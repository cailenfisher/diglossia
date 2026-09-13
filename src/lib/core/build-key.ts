/**
 * Builds the dictionary lookup key from a link's parts. Never exported from the
 * package — `localText`/`localeOf`/`formatText` are the only sanctioned way to
 * read a key; nothing outside this module constructs one by hand.
 */
export function buildKey(
  slug: string,
  scope?: string | null,
  entityId?: number | string | null
): string {
  if (scope === '') {
    throw new TypeError(
      `[diglossia] buildKey: scope must be a non-empty string, or null/undefined for the ` +
        `global namespace. Slug "${slug}" was given an empty string.`
    );
  }

  if (scope == null) {
    if (entityId != null) {
      throw new TypeError(
        `[diglossia] buildKey: slug "${slug}" was given entityId "${String(entityId)}" with no ` +
          `scope. An entity-scoped key requires a scope — without one, the entity ID collapses ` +
          `into the global namespace and collides with unrelated keys.`
      );
    }
    return slug;
  }

  if (entityId == null) return `${scope}:${slug}`;
  return `${scope}:${slug}:${String(entityId)}`;
}
