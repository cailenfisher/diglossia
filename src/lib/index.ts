export { load, merge, localText } from './store.svelte.js';
export { default as LocalText } from './LocalText.svelte';
// LocalText (the Svelte component above) already binds the name as both value and type.
// The data-model type is re-exported as LocalTextRecord to avoid a duplicate-identifier error.
export type { Locale, LocalText as LocalTextRecord, LocalTextLink, Dictionary, DictionaryPayload } from './types.ts';
