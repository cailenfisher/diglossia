# diglossia

File-based i18n libraries resolve application chrome — nav labels, button text, page titles —
from JSON or YAML files at build time. That works until copy starts living in database rows: a
product headline, a section label, an article dek. In a static-site architecture that gap gets
treated as a file-naming problem for the site generator; in a normal server-rendered app it
usually has no answer at all. diglossia resolves application chrome and database-backed entity
content through a single lookup, because when your copy lives in rows and the locale is a
query-time decision, both halves need one resolution layer. That is diglossia.

## Install

```sh
npm install diglossia
```

The core (`diglossia`) is framework-agnostic — no Svelte required, safe to call on the server or
in a plain script. The Svelte adapter — context helpers and a `<LocalText />` component — ships
separately at `diglossia/svelte` and requires Svelte 5.

## The core / svelte split

- `diglossia` — `createDictionary()`, the `DictionaryInstance` interface, and every type. No
  Svelte import anywhere in this subtree.
- `diglossia/svelte` — `setDictionary()`, `getDictionary()`, and `<LocalText />`. Thin context
  plumbing on top of a `DictionaryInstance`.

## Usage

Build a dictionary from an already-resolved payload — one row per key, already picked for the
active locale (see [Locale resolution lives in SQL](#locale-resolution-lives-in-sql) below) — and
put it in context once, near the root of the component tree:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { createDictionary } from 'diglossia';
  import { setDictionary } from 'diglossia/svelte';

  let { data, children } = $props();

  setDictionary(createDictionary(data.dictionary));
</script>

{@render children()}
```

Read values from context with `getDictionary()`, or render them with `<LocalText />`:

```svelte
<script lang="ts">
  import { getDictionary } from 'diglossia/svelte';

  const dictionary = getDictionary();
</script>

<h1>{dictionary.localText('app.title')}</h1>
```

```svelte
<script lang="ts">
  import { LocalText } from 'diglossia/svelte';
</script>

<LocalText slug="buy_label" scope="product" entityId={product.id} />
```

Outside a component — a `+page.server.ts` load function, an RSS feed, a sitemap, a structured-data
helper — build a dictionary directly, with no Svelte context involved:

```ts
import { createDictionary } from 'diglossia';

const dictionary = createDictionary(payload);
const headline = dictionary.localText('headline', 'article', article.id);
```

### Key convention

`localText(slug, scope?, entityId?)` resolves a dictionary key built from those three parts:

| Call                                                   | Key                         |
| ------------------------------------------------------- | ---------------------------- |
| `dictionary.localText('app.title')`                    | `app.title`                 |
| `dictionary.localText('buy_label', 'product')`         | `product:buy_label`         |
| `dictionary.localText('product.title', 'product', 42)` | `product:product.title:42`  |

`scope` is omitted (or `null`) for global/application-level copy, and set to the owning entity's
table/model name for entity-bound copy. `scope` must be a non-empty string, or `null`/`undefined`
for global — an empty string throws, because it would otherwise collide with the global
namespace's key shape. Passing an `entityId` with no `scope` throws for the same reason: without a
scope the entity ID collapses into the global namespace and collides with unrelated keys.

### Locale resolution lives in SQL

Earlier versions of diglossia accepted `userLocaleCode`/`fallbackLocaleCode` and resolved locale
priority in JavaScript. That logic is gone. `createDictionary` now trusts its payload to already
carry one row per key — the query that builds the payload picks the right locale (user locale,
falling back to a default) before the data ever reaches diglossia. If a payload does contain more
than one entry for a key, the last one in the array wins; nothing else is inferred.

`localeOf(slug, scope?, entityId?)` returns the locale code the resolved entry actually came from,
so a component can tell when it's rendering fallback-locale content rather than the visitor's own
locale.

### Missing keys

By default, a missing key returns the sentinel `[missing: <key>]` and logs an error to the
console — once per key per dictionary instance, not once per read, so a 50-row table with one
missing translation logs once, not fifty times.

Pass `onMissing` to customize the behavior:

```ts
const dictionary = createDictionary(payload, {
  onMissing: ({ key, slug, scope, entityId }) =>
    scope === null ? undefined : `[${slug}]`, // patch entity copy only; let chrome show the sentinel
});
```

Returning a string replaces the sentinel; returning `undefined` falls through to it. The console
error still fires (deduplicated) either way — `onMissing` controls what's rendered, not whether
the miss is logged.

### Interpolation and pluralization

`localText()` is a raw map read with no parsing, so the entity-copy path — the one called once per
row in a list — stays O(1). For copy that needs variables or plural forms, use `formatText()`
instead:

```ts
dictionary.formatText('cart.count', { count: itemCount }, 'cart');
```

`formatText` parses [Unicode MessageFormat 2](https://unicode.org/reports/tr35/tr35-messageFormat.html)
lazily, the first time a given key is read, and caches the compiled message per key. A plain
string with no MF2 markers is returned as-is, with no parsing cost. MF2 source lives in the same
`content` column as any other entry — there is no separate schema for it:

```
.input {$count :number}
.match $count
one {{You have {$count} item.}}
*   {{You have {$count} items.}}
```

### The rich-text boundary

diglossia holds short strings — labels, headlines, dek, button text. Rich body content belongs in
a structured content table in your application, never in the dictionary. `<LocalText />` escapes
its output and will not render HTML.

### SSR

`createDictionary` must be called in the component's `<script>` body, not inside `$effect`. Svelte
5 effects don't run during server-side rendering, so a dictionary built inside one is simply never
populated on the server, and every server-rendered page falls back to `[missing: …]` sentinels. A
module-level dictionary has the opposite problem: state shared across concurrent server requests
leaks one visitor's locale into another's response. `createDictionary` returns a fresh,
request-scoped instance every time it's called — call it once per render, in the script body:

```svelte
<script lang="ts">
  import { createDictionary } from 'diglossia';
  import { setDictionary } from 'diglossia/svelte';

  let { data, children } = $props();

  setDictionary(createDictionary(data.dictionary)); // not inside $effect
</script>
```

## API

### `diglossia`

- `createDictionary(payload, options?)` — builds a `DictionaryInstance` from a resolved payload.
- `DictionaryInstance`
  - `localText(slug, scope?, entityId?)` — raw string lookup.
  - `localeOf(slug, scope?, entityId?)` — the locale code the resolved entry came from.
  - `formatText(slug, values?, scope?, entityId?)` — MF2 interpolation/pluralization.
  - `merge(payload)` — adds/overwrites keys without clearing the rest.
- `DictionaryOptions.onMissing?: (info: MissingKeyInfo) => string | undefined`

### `diglossia/svelte`

- `setDictionary(instance)` — puts a `DictionaryInstance` in context. Call once, in the root
  layout's `<script>` body.
- `getDictionary()` — reads the instance from context. Throws a clear, actionable error naming
  `setDictionary` if none was set.
- `<LocalText slug scope? entityId? />` — a bare text expression with no wrapping element, so it
  stays valid inside `<svelte:head><title>`, `<option>`, and attribute contexts.

### Types

`Locale`, `LocalText` (the data-record type — the Svelte component of the same name lives at
`diglossia/svelte`, in a separate module, so the two never collide), `LocalTextLink`, `Dictionary`,
`DictionaryEntry`, `DictionaryPayload`, `MissingKeyInfo`.

## Origin

diglossia was extracted from [SvelteBuilder](https://github.com/cailenfisher/SvelteBuilder), where
it was built as `@sveltebuilder/hermes`. SvelteBuilder is its first consumer, depending on it as an
ordinary external package rather than a workspace package.
