# The attic

Files this app no longer loads. They are kept because they are the history of how
it got here, and they are out of `assets/` because a stranger reading this
repository could not tell the live app from the dead one, and neither could a
coding agent. Three of the four below look exactly like the real thing.

Nothing here is shipped, precached, imported or served.

| file | what it was | what replaced it |
|---|---|---|
| `gratus.js` | the whole v5 app, 31 KB | `assets/js/galaxy.js`, in the v7 rewrite |
| `gratus.css` | its stylesheet, 10 KB | `assets/css/galaxy.css` |
| `api.js` | its only network layer | live code calls `fetch('/api/...')` directly |
| `v5-review-fixes.py` | a one-shot patcher, 29 KB | nothing. It edits five files that do not exist and would throw on its first read. |

Moved here on 2026-09-19, in v23.
