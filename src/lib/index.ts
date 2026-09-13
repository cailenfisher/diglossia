// Re-exports the framework-agnostic core only. The Svelte adapter — the
// <LocalText /> component today, context helpers arriving in a follow-up —
// lives at 'diglossia/svelte'.
export { load, merge, localText } from './core/index.ts';
// LocalText (the Svelte component, exported from 'diglossia/svelte') already binds the
// name as both value and type. The data-model type is re-exported as LocalTextRecord to
// avoid a duplicate-identifier error for anyone importing both subpaths.
export type {
  Locale,
  LocalText as LocalTextRecord,
  LocalTextLink,
  Dictionary,
  DictionaryPayload,
} from './core/index.ts';
