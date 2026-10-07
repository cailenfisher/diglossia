# diglossia/react

The React adapter for [diglossia](https://github.com/cailenfisher/diglossia#readme): a `<DictionaryProvider>`, a
`useDictionary()` hook, and a `<LocalText />` component, on top of the framework-agnostic core.

## React 19 only (for now)

`diglossia/react` requires React 19. It uses `use()` and renders the context directly as a
provider (`<Context value>`), both new in 19. Supporting React 18 would mean a `Context.Provider`
fallback and a second test setup, which is cheap but not free. If you need React 18,
[open an issue](https://github.com/cailenfisher/diglossia/issues) and support can be added if there
is interest.

## Usage

Wrap your tree in a provider, then read with the hook:

```tsx
import { DictionaryProvider, LocalText, useDictionary } from 'diglossia/react';

function App({ payload }) {
  return (
    <DictionaryProvider payload={payload}>
      <SearchBox />
    </DictionaryProvider>
  );
}

function SearchBox() {
  const dictionary = useDictionary();
  return (
    <label>
      <LocalText slug="search.label" />
      <input placeholder={dictionary.localText('search.placeholder')} />
    </label>
  );
}
```

`<DictionaryProvider>` takes one of:

- `payload` (and optional `options`): the provider builds the dictionary itself. Use this when the
  payload comes from a Server Component (see below).
- `dictionary`: an instance you built yourself with `createDictionary()`, on the client.

The hook is the main API. `<LocalText />` renders a bare string with no wrapping element, which
suits body text. Attributes need a string, so call the hook for those. React also expects
`<title>` to hold a single string, so use the hook there too:

```tsx
<title>{dictionary.localText('app.title')}</title>
```

`useDictionary()` throws a clear error naming `<DictionaryProvider>` if no provider is above it.

## Server Components

React context doesn't exist in Server Components, so `useDictionary()` and `<LocalText />` work only
in Client Components. Server Components don't need them. The core is synchronous with no I/O, so a
Server Component can build and read a dictionary directly:

```tsx
// app/page.tsx (a Server Component)
import { createDictionary } from 'diglossia';

export default async function Page() {
  const dictionary = createDictionary(await loadDictionaryRows());
  return <h1>{dictionary.localText('app.title')}</h1>;
}
```

To share one instance across the Server Components in a request, wrap your loader in React's
`cache()`. That code fetches rows, so it belongs in your app, not in diglossia.

### Crossing into Client Components

A dictionary instance can't be passed from a Server Component to a Client Component. It's a set of
closures over a `Map`, and only plain data can cross that boundary. Pass the **payload** instead.
`diglossia/react` is marked `'use client'`, so a Server Component can render the provider
directly:

```tsx
// app/layout.tsx (a Server Component)
import { DictionaryProvider } from 'diglossia/react';

export default async function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DictionaryProvider payload={await loadDictionaryRows()}>{children}</DictionaryProvider>
      </body>
    </html>
  );
}
```

Two consequences:

- **The payload is serialized into the page.** Every row you pass is sent to the browser. Pass only
  the keys Client Components read, and keep server-only copy in Server Components.
- **Function options can't cross the boundary either.** `options.onMissing` is a function, so it
  can't be passed from a Server Component. If you need it, render the provider from your own
  `'use client'` component and pass `options` (or a pre-built `dictionary`) there.

## Updating the dictionary

`merge()` adds keys in the current locale, such as entity copy loaded on navigation. Call it from an
event handler or an effect, never during render. Consumers re-render after a `merge()`, whether you
call it on `useDictionary()` or on the instance you passed as `dictionary`.

The provider builds its dictionary once, from the initial `payload`. A later change to `payload` is
ignored, with a one-time warning in development. To switch locale, rebuild the provider with a
`key`:

```tsx
<DictionaryProvider key={locale} payload={payload}>
```

## React Compiler and memoization

A dictionary instance keeps the same identity across `merge()`. If components read it directly,
the React Compiler, `useMemo`, or `React.memo` could keep showing text from before the merge.
`useDictionary()` avoids this by returning a new object after every `merge()`, so memoized
components see a changed value and update. Read through `useDictionary()` rather than holding on
to the instance you passed as `dictionary`.

## API

- `<DictionaryProvider payload options?>` or `<DictionaryProvider dictionary>`: puts a dictionary
  in context. `payload` and `options` are read once, on mount.
- `useDictionary()`: the `DictionaryInstance` from the nearest provider. Its identity changes after
  each `merge()`. Throws if there is no provider.
- `<LocalText slug scope? entityId? />`: renders `useDictionary().localText(...)` as a bare string.
