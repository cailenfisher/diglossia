import { describe, expect, it, vi } from 'vitest';
import { createDictionary } from '../lib/core/dictionary.ts';
import type { DictionaryPayload } from '../lib/core/types.ts';

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

describe('createDictionary — instance isolation', () => {
  it('two instances built from different payloads do not observe each other\'s keys', () => {
    const a = createDictionary([entry('greeting', 'Hello', 'en')]);
    const b = createDictionary([entry('farewell', 'Goodbye', 'en')]);

    expect(a.localText('greeting')).toBe('Hello');
    expect(a.localText('farewell')).toBe('[missing: farewell]');
    expect(b.localText('farewell')).toBe('Goodbye');
    expect(b.localText('greeting')).toBe('[missing: greeting]');
  });
});

describe('createDictionary — key resolution', () => {
  it('resolves slug/scope/entityId combinations distinctly', () => {
    const dictionary = createDictionary([
      entry('label', 'Category Label', 'en', 'category'),
      entry('label', 'Product Label', 'en', 'product'),
      entry('product.title', 'Widget A', 'en', 'product', 1),
      entry('product.title', 'Widget B', 'en', 'product', 2),
    ]);

    expect(dictionary.localText('label', 'category')).toBe('Category Label');
    expect(dictionary.localText('label', 'product')).toBe('Product Label');
    expect(dictionary.localText('product.title', 'product', 1)).toBe('Widget A');
    expect(dictionary.localText('product.title', 'product', 2)).toBe('Widget B');
  });

  it('last entry wins on duplicate keys in a payload', () => {
    const dictionary = createDictionary([
      entry('title', 'First', 'en'),
      entry('title', 'Second', 'en'),
    ]);
    expect(dictionary.localText('title')).toBe('Second');
  });
});

describe('createDictionary — localeOf', () => {
  it('returns the locale code for a resolved key', () => {
    const dictionary = createDictionary([entry('title', 'Bonjour', 'fr')]);
    expect(dictionary.localeOf('title')).toBe('fr');
  });

  it('returns undefined for a missing key', () => {
    const dictionary = createDictionary([]);
    expect(dictionary.localeOf('missing')).toBeUndefined();
  });
});

describe('createDictionary — merge', () => {
  it('adds new keys without clearing existing ones', () => {
    const dictionary = createDictionary([entry('greeting', 'Hello', 'en')]);
    dictionary.merge([entry('farewell', 'Goodbye', 'en')]);
    expect(dictionary.localText('greeting')).toBe('Hello');
    expect(dictionary.localText('farewell')).toBe('Goodbye');
  });

  it('overwrites an existing key with the incoming value', () => {
    const dictionary = createDictionary([entry('greeting', 'Hello', 'en')]);
    dictionary.merge([entry('greeting', 'Hi there', 'en')]);
    expect(dictionary.localText('greeting')).toBe('Hi there');
  });

  it('does not affect keys absent from the incoming payload', () => {
    const dictionary = createDictionary([
      entry('greeting', 'Hello', 'en'),
      entry('farewell', 'Goodbye', 'en'),
    ]);
    dictionary.merge([entry('farewell', 'Bye', 'en')]);
    expect(dictionary.localText('greeting')).toBe('Hello');
  });
});

describe('createDictionary — missing keys', () => {
  it('returns the sentinel and logs an error for a missing key', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dictionary = createDictionary([]);
    expect(dictionary.localText('missing.key')).toBe('[missing: missing.key]');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('missing.key'));
    errorSpy.mockRestore();
  });

  it('sentinel includes the full scoped key', () => {
    const dictionary = createDictionary([]);
    expect(dictionary.localText('product.title', 'product', 42)).toBe(
      '[missing: product:product.title:42]'
    );
  });

  it('logs a missing key once per instance, not once per read', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dictionary = createDictionary([]);
    for (let i = 0; i < 50; i += 1) {
      dictionary.localText('missing.key');
    }
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('dedupes logging independently per instance', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = createDictionary([]);
    const b = createDictionary([]);
    a.localText('missing.key');
    b.localText('missing.key');
    expect(errorSpy).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });
});

describe('createDictionary — onMissing', () => {
  it('returning a string replaces the sentinel', () => {
    const dictionary = createDictionary([], { onMissing: () => 'fallback copy' });
    expect(dictionary.localText('missing.key')).toBe('fallback copy');
  });

  it('returning undefined falls through to the sentinel', () => {
    const dictionary = createDictionary([], { onMissing: () => undefined });
    expect(dictionary.localText('missing.key')).toBe('[missing: missing.key]');
  });

  it('receives the parsed parts, not just the key', () => {
    const onMissing = vi.fn(() => undefined);
    const dictionary = createDictionary([], { onMissing });
    dictionary.localText('headline', 'article', 42);
    expect(onMissing).toHaveBeenCalledWith({
      key: 'article:headline:42',
      slug: 'headline',
      scope: 'article',
      entityId: 42,
    });
  });

  it('still logs once per key even when onMissing supplies a replacement', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dictionary = createDictionary([], { onMissing: () => 'x' });
    dictionary.localText('missing.key');
    dictionary.localText('missing.key');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
