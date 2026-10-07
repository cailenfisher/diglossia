# ![project logo](diglossia-mark.svg) diglossia

One lookup for interface copy and database-backed entity copy.

Message libraries are built for strings that ship with the code. Entity copy — a product name, a
headline, a section label — lives in rows. Server frameworks handle that half on their own terms
(Rails' Mobility, Vendure's translation relations), but separately from the message layer.
diglossia puts both behind one key and one read: a synchronous, in-memory dictionary built from a
payload you've already queried.

It doesn't fetch, pick locales, or hold rich text.

**Status:** 0.x. The API may change before 1.0.

## Install

```sh
npm install diglossia
```

The core (`diglossia`) is framework-agnostic — no Svelte or React required, safe to call on the
server or in a plain script. Two adapters ship separately, each with context helpers and a
`<LocalText />` component:

- `diglossia/svelte` — requires Svelte 5.
- `diglossia/react` — requires React 19. See [its README](src/lib/react/README.md) for usage,
  Server Components, and the React Compiler.

## The core / adapter split

- `diglossia` — `createDictionary()`, the `DictionaryInstance` interface, and every type. No
  Svelte or React import anywhere in this subtree.
- `diglossia/svelte` — `setDictionary()`, `getDictionary()`, and `<LocalText />`. Thin context
  plumbing on top of a `DictionaryInstance`.
- `diglossia/react` — `<DictionaryProvider>`, `useDictionary()`, and `<LocalText />`. The same
  plumbing for React.

The usage examples below use Svelte. The core API is the same in React; the
[React README](src/lib/react/README.md) covers the adapter.

## Usage

