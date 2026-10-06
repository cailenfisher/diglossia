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

describe('formatText — plain strings', () => {
  it('passes a string with no MF2 markers through unparsed', () => {
    const dictionary = createDictionary([entry('greeting', 'Hello there', 'en')]);
    expect(dictionary.formatText('greeting')).toBe('Hello there');
  });
});

describe('formatText — interpolation', () => {
  it('substitutes a simple variable', () => {
    const dictionary = createDictionary([entry('welcome', 'Hello {$name}!', 'en')]);
    expect(dictionary.formatText('welcome', { name: 'Kat' })).toBe('Hello Kat!');
  });
});

describe('formatText — pluralization', () => {
  const english = `.input {$count :number}
.match $count
one {{You have {$count} item.}}
*   {{You have {$count} items.}}`;

  it('selects the English singular form', () => {
    const dictionary = createDictionary([entry('cart.count', english, 'en')]);
    expect(dictionary.formatText('cart.count', { count: 1 })).toBe('You have 1 item.');
  });

  it('selects the English plural form', () => {
    const dictionary = createDictionary([entry('cart.count', english, 'en')]);
    expect(dictionary.formatText('cart.count', { count: 5 })).toBe('You have 5 items.');
  });

  it('handles a language with more than two plural forms', () => {
    const polish = `.input {$count :number}
.match $count
one {{Masz {$count} produkt.}}
few {{Masz {$count} produkty.}}
many {{Masz {$count} produktow.}}
*   {{Masz {$count} produktu.}}`;
    const dictionary = createDictionary([entry('cart.count', polish, 'pl')]);
    expect(dictionary.formatText('cart.count', { count: 1 })).toBe('Masz 1 produkt.');
    expect(dictionary.formatText('cart.count', { count: 3 })).toBe('Masz 3 produkty.');
    expect(dictionary.formatText('cart.count', { count: 5 })).toBe('Masz 5 produktow.');
  });
});

describe('formatText — missing key', () => {
  it('falls through to the missing-key sentinel', () => {
    const dictionary = createDictionary([]);
    expect(dictionary.formatText('missing.key')).toBe('[missing: missing.key]');
  });
});

describe('formatText — recompiles after merge', () => {
  it('reflects an updated compiled message after merge overwrites the key', () => {
    const dictionary = createDictionary([entry('welcome', 'Hello {$name}!', 'en')]);
    expect(dictionary.formatText('welcome', { name: 'Kat' })).toBe('Hello Kat!');
    dictionary.merge([entry('welcome', 'Hi {$name}!', 'en')]);
    expect(dictionary.formatText('welcome', { name: 'Kat' })).toBe('Hi Kat!');
  });
});

describe('formatText — content that fails to compile', () => {
  it('returns raw content for malformed MF2', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dictionary = createDictionary([entry('hint', 'Use {braces', 'en')]);
    expect(dictionary.formatText('hint')).toBe('Use {braces');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"hint"'));
    errorSpy.mockRestore();
  });

  it('returns raw content for an invalid locale code', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dictionary = createDictionary([entry('welcome', 'Hello {$name}!', 'en_US')]);
    expect(dictionary.formatText('welcome', { name: 'Kat' })).toBe('Hello {$name}!');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('en_US'));
    errorSpy.mockRestore();
  });

  it('logs once per key, not once per read', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dictionary = createDictionary([entry('hint', 'Use {braces', 'en')]);
    dictionary.formatText('hint');
    dictionary.formatText('hint');
    dictionary.formatText('hint');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('recompiles once merge() replaces the broken content', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dictionary = createDictionary([entry('welcome', 'Hello {$name', 'en')]);
    expect(dictionary.formatText('welcome', { name: 'Kat' })).toBe('Hello {$name');
    dictionary.merge([entry('welcome', 'Hello {$name}!', 'en')]);
    expect(dictionary.formatText('welcome', { name: 'Kat' })).toBe('Hello Kat!');
    errorSpy.mockRestore();
  });
});
