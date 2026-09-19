#!/usr/bin/env python3
"""
Flavors API — generation (GLM 5.3) + proactive suggestions (jev).

Runs on the T430 and is exposed at flavors.waleeds.world/api/* through the
RPI-Home cloudflared tunnel (path-based ingress), so it shares an origin with
flavors.js: no CORS preflight surprises and no extra CSP allowance.

The OpenRouter key lives here, never in flavors.js, which is world-readable.

  env: OPENROUTER_API_KEY   (required)
       FLAVORS_PORT         (default 9800)
       MEMORY_DIR           (default /opt/flavors/memory)
"""
import json, os, re, sys, time, hashlib, urllib.request, urllib.error, threading, traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ.get("OPENROUTER_API_KEY", "")
PORT = int(os.environ.get("FLAVORS_PORT", "9800"))
MEMORY_DIR = os.environ.get("MEMORY_DIR", "/opt/flavors/memory")
GEN_MODEL = "z-ai/glm-5.3"
JEV_MODEL = "typesafe/jev-1.13"
OR_CHAT = "https://openrouter.ai/api/v1/chat/completions"
OR_DECISIONS = "https://openrouter.ai/api/alpha/decisions"

SYSTEM = """You write "flavors": self-contained JavaScript that restyles or re-shapes a website. It is injected into a live page that is ALREADY LOADED, by a bookmarklet.

## Output contract
Reply with ONE JSON object and nothing else. No prose, no markdown fence.
{"name":"<3-4 word flavor name>","code":"<javascript>","notes":"<one sentence on what you changed>"}

## 1. SELF-TOGGLING (required)
Your code runs again on every toggle click. First run applies; next run must fully
remove itself and restore the page. Use a sentinel element:

  var ID='__flavor_<slug>__';
  var prev=document.getElementById(ID);
  if(prev){ prev.remove(); /* ALSO undo JS-side changes + removeEventListener */ return; }
  var st=document.createElement('style'); st.id=ID;
  st.textContent="...css...";
  document.head.appendChild(st);

Top-level `return` is supported. `await`, `import` and `export` at top level are NOT.

## 2. TRUSTED TYPES - the single biggest source of runtime failures
Many sites (YouTube, GitHub, others) send `require-trusted-types-for 'script'`.
On those pages these THROW and your flavor dies:

  FORBIDDEN, never emit:
    innerHTML          outerHTML        insertAdjacentHTML
    document.write     document.writeln
    eval(...)          new Function(...)
    script.src = "<string>"
    el.setAttribute('onclick', ...)    inline on* attributes

  Use instead:
    build nodes  -> document.createElement + textContent + append/appendChild
    clear nodes  -> el.replaceChildren()        (NOT el.innerHTML = '')
    styling      -> a <style> element with .textContent  (this is safe)

Prefer pure CSS in a single <style> element. It needs no DOM surgery, cannot trip
Trusted Types, and is trivially reversible by removing that one element.

## 3. SELECTORS
- Use ONLY selectors listed as verified in the memory below, with their counts.
- NEVER invent a selector, and never use one from the DEAD list.
- Selectors are PAGE-SCOPED. The same selector can be live on one page of a site and
  dead on another (on YouTube `a#video-title` is dead on the watch page but alive on
  search results). Check which page the memory verified before using it.
- Never target obfuscated/hashed class names (`mwoq`, `e5616576`, `css-1dbjc4n`) - they
  change on every deploy. Prefer ids, data-testid, ARIA roles, semantic elements, then
  stable BEM-ish classes.
- Prefer CSS custom properties when the memory lists them: they pierce component
  rewrites that break element selectors.
- If the request cannot be done with verified selectors, say so in "notes" and return
  the smallest thing you CAN do. A no-op is better than a guess.

## 4. DO NOT BREAK THE PAGE
- NEVER hide a container that also holds wanted content. On YouTube `#columns` holds
  BOTH the sidebar and the player - hiding it hides the video. Target specific
  siblings (`#secondary`, `#comments`, `#below`).
- NEVER force `display` on an element you are only restyling cosmetically. Forcing
  `display:block` on a flex/grid/aspect-ratio box collapses its height, and with
  `overflow:hidden` the content is clipped out of existence. (This really happened:
  it made every YouTube thumbnail vanish.) Restyle borders/radius/colour without
  touching `display`.
- Do not set `overflow:hidden` on a container whose child must overflow.
- Real fullscreen only: call `el.requestFullscreen()` on the SITE'S OWN player
  element. Faking it with `position:fixed;width:100vw;height:100vh` does NOT make the
  site resize its internal <video>; that runs off the site's own resize observer.
- Site CSS is high-specificity. Use `!important` on visual overrides.

## 5. SPA NAVIGATION
Many sites never reload between pages. If the site is an SPA, re-apply on its own
navigation event (YouTube: `yt-navigate-finish`), and on toggle-off ALWAYS
removeEventListener and delete anything you parked on `window`. Re-applying must be
idempotent - check your sentinel before adding a second copy.

## 6. DEFENSIVE
- Every querySelector/querySelectorAll result may be null or empty. Guard everything.
- Never throw. Wrap risky DOM work in try/catch.
- Running twice must not double-apply.

## 7. SCOPE
Visual and layout changes only. No network requests (fetch/XHR/WebSocket/beacon),
no cookies, no localStorage of page data, no reading credentials or form values,
no sending anything anywhere.

## Style
Match the request's spirit - if they ask for playful, be playful. Keep it to one
<style> element plus the minimum JS the request actually needs."""

