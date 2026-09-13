import { buildKey } from './build-key.ts';
import type { Dictionary, DictionaryPayload } from './types.ts';

let dictionary: Dictionary = new Map();

type LocaleEntry = { content: string; localeCode: string };

/**
 * Groups payload entries by key, then resolves each key to a single string
 * using locale priority: userLocaleCode → fallbackLocaleCode → first available.
 *
 * Logs a warning when the fallback locale is used; logs an error when neither
 * configured locale is present.
 */
function flatten(
  payload: DictionaryPayload,
  userLocaleCode: string,
  fallbackLocaleCode: string
): Map<string, string> {
  const groups = new Map<string, LocaleEntry[]>();

  for (const entry of payload) {
    const key = buildKey(entry.link.slug, entry.link.scope, entry.link.entityId);
    const group = groups.get(key);
    if (group) {
      group.push({ content: entry.content, localeCode: entry.localeCode });
    } else {
      groups.set(key, [{ content: entry.content, localeCode: entry.localeCode }]);
    }
  }

  const result = new Map<string, string>();

  for (const [key, entries] of groups) {
    const userEntry = entries.find((e) => e.localeCode === userLocaleCode);
    if (userEntry) {
      result.set(key, userEntry.content);
      continue;
    }

    const fallbackEntry = entries.find((e) => e.localeCode === fallbackLocaleCode);
    if (fallbackEntry) {
      console.warn(`[diglossia] key "${key}" fell back to locale "${fallbackLocaleCode}"`);
      result.set(key, fallbackEntry.content);
      continue;
    }

    if (entries.length > 0) {
      console.error(
        `[diglossia] key "${key}" has no entry for locale "${userLocaleCode}" or fallback ` +
          `"${fallbackLocaleCode}"; using first available "${entries[0].localeCode}"`
      );
      result.set(key, entries[0].content);
    } else {
      console.error(`[diglossia] key "${key}" has no resolvable content`);
    }
  }

  return result;
}

/**
 * Replaces the entire dictionary with the resolved payload.
 *
 * If multiple entries share a key (non-flat payload), resolution order is:
 * userLocaleCode → fallbackLocaleCode → first available.
 * A fallback logs a warning; no configured locale present logs an error.
 */
export function load(
  payload: DictionaryPayload,
  userLocaleCode: string,
  fallbackLocaleCode: string
): void {
  dictionary = new Map(flatten(payload, userLocaleCode, fallbackLocaleCode));
}

/**
 * Merges a payload into the existing dictionary without replacing it.
 *
 * New keys are added; existing keys are overwritten with the incoming resolved
 * value. Uses the same locale resolution order as {@link load}.
 */
export function merge(
  payload: DictionaryPayload,
  userLocaleCode: string,
  fallbackLocaleCode: string
): void {
  const resolved = flatten(payload, userLocaleCode, fallbackLocaleCode);
  for (const [key, value] of resolved) {
    dictionary.set(key, value);
  }
}

/**
 * Synchronous dictionary lookup by slug, optional scope, and optional entityId.
 *
 * Returns the translated string for the resolved key. If the key is absent,
 * logs an error and returns the visible sentinel `[missing: <key>]`. Never throws.
 */
export function localText(slug: string, scope?: string, entityId?: number): string {
  const key = buildKey(slug, scope, entityId);
  const value = dictionary.get(key);
  if (value !== undefined) return value;
  console.error(`[diglossia] missing key "${key}"`);
  return `[missing: ${key}]`;
}
