import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load, merge, localText } from '../lib/store.svelte.ts';
import type { DictionaryPayload } from '../lib/types.ts';

/** Concise payload entry builder. */
function entry(
  slug: string,
  content: string,
  localeCode: string,
  scope: string | null = null,
  entityId: number | null = null
): DictionaryPayload[number] {
  return { link: { id: 1, slug, scope, entityId }, content, localeCode };
}

beforeEach(() => {
  // Replace with an empty dictionary before every test.
  load([], 'en', 'en');
});

// ---------------------------------------------------------------------------
// buildKey — tested indirectly via localText / load
// ---------------------------------------------------------------------------

describe('buildKey (via localText)', () => {
  it('slug only — no scope, no entityId', () => {
    load([entry('app.title', 'Hello', 'en')], 'en', 'en');
    expect(localText('app.title')).toBe('Hello');
  });

  it('scope only — key is scope:slug', () => {
    load([entry('buy_label', 'Buy', 'en', 'product')], 'en', 'en');
    expect(localText('buy_label', 'product')).toBe('Buy');
  });

  it('scope + entityId — key is scope:slug:entityId', () => {
    load([entry('product.title', 'Widget', 'en', 'product', 42)], 'en', 'en');
    expect(localText('product.title', 'product', 42)).toBe('Widget');
  });

  it('same slug under different scopes produces independent keys', () => {
    load(
      [
        entry('label', 'Category Label', 'en', 'category'),
        entry('label', 'Product Label', 'en', 'product'),
      ],
      'en',
      'en'
    );
    expect(localText('label', 'category')).toBe('Category Label');
    expect(localText('label', 'product')).toBe('Product Label');
  });

  it('same slug with different entityIds produces independent keys', () => {
    load(
      [
        entry('product.title', 'Widget A', 'en', 'product', 1),
        entry('product.title', 'Widget B', 'en', 'product', 2),
      ],
      'en',
      'en'
    );
    expect(localText('product.title', 'product', 1)).toBe('Widget A');
    expect(localText('product.title', 'product', 2)).toBe('Widget B');
  });
});

// ---------------------------------------------------------------------------
// load
// ---------------------------------------------------------------------------

describe('load', () => {
  it('loads a pre-flat payload (one locale per key)', () => {
    load(
      [entry('greeting', 'Hello', 'en'), entry('farewell', 'Goodbye', 'en')],
      'en',
      'en'
    );
    expect(localText('greeting')).toBe('Hello');
    expect(localText('farewell')).toBe('Goodbye');
  });

  it('replaces the entire dictionary on each call', () => {
    load([entry('greeting', 'Hello', 'en')], 'en', 'en');
    load([entry('farewell', 'Goodbye', 'en')], 'en', 'en');
    expect(localText('farewell')).toBe('Goodbye');
    expect(localText('greeting')).toBe('[missing: greeting]');
  });

  it('non-flat payload — user locale wins', () => {
    load(
      [entry('title', 'Hello', 'en'), entry('title', 'Bonjour', 'fr')],
      'fr',
      'en'
    );
    expect(localText('title')).toBe('Bonjour');
  });

  it('non-flat payload — fallback locale used when user locale absent', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    load(
      [entry('title', 'Hello', 'en'), entry('title', 'Hola', 'es')],
      'fr',
      'en'
    );
    expect(localText('title')).toBe('Hello');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('fell back'));
    warnSpy.mockRestore();
  });

  it('non-flat payload — first available used when neither locale present, logs error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    load(
      [entry('title', 'Hola', 'es'), entry('title', 'Ciao', 'it')],
      'fr',
      'en'
    );
    expect(localText('title')).toBe('Hola');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('no entry for locale')
    );
    errorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// merge
// ---------------------------------------------------------------------------

describe('merge', () => {
  it('adds new keys without clearing existing ones', () => {
    load([entry('greeting', 'Hello', 'en')], 'en', 'en');
    merge([entry('farewell', 'Goodbye', 'en')], 'en', 'en');
    expect(localText('greeting')).toBe('Hello');
    expect(localText('farewell')).toBe('Goodbye');
  });

  it('overwrites an existing key with the incoming resolved value', () => {
    load([entry('greeting', 'Hello', 'en')], 'en', 'en');
    merge([entry('greeting', 'Hi there', 'en')], 'en', 'en');
    expect(localText('greeting')).toBe('Hi there');
  });

  it('applies the same locale resolution as load', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    load([entry('greeting', 'Hello', 'en')], 'en', 'en');
    merge(
      [entry('farewell', 'Goodbye', 'en'), entry('farewell', 'Au revoir', 'fr')],
      'de',
      'en'
    );
    expect(localText('farewell')).toBe('Goodbye');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not affect keys absent from the incoming payload', () => {
    load(
      [entry('greeting', 'Hello', 'en'), entry('farewell', 'Goodbye', 'en')],
      'en',
      'en'
    );
    merge([entry('farewell', 'Bye', 'en')], 'en', 'en');
    expect(localText('greeting')).toBe('Hello');
  });
});

// ---------------------------------------------------------------------------
// localText
// ---------------------------------------------------------------------------

describe('localText', () => {
  it('returns content for a valid key', () => {
    load([entry('nav.home', 'Home', 'en')], 'en', 'en');
    expect(localText('nav.home')).toBe('Home');
  });

  it('returns the sentinel string for a missing key', () => {
    expect(localText('missing.key')).toBe('[missing: missing.key]');
  });

  it('sentinel includes the full scoped key', () => {
    expect(localText('product.title', 'product', 42)).toBe(
      '[missing: product:product.title:42]'
    );
  });

  it('logs an error containing the key for a missing lookup', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localText('missing.key');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('missing.key'));
    errorSpy.mockRestore();
  });

  it('returns content for empty-string scope treated as a scope', () => {
    load([entry('title', 'A', 'en', '')], 'en', 'en');
    // empty string scope is a valid scope value — key becomes ':title'
    expect(localText('title', '')).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// Fallback warning
// ---------------------------------------------------------------------------

describe('fallback warning', () => {
  it('logs a warning that includes the fallback locale code', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    load([entry('cta', 'Get started', 'en')], 'fr', 'en');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"en"'));
    warnSpy.mockRestore();
  });

  it('does not log a warning when user locale is resolved', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    load([entry('cta', 'Commencer', 'fr')], 'fr', 'en');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