TASKS = {
    "watching": "watching a video", "reading": "reading an article or docs",
    "shopping": "browsing products", "working": "working in an app or dashboard",
    "searching": "looking through search results", "social": "scrolling a social feed",
}
KINDS = {
    "main": "Main content - the thing the person actually came for",
    "recommendations": "Suggested/related/recommended items pointing elsewhere",
    "comments": "User comments, replies or a discussion thread",
    "navigation": "Site navigation, menus, table of contents or breadcrumbs",
    "ads": "Advertising or sponsored placements",
    "promo": "Site promo, banner, newsletter prompt, donation or upsell",
    "meta": "Secondary details about the main thing - metadata, tags, author box",
    "chat": "Live chat or messaging panel",
}
KIND_LABEL = {
    "recommendations": "the recommendations", "comments": "the comments",
    "navigation": "the navigation", "ads": "the ads", "promo": "the promo banner",
    "meta": "the side details", "chat": "the chat panel", "main": "the main content",
}
REMOVABLE = {"recommendations", "comments", "ads", "promo", "chat"}
PLURAL = {"recommendations", "comments", "ads", "meta"}
BANNED = re.compile(
    r"\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write(?:ln)?"
    r"|eval\s*\(|new\s+Function\s*\(|Function\s*\(\s*[\"']"
    r"|set(?:Timeout|Interval)\s*\(\s*[\"'])"
)


def post_json(url, payload, timeout=180):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={
        "Authorization": "Bearer " + KEY, "Content-Type": "application/json",
        "HTTP-Referer": "https://flavors.waleeds.world",
        "X-OpenRouter-Title": "Bookmarklet Flavors"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def load_memory(domain):
    safe = re.sub(r"[^a-z0-9.\-]", "", str(domain or "").lower())
    if not safe:
        return None
    path = os.path.join(MEMORY_DIR, safe + ".md")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def extract_json(text):
    if not text:
        return None
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"```\s*$", "", t)
    try:
        return json.loads(t)
    except Exception:
        pass
    start = t.find("{")
    if start == -1:
        return None
    for end in range(len(t), start, -1):
        if t[end - 1] != "}":
            continue
        try:
            return json.loads(t[start:end])
        except Exception:
            continue
    return None


def build_user_message(body, memory):
    parts = ["# Verified flavor memory for %s\n\n%s" % (body.get("domain"), memory)]
    page = body.get("page") or {}
    if page:
        parts.append("# Current page\nURL: %s\nTitle: %s\nComponents present: %s"
                     % (page.get("url"), page.get("title"), ", ".join(page.get("components") or [])))
    els = body.get("elements") or []
    if els:
        parts.append("# Elements the user pointed at (treat these as the target)\n" + "\n".join(
            "- `%s` (%s matches, <%s>)%s" % (e.get("selector"), e.get("matches"), e.get("tag"),
                                             ' — "%s"' % e["text"] if e.get("text") else "")
            for e in els))
    rec = body.get("recording") or {}
    steps = rec.get("steps") or []
    if steps:
        parts.append("# What the user did while recording (in order)\n" + "\n".join(
            "%d. clicked `%s`%s" % (i + 1, s.get("selector"), ' — "%s"' % s["text"] if s.get("text") else "")
            for i, s in enumerate(steps[:40])))
    if body.get("currentCode"):
        parts.append("# The flavor as it stands now - MODIFY this, do not start over\n"
                     "```javascript\n%s\n```" % body["currentCode"])
    pp = body.get("pageProbe") or {}
    if pp:
        lines = ["# LIVE PAGE PROBE - measured in the user's browser just now",
                 "This is GROUND TRUTH and overrides the memory file where they disagree."]
        if pp.get("alive"):
            lines.append("## Memory selectors that MATCH on this exact page")
            lines += ["- `%s` -> %s" % (x, (pp.get("probe") or {}).get(x)) for x in pp["alive"][:35]]
        if pp.get("dead"):
            lines.append("## Memory selectors that match ZERO here - DO NOT USE THEM")
            lines += ["- `%s`" % x for x in pp["dead"][:35]]
        if pp.get("components"):
            lines.append("## Custom elements present: " + ", ".join(pp["components"][:25]))
        if pp.get("linkShapes"):
            lines.append("## Link shapes: " + ", ".join(pp["linkShapes"][:12]))
        parts.append("\n".join(lines))

    obs = observations_for(body.get("domain"))
    if obs:
        parts.append("# Selector counts observed in REAL sessions on this domain\n"
                     "(ground truth from live pages, including logged-in ones)\n" + obs)
    parts.append("# What the user wants\n" + str(body.get("prompt", "")))
    return "\n\n".join(parts)


