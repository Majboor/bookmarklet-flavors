# Flavor memory — news.ycombinator.com

> Machine-readable memory for the flavor generator. Everything under **Verified elements** was
> confirmed by running `document.querySelectorAll(s).length` against the live site.
> **Never invent a selector.** If it is not in this file, it is not known to exist.

```yaml
domain: news.ycombinator.com
match: /(^|\.)news\.ycombinator\.com$/
last_verified: 2026-09-19
verified_by: playwright + real Chrome, signed out, 1440x900
coverage: front page (/), signed out
```

## Verified elements — front page (/), signed out

| role | selector | count |
|---|---|---|
| one story row (the title line) | `tr.athing` | 30 |
| title cell | `td.title` | 61 |
| story title + domain | `.titleline` | 30 |
| the story link itself | `.titleline > a` | 30 |
| points / author / age / comments line | `.subtext` | 30 |
| points | `.score` | 30 |
| author | `.hnuser` | 30 |
| upvote triangle | `.votearrow` | 30 |
| source domain | `span.sitestr` | 30 |
| relative time | `.age` | 30 |
| the whole page table | `#hnmain` | 1 |
| same, explicit | `table#hnmain` | 1 |
| outer centering wrapper | `center > table` | 1 |
| header nav | `.pagetop` | 2 |

## DEAD on this page — confirmed 0 matches, never emit

```
#pagespace
```

## Notes

- HN is a **table layout**, not divs. Style `tr.athing` / `td.title`, and remember a story spans TWO rows: `tr.athing` then the following `.subtext` row - hiding one without the other leaves orphans.
- There are no custom elements and almost no classes; what exists is stable and has been for years.
- `#pagespace` does not exist on the front page (it appears on item pages).

## Hard constraints

- ⚠️ **Only the page above is verified.** Other pages on this domain use different markup;
  selectors are page-scoped. Do not assume these hold elsewhere.
- Verified signed out. A signed-in session may render different markup.
- Never hide a container that also holds wanted content — target specific siblings.
- No `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `eval`.
  Build nodes with `createElement`/`textContent`, clear with `replaceChildren()`.
- Guard every `querySelector` result against null. Never throw.
