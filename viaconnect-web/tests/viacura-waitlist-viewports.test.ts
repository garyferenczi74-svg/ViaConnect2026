// OBRA Brief 7 viewport contract: 390 (mobile) + 1280 (desktop).
// Source-level checks that waitlist, signup role, and homepage features
// keep stacked mobile layout and desktop columns without new portal paint.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..');

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), 'utf8');
}

describe('390 + 1280 waitlist honesty surfaces', () => {
  it('waitlist landing stacks on mobile and widens at md (1280)', () => {
    const src = read('src/app/practitioners/page.tsx');
    expect(src).toContain('px-6');
    expect(src).toContain('md:px-10');
    expect(src).toContain('text-4xl');
    expect(src).toContain('md:text-6xl');
    expect(src).toContain('md:grid-cols-3');
    expect(src).toContain('min-h-screen');
  });

  it('waitlist form stacks fields on 390 and splits at md', () => {
    const src = read('src/app/practitioners/PractitionerWaitlistForm.tsx');
    expect(src).toContain('md:grid-cols-2');
    expect(src).toMatch(/min-h-\[44px\]/);
  });

  it('signup role cards are full-width with 44px targets for 390', () => {
    const src = read('src/app/(auth)/signup/page.tsx');
    expect(src).toContain('w-full max-w-md mx-auto px-4 md:px-0');
    expect(src).toContain('w-full text-left p-4 rounded-xl');
    expect(src).toMatch(/min-h-\[44px\]/);
    expect(src).toContain('flex-wrap');
  });

  it('homepage features keep a 390 accordion and a 1280 grid', () => {
    const mobile = read('src/components/landing/scroll-sections/mobile/FeaturesSectionMobile.tsx');
    const desktop = read('src/components/landing/scroll-sections/desktop/FeaturesSectionDesktop.tsx');
    expect(mobile).toContain('px-5');
    expect(mobile).toContain('max-w-md mx-auto');
    expect(desktop).toContain('px-12');
    expect(desktop).toContain('grid-cols-2 lg:grid-cols-4');
  });
});