def handle_generate(body):
    if not body.get("prompt") or not body.get("domain"):
        return 400, {"error": "domain and prompt required"}
    memory = load_memory(body["domain"])
    if memory is None:
        return 404, {"error": "No flavor memory for " + str(body["domain"]), "needsRequest": True}
    history = [{"role": "user" if m.get("role") == "user" else "assistant",
                "content": str(m.get("content", ""))[:2000]}
               for m in (body.get("history") or [])[-8:]]
    try:
        data = post_json(OR_CHAT, {
            "model": GEN_MODEL, "temperature": 0.4,
            # GLM 5.3 reasons by default and will spend the entire budget doing it,
            # returning content:null. Cap reasoning, keep room for the code.
            "reasoning": {"effort": "low"}, "max_tokens": 12000,
            "messages": [{"role": "system", "content": SYSTEM}] + history +
                        [{"role": "user", "content": build_user_message(body, memory)}]})
    except urllib.error.HTTPError as e:
        return 502, {"error": "Model error %s: %s" % (e.code, e.read()[:300].decode("utf8", "replace"))}
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content")
    if not content:
        rt = ((data.get("usage") or {}).get("completion_tokens_details") or {}).get("reasoning_tokens")
        return 502, {"error": "Model returned no content" + (" (spent %s tokens reasoning)" % rt if rt else "")}
    parsed = extract_json(content)
    if not parsed or not parsed.get("code"):
        return 502, {"error": "Model did not return usable code", "raw": content[:500]}
    if BANNED.search(parsed["code"]):
        return 422, {"error": "Generated code used a forbidden HTML sink; try rephrasing."}
    return 200, {"name": str(parsed.get("name") or "AI flavor")[:40], "code": parsed["code"],
                 "notes": str(parsed.get("notes") or "")[:400], "usage": data.get("usage")}


def describe_regions(regions):
    out = []
    for i, c in enumerate(regions):
        bits = ["%s%% of the screen" % c.get("area")]
        if (c.get("links") or 0) > 2:
            bits.append("%s links" % c["links"])
        if (c.get("repeats") or 0) > 3:
            bits.append("%s repeating items" % c["repeats"])
        if c.get("words"):
            bits.append("~%s words" % c["words"])
        d = "[%d] <%s>%s - %s" % (i + 1, c.get("role") or "div",
                                  ' id="%s"' % c["id"] if c.get("id") else "", ", ".join(bits))
        if c.get("heading"):
            d += '\n     heading: "%s"' % c["heading"]
        if c.get("aria"):
            d += '\n     label: "%s"' % c["aria"]
        if c.get("sample"):
            d += '\n     text: "%s"' % c["sample"]
        out.append(d)
    return "\n".join(out)


