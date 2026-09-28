# diglossia

## 0.1.1

### Patch Changes

- [`9f5e094`](https://github.com/cailenfisher/diglossia/commit/9f5e094043baa3f86d82b16e74b2deae996b4a3b) Thanks [@cailenfisher](https://github.com/cailenfisher)! - Fix relative imports in the published package that used explicit `.ts` extensions (`./core/index.ts`, `./context.svelte.ts`, etc). `svelte-package` doesn't rewrite these during compilation, so the shipped `dist/*.js` files pointed at source paths that don't exist in the published `dist/`, breaking module resolution for any real consumer (e.g. `Could not resolve "./core/index.ts"` from Vite/Rollup). All relative imports now use `.js`.

## 0.1.0

### Minor Changes

- [`af90a80`](https://github.com/cailenfisher/diglossia/commit/af90a80c9ebe6ee38034252fb12d141a3eec45e9) Thanks [@cailenfisher](https://github.com/cailenfisher)! - Split into a framework-agnostic core (`diglossia`) and a Svelte adapter (`diglossia/svelte`).

  - Replaced the module-level dictionary singleton (`load`/`merge`/`localText`) with per-request
    `createDictionary(payload, options?)` instances. `setDictionary`/`getDictionary` (from
    `diglossia/svelte`) put an instance in Svelte context.
  - Locale-priority resolution (`userLocaleCode`/`fallbackLocaleCode`) is removed. Payloads must now
    carry one row per key — that resolution belongs in the SQL query that builds the payload.
  - Added `onMissing` for configurable missing-key handling, with missing-key logging deduplicated
    per key per instance instead of once per read.
  - `buildKey` now throws a `TypeError` on an empty-string scope, and when an `entityId` is given
    without a scope.
  - Added `formatText(slug, values?, scope?, entityId?)` for Unicode MessageFormat 2 interpolation
    and pluralization, parsed lazily and cached per key.
  - `<LocalText />` moved to `diglossia/svelte`; its props and no-wrapper-element behavior are
    unchanged.
