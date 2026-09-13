import { describe, expect, it } from 'vitest';
import { buildKey } from '../lib/core/build-key.ts';

describe('buildKey', () => {
  it('slug only — no scope, no entityId', () => {
    expect(buildKey('app.title')).toBe('app.title');
  });

  it('scope only — key is scope:slug', () => {
    expect(buildKey('buy_label', 'product')).toBe('product:buy_label');
  });

  it('scope + entityId — key is scope:slug:entityId', () => {
    expect(buildKey('product.title', 'product', 42)).toBe('product:product.title:42');
  });

  it('normalizes a string entityId the same as a number', () => {
    expect(buildKey('product.title', 'product', '42')).toBe('product:product.title:42');
  });

  it('null scope and null entityId behave like omitted', () => {
    expect(buildKey('app.title', null, null)).toBe('app.title');
  });

  it('throws a TypeError naming the slug for an empty-string scope', () => {
    expect(() => buildKey('title', '')).toThrow(TypeError);
    expect(() => buildKey('title', '')).toThrow(/title/);
  });

  it('throws when entityId is given without a scope', () => {
    expect(() => buildKey('title', null, 42)).toThrow(TypeError);
    expect(() => buildKey('title', undefined, 42)).toThrow(/title/);
    expect(() => buildKey('title', undefined, 42)).toThrow(/42/);
  });
});