def handle_suggest(body):
    regions = (body.get("regions") or [])[:6]
    if not regions:
        return 400, {"error": "regions required"}
    state = ("Page title: %s\nURL: %s\nHeadings on screen: %s\n\nRegions on screen:\n%s"
             % (body.get("title", ""), body.get("url", ""),
                " | ".join((body.get("headings") or [])[:5]), describe_regions(regions)))
    q = {
        "task": {"type": "choice", "instructions": "What is the person most likely here to do?",
                 "criteria": {"watching": "Watching or about to watch a video",
                              "reading": "Reading an article, documentation or a long text",
                              "shopping": "Browsing or comparing products to buy",
                              "working": "Using an app, dashboard or tool to get work done",
                              "searching": "Scanning a list of search results to find something",
                              "social": "Scrolling a social or recommendation feed"}},
        "clutter": {"type": "score",
                    "instructions": "How cluttered is this page relative to what the person came to do?",
                    "criteria": ["Calm and focused", "Somewhat busy", "Overwhelming"]},
    }
    for i, c in enumerate(regions, 1):
        q["k%d" % i] = {"type": "choice", "instructions": "What kind of region is [%d]?" % i,
                        "criteria": KINDS}
        q["d%d" % i] = {"type": "noul",
                        "instructions": "Would hiding region [%d] help the person focus on what they came to do?" % i,
                        "criteria": {"true": "It is peripheral - they would lose nothing important",
                                     "false": "It is the content or controls they came for, or they need it"}}
    try:
        a = post_json(OR_DECISIONS, {"model": JEV_MODEL, "state": state, "questions": q}, timeout=90)["answers"]
    except urllib.error.HTTPError as e:
        return 502, {"error": "jev %s: %s" % (e.code, e.read()[:200].decode("utf8", "replace"))}

    task = (a.get("task") or {}).get("choice")
    task_conf = ((a.get("task") or {}).get("probabilities") or {}).get(task, 0)
    clutter = (a.get("clutter") or {}).get("score", 0)

    # Kinds the client has already suggested on this page - offer something else
    # rather than repeating the same line every loop.
    exclude = set(x for x in (body.get("exclude") or []) if isinstance(x, str))
    picks, seen = [], set()
    ranked = []
    for i, c in enumerate(regions, 1):
        k = (a.get("k%d" % i) or {}).get("choice")
        kc = ((a.get("k%d" % i) or {}).get("probabilities") or {}).get(k, 0)
        p = (a.get("d%d" % i) or {}).get("noul", 0)
        if k in exclude:
            continue
        if p > 0.7 and k in REMOVABLE and kc >= 0.5 and KIND_LABEL.get(k):
            ranked.append({"selector": c.get("selector"), "kind": k, "label": KIND_LABEL[k], "p": p})
    ranked.sort(key=lambda x: -x["p"])
    for c in ranked:
        if c["kind"] not in seen:
            seen.add(c["kind"])
            picks.append(c)

    if not task or task_conf < 0.5 or clutter < 0.8 or not picks:
        return 200, {"suggest": False, "why": {"task": task, "taskConf": task_conf,
                                               "clutter": clutter, "candidates": len(picks),
                                               "excluded": sorted(exclude)}}
    top = picks[0]
    second = picks[1] if len(picks) > 1 else None
    tt = TASKS.get(task, "using this page")
    if clutter >= 1.5 and second:
        msg = "Looks like you're %s. Want me to clear %s and %s out of the way?" % (tt, top["label"], second["label"])
    elif top["p"] > 0.9:
        msg = "You're %s — %s %s a bit distracting?" % (tt, "aren't" if top["kind"] in PLURAL else "isn't", top["label"])
    else:
        msg = "Quite busy in here while you're %s. Want me to hide %s?" % (tt, top["label"])
    return 200, {"suggest": True, "message": msg,
                 "prompt": "Hide %s so I can focus on %s." % (" and ".join(p["label"] for p in picks[:2]), tt),
                 "targets": [{"selector": p["selector"], "label": p["label"], "kind": p["kind"], "p": p["p"]}
                             for p in picks[:2]],
                 "signals": {"task": task, "taskConf": task_conf, "clutter": clutter}}





# ---------------------------------------------------------------------
#  Cross-site trail (server side)
#
#  localStorage is ORIGIN-SCOPED, so a trail kept in the page can only ever
#  see the site it is on - which makes "was searching API docs, now watching
#  a tutorial" impossible client-side. The API sees every site though, so the
#  trail lives here instead.
#
#  PRIVACY: hostnames only. No URLs, paths, queries or titles. Held in memory
#  only (never written to disk), 30-minute TTL, keyed by a salted hash of the
#  client IP so the raw address is not retained. Lost on restart, by design.
# ---------------------------------------------------------------------
TRAIL_TTL = 30 * 60
_TRAILS = {}
_TRAIL_LOCK = threading.Lock()
_TRAIL_SALT = os.urandom(16)


def _client_key(handler):
    ip = (handler.headers.get("CF-Connecting-IP")
          or handler.headers.get("X-Forwarded-For", "").split(",")[0].strip()
          or handler.client_address[0])
    return hashlib.sha256(_TRAIL_SALT + ip.encode()).hexdigest()[:16]


