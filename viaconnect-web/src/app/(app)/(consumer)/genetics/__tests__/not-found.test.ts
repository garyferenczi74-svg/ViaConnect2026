import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '..', 'not-found.tsx');

describe('genetics app-shell not-found', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('uses existing genetics chrome and Lucide 1.5', () => {
    expect(source).toContain('bg-[#1A2744]');
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).toContain('href="/genetics"');
    expect(source).toContain('BLUEPRINT_ROUTE');
    expect(source).toContain('Page not found');
  });

  it('is not a fabricated panel page', () => {
    expect(source).not.toContain('Order Test Kit');
    expect(source).not.toContain('panelMeta');
    expect(source).not.toContain("'use client'");
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
