// Prompt 191 Task E (2026-06-12): source as text contract test for the
// /genetics server shell. Same convention as the other page tests (readFileSync
// + assert on the source). Locks the hub mount, the Suspense boundary (required
// because YourVariantsCard reads useSearchParams), the Deep Navy background, the
// server component posture + metadata export, the removal of the full bleed
// MobileHeroBackground hero, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '..', 'page.tsx');

describe('genetics page.tsx wrapper', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('renders the GeneticsHub', () => {
    expect(source).toContain(
      "import { GeneticsHub } from '@/components/genetics/hub/GeneticsHub'",
    );
    expect(source).toContain('<GeneticsHub');
  });

  it('wraps the hub in a Suspense boundary', () => {
    expect(source).toContain("import { Suspense } from 'react'");
    expect(source).toContain('<Suspense');
  });

  it('paints plain Deep Navy behind the hub', () => {
    expect(source).toContain('bg-[#1A2744]');
  });

  it('is a server component (not use client) and exports metadata', () => {
    expect(source.startsWith("'use client'")).toBe(false);
    expect(source).not.toContain("'use client'");
    expect(source).toContain('export const metadata');
    expect(source).toContain('export default function GeneticsPage()');
  });

  it('no longer imports or renders the full bleed MobileHeroBackground hero', () => {
    expect(source).not.toContain('MobileHeroBackground');
  });

  it('drops the superseded inline page data and helpers', () => {
    // The old PANELS / VARIANTS consts and the per panel shop link helper are
    // absorbed into the hub (Your Variants) and must not linger on the page.
    expect(source).not.toContain('const PANELS');
    expect(source).not.toContain('const VARIANTS');
    expect(source).not.toContain('getGeneticsShopUrl');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
