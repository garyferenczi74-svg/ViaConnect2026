import { describe, it, expect } from 'vitest';
import { normalizeQuery } from '../normalize-query';

describe('normalizeQuery', () => {
  it('lowercases', () => expect(normalizeQuery('EGG')).toBe('egg'));
  it('trims whitespace', () => expect(normalizeQuery('  egg  ')).toBe('egg'));
  it('depluralizes naive -s', () => expect(normalizeQuery('eggs')).toBe('egg'));
  it('depluralizes -es for words ending in s/x/z/ch/sh', () => {
    expect(normalizeQuery('tomatoes')).toBe('tomato');
    expect(normalizeQuery('peaches')).toBe('peach');
  });
  it('leaves single chars alone', () => expect(normalizeQuery('a')).toBe('a'));
  it('strips trailing punctuation', () => expect(normalizeQuery('egg.')).toBe('egg'));
  it('collapses whitespace inside', () => expect(normalizeQuery('whole  wheat   bread')).toBe('whole wheat bread'));
  it('removes leading articles', () => expect(normalizeQuery('an avocado')).toBe('avocado'));
});
