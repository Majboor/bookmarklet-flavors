# Flavor memory — stackoverflow.com

> Machine-readable memory for the flavor generator. Everything under **Verified elements** was
> confirmed by running `document.querySelectorAll(s).length` against the live site.
> **Never invent a selector.** If it is not in this file, it is not known to exist.

```yaml
domain: stackoverflow.com
match: /(^|\.)stackoverflow\.com$/
last_verified: 2026-09-19
verified_by: playwright + real Chrome, signed out, 1440x900
coverage: question page, signed out
```

## Verified elements — question page, signed out

| role | selector | count |
|---|---|---|
| the question post | `#question` | 1 |
| answers container | `#answers` | 1 |
| one answer | `.answer` | 25 |
| question post body wrapper | `.question` | 1 |
| rendered post markdown | `.js-post-body` | 26 |
| same content, design-system class | `.s-prose` | 26 |
| score number | `.js-vote-count` | 26 |
| the vote column | `.votecell` | 26 |
| post grid row | `.post-layout` | 26 |
| user card | `.user-details` | 53 |
| asked/answered signature block | `.post-signature` | 52 |
| a tag chip | `.post-tag` | 33 |
| one comment | `.comment` | 6 |
| comments container | `.comments` | 1 |
| right sidebar | `#sidebar` | 1 |
| a sidebar widget | `.s-sidebarwidget` | 3 |
| question title | `#question-header h1` | 1 |
| top bar | `header.s-topbar` | 1 |
| nav | `.s-navigation` | 1 |
| footer | `#footer` | 1 |

## DEAD on this page — confirmed 0 matches, never emit

```
.js-sidebar-related
.tags
```

## Notes

- `.js-post-body` and `.s-prose` select the SAME elements (26 each) - use one, not both.
- `.answer` is 25 and `.post-layout` is 26: question + answers. Scope to `#answers .answer` to exclude the question.
- `.tags` and `.js-sidebar-related` do NOT exist; use `.post-tag` and `.s-sidebarwidget`.

## Hard constraints

- ⚠️ **Only the page above is verified.** Other pages on this domain use different markup;
  selectors are page-scoped. Do not assume these hold elsewhere.
- Verified signed out. A signed-in session may render different markup.
- Never hide a container that also holds wanted content — target specific siblings.
- No `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `eval`.
  Build nodes with `createElement`/`textContent`, clear with `replaceChildren()`.
- Guard every `querySelector` result against null. Never throw.
