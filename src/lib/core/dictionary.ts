import { MessageFormat } from 'messageformat';
import { buildKey } from './build-key.ts';
import type { Dictionary, DictionaryEntry, DictionaryPayload, MissingKeyInfo } from './types.ts';

export type DictionaryOptions = {
  /**
   * Called on every missing-key lookup, with the parsed key parts (not just the
   * built key), so a consumer can behave differently for global chrome copy
   * versus entity copy. Returning a string replaces the `[missing: <key>]`
   * sentinel; returning `undefined` falls through to it. The miss is still
   * logged (deduplicated per key) either way — this option controls what's
   * rendered, not whether the miss is logged.
   */
  onMissing?: (info: MissingKeyInfo) => string | undefined;
};

export interface DictionaryInstance {
  /** Raw string lookup. No parsing — stays O(1) for the entity-copy read path. */
  localText(slug: string, scope?: string | null, entityId?: number | string | null): string;
  /** The locale code the resolved entry actually came from, or undefined if missing. */
  localeOf(
    slug: string,
    scope?: string | null,
    entityId?: number | string | null
  ): string | undefined;
  /** Adds/overwrites keys from `payload` without clearing the rest of the dictionary. */
  merge(payload: DictionaryPayload): void;
  /** MF2 interpolation/pluralization. Parses lazily and caches per key. */
  formatText(
    slug: string,
    values?: Record<string, unknown>,
    scope?: string | null,
    entityId?: number | string | null
  ): string;
}

/**
 * Creates a fresh, request-scoped dictionary from an already-resolved payload
 * (one row per key — see the README's "locale resolution" section). Holds no
 * framework state, only a plain Map closed over by the returned instance's
 * methods, so it's safe to call outside any component, including on the server.
 */
export function createDictionary(
  payload: DictionaryPayload,
  options: DictionaryOptions = {}
): DictionaryInstance {
  const map: Dictionary = new Map();
  const loggedMissingKeys = new Set<string>();
  // Compiled MF2 messages, keyed the same as `map`. A `null` value marks a
  // plain string with no MF2 markers, so formatText skips re-checking it.
  const compiledMessages = new Map<string, MessageFormat | null>();

  function applyEntries(entries: DictionaryPayload): void {
    for (const item of entries) {
      const key = buildKey(item.link.slug, item.link.scope, item.link.entityId);
      // Payload is expected to carry one row per key; if it doesn't, last one wins.
      map.set(key, { content: item.content, localeCode: item.localeCode });
      compiledMessages.delete(key);
    }
  }

  applyEntries(payload);

  function resolveMissing(
    key: string,
    slug: string,
    scope: string | null,
    entityId: number | string | null
  ): string {
    const replacement = options.onMissing?.({ key, slug, scope, entityId });

    if (!loggedMissingKeys.has(key)) {
      loggedMissingKeys.add(key);
      console.error(`[diglossia] missing key "${key}"`);
    }

    return replacement ?? `[missing: ${key}]`;
  }

  function localText(
    slug: string,
    scope?: string | null,
    entityId?: number | string | null
  ): string {
    const key = buildKey(slug, scope, entityId);
    const entry = map.get(key);
    if (entry !== undefined) return entry.content;
    return resolveMissing(key, slug, scope ?? null, entityId ?? null);
  }

  function localeOf(
    slug: string,
    scope?: string | null,
    entityId?: number | string | null
  ): string | undefined {
    const key = buildKey(slug, scope, entityId);
    return map.get(key)?.localeCode;
  }

  function merge(nextPayload: DictionaryPayload): void {
    applyEntries(nextPayload);
  }

  function getCompiledMessage(key: string, entry: DictionaryEntry): MessageFormat | null {
    if (compiledMessages.has(key)) {
      return compiledMessages.get(key) ?? null;
    }

    if (!entry.content.includes('{')) {
      compiledMessages.set(key, null);
      return null;
    }

    const compiled = new MessageFormat(entry.localeCode, entry.content, { bidiIsolation: 'none' });
    compiledMessages.set(key, compiled);
    return compiled;
  }

  function formatText(
    slug: string,
    values: Record<string, unknown> = {},
    scope?: string | null,
    entityId?: number | string | null
  ): string {
    const key = buildKey(slug, scope, entityId);
    const entry = map.get(key);
    if (entry === undefined) {
      return resolveMissing(key, slug, scope ?? null, entityId ?? null);
    }

    const compiled = getCompiledMessage(key, entry);
    return compiled === null ? entry.content : compiled.format(values);
  }

  return { localText, localeOf, merge, formatText };
}
