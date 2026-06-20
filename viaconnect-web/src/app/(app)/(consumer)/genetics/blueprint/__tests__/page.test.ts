// Prompt 193a follow-up (2026-06-12): contract tests for the standalone Your
// Genetic Blueprint page. Source string assertions per the repo convention
// (vitest node env, no jsdom). These confirm the page hosts the GeneX360 panel
// explorer that moved off the shop PLP, on Deep Navy, with a back link to the
// genetics hub and a Shop GeneX360 CTA that preserves the buy path, plus the no
// dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '..', 'page.tsx');

describe('Your Genetic Blueprint page', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('mounts the GeneX360PanelSection island', () => {
    expect(source).toContain(
      "import { GeneX360PanelSection } from '@/components/shop/genex360/GeneX360PanelSection'",
    );
    expect(source).toContain('<GeneX360PanelSection />');
  });

  it('renders on plain Deep Navy and exports metadata', () => {
    expect(source).toContain('bg-[#1A2744]');
    expect(source).toContain('export const metadata');
  });

  it('renders the Your Genetic Blueprint title', () => {
    expect(source).toContain('Your Genetic Blueprint');
  });

  it('has a sticky back control to the Your Variants list (204i)', () => {
    expect(source).toContain('href="/genetics#your-variants"');
    expect(source).toContain('Back to Your Variants');
    // Sticky just below the 64px brand header so it is reachable while scrolled.
    expect(source).toContain('sticky top-16');
  });

  it('preserves the buy path with a Shop GeneX360 CTA to the PLP', () => {
    expect(source).toContain('href="/shop/genex360"');
    expect(source).toContain('Shop GeneX360');
  });

  it('uses Lucide icons at strokeWidth 1.5', () => {
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('is a server component (no use client directive) with metadata', () => {
    expect(source).not.toContain("'use client'");
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