def record_visit(key, host):
    host = re.sub(r"[^a-z0-9.\-]", "", str(host or "").lower())[:80]
    if not host:
        return 0
    now = time.time()
    with _TRAIL_LOCK:
        t = [x for x in _TRAILS.get(key, []) if now - x[1] < TRAIL_TTL]
        if not t or t[-1][0] != host:
            t.append([host, now])
        else:
            t[-1][1] = now
        _TRAILS[key] = t[-60:]
        # opportunistic sweep so idle keys do not accumulate
        if len(_TRAILS) > 500:
            for k in [k for k, v in _TRAILS.items() if not v or now - v[-1][1] > TRAIL_TTL]:
                _TRAILS.pop(k, None)
        return len(t)


def trail_for(key):
    now = time.time()
    with _TRAIL_LOCK:
        entries = [x for x in _TRAILS.get(key, []) if now - x[1] < TRAIL_TTL]
    agg = {}
    for host, ts in entries:
        r = agg.setdefault(host, {"host": host, "n": 0, "last": 0})
        r["n"] += 1
        r["last"] = max(r["last"], ts)
    out = [{"host": r["host"], "n": r["n"], "minsAgo": int((now - r["last"]) / 60)}
           for r in agg.values()]
    return sorted(out, key=lambda r: r["minsAgo"])[:10]


# ---------------------------------------------------------------------
#  /api/context  -  what is this person actually trying to do right now?
#
#  Page clutter answers "what is noisy here". This answers "what are they
#  here FOR", which is the question a prompt box can never ask because the
#  user would have to know to type it. Evidence is the site, the local time
#  and the recent trail - the same person on youtube.com at 14:00 after
#  searching API docs is not doing what they are doing at 23:00 after
#  watching stand-up.
# ---------------------------------------------------------------------
CONTEXTS = {
    "working": "Getting a work task done - building, fixing, shipping something",
    "learning": "Studying or following a tutorial to understand something",
    "job_hunting": "Looking for work, bidding, applying or pitching",
    "hiring": "Evaluating people - sourcing candidates, reviewing profiles",
    "research": "Digging into a topic across sources to form a view",
    "entertainment": "Relaxing - watching, scrolling or listening for fun",
    "shopping": "Browsing or comparing things to buy",
    "admin": "Chores - email, invoices, forms, accounts",
}

# Short, human labels for the confirm question. The long criteria above are for
# jev; nobody wants to read "studying or following a tutorial to understand
# something" on a button.
CONTEXT_SHORT = {
    "working": "Working", "learning": "Studying", "job_hunting": "Job hunting",
    "hiring": "Hiring", "research": "Researching", "entertainment": "Relaxing",
    "shopping": "Shopping", "admin": "Admin",
}

# A Mode is a NAMED, hand-written transformation for one (context, site) pair.
# The model picks which Mode fits; it does not invent the transformation. An
# intent read that produces a useless change is worse than staying quiet.
MODES = {
    ("youtube.com", "learning"): {
        "name": "Study Mode",
        "pitch": "Want me to strip this down so you can focus on the tutorial?",
        "prompt": "Hide the recommendations sidebar, comments and Shorts, widen the player "
                  "and keep the video and its title. Calm, low-contrast colours.",
    },
    ("youtube.com", "working"): {
        "name": "Reference Mode",
        "pitch": "Using this as a reference? I can clear everything but the video.",
        "prompt": "Hide the recommendations sidebar, comments, Shorts and the filter chips. "
                  "Keep the player and title only, and widen the player.",
    },
    ("youtube.com", "entertainment"): {
        "name": "Lean-back Mode",
        "pitch": "Winding down? I can make this bigger and quieter.",
        "prompt": "Make thumbnails and the player larger and rounded, hide the comments "
                  "and the filter chips, keep the recommendations, soften the colours.",
    },
    ("youtube.com", "research"): {
        "name": "Research Mode",
        "pitch": "Researching? I can keep the related videos and drop the noise.",
        "prompt": "Hide comments and Shorts, keep the recommendations sidebar and make its "
                  "titles larger and easier to scan.",
    },
    ("news.ycombinator.com", "research"): {
        "name": "Reading Mode",
        "pitch": "Want this easier to scan?",
        "prompt": "Larger story titles, dim the points/author line, wider spacing, calm palette.",
    },
    ("stackoverflow.com", "working"): {
        "name": "Answer Mode",
        "pitch": "Debugging? I can put the answers front and centre.",
        "prompt": "Hide the right sidebar and the question's comments, emphasise the accepted "
                  "answer and make code blocks larger.",
    },
    ("github.com", "working"): {
        "name": "Code Mode",
        "pitch": "Want the chrome out of the way?",
        "prompt": "Hide the repo header nav and side panels, widen the file listing, "
                  "larger monospace.",
    },
}


