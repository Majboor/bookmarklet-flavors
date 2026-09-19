# Flavor memory — youtube.com

> Machine-readable memory for the flavor generator. Everything in **Verified elements** was
> confirmed by running `document.querySelectorAll(s).length` against the live site.
> **Never invent a selector.** If it is not in this file, it is not known to exist.

```yaml
domain: youtube.com
match: /(^|\.)youtube\.com$/
last_verified: 2026-09-19
verified_by: playwright signed-out (watch, results) + user's own logged-in DevTools (home feed)
coverage: home feed (SIGNED IN) · watch page · search results — all CONFIRMED
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

The same selector can be alive on one YouTube page and dead on another. All three pages
verified 2026-09-19 (home feed verified **signed in**, which is the only way it renders):

| selector | home feed | watch | search results |
|---|---|---|---|
| `ytd-rich-item-renderer` | **37 OK** | 0 | 0 |
| `yt-lockup-view-model` | **27 OK** | 52 OK | 2 |
| `a.ytLockupViewModelContentImage[href*="watch?v="]` | **25 OK** | **26 OK** | 0 |
| `h3.ytLockupMetadataViewModelHeadingReset` | **25 OK** | **26 OK** | 0 |
| `a.ytLockupMetadataViewModelTitle` | **25 OK** | 26 OK | 0 |
| `yt-thumbnail-view-model` | **37 OK** | **26 OK** | **22 OK** |
| `div.ytThumbnailViewModelImage` | **37 OK** | 26 OK | **22 OK** |
| `yt-chip-cloud-chip-renderer` | **21 OK** | 0 | **6 OK** |
| `a#video-title` | **0 DEAD** | **0 DEAD** | **23 OK** |
| `ytd-video-renderer` | 0 | 0 | **23 OK** |
| `a#thumbnail` | **2** (ads/shelves only) | 0 DEAD | 0 DEAD |
| `ytd-thumbnail` | 2 | 2 | 0 |
| `ytd-rich-grid-media` | **0 DEAD** | 0 | 0 |

### Dead on EVERY page tested — never emit

```
ytd-searchbox        #search-form         tp-yt-paper-chip
yt-chip-cloud-renderer                    ytd-shelf-renderer
ytd-reel-shelf-renderer                   ytd-rich-grid-media
#video-title (bare)  ytd-rich-grid-media #video-title
ytd-compact-autoplay-renderer a#thumbnail
ytd-watch-next-secondary-results-renderer a#thumbnail
```

⚠️ `a#thumbnail` is **not** dead everywhere: it is 0 on watch and search results but **2 on the
home feed** (ad / shelf lockups). Do not use it as a general feed handle — use
`a.ytLockupViewModelContentImage` — but do not assume it matches nothing either.

### Home feed (`youtube.com/`) — verified SIGNED IN, 53 video links

| role | selector | count |
|---|---|---|
| feed grid item | `ytd-rich-item-renderer` | 37 |
| feed grid container | `ytd-rich-grid-renderer` | 1 |
| feed section row | `ytd-rich-section-renderer` | 3 |
| video lockup | `yt-lockup-view-model` | 27 |
| lockup thumb link | `a.ytLockupViewModelContentImage[href*="watch?v="]` | 25 |
| lockup title | `h3.ytLockupMetadataViewModelHeadingReset` | 25 |
| lockup title link | `a.ytLockupMetadataViewModelTitle` | 25 |
| thumbnail | `yt-thumbnail-view-model` | 37 |
| thumbnail image box | `div.ytThumbnailViewModelImage` | 37 |
| channel link | `yt-lockup-metadata-view-model a[href^="/@"]` | 23 |
| filter chip | `yt-chip-cloud-chip-renderer` | 21 |
| chip bar | `ytd-feed-filter-chip-bar-renderer` / `#chips-wrapper` | 1 / 1 |
| **Shorts tile** | `ytm-shorts-lockup-view-model` | 10 |
| sidebar (expanded) | `ytd-guide-renderer` / `#guide` / `#guide-content` | 1 |
| sidebar entry | `ytd-guide-entry-renderer` | 29 |
| sidebar (collapsed) | `ytd-mini-guide-renderer` / `ytd-mini-guide-entry-renderer` | 1 / 4 |
| masthead | `ytd-masthead` / `#masthead-container` | 1 |
| masthead centre (search) | `#center` | 1 |
| logo | `#logo-icon` | 4 |
| page body | `ytd-browse` / `ytd-two-column-browse-results-renderer` | 1 |
| generic contents | `#contents` | 4 |

**Hiding Shorts:** `ytm-shorts-lockup-view-model` (10) is the tile; its row is a
`ytd-rich-section-renderer` (3 on the page) — hide the section to remove the whole shelf,
the tile alone leaves an empty row.

**Ads:** ad lockups carry `ad-button-view-model` / `lockup-attachments-view-model`
(`.ytLockupAttachmentsViewModelHost`) inside a normal `div.ytLockupViewModelHost` — that is
what the 2 stray `a#thumbnail` matches belong to.

**The search box is NOT `ytd-searchbox`** — that returns 0 even signed in. Use `#center`
inside `ytd-masthead`.

### Search results page (`/results?search_query=…`) — verified signed out

| role | selector | count |
|---|---|---|
| result item | `ytd-video-renderer` | 23 |
| result title | `a#video-title` | 23 |
| thumbnail | `yt-thumbnail-view-model` / `div.ytThumbnailViewModelImage` | 22 |
| filter chips | `yt-chip-cloud-chip-renderer` | 6 |

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

- **Trusted Types.** YouTube sends `require-trusted-types-for 'script'`. These all THROW here:
  `el.innerHTML = ...`, `outerHTML`, `insertAdjacentHTML`, `document.write`,
  `script.src = "<string>"`, **`eval(...)` and `new Function(...)`**.
  (`new Function` is what broke the first generated flavor at runtime:
  *"Refused to evaluate a string as JavaScript because this document requires a
  'Trusted Type' assignment"*.) Use `element.replaceChildren()` to clear and a
  `<style>`/`<script>` element's **`.textContent`** to inject — that is not gated.
- **Don't force `display`** on an element you are only restyling. Forcing `display:block`
  on a flex/aspect-ratio box collapses its height, and with `overflow:hidden` the content is
  clipped away — this is what made every thumbnail vanish once.
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

