---
"diglossia": patch
---

Fix relative imports in the published package that used explicit `.ts` extensions (`./core/index.ts`, `./context.svelte.ts`, etc). `svelte-package` doesn't rewrite these during compilation, so the shipped `dist/*.js` files pointed at source paths that don't exist in the published `dist/`, breaking module resolution for any real consumer (e.g. `Could not resolve "./core/index.ts"` from Vite/Rollup). All relative imports now use `.js`.