def part_of_day(hour):
    if hour < 5:   return "the small hours"
    if hour < 9:   return "early morning"
    if hour < 12:  return "morning"
    if hour < 17:  return "afternoon"
    if hour < 21:  return "evening"
    return "late evening"


def handle_context(body):
    site = re.sub(r"[^a-z0-9.\-]", "", str(body.get("domain") or "").lower())
    if not site:
        return 400, {"error": "domain required"}
    hour = body.get("hour")
    hour = int(hour) if isinstance(hour, (int, float)) and 0 <= hour <= 23 else 12
    weekday = str(body.get("weekday") or "")[:12]
    trail = body.get("_serverTrail") or body.get("trail") or []   # hostnames only
    page_kind = str(body.get("pageKind") or "")[:60]

    trail_txt = "\n".join(
        "  - %s  (%s page%s, %s)" % (t.get("host"), t.get("n"),
                                     "" if t.get("n") == 1 else "s",
                                     ("%s min ago" % t.get("minsAgo")) if t.get("minsAgo") is not None else "recently")
        for t in trail[:10]) or "  (nothing recorded yet)"

    state = (
        "Local time: %s %02d:00 (%s)\n"
        "Current site: %s\n"
        "Current page: %s\n\n"
        "Sites visited in the last half hour, most recent first:\n%s"
        % (weekday, hour, part_of_day(hour), site, page_kind or "unknown", trail_txt))

    questions = {
        "context": {"type": "choice",
                    "instructions": "What is this person most likely doing right now? "
                                    "Weigh the trail and the time of day, not just the site.",
                    "criteria": CONTEXTS},
        "sure": {"type": "noul",
                 "instructions": "Is the evidence strong enough to act on without asking them?",
                 "criteria": {"true": "The trail and time point clearly at one thing",
                              "false": "It is genuinely ambiguous - two readings fit equally"}},
    }
    try:
        a = (post_json(OR_DECISIONS, {"model": JEV_MODEL, "state": state,
                                      "questions": questions}, timeout=90))["answers"]
    except urllib.error.HTTPError as e:
        return 502, {"error": "jev %s: %s" % (e.code, e.read()[:200].decode("utf8", "replace"))}

    ctx = (a.get("context") or {}).get("choice")
    probs = (a.get("context") or {}).get("probabilities") or {}
    conf = probs.get(ctx, 0)
    sure = (a.get("sure") or {}).get("noul", 0)

    mode = MODES.get((site, ctx))
    # No hand-verified Mode for this pair means we have nothing genuinely useful
    # to offer. Say nothing rather than invent a transformation.
    if not mode:
        return 200, {"act": False, "context": ctx, "confidence": conf,
                     "why": "no verified Mode for (%s, %s)" % (site, ctx)}

    runner_up = sorted(((k, v) for k, v in probs.items() if k != ctx),
                       key=lambda kv: -kv[1])[:1]
    # `sure` reads low even when the choice is unanimous, so gating on it alone
    # meant asking every single time - which is nagging, not confirming. Trust the
    # choice distribution, and only fall back to `sure` when it is very low
    # (that is the genuinely evidence-free case, e.g. no trail at all).
    ask = (conf < 0.75) or (sure < 0.30)
    out = {"act": True, "context": ctx, "confidence": conf, "sure": sure,
           "mode": {"name": mode["name"], "pitch": mode["pitch"], "prompt": mode["prompt"]},
           "timeOfDay": part_of_day(hour)}
    if ask and runner_up:
        alt = runner_up[0][0]
        alt_mode = MODES.get((site, alt))
        out["ask"] = {
            "question": "Quick one — %s or %s?" % (CONTEXT_SHORT.get(ctx, ctx).lower(),
                                                   CONTEXT_SHORT.get(alt, alt).lower()),
            "options": [
                {"key": ctx, "label": CONTEXT_SHORT.get(ctx, ctx), "mode": mode["name"]},
                {"key": alt, "label": CONTEXT_SHORT.get(alt, alt),
                 "mode": (alt_mode or {}).get("name")},
            ],
        }
    return 200, out


def handle_mode(body):
    """Resolve a confirmed context to its Mode prompt."""
    site = re.sub(r"[^a-z0-9.\-]", "", str(body.get("domain") or "").lower())
    ctx = str(body.get("context") or "")
    mode = MODES.get((site, ctx))
    if not mode:
        return 404, {"error": "no Mode for (%s, %s)" % (site, ctx)}
    return 200, {"mode": {"name": mode["name"], "pitch": mode["pitch"], "prompt": mode["prompt"]}}


