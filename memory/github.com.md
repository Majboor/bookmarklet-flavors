# Flavor memory — github.com

> Machine-readable memory for the flavor generator. Everything under **Verified elements** was
> confirmed by running `document.querySelectorAll(s).length` against the live site.
> **Never invent a selector.** If it is not in this file, it is not known to exist.

```yaml
domain: github.com
match: /(^|\.)github\.com$/
last_verified: 2026-09-19
verified_by: playwright + real Chrome, signed out, 1440x900
coverage: repository page, signed out
```

## Verified elements — repository page, signed out

| role | selector | count |
|---|---|---|
| repo header block | `#repository-container-header` | 1 |
| repo tab nav (Code/Issues/PRs) | `nav[aria-label='Repository']` | 1 |
| the file listing table | `table[aria-labelledby='folders-and-files']` | 1 |
| main content frame | `#repo-content-turbo-frame` | 1 |
| latest commit bar | `[data-testid='latest-commit']` | 1 |
| file name cell | `.react-directory-filename-column` | 82 |
| per-file commit message | `.react-directory-commit-message` | 41 |
| per-file timestamp | `.react-directory-commit-age` | 41 |
| avatar image | `[data-testid='github-avatar']` | 15 |
| the little count badges | `.Counter` | 7 |
| timestamp element | `relative-time` | 43 |

## DEAD on this page — confirmed 0 matches, never emit

```
header.AppHeader
div.AppHeader-globalBar
.Layout-sidebar
.BorderGrid--spacious
#repo-title-component
.markdown-body
article.markdown-body
#readme
.file-navigation
```

## Notes

- The file browser is React-rendered: `.react-directory-*` classes are the current handles.
- `header.AppHeader`, `.Layout-sidebar`, `.BorderGrid--spacious`, `#repo-title-component` and `.file-navigation` returned **0** - do not use them.
- `.markdown-body` / `#readme` returned 0 on the load I measured; the README renders inside a turbo-frame that may not have arrived. **Treat README selectors as unverified.**

## Hard constraints

- ⚠️ **Only the page above is verified.** Other pages on this domain use different markup;
  selectors are page-scoped. Do not assume these hold elsewhere.
- Verified signed out. A signed-in session may render different markup.
- Never hide a container that also holds wanted content — target specific siblings.
- No `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `eval`.
  Build nodes with `createElement`/`textContent`, clear with `replaceChildren()`.
- Guard every `querySelector` result against null. Never throw.
