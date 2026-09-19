# Flavor memory — youtube.com

> Machine-readable memory for the flavor generator. Everything in **Verified elements** was
> confirmed by running `document.querySelectorAll(s).length` against the live site.
> **Never invent a selector.** If it is not in this file, it is not known to exist.

```yaml
domain: youtube.com
match: /(^|\.)youtube\.com$/
last_verified: 2026-09-19
verified_by: playwright, signed-out, 1440x900, watch + search-results pages
coverage: watch page CONFIRMED · search results CONFIRMED · home feed UNVERIFIED (empty when signed out, even in headed Chrome)
existing_flavor: fancy_yt
```

## Verified elements (watch page, live)

| role | selector | count | notes |
|---|---|---|---|
| player | `#movie_player` | 1 | the site's own player; call `.requestFullscreen()` on this |
| video tag | `video.html5-main-video` | 1 | real pixel size = ground truth for fullscreen checks |
| sidebar | `#secondary` | 1 | related videos column |
| below-player | `#below` | 1 | |
| comments | `#comments` / `ytd-comments` | 1 | |
| **next-video link** | `a.ytLockupViewModelContentImage[href*="watch?v="]` | 26 | **use this to advance** |
| next-video (broad) | `yt-lockup-view-model a[href*="watch?v="]` | 52 | includes title links; dedupe by `v=` |
| related, scoped | `#secondary a.ytLockupViewModelContentImage[href*="watch?v="]` | 26 | |
| thumbnail | `yt-thumbnail-view-model` | 26 | current component |
| thumbnail inner | `div.ytThumbnailViewModelImage` | 26 | the image box; round corners here |
| thumbnail (legacy) | `ytd-thumbnail` | 2 | nearly gone, keep only as a fallback |
| lockup title | `h3.ytLockupMetadataViewModelHeadingReset` | 26 | |
| lockup title link | `a.ytLockupMetadataViewModelTitle` | 26 | |
| watch title | `ytd-watch-metadata #title` / `h1.ytd-watch-metadata` | 5 / 1 | |
| channel link | `ytd-watch-metadata #channel-name a` | 1 | also `#owner #channel-name a` |
| uploader | `ytd-video-owner-renderer a` | 2 | |
| masthead | `ytd-masthead`, `#masthead-container` | 1 | |

## ⚠️ Selectors are PAGE-SCOPED — check the page before emitting

The same selector can be alive on one YouTube page and dead on another. Verified 2026-09-19:

| selector | watch | search results | home feed |
|---|---|---|---|
| `a#video-title` | **0 DEAD** | **23 OK** | unknown |
| `ytd-video-renderer` | 0 | **23 OK** | unknown |
| `a#thumbnail[href*="watch?v="]` | **0 DEAD** | 0 DEAD | unknown |
| `a.ytLockupViewModelContentImage[href*="watch?v="]` | **26 OK** | 0 | unknown |
| `h3.ytLockupMetadataViewModelHeadingReset` | **26 OK** | 0 | unknown |
| `yt-thumbnail-view-model` | **26 OK** | **22 OK** | unknown |
| `div.ytThumbnailViewModelImage` | 26 OK | **22 OK** | unknown |
| `yt-chip-cloud-chip-renderer` | 0 | **6 OK** | unknown |
| `ytd-rich-item-renderer` / `ytd-rich-grid-media` | 0 | 0 | unknown |

### Dead everywhere tested — never emit

```
a#thumbnail[href*="watch?v="]      #video-title (bare)
#related a#thumbnail               ytd-rich-grid-media #video-title
#secondary a#thumbnail             ytd-compact-autoplay-renderer a#thumbnail
ytd-watch-next-secondary-results-renderer a#thumbnail
ytd-searchbox / #search-form       tp-yt-paper-chip
```

`a#thumbnail` is gone from every page tested. This is the current bug class in older flavors.

### Search results page (`/results?search_query=…`) — verified signed out

| role | selector | count |
|---|---|---|
| result item | `ytd-video-renderer` | 23 |
| result title | `a#video-title` | 23 |
| thumbnail | `yt-thumbnail-view-model` / `div.ytThumbnailViewModelImage` | 22 |
| filter chips | `yt-chip-cloud-chip-renderer` | 6 |

### ⚠️ Home feed — still UNVERIFIED, and not lazily

`youtube.com` signed out returns **0 video links even in real headed Chrome** (the guide,
masthead and logo render; the feed does not). This is not headless detection and not a consent
wall — signed-out users in this region simply get no feed. Auditing it needs a logged-in
session. Do not emit home-feed-only selectors (`ytd-rich-item-renderer`, `ytd-rich-grid-media`,
`ytd-mini-guide-entry-renderer`, `yt-lockup-metadata-view-model a[href^="/@"]`) until confirmed.

## Theming hooks that survive component churn

YouTube's CSS custom properties pierce through regardless of which component version is live —
**prefer these over element selectors for colour work**, they are far more durable:

```
--yt-spec-base-background      --yt-spec-raised-background
--yt-spec-general-background-a --yt-spec-general-background-b
--yt-spec-text-primary         --yt-spec-text-secondary
--yt-spec-brand-background-solid --yt-spec-call-to-action
--yt-spec-icon-active-other
```
Set on `html,ytd-app`. This is why the masthead gradient kept working while the rest broke.

## Hard constraints (violating these breaks the page)

- **Trusted Types.** YouTube sends `require-trusted-types-for 'script'`. `el.innerHTML = ...`
  and `script.src = "<string>"` THROW. Use `element.replaceChildren()` to clear, and
  `script.textContent` to inject. Emit no `innerHTML` in generated code.
- **Never hide `#columns`.** It contains both `#secondary` AND the player. Hiding it hides the
  video. Target the specific siblings: `#secondary`, `#comments`, `#below`.
- **No CSS fake-fullscreen.** Forcing `position:fixed;width:100vw;height:100vh` on the player
  container does NOT resize the internal `<video>`; the site's own resize observer owns that.
  Call `document.querySelector('#movie_player').requestFullscreen()` instead.
- **SPA navigation.** YouTube does not reload between videos. Anything stateful must re-apply on
  `yt-navigate-finish` (and survive `next()`), not just on first run.
- **Verify before shipping.** Headless signed-out DOM ≠ the user's logged-in DOM (different
  experiment cohort, populated vs empty feed). A headless pass is necessary, not sufficient.

## Capabilities already built (`fancy_yt`)

- **Anime Purple theme** — custom-property reskin + rounded glowing thumbnails + Baloo 2 titles.
  Status: working, because its CSS lists the new lockup selectors alongside the dead legacy ones.
- **Doom Scroll** — takes over the real player, hides chrome, scroll/wheel/touch/arrow to advance.
  Status: **BROKEN** — next-video lookup uses `a#thumbnail`, now 0 matches. Fix by swapping to
  `a.ytLockupViewModelContentImage[href*="watch?v="]`.

