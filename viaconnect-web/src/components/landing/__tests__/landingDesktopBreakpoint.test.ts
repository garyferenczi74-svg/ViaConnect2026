/**
 * Laptop layout: desktop chrome starts at 1000px, not Tailwind lg (1024px).
 * A 1024px Windows window is about 1007px once the classic scrollbar is in,
 * which used to keep the hamburger, the 512px column, and the headline
 * under the fixed bar.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('landing desktop breakpoint', () => {
  it('shows the desktop nav from 1000px and keeps the hamburger below that', () => {
    const nav = src('src/components/landing/LandingNav.tsx');
    expect(nav).toContain('min-[1000px]:hidden');
    expect(nav).toContain('min-[1000px]:flex');
    expect(nav).not.toContain('lg:hidden');
    expect(nav).not.toContain('xl:hidden');
    expect(nav).toContain('strokeWidth={1.5}');
  });

  it('lays the hero out as desktop from 1000px and keeps header clearance below that', () => {
    const hero = src('src/components/landing/HeroSection.tsx');
    expect(hero).toContain('min-[1000px]:max-w-5xl');
    expect(hero).toContain('min-[1000px]:text-6xl');
    expect(hero).toContain('md:max-w-none');
    expect(hero).toContain('md:pt-[88px]');
    expect(hero).toContain('min-[1000px]:pt-0');
    expect(hero).toContain('min-[1000px]:justify-center');
    expect(hero).not.toContain('lg:text-6xl');
    expect(hero).toContain('strokeWidth={1.5}');
  });

  it('uses three pillar columns from 1000px and two columns on tablet', () => {
    const pillars = src('src/components/landing/HeroPillars.tsx');
    expect(pillars).toContain('hidden sm:grid sm:grid-cols-2');
    expect(pillars).toContain('min-[1000px]:grid-cols-3');
    expect(pillars).toContain('min-[1000px]:col-span-1');
    expect(pillars).not.toContain('lg:grid-cols-3');
  });

  it('shows the hero ticker on the same 1000px switch', () => {
    const carousel = src('src/components/landing/LandingHeroCarousel.tsx');
    expect(carousel).toContain('hidden min-[1000px]:block');
    expect(carousel).toContain("(max-width: 999px)");
    expect(carousel).not.toContain('hidden lg:block');
  });
});