OBS_DIR = os.path.join(MEMORY_DIR, "observed")


def observations_for(domain):
    """Selector counts seen in REAL sessions, including logged-in pages that no
    headless check can reach. This is how the memory improves by itself."""
    safe = re.sub(r"[^a-z0-9.\-]", "", str(domain or "").lower())
    path = os.path.join(OBS_DIR, safe + ".json")
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        return None
    rows = []
    for sel, rec in sorted(data.items(), key=lambda kv: -max(kv[1].get("counts") or [0])):
        counts = rec.get("counts") or []
        if not counts:
            continue
        hi = max(counts)
        rows.append("  %-62s %s  (seen %dx, pages: %s)" % (
            sel, ("%d MATCHES" % hi) if hi else "0 - DEAD HERE",
            len(counts), ", ".join((rec.get("pages") or [])[:2])))
    return "\n".join(rows[:60]) if rows else None


def handle_observe(body):
    domain = re.sub(r"[^a-z0-9.\-]", "", str(body.get("domain") or "").lower())
    probe = body.get("probe") or {}
    if not domain or not isinstance(probe, dict):
        return 400, {"error": "domain and probe required"}
    os.makedirs(OBS_DIR, exist_ok=True)
    path = os.path.join(OBS_DIR, domain + ".json")
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        data = {}
    page = str(body.get("url") or "")[:120]
    for sel, n in list(probe.items())[:120]:
        if not isinstance(n, int) or n < 0:
            continue
        rec = data.setdefault(str(sel)[:180], {"counts": [], "pages": []})
        rec["counts"] = (rec["counts"] + [n])[-10:]
        if page and page not in rec["pages"]:
            rec["pages"] = (rec["pages"] + [page])[-5:]
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=1)
    os.replace(tmp, path)
    return 200, {"ok": True, "tracked": len(data)}


REPAIR_SYSTEM = SYSTEM + """

## YOU ARE REPAIRING A FLAVOR THAT DID NOT WORK
You will be given your previous code and MEASURED EVIDENCE from the live page.
That evidence is ground truth - it was taken in the real browser, on the real
page, in the user's real session. It overrides any assumption you made.

- A selector with 0 matches DOES NOT EXIST on this page. Replace it. Do not keep it
  "just in case" and do not simply add `!important` to it.
- An INVALID selector is a syntax error you wrote. Fix or drop it.
- If selectors matched but NOTHING CHANGED VISUALLY, your CSS lost to the site's own
  rules: raise specificity or add `!important`, and check you are not styling a
  wrapper whose child paints over it.
- Prefer selectors that the evidence shows actually match on THIS page.
Return the same JSON contract. Fix the code; do not start from scratch."""


