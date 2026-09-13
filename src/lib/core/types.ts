/**
 * A configured locale in the system.
 */
export type Locale = {
  id: number;
  /** BCP-47 language tag, e.g. 'en', 'fr', 'pt-BR' */
  code: string;
  /** Display name in English, e.g. 'English' */
  name: string;
  /** Display name in the locale's own language, e.g. 'Français' */
  nativeName: string;
  dir: 'ltr' | 'rtl';
};

/**
 * The link record that identifies a text entry — its slug, optional scope,
 * and the optional entity it belongs to.
 */
export type LocalTextLink = {
  id: number;
  slug: string;
  /** Groups related slugs, e.g. 'product', 'nav'. Null for global scope. */
  scope: string | null;
  /** The ID of the entity this text belongs to when scope is set. Null otherwise. */
  entityId: number | null;
};

/**
 * A single translated text entry backed by a link record.
 */
export type LocalText = {
  id: number;
  link: LocalTextLink;
  content: string;
};

/** One resolved dictionary entry: the display text plus the locale it came from. */
export type DictionaryEntry = {
  content: string;
  localeCode: string;
};

/**
 * The flat in-memory dictionary. Keys follow the convention built by `buildKey`:
 * - 'slug' (no scope, no entityId)
 * - 'scope:slug' (scope only)
 * - 'scope:slug:entityId' (scope + entityId)
 */
export type Dictionary = Map<string, DictionaryEntry>;

/**
 * The shape callers pass to {@link createDictionary} or a `DictionaryInstance`'s
 * `merge`.
 *
 * Must already carry at most one entry per key — locale-priority resolution is
 * the caller's job (typically done in SQL), not diglossia's. If a payload does
 * contain more than one entry for a key, the last one in the array wins.
 */
export type DictionaryPayload = Array<{
  link: LocalTextLink;
  content: string;
  localeCode: string;
}>;

/** Passed to `DictionaryOptions.onMissing` when a lookup key isn't in the dictionary. */
export type MissingKeyInfo = {
  key: string;
  slug: string;
  scope: string | null;
  entityId: number | string | null;
};
