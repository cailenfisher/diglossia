# diglossia

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
