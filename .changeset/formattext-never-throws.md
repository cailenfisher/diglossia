---
'diglossia': patch
---

`formatText` no longer throws when an entry's content fails to compile as MF2 (for example `Use {braces`) or its locale code is invalid (for example `en_US`). The error is logged once per key and the raw content is rendered, so a single malformed row can't take down a page. Previously the failure wasn't cached, so it re-threw on every render.
