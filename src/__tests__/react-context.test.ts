// @vitest-environment happy-dom
import { act, createElement, memo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDictionary, type DictionaryInstance } from '../lib/core/index.ts';
import type { DictionaryPayload } from '../lib/core/types.ts';
import { DictionaryProvider, LocalText, useDictionary } from '../lib/react/index.ts';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

function greeting(content: string, localeCode: string): DictionaryPayload[number] {
  return { link: { id: 1, slug: 'greeting', scope: null, entityId: null }, content, localeCode };
}

const unmounts: Array<() => void> = [];
afterEach(() => {
  for (const unmount of unmounts.splice(0)) act(unmount);
});

function render(element: ReactNode) {
  const target = document.createElement('div');
  const root = createRoot(target);
  act(() => root.render(element));
  unmounts.push(() => root.unmount());
  return {
    target,
    rerender: (next: ReactNode) => act(() => root.render(next)),
  };
}

/** Exposes the context dictionary so a test can call merge() on it. */
function Capture({ onContext }: { onContext: (dictionary: DictionaryInstance) => void }) {
  onContext(useDictionary());
  return null;
}

describe('DictionaryProvider — rendering', () => {
  it('renders <LocalText /> from a payload', () => {
    const { target } = render(
      createElement(
        DictionaryProvider,
        { payload: [greeting('Hello', 'en')] },
        createElement(LocalText, { slug: 'greeting' })
      )
    );
    expect(target.textContent).toBe('Hello');
  });

  it('renders <LocalText /> from a pre-built instance', () => {
    const dictionary = createDictionary([greeting('Hello', 'en')]);
    const { target } = render(
      createElement(
        DictionaryProvider,
        { dictionary },
        createElement(LocalText, { slug: 'greeting' })
      )
    );
    expect(target.textContent).toBe('Hello');
  });

  it('passes options through with a payload', () => {
    const { target } = render(
      createElement(
        DictionaryProvider,
        { payload: [], options: { onMissing: () => '' } },
        createElement(LocalText, { slug: 'absent' })
      )
    );
    expect(target.textContent).toBe('');
  });

  it('renders on the server', () => {
    const html = renderToString(
      createElement(
        DictionaryProvider,
        { payload: [greeting('Hello', 'en')] },
        createElement(LocalText, { slug: 'greeting' })
      )
    );
    expect(html).toBe('Hello');
  });
});

describe('DictionaryProvider — re-rendering after merge()', () => {
  it('re-renders after merge() through useDictionary()', () => {
    let contextDictionary: DictionaryInstance | undefined;
    const { target } = render(
      createElement(
        DictionaryProvider,
        { payload: [greeting('Hello', 'en')] },
        createElement(Capture, { onContext: (instance) => (contextDictionary = instance) }),
        createElement(LocalText, { slug: 'greeting' })
      )
    );

    act(() => contextDictionary?.merge([greeting('Bonjour', 'fr')]));

    expect(target.textContent).toBe('Bonjour');
  });

  it('re-renders after merge() on the instance passed as `dictionary`', () => {
    const dictionary = createDictionary([greeting('Hello', 'en')]);
    const { target } = render(
      createElement(
        DictionaryProvider,
        { dictionary },
        createElement(LocalText, { slug: 'greeting' })
      )
    );

    act(() => dictionary.merge([greeting('Bonjour', 'fr')]));

    expect(target.textContent).toBe('Bonjour');
  });

  it('gives consumers a new dictionary identity per version, so memoized children update', () => {
    const dictionary = createDictionary([greeting('Hello', 'en')]);
    const seen = new Set<DictionaryInstance>();
    // Receives the dictionary as a prop: React.memo only re-renders it if the
    // identity changes, which is what the per-version wrapper guarantees.
    const Memoized = memo(function Memoized({ source }: { source: DictionaryInstance }) {
      return source.localText('greeting');
    });
    function Parent() {
      const source = useDictionary();
      seen.add(source);
      return createElement(Memoized, { source });
    }
    const { target } = render(
      createElement(DictionaryProvider, { dictionary }, createElement(Parent))
    );

    act(() => dictionary.merge([greeting('Bonjour', 'fr')]));

    expect(target.textContent).toBe('Bonjour');
    expect(seen.size).toBe(2);
  });

  it('unsubscribes when the provider unmounts', () => {
    const dictionary = createDictionary([greeting('Hello', 'en')]);
    const target = document.createElement('div');
    const root = createRoot(target);
    act(() => root.render(createElement(DictionaryProvider, { dictionary })));
    act(() => root.unmount());

    let calls = 0;
    dictionary.subscribe(() => (calls += 1));
    dictionary.merge([greeting('Bonjour', 'fr')]);
    expect(calls).toBe(1);
  });
});

describe('DictionaryProvider — payload changes after mount', () => {
  it('ignores a new payload and warns once', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tree = (payload: DictionaryPayload) =>
      createElement(
        DictionaryProvider,
        { payload },
        createElement(LocalText, { slug: 'greeting' })
      );
    const { target, rerender } = render(tree([greeting('Hello', 'en')]));

    rerender(tree([greeting('Bonjour', 'fr')]));
    rerender(tree([greeting('Hola', 'es')]));

    expect(target.textContent).toBe('Hello');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('key={locale}'));
    warnSpy.mockRestore();
  });

  it('does not warn when re-rendered with the same payload', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const payload = [greeting('Hello', 'en')];
    const tree = () =>
      createElement(
        DictionaryProvider,
        { payload },
        createElement(LocalText, { slug: 'greeting' })
      );
    const { rerender } = render(tree());

    rerender(tree());

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('rebuilds from the new payload when keyed', () => {
    const tree = (locale: string, payload: DictionaryPayload) =>
      createElement(
        DictionaryProvider,
        { key: locale, payload },
        createElement(LocalText, { slug: 'greeting' })
      );
    const { target, rerender } = render(tree('en', [greeting('Hello', 'en')]));

    rerender(tree('fr', [greeting('Bonjour', 'fr')]));

    expect(target.textContent).toBe('Bonjour');
  });
});

describe('useDictionary — outside a provider', () => {
  it('throws an error naming DictionaryProvider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderToString(createElement(LocalText, { slug: 'greeting' }))).toThrow(
      /DictionaryProvider/
    );
    errorSpy.mockRestore();
  });
});
