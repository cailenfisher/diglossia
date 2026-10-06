// @vitest-environment happy-dom
import { flushSync, mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import { createDictionary, type DictionaryInstance } from '../lib/core/index.ts';
import type { DictionaryPayload } from '../lib/core/types.ts';
import DictionaryHost from './fixtures/DictionaryHost.svelte';

function greeting(content: string, localeCode: string): DictionaryPayload[number] {
  return { link: { id: 1, slug: 'greeting', scope: null, entityId: null }, content, localeCode };
}

function render(dictionary: DictionaryInstance) {
  let contextDictionary: DictionaryInstance | undefined;
  const target = document.createElement('div');
  const component = mount(DictionaryHost, {
    target,
    props: { dictionary, onContext: (instance) => (contextDictionary = instance) },
  });
  flushSync();
  if (contextDictionary === undefined) throw new Error('fixture did not expose its context');
  return { target, component, contextDictionary };
}

describe('setDictionary — re-rendering after merge()', () => {
  it('re-renders after merge() through getDictionary()', () => {
    const { target, contextDictionary } = render(createDictionary([greeting('Hello', 'en')]));
    expect(target.textContent).toBe('Hello');

    contextDictionary.merge([greeting('Bonjour', 'fr')]);
    flushSync();

    expect(target.textContent).toBe('Bonjour');
  });

  it('re-renders after merge() on the instance originally passed to setDictionary()', () => {
    const dictionary = createDictionary([greeting('Hello', 'en')]);
    const { target } = render(dictionary);

    dictionary.merge([greeting('Bonjour', 'fr')]);
    flushSync();

    expect(target.textContent).toBe('Bonjour');
  });

  it('unsubscribes from the instance when the component is destroyed', () => {
    const dictionary = createDictionary([greeting('Hello', 'en')]);
    const { component } = render(dictionary);
    unmount(component);

    // Only this test's own listener should still be registered.
    let calls = 0;
    dictionary.subscribe(() => (calls += 1));
    expect(() => dictionary.merge([greeting('Bonjour', 'fr')])).not.toThrow();
    expect(calls).toBe(1);
  });
});