def handle_repair(body):
    if not body.get("domain") or not body.get("code"):
        return 400, {"error": "domain and code required"}
    memory = load_memory(body["domain"])
    if memory is None:
        return 404, {"error": "No flavor memory for " + str(body["domain"])}

    probe = body.get("probe") or {}
    missed = body.get("missed") or []
    invalid = body.get("invalid") or []
    matched = body.get("matched") or []

    ev = ["# MEASURED EVIDENCE FROM THE LIVE PAGE (ground truth)"]
    if body.get("threw"):
        ev.append("The code THREW at runtime: " + str(body["threw"])[:300])
    if missed:
        ev.append("## These selectors matched ZERO elements - they do not exist here\n"
                  + "\n".join("- `%s`" % m for m in missed[:25]))
    if invalid:
        ev.append("## These selectors are INVALID syntax\n"
                  + "\n".join("- `%s`" % m for m in invalid[:10]))
    if matched:
        ev.append("## These DID match (counts)\n"
                  + "\n".join("- `%s` -> %s" % (m, probe.get(m)) for m in matched[:25]))
    if not body.get("threw") and matched and not missed:
        ev.append("## Nothing changed visually even though selectors matched.\n"
                  "Your CSS is being overridden by the site. Raise specificity / add !important.")
    pp = body.get("pageProbe") or {}
    if pp.get("alive"):
        ev.append("## Selectors CONFIRMED present on this page (use these)\n"
                  + "\n".join("- `%s` -> %s" % (x, (pp.get("probe") or {}).get(x))
                             for x in pp["alive"][:30]))
    if pp.get("dead"):
        ev.append("## Selectors CONFIRMED absent on this page (never use these)\n"
                  + "\n".join("- `%s`" % x for x in pp["dead"][:30]))
    obs = observations_for(body["domain"])
    if obs:
        ev.append("## Selector counts observed in real sessions on this domain\n" + obs)

    user = ("# Verified flavor memory for %s\n\n%s\n\n%s\n\n"
            "# The code that failed\n```javascript\n%s\n```\n\n"
            "# What the user originally asked for\n%s\n\n"
            "This is repair attempt %s. Fix it."
            % (body["domain"], memory, "\n\n".join(ev), body["code"],
               body.get("prompt", ""), body.get("attempt", 1)))
    try:
        # Replay every previous attempt as real turns. Without this the model
        # happily re-proposes a selector it already proved dead.
        msgs = [{"role": "system", "content": REPAIR_SYSTEM}]
        for h in (body.get("history") or [])[:-1][-4:]:
            msgs.append({"role": "assistant",
                         "content": json.dumps({"code": str(h.get("code", ""))[:3000],
                                                "notes": str(h.get("notes", ""))[:200]})})
            fb = ["That attempt was measured in the live page: " + str(h.get("verdict", ""))]
            if h.get("missed"):
                fb.append("Matched ZERO: " + ", ".join("`%s`" % m for m in h["missed"][:15]))
            if h.get("threw"):
                fb.append("It threw: " + str(h["threw"])[:200])
            msgs.append({"role": "user", "content": "\n".join(fb)})
        msgs.append({"role": "user", "content": user})
        data = post_json(OR_CHAT, {
            "model": GEN_MODEL, "temperature": 0.3,
            "reasoning": {"effort": "low"}, "max_tokens": 12000,
            "messages": msgs})
    except urllib.error.HTTPError as e:
        return 502, {"error": "Model error %s: %s" % (e.code, e.read()[:200].decode("utf8", "replace"))}
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content")
    if not content:
        return 502, {"error": "Model returned no content"}
    parsed = extract_json(content)
    if not parsed or not parsed.get("code"):
        return 502, {"error": "Model did not return usable code"}
    if BANNED.search(parsed["code"]):
        return 422, {"error": "Repaired code used a forbidden sink"}
    return 200, {"name": str(parsed.get("name") or "AI flavor")[:40], "code": parsed["code"],
                 "notes": str(parsed.get("notes") or "")[:400], "usage": data.get("usage")}


REQ_LOG = os.path.join(MEMORY_DIR, "..", "requests.jsonl")


def handle_request(body):
    try:
        with open(REQ_LOG, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(body) + "\n")
    except Exception:
        pass
    return 200, {"ok": True}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "flavors-api"

    def _send(self, status, obj):
        payload = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        # A 204 must not carry a body. Sending one (Content-Length: 2, "{}") makes
        # Cloudflare reject the response with a 520, which fails the CORS preflight
        # and surfaces in the page as an unexplained "Failed to fetch".
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.rstrip("/") in ("/api/health", "/health"):
            doms = sorted(f[:-3] for f in os.listdir(MEMORY_DIR) if f.endswith(".md")) if os.path.isdir(MEMORY_DIR) else []
            return self._send(200, {"ok": True, "key": bool(KEY), "memory": doms})
        self._send(404, {"error": "Not found"})

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._send(400, {"error": "bad JSON body"})
        route = self.path.split("?")[0].rstrip("/")
        if route not in ("/api/observe", "/api/request", "/api/visit") and not KEY:
            return self._send(500, {"error": "Server missing OPENROUTER_API_KEY"})
        try:
            if route == "/api/generate":
                return self._send(*handle_generate(body))
            if route == "/api/suggest":
                return self._send(*handle_suggest(body))
            if route == "/api/visit":
                n = record_visit(_client_key(self), body.get("host"))
                return self._send(200, {"ok": True, "trail": n})
            if route == "/api/context":
                body["_serverTrail"] = trail_for(_client_key(self))
                return self._send(*handle_context(body))
            if route == "/api/mode":
                return self._send(*handle_mode(body))
            if route == "/api/repair":
                return self._send(*handle_repair(body))
            if route == "/api/observe":
                return self._send(*handle_observe(body))
            if route == "/api/request":
                return self._send(*handle_request(body))
        except Exception as e:
            traceback.print_exc()
            return self._send(500, {"error": "%s: %s" % (type(e).__name__, e)})
        self._send(404, {"error": "Not found"})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    if not KEY:
        print("WARNING: OPENROUTER_API_KEY not set", file=sys.stderr)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("flavors-api on :%d  memory=%s" % (PORT, MEMORY_DIR), flush=True)
    srv.serve_forever()
