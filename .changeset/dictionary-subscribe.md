---
'diglossia': minor
---

Add `subscribe(listener)` and `getVersion()` to `DictionaryInstance`. Listeners run after every `merge()`, giving framework adapters a single change signal.

The Svelte adapter now uses this signal, so calling `merge()` on the instance passed to `setDictionary()` re-renders. Before, only `getDictionary().merge()` did. The adapter's dependency tracking is also fixed so it no longer silently breaks when its `.svelte.ts` source is transpiled by esbuild, as it is in a Vite workspace that consumes the source directly.
