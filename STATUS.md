# Flavors — open work

Updated 2026-09-19. Status: ✅ done · 🟡 coded, not verified/deployed · ⬜ not started

| # | Item | Status | Detail |
|---|---|---|---|
| **B1** | **CSP `connect-src` blocks the loader** | ✅ | Bookmarklet `fetch()`es `flavors.js`; strict-CSP sites refuse it (`Refused to connect ... not in the connect-src directive`). `<script src>` is no escape — that's `script-src`, equally locked. **Fixed:** `build-bookmarklet.js` produces a hybrid — tries the fetch, falls back to an embedded `flavorHub` called *directly* (no script node, no request, so CSP has nothing to refuse). **Verified on WebKit + Chromium under `connect-src 'none'`:** mascot still injects. Bookmarklet is now ~59 KB. ⚠️ Needs re-installing once to pick up the embedded fallback. |
| **B2** | **Safari: dragging selects page text** | ✅ | `pointerdown` never called `preventDefault()`; nothing suppressed selection once the pointer left the mascot. **Done:** `e.preventDefault()`, full-viewport dim shield (`rgba(20,12,36,.42)`) that swallows the pointer, `user-select:none!important` on `html *` while dragging, selection cleared on move, plus `pointercancel`/`blur` recovery so an interrupted drag can't leave the page dimmed. **Verified on WebKit + Chromium:** 0 chars selected across a full-page drag, shield `rgba(20,12,36,0.42)`, `user-select:none` applied, nothing leaks after release. Also fixed: `setPointerCapture` now fires on `pointerdown`, not after the 6px threshold — a fast flick off the mascot used to abort the drag entirely. **Needs:** deploy. |
| **B3** | Mascot peek overshoots, back seam visible | ✅ | `EDGE_PEEK 4 → 20` (20px stays off-screen, only paws clear the edge). Bounce overshoot softened `scale 1.2 → 1.08`, rotate `6° → 4°`. **Needs:** deploy + eyeball. |
| **B4** | YouTube Doom Scroll can't advance | ✅ | All `a#thumbnail` variants return **0** — YouTube moved to lockup components. Verified replacement `a.ytLockupViewModelContentImage[href*="watch?v="]` (26) / `yt-lockup-view-model a[href*="watch?v="]` (52). Also dead: `a#video-title`, `#video-title`. **Fixed + verified live:** resolves `/watch?v=aCZBCNNzjDA` from 52 candidates. |
| **B5** | Home-feed selectors unverified | ⬜ | Headless hit a signed-out state (0 video links). Run the diagnostic via Playwright **persistent context on the real Chrome profile** (Chrome must be closed, or copy the profile dir). |
| **A1** | Flavor memory store | ✅ | `memory/youtube.com.md` written from verified data (element table + match counts, DEAD list, `--yt-spec-*` hooks, Trusted Types / `#columns` / fullscreen / SPA rules). `memory/index.json` written and live (200). Also mirrored to `/opt/flavors/memory` on T430 for the API. |
| **A2** | AI flavor generation (GLM 5.3) | ✅ | `z-ai/glm-5.3` on OpenRouter ($0.91/M in, $2.86/M out, 1.3M ctx). **Key must stay server-side** — `flavors.js` is world-readable. `worker/index.js` + `wrangler.toml` written. **End-to-end verified on live YouTube:** generated `Focus Mode YouTube`, no banned sinks, no DEAD selectors, applies + toggles off clean, video stays visible, no page errors. **$0.0035/generation.** ⚠️ GLM 5.3 is a reasoning model — at `max_tokens:4000` it burned all 4000 on reasoning and returned `content:null`; fixed with `reasoning:{effort:'low'}` (`enabled:false` 400s) + `max_tokens:12000`. **LIVE** on T430:9800 via path-based tunnel ingress (Worker abandoned — wrangler auth expired and the box is simpler). Verified from a real YouTube page: generate → apply → `#secondary` hidden, video intact → toggle → restored. |
| **A3** | Domain gating | ✅ | Gated in BOTH places: client hides the prompt box, Worker returns 404 `needsRequest` without memory. Verified — an unknown domain falls through to the request flow, not generation. |
| **A4** | Generated flavor → toggle | ✅ | Reuse the existing custom-flavor store (`prefs.customFlavors`, `runCustomFlavor`, `buildCustomToggleRow`); add `generated`, `domain`, `messages[]`. |
| **A5** | Click flavor → chat to refine | ✅ | `renderChatView()` — per-flavor history, current code sent back so the model edits rather than restarts. Generated flavors show `✨` and a dotted underline; click the name to chat. |
| **A6** | Element picker in chat | ✅ | Mark-all dashed outline over every element, hot-highlight on hover, click to add a chip. Selector built id-first then class/nth-of-type, with a live match count. Available in both the create and chat views. Smoke-tested on WebKit + Chromium. |
| **A7** | Record mode | 🟡 | Records the click path (observe-only, never swallows the real click), highlights everything while armed, attaches the ordered steps to the generation prompt. **Not yet done:** suggesting actions to the user. |

