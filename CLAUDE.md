# CLAUDE.md — diglossia

## What this is

diglossia is a synchronous, in-memory i18n dictionary. It resolves application chrome and
database-backed entity content through the same lookup — see the README for the problem this
solves and why file-based i18n libraries don't.

It exists to be the single place that resolves translated strings by key — nothing more. It does
not fetch content, does not know about your database or your routing, and does not decide which
locale a visitor should see, or which locale wins when the same key has rows in more than one
language. All of that is the consuming app's job; the payload passed to `createDictionary` must
already be resolved to one row per key.

## Core / Svelte split

```
src/lib/
  core/            framework-agnostic — no Svelte import anywhere in this subtree, enforced by
                   an eslint no-restricted-imports rule scoped to src/lib/core/**/*.ts
    build-key.ts   the only place a lookup key is built — never reconstruct one by hand
    dictionary.ts  createDictionary, DictionaryInstance
    types.ts
    index.ts
  svelte/          the Svelte adapter — requires runes, hence the .svelte.ts naming
    context.svelte.ts   setDictionary, getDictionary — a version-counter wrapper around a
                         DictionaryInstance (see the comment above `makeReactive` for why this
                         approach was chosen over giving the core instance a reactive map)
    LocalText.svelte
    index.ts
  index.ts         re-exports core only
```

`package.json` exports two entry points: `.` (core, `dist/index.js`) and `./svelte`
(`dist/svelte/index.js`). `svelte` is a peer dependency marked optional via
`peerDependenciesMeta` — only `diglossia/svelte` needs it.

## The absolute rule: no I/O, ever

This package contains no database calls, no `fetch`, no async of any kind — full stop. Every
exported function is synchronous. If a change requires awaiting something inside this package,
that's a sign the change belongs in the consuming app instead, not here.

The app fetches translated rows from wherever they live, resolves locale priority itself
(typically in SQL — see below), shapes the result into a `DictionaryPayload`, and calls
`createDictionary()` or an instance's `merge()`. diglossia only ever reads from its own in-memory
`Map`.

## API surface

- `createDictionary(payload, options?)` — builds a `DictionaryInstance`. Safe to call outside any
  component, including on the server; holds no framework state.
- `DictionaryInstance.localText(slug, scope?, entityId?)` — raw synchronous lookup. Returns the
  visible sentinel `[missing: <key>]` (or `options.onMissing`'s replacement) on a miss. Never
  throws. Logs a missing-key error once per key per instance lifetime, not once per read.
- `DictionaryInstance.localeOf(slug, scope?, entityId?)` — the locale code the resolved entry came
  from, or `undefined` if missing.
- `DictionaryInstance.formatText(slug, values?, scope?, entityId?)` — MF2 interpolation and
  pluralization via the `messageformat` package. Parses lazily per key and caches the compiled
  message; a plain string with no MF2 markers (no `{`) passes through unparsed.
- `DictionaryInstance.merge(payload)` — adds/overwrites keys without clearing the rest.
- `setDictionary(instance)` / `getDictionary()` (from `diglossia/svelte`) — context plumbing.
  `getDictionary()` throws a clear error naming `setDictionary` if nothing was set.
- `<LocalText slug scope? entityId? />` (from `diglossia/svelte`) — thin wrapper around
  `getDictionary().localText(...)`. No wrapping element — stays valid inside
  `<svelte:head><title>`, `<option>`, and attribute contexts. Escapes its output; does not render
  HTML. Do not add `lang`/`dir` emission here — that's each consuming component's job via
  `localeOf()`, since this component has no owned element to put the attribute on.

### Key convention

`buildKey(slug, scope?, entityId?)` in `core/build-key.ts` is the only place a lookup key is
built. Never reconstruct a key by hand elsewhere:

| Call                                          | Key                         |
| --------------------------------------------- | ---------------------------- |
| `localText('app.title')`                      | `app.title`                  |
| `localText('buy_label', 'product')`           | `product:buy_label`          |
| `localText('product.title', 'product', 42)`   | `product:product.title:42`   |

`scope = null`/omitted means global/application-level copy. `scope` must be a non-empty string or
`null`/`undefined` — `buildKey` throws a `TypeError` on an empty string, and throws when an
`entityId` is given without a scope (it would otherwise silently collapse into the global
namespace and collide with unrelated keys).

### No locale resolution here

diglossia used to accept `userLocaleCode`/`fallbackLocaleCode` and pick a locale per key inside
`flatten()`. That logic is gone entirely — `createDictionary` is a pure flattener now. If a
payload has more than one entry for a key, the last one wins; nothing else is inferred. Do not
reintroduce locale-priority logic here even if a consumer asks for it — that decision belongs in
the SQL query that builds the payload.

## Conventions

- Svelte 5 runes only, and only inside `src/lib/svelte/`. No `export let`, no Svelte 4 reactivity.
- TypeScript `strict`. No non-null assertions (`!`) — narrow instead.
- No abbreviations in naming (`entityId`, not `eid`).
- Tests live in `src/__tests__/` and run via `vitest run`: `build-key.test.ts`,
  `dictionary.test.ts`, `format-text.test.ts`. Add a test alongside any change to
  `core/dictionary.ts` or `core/build-key.ts` — together they're the whole surface area of this
  package.
- Test against instances (`createDictionary(...)`), never a shared/module-level dictionary — there
  isn't one. A test asserting two instances stay isolated from each other exists specifically to
  guard against ever reintroducing a singleton.

## Publishing

Versioned and published via [Changesets](https://github.com/changesets/changesets). Run
`pnpm changeset` to record a change; `.github/workflows/release.yml` opens the version PR and
publishes to npm on merge to `main`.

## Origin

Extracted from [SvelteBuilder](https://github.com/cailenfisher/SvelteBuilder), where this lived
as `@sveltebuilder/hermes`. SvelteBuilder now depends on this package externally instead of as a
workspace package.
