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

/**
 * The flat in-memory dictionary. Keys follow the convention:
 * - 'slug' (no scope, no entityId)
 * - 'scope:slug' (scope only)
 * - 'scope:slug:entityId' (scope + entityId)
 */
export type Dictionary = Map<string, string>;

/**
 * The shape callers pass to {@link load} or {@link merge}.
 *
 * May contain multiple entries per key (one per locale). Diglossia flattens them
 * using the provided locale preferences: userLocaleCode → fallbackLocaleCode →
 * first available.
 */
export type DictionaryPayload = Array<{
  link: LocalTextLink;
  content: string;
  localeCode: string;
}>;