## Architecture facts (verified)

- `flavors.waleeds.world` = **push-to-deploy**: deployed bytes == `HEAD` commit, built from
  `github.com/Majboor/bookmarklet-flavors` via Cloudflare. Nothing needs to run locally; the
  cloudflared tunnel on this Mac (PID 4740) is unrelated.
- `serve.py` on :8899 is local preview only, not the origin.
- Custom flavors already persist in `localStorage` and run via `new Function(cf.code)` — the
  generated-flavor store is an extension of this, not a new mechanism.

| **B6** | Anime theme hid thumbnails | ✅ | My own B4 regression: `.ytThumbnailViewModelImage` got added to a rule with `display:block!important;overflow:hidden`, which collapsed YouTube's inner image box and clipped the image away. Reverted — the outer component tags already match. **Verified live:** 13 visible thumbnails theme-off and theme-on, box 248x139 → 248x145 (exactly the 3px border). |
| **A8** | jev suggestions | 🟡 | Client sends region *evidence* (geometry, headings, aria, text sample) — never a scraped class name, because those are obfuscated (`mwoq`, `ytLockupViewModelHost`). jev classifies each region into a fixed vocabulary and answers "would hiding this help?"; **our** thresholds decide whether to speak at all. Verified live: YouTube → comments 0.99 / recommendations 0.97; Wikipedia → caught the fundraising banner as `promo` 0.97 and refused to touch the article body; HN → 0 regions, stays silent. Restraint: 9s delay, once per page, 6h mute per domain on dismiss, 30min on ignore, auto-hides after 14s, never opens the panel by itself. **LIVE.** Verified from a real YouTube page: *"Quite busy in here while you're watching a video. Want me to hide the recommendations?"* Bubble UI verified on WebKit + Chromium — anchored to the mascot, correct plural agreement, dismiss removes and mutes. |

| **B7** | CORS preflight 520 | ✅ | `do_OPTIONS` returned `204` **with a body** (`Content-Length: 2`). Cloudflare rejects that as malformed with a 520, failing the preflight, which the page reports only as "Failed to fetch". Now `204` + `Content-Length: 0`. All three endpoints preflight 204. |
| **B8** | Unhelpful generator errors | ✅ | A 404 HTML page parsed as JSON surfaced as Safari's "The string did not match the expected pattern". Client now reads as text, detects a 404, and says the API isn't deployed. |

| **A9** | Memory for more platforms | 🟡 | **Verified + shipped:** `news.ycombinator.com` (14 elements), `stackoverflow.com` (20), `github.com` (11, README unverified). HN flavor generated and verified live: dark bg, titles 13.3→20px, all 30 stories intact, clean toggle-off. **Blocked:** `x.com` and `linkedin.com` need a logged-in session — see below. |
| **A10** | x.com / linkedin.com memory | ⬜ | Signed out, **x.com returns a blank document headless** and renders only intermittently in headed Chrome — every `data-testid` measured 0 on the run I scored, though an earlier run saw `role=article` ×9. LinkedIn redirects `/feed/` to a login wall and serves guest markup with obfuscated hash classes (`e5616576`) on public pages. Both serve a *different app* to guests, so guest selectors would be confidently wrong for the logged-in UI you actually use. Needs Chrome quit so Playwright can use the real profile directly. |

## What the hanzi-browse repo actually contained

Searched all **412 files**, not just the skills. Total selector haul: **one** —
`[data-testid="tweetTextarea_0"]` in the x.com entry of `server/dist/agent/domain-skills.json`.
The 21 domain entries there are behavioural guidance ("click the post title", "comments are
nested", "Draft.js ignores programmatic input"), which is useful for knowing *what* to look for
but cannot seed a memory file. It did confirm that **X's durable handle is `data-testid`**.
