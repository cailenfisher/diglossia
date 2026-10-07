---
'diglossia': minor
---

Add a React 19 adapter at `diglossia/react`: `<DictionaryProvider>`, `useDictionary()`, and `<LocalText />`.

The provider accepts either a `payload` or a pre-built `dictionary`. Passing a `payload` lets a Server Component hand rows to Client Components, since a dictionary instance can't cross that boundary. Consumers re-render after every `merge()`. `useDictionary()` returns a new object after each merge, so components memoized by the React Compiler or `React.memo` don't keep showing text from before the merge. `react` is an optional peer dependency. See `src/lib/react/README.md` for Server Component usage.
