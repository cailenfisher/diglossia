import { getContext, setContext } from 'svelte';
import type { DictionaryInstance, DictionaryPayload } from '../core/index.ts';

const CONTEXT_KEY = Symbol('diglossia');

/**
 * Wraps a core DictionaryInstance so Svelte's reactivity system notices merge().
 *
 * core/ holds a plain Map with no runes, keeping it framework-agnostic. Rather
 * than reimplementing dictionary storage with $state here — which would
 * duplicate buildKey/formatText logic in two places — this wraps the existing
 * instance in a version counter: every read method depends on `version`, and
 * merge() bumps it. Any $derived or template expression that reads through the
 * wrapper returned by getDictionary() re-runs after a merge(), exactly as if
 * the underlying map itself were reactive.
 *
 * This file is named `context.svelte.ts` rather than `context.ts` because
 * Svelte's tooling only compiles runes in `.svelte`/`.svelte.ts` files.
 */
function makeReactive(instance: DictionaryInstance): DictionaryInstance {
  let version = $state(0);

  return {
    localText(slug, scope, entityId) {
      void version; // read to register the reactive dependency — see comment above
      return instance.localText(slug, scope, entityId);
    },
    localeOf(slug, scope, entityId) {
      void version;
      return instance.localeOf(slug, scope, entityId);
    },
    formatText(slug, values, scope, entityId) {
      void version;
      return instance.formatText(slug, values, scope, entityId);
    },
    merge(payload: DictionaryPayload) {
      instance.merge(payload);
      version += 1;
    },
  };
}

/**
 * Puts a dictionary instance into context. Call once, in the root layout's
 * `<script>` body — never inside `$effect`, which doesn't run during SSR.
 */
export function setDictionary(instance: DictionaryInstance): void {
  setContext(CONTEXT_KEY, makeReactive(instance));
}

/**
 * Reads the dictionary instance from context. Throws a clear, actionable error
 * if no dictionary was set — call this only during component initialization.
 */
export function getDictionary(): DictionaryInstance {
  const instance = getContext<DictionaryInstance | undefined>(CONTEXT_KEY);
  if (!instance) {
    throw new Error(
      '[diglossia] No dictionary found in context. Call ' +
        'setDictionary(createDictionary(payload)) once in your root layout before any ' +
        'component calls getDictionary().'
    );
  }
  return instance;
}