Build a dictionary from an already-resolved payload (see [The payload](#the-payload)) and put it in
context once, in the root layout's `<script>` body:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { createDictionary } from 'diglossia';
  import { setDictionary } from 'diglossia/svelte';

  let { data, children } = $props();

  setDictionary(createDictionary(data.dictionary)); // script body, not $effect — see SSR
</script>

{@render children()}
```

Read values from context with `getDictionary()`, or render them with `<LocalText />`:

```svelte
<script lang="ts">
  import { getDictionary, LocalText } from 'diglossia/svelte';

  const dictionary = getDictionary();
</script>

<h1>{dictionary.localText('app.title')}</h1>
<LocalText slug="title" scope="product" entityId={product.id} />
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

| Call                                           | Key                 |
| ---------------------------------------------- | ------------------- |
| `dictionary.localText('app.title')`            | `app.title`         |
| `dictionary.localText('buy_label', 'product')` | `product:buy_label` |
| `dictionary.localText('title', 'product', 42)` | `product:title:42`  |

`scope` is omitted (or `null`) for global/application-level copy, and set to the owning entity's
table/model name for entity-bound copy. An empty-string `scope` throws, as does an `entityId`
without a `scope` — either would collide with keys in the global namespace.

### The payload

`createDictionary` and `merge` take one row per key:

```ts
[
  {
    link: { id: 1, slug: 'app.title', scope: null, entityId: null },
    content: 'Storefront',
    localeCode: 'en',
  },
  {
    link: { id: 7, slug: 'title', scope: 'product', entityId: 42 },
    content: 'Trail Runner',
    localeCode: 'en',
  },
];
```

### Locale resolution lives in the query

diglossia doesn't resolve locale priority. The query that builds the payload picks one row per key.
For example, in Postgres, preferring the user's locale and falling back to a default (adjust the
names to your schema):

```sql
select distinct on (l.id)
  l.id, l.slug, l.scope, l.entity_id, t.content, loc.code as locale_code
from local_text_link l
join local_text t on t.link_id = l.id
join locale loc on loc.id = t.locale_id
where loc.code in ($1, $2)                -- user locale, fallback
order by l.id, (loc.code = $1) desc;
```

Because the query decides, showing interface copy in one locale and entity copy in another is a
different `where` clause, not a library feature. If a payload does carry more than one row for a
key, the last one wins.

`localeOf(slug, scope?, entityId?)` returns the locale an entry actually came from, so a component
can tell when it's rendering fallback content.

### Switching locale

`setDictionary` runs once per root-layout mount, so a new `data.dictionary` after client-side
navigation doesn't replace the instance. Treat a locale change as a full page load — for example, a
form that sets a locale cookie and redirects with `data-sveltekit-reload`.

`merge()` is for adding keys in the current locale, such as entity copy loaded on navigation. It
overwrites matching keys and leaves the rest, so it isn't a way to swap locales. Reads through
`getDictionary()` and `<LocalText />` update after a `merge()`, whether you call it on
`getDictionary()` or on the instance you passed to `setDictionary()`.

### Missing keys

A missing key returns the sentinel `[missing: <key>]` and logs an error to the console — once per
key per dictionary instance, not once per read.

Pass `onMissing` to change what's rendered:

```ts
const dictionary = createDictionary(payload, {
  onMissing: ({ slug, scope }) => (scope === null ? undefined : `[${slug}]`), // patch entity copy only; let chrome show the sentinel
});
```

Returning a string replaces the sentinel; returning `undefined` falls through to it. The miss is
logged either way.

### Interpolation and pluralization

`localText()` is a raw map read with no parsing, so the entity-copy path — called once per row in a
list — stays O(1). For copy that needs variables or plural forms, use `formatText()`:

```ts
dictionary.formatText('cart.count', { count: itemCount }, 'cart');
```

`formatText` uses [Unicode MessageFormat 2](https://unicode.org/reports/tr35/tr35-messageFormat.html)
(MF2, via [`messageformat`](https://github.com/messageformat/messageformat) v4), not ICU
MessageFormat 1. The syntax differs, and translation-tool support for MF2 is still uneven. MF2
source lives in the same `content` column as any other entry:

```
.input {$count :number}
.match $count
one {{You have {$count} item.}}
*   {{You have {$count} items.}}
```

Messages are parsed lazily on first read and cached per key. Content with no `{` is returned as-is,
with no parsing cost. Any content containing `{` is parsed as MF2, so a literal brace read through
`formatText` must be escaped as `\{` or `\}`; unescaped, `Use {braces}` renders as `Use braces`.
`localText()` never parses.

### The rich-text boundary

diglossia holds short strings — labels, headlines, deks, button text. Rich body content belongs in
a structured content table in your application, not in the dictionary. `<LocalText />` escapes its
output and will not render HTML.

### SSR

Call `createDictionary` in the root layout's `<script>` body, as in [Usage](#usage), for two
reasons:

- Svelte 5 effects don't run during server-side rendering. A dictionary built inside `$effect` is
  never populated on the server, and every server-rendered page shows `[missing: …]` sentinels.
- A module-level dictionary would be shared across concurrent server requests, leaking one
  visitor's locale into another's response. `createDictionary` returns a fresh, request-scoped
  instance on every call.

## API

### `diglossia`

- `createDictionary(payload, options?)` — builds a `DictionaryInstance` from a resolved payload.
- `DictionaryInstance`
  - `localText(slug, scope?, entityId?)` — raw string lookup.
  - `localeOf(slug, scope?, entityId?)` — the locale code the resolved entry came from.
  - `formatText(slug, values?, scope?, entityId?)` — MF2 interpolation/pluralization. Never
    throws: content that fails to compile (malformed MF2, an invalid locale code) is logged once
    per key and rendered raw.
  - `merge(payload)` — adds/overwrites keys without clearing the rest.
  - `subscribe(listener)` — calls `listener` after every `merge()`; returns an unsubscribe
    function. For framework adapters.
  - `getVersion()` — a counter incremented by every `merge()`, usable as a change snapshot.
- `DictionaryOptions.onMissing?: (info: MissingKeyInfo) => string | undefined`

### `diglossia/svelte`

- `setDictionary(instance)` — puts a `DictionaryInstance` in context. Call once, in the root
  layout's `<script>` body.
- `getDictionary()` — reads the instance from context. Throws a clear, actionable error naming
  `setDictionary` if none was set.
- `<LocalText slug scope? entityId? />` — a bare text expression with no wrapping element, so it
  stays valid inside `<svelte:head><title>`, `<option>`, and attribute contexts.

### `diglossia/react`

- `<DictionaryProvider payload options?>` or `<DictionaryProvider dictionary>` — puts a dictionary
  in context. `payload` is how a Server Component hands rows to Client Components.
- `useDictionary()` — reads the dictionary from context; its identity changes after each
  `merge()`. Throws a clear error naming `<DictionaryProvider>` if there is no provider.
- `<LocalText slug scope? entityId? />` — a bare string, no wrapping element. Use the hook for
  attributes and `<title>`.

See the [React README](src/lib/react/README.md) for Server Components and the React Compiler.

### Types

`Locale`, `LocalText` (the data-record type — the Svelte component of the same name lives at
`diglossia/svelte`, in a separate module, so the two never collide), `LocalTextLink`, `Dictionary`,
`DictionaryEntry`, `DictionaryPayload`, `MissingKeyInfo`.

## Origin

diglossia was extracted from [SvelteBuilder](https://github.com/cailenfisher/SvelteBuilder), where
it was built as `@sveltebuilder/hermes`. SvelteBuilder is its first consumer, depending on it as an
ordinary external package. Its [wiki](https://github.com/cailenfisher/SvelteBuilder/wiki/Why-a-Custom-i18n-Toolkit)
has the reference schema and the longer rationale.

## License

MIT
