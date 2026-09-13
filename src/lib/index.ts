// Re-exports the framework-agnostic core only. The Svelte adapter — setDictionary,
// getDictionary, and the <LocalText /> component — lives at 'diglossia/svelte'.
export { createDictionary } from './core/index.ts';
export type {
  Dictionary,
  DictionaryEntry,
  DictionaryInstance,
  DictionaryOptions,
  DictionaryPayload,
  Locale,
  LocalText,
  LocalTextLink,
  MissingKeyInfo,
} from './core/index.ts';
