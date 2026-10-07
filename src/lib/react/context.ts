'use client';

import {
  createContext,
  createElement,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createDictionary } from '../core/index.js';
import type { DictionaryInstance, DictionaryOptions, DictionaryPayload } from '../core/index.js';

// Bundlers statically replace `process.env.NODE_ENV`; the typeof guard keeps
// an unbundled browser from throwing on the bare `process` reference.
declare const process: { env: { NODE_ENV?: string } } | undefined;
const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

const DictionaryContext = createContext<DictionaryInstance | null>(null);

/**
 * Returns a new object wrapping `instance` — called once per dictionary
 * version, never per render.
 *
 * The instance itself keeps the same identity across merge(), so anything that
 * memoizes on it — the React Compiler, useMemo, React.memo — could keep serving
 * text from before the merge. Handing consumers a fresh wrapper per version
 * makes a merge() look like a changed value to all of them. This is the React
 * counterpart of the Svelte adapter's version counter.
 */
function wrapVersion(instance: DictionaryInstance): DictionaryInstance {
  return {
    localText: (slug, scope, entityId) => instance.localText(slug, scope, entityId),
    localeOf: (slug, scope, entityId) => instance.localeOf(slug, scope, entityId),
    formatText: (slug, values, scope, entityId) =>
      instance.formatText(slug, values, scope, entityId),
    merge: (payload) => instance.merge(payload),
    subscribe: (listener) => instance.subscribe(listener),
    getVersion: () => instance.getVersion(),
  };
}

export type DictionaryProviderProps = { children?: ReactNode } & (
  | {
      /**
       * Rows to build the dictionary from — the path for Server Components,
       * which can't pass an instance across the client boundary. Read once, on
       * mount: a later change is ignored (with a dev warning). Rebuild with
       * `key={locale}`, or add keys with `useDictionary().merge()`.
       */
      payload: DictionaryPayload;
      /** Passed to `createDictionary` with `payload`. Read once, on mount. */
      options?: DictionaryOptions;
      dictionary?: never;
    }
  | {
      /** An instance you built yourself, on the client. */
      dictionary: DictionaryInstance;
      payload?: never;
      options?: never;
    }
);

/**
 * Puts a dictionary into context for `useDictionary()` and `<LocalText />`.
 * Re-renders consumers after every `merge()`, whichever reference it's called on.
 */
export function DictionaryProvider(props: DictionaryProviderProps): ReactNode {
  const { payload, options, dictionary } = props;
  const [ownInstance] = useState(() =>
    dictionary === undefined ? createDictionary(payload ?? [], options) : null
  );
  const instance = dictionary ?? ownInstance;
  if (instance === null) {
    throw new Error(
      '[diglossia] <DictionaryProvider> switched from `payload` to `dictionary` after ' +
        'mounting. Pass one or the other for the lifetime of the provider.'
    );
  }

  const initialPayload = useRef(payload);
  const warnedAboutPayload = useRef(false);
  useEffect(() => {
    if (!isDevelopment || warnedAboutPayload.current) return;
    if (payload !== initialPayload.current) {
      warnedAboutPayload.current = true;
      console.warn(
        '[diglossia] <DictionaryProvider> `payload` changed after mount and was ignored — ' +
          'the dictionary is built once. Use key={locale} on the provider to rebuild it, ' +
          'or useDictionary().merge() to add keys.'
      );
    }
  }, [payload]);

  const version = useSyncExternalStore(
    instance.subscribe,
    instance.getVersion,
    instance.getVersion
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the point
  const value = useMemo(() => wrapVersion(instance), [instance, version]);

  return createElement(DictionaryContext, { value }, props.children);
}

/**
 * Reads the dictionary from the nearest `<DictionaryProvider>`. Throws a clear,
 * actionable error if there isn't one. Client Components only — a Server
 * Component can call `createDictionary(payload)` directly instead.
 */
export function useDictionary(): DictionaryInstance {
  const instance = use(DictionaryContext);
  if (instance === null) {
    throw new Error(
      '[diglossia] No dictionary found in context. Wrap your tree in ' +
        '<DictionaryProvider payload={payload}> (or dictionary={instance}) before any ' +
        'component calls useDictionary().'
    );
  }
  return instance;
}
