/** Builds the dictionary lookup key from a link's parts. Never exported. */
export function buildKey(slug: string, scope?: string | null, entityId?: number | null): string {
  if (scope == null) return slug;
  if (entityId == null) return `${scope}:${slug}`;
  return `${scope}:${slug}:${entityId}`;
}
