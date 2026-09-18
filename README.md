# Bookmarklet Flavors

A single bookmarklet ("Flavors ✨") that drops a small draggable mascot on
the page. Click it to open a panel listing every "flavor" (site
reskin/feature set) available for the site you're on — each independently
toggleable, searchable, and extensible with your own custom scripts.

## What's here

- `flavors.js` — the source of truth, a single `function flavorHub(){...}`.
  This is what gets wrapped into the actual bookmarklet
  (`javascript:(` + `flavorHub.toString()` + `)();`).
- `bookmarklet-flavors.html` — the install page: drag-to-bookmark UI, a
  live preview, and a manual fallback code box.

## Currently built in

**fancy_yt** (youtube.com):
- 🌸 Anime Purple theme — purple/pink reskin, rounded glowing thumbnails,
  bubbly title font
- 💀 Doom Scroll — takes over the real YouTube player, hides the chrome,
  full-screen, scroll for the next video. Works from anywhere on
  youtube.com, not just once a video is already open.

## Panel features

- 🔍 Search — filters every row (built-in + custom) by label
- ✅ Toggle — every capability is a simple on/off switch
- ➕ Add — paste your own self-toggling JavaScript snippet, give it a name
  and (optionally) a site filter, and it's saved forever
- 📤 Export / 📥 Import — share your custom flavors as JSON

## Mascot

An original hand-drawn pixel-art character (not affiliated with or copied
from any existing product). Peeks from whichever screen edge it's dragged
near, rotating so its paws always grip the edge it's snapped to; drop it
in the open middle of the page and it just stays there, fully visible.
