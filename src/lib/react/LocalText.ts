'use client';

import { useDictionary } from './context.js';

export type LocalTextProps = {
  slug: string;
  scope?: string | null;
  entityId?: number | string | null;
};

/**
 * Renders a bare string — no wrapping element. For attributes and `<title>`,
 * call `useDictionary().localText(...)` instead: JSX attributes need a string,
 * and React wants `<title>` to hold a single string child.
 */
export function LocalText({ slug, scope, entityId }: LocalTextProps): string {
  return useDictionary().localText(slug, scope, entityId);
}
