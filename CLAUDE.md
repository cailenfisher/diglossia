# CLAUDE.md — diglossia

## What this is

diglossia is a synchronous, in-memory i18n dictionary store. It is not fully framework-agnostic:
the store (`store.svelte.ts`) uses Svelte 5 runes (`$state`) for reactivity, so `svelte` is a
peer dependency. Only the exported *types* (`Locale`, `LocalText`, `LocalTextLink`, `Dictionary`,
`DictionaryPayload`) are framework-independent.

It exists to be the single place that resolves translated strings by key — nothing more. It does
not fetch content, does not know about your database or your routing, and does not decide which
locale a visitor should see. All of that is the consuming app's job.

## The absolute rule: no I/O, ever

This package contains no database calls, no `fetch`, no async of any kind — full stop. Every
exported function is synchronous. If a change requires awaiting something inside this package,
that's a sign the change belongs in the consuming app instead, not here.

The app fetches translated rows from wherever they live, shapes them into a `DictionaryPayload`,
and calls `load()` or `merge()`. diglossia only ever reads from its own in-memory `Map`.

## API surface

- `load(payload, userLocaleCode, fallbackLocaleCode)` — replaces the entire dictionary.
- `merge(payload, userLocaleCode, fallbackLocaleCode)` — adds/overwrites keys without clearing
  the rest (for lazy-loading scoped copy on navigation).
- `localText(slug, scope?, entityId?)` — synchronous lookup. Returns the visible sentinel
  `[missing: <key>]` and logs a `console.error` on a miss. Never throws.
- `<LocalText slug scope? entityId? />` — thin Svelte wrapper around `localText`.

### Key convention

`buildKey(slug, scope?, entityId?)` in `store.svelte.ts` is the only place a lookup key is built.
Never reconstruct a key by hand elsewhere:

| Call                                         | Key                         |
| --------------------------------------------- | ---------------------------- |
| `localText('app.title')`                      | `app.title`                  |
| `localText('buy_label', 'product')`           | `product:buy_label`          |
| `localText('product.title', 'product', 42)`   | `product:product.title:42`   |

`scope = null`/omitted means global/application-level copy.

### Locale resolution order

Both `load` and `merge` resolve each key through the same priority, implemented in `flatten()`:

1. `userLocaleCode` — used silently.
2. `fallbackLocaleCode` — used with a `console.warn`.
3. First available locale in the payload — used with a `console.error`.

Preserve this order and its logging semantics in any change to `flatten()` — consuming apps rely
on the warn/error split to detect missing translations in production logs.

## Conventions

- Svelte 5 runes only. No `export let`, no Svelte 4 reactivity.
- TypeScript `strict`. No non-null assertions (`!`) — narrow instead.
- No abbreviations in naming (`entityId`, not `eid`).
- Tests live in `src/__tests__/` and run via `vitest run`. Add a test alongside any change to
  `store.svelte.ts`'s resolution logic — it's the whole surface area of this package.

## Publishing

Versioned and published via [Changesets](https://github.com/changesets/changesets). Run
`pnpm changeset` to record a change; `.github/workflows/release.yml` opens the version PR and
publishes to npm on merge to `main`.

## Origin

Extracted from [SvelteBuilder](https://github.com/cailenfisher/SvelteBuilder), where this lived
as `@sveltebuilder/hermes`. SvelteBuilder now depends on this package externally instead of as a
workspace package. The API is unchanged from that origin — only the package name and internal
log prefixes changed.
