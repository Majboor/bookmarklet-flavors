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
import json, os, re, sys, urllib.request, urllib.error, threading, traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ.get("OPENROUTER_API_KEY", "")
PORT = int(os.environ.get("FLAVORS_PORT", "9800"))
MEMORY_DIR = os.environ.get("MEMORY_DIR", "/opt/flavors/memory")
GEN_MODEL = "z-ai/glm-5.3"
JEV_MODEL = "typesafe/jev-1.13"
OR_CHAT = "https://openrouter.ai/api/v1/chat/completions"
OR_DECISIONS = "https://openrouter.ai/api/alpha/decisions"

SYSTEM = """You write "flavors": self-contained JavaScript that restyles or re-shapes a website, injected into the live page by a bookmarklet.

## Output contract
Reply with ONE JSON object and nothing else. No prose, no markdown fence.
{"name":"<3-4 word flavor name>","code":"<javascript>","notes":"<one sentence on what you changed>"}

## The code you write MUST
1. BE SELF-TOGGLING. It runs on every toggle click. On first run it applies; on the
   next run it must fully remove itself and restore the page. Use a sentinel:
     var ID='__flavor_<slug>__';
     var prev=document.getElementById(ID);
     if(prev){ prev.remove(); /* undo any JS-side changes too */ return; }
     var st=document.createElement('style'); st.id=ID; st.textContent="..."; document.head.appendChild(st);
2. Use ONLY selectors listed as verified in the memory below. Never invent one.
   Never use anything in the DEAD list. If you cannot do it with verified selectors,
   say so in "notes" and return the smallest thing you CAN do.
3. NEVER use innerHTML, outerHTML, insertAdjacentHTML, document.write, eval, or set
   script.src to a string. Sites with Trusted Types throw on these. Build nodes with
   createElement/textContent/append, and clear with replaceChildren().
4. Never hide a container that also holds wanted content. Hide specific siblings.
5. Survive SPA navigation if the site is an SPA: re-apply on the site's navigation
   event, and clean the listener up on toggle-off.
6. Be defensive: every querySelector result may be null. Guard everything. Never throw.
7. No network requests. No cookies, storage, credentials, or data exfiltration.
   Visual and layout changes only.

## Style
Match the request's spirit. Prefer CSS custom properties where the memory lists them -
they survive the site's component churn far better than element selectors."""

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
BANNED = re.compile(r"\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\s*\()")


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

    picks, seen = [], set()
    ranked = []
    for i, c in enumerate(regions, 1):
        k = (a.get("k%d" % i) or {}).get("choice")
        kc = ((a.get("k%d" % i) or {}).get("probabilities") or {}).get(k, 0)
        p = (a.get("d%d" % i) or {}).get("noul", 0)
        if p > 0.7 and k in REMOVABLE and kc >= 0.5 and KIND_LABEL.get(k):
            ranked.append({"selector": c.get("selector"), "kind": k, "label": KIND_LABEL[k], "p": p})
    ranked.sort(key=lambda x: -x["p"])
    for c in ranked:
        if c["kind"] not in seen:
            seen.add(c["kind"])
            picks.append(c)

    if not task or task_conf < 0.5 or clutter < 0.8 or not picks:
        return 200, {"suggest": False, "why": {"task": task, "taskConf": task_conf,
                                               "clutter": clutter, "candidates": len(picks)}}
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
        if not KEY:
            return self._send(500, {"error": "Server missing OPENROUTER_API_KEY"})
        route = self.path.split("?")[0].rstrip("/")
        try:
            if route == "/api/generate":
                return self._send(*handle_generate(body))
            if route == "/api/suggest":
                return self._send(*handle_suggest(body))
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
