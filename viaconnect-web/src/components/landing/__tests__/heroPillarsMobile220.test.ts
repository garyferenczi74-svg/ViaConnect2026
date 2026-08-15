/**
 * Prompt 220 (revised): auto-rotating mobile journey carousel.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERO_PILLAR_DWELL_MS } from '../HeroPillarsMobileMarquee';

const root = process.cwd();

describe('Prompt 220 HeroPillars mobile carousel', () => {
  it('exports 6s dwell constant', () => {
    expect(HERO_PILLAR_DWELL_MS).toBe(6000);
  });

  it('uses scroll-snap track with auto-rotate interval, not CSS marquee', () => {
    const src = readFileSync(
      join(root, 'src/components/landing/HeroPillarsMobileMarquee.tsx'),
      'utf8',
    );
    expect(src).toMatch(/scroll-snap-type:\s*x\s+mandatory/);
    expect(src).toMatch(/scroll-snap-align:\s*center/);
    expect(src).toMatch(/85vw/);
    expect(src).toMatch(/overflow-x:\s*auto/);
    expect(src).toMatch(/HERO_PILLAR_DWELL_MS/);
    expect(src).toMatch(/setInterval/);
    expect(src).toMatch(/IntersectionObserver/);
    expect(src).toMatch(/visibilitychange/);
    expect(src).toMatch(/userTouching|onTouchStart/);
    expect(src).toMatch(/prefers-reduced-motion|reducedMotion/);
    expect(src).not.toMatch(/@keyframes hero-pillar-marquee/);
    expect(src).not.toMatch(/animation:\s*hero-pillar-marquee/);
  });

  it('has pagination dots with aria-labels and teal active', () => {
    const src = readFileSync(
      join(root, 'src/components/landing/HeroPillarsMobileMarquee.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Go to step/);
    expect(src).toMatch(/#2DA5A0/);
    expect(src).toMatch(/hero-pillars-mobile-dots/);
  });

  it('desktop grid remains sm:grid and mobile carousel sm:hidden (no desktop rotation)', () => {
    const pillars = readFileSync(
      join(root, 'src/components/landing/HeroPillars.tsx'),
      'utf8',
    );
    const mobile = readFileSync(
      join(root, 'src/components/landing/HeroPillarsMobileMarquee.tsx'),
      'utf8',
    );
    expect(pillars).toMatch(/hidden sm:grid/);
    expect(mobile).toMatch(/sm:hidden/);
    // Rotation interval lives only in mobile component body, not desktop grid
    expect(pillars).not.toMatch(/setInterval/);
    expect(mobile).toMatch(/setInterval/);
  });

  it('preserves journey copy tokens', () => {
    const pillars = readFileSync(
      join(root, 'src/components/landing/HeroPillars.tsx'),
      'utf8',
    );
    expect(pillars).toMatch(/Your Story/);
    expect(pillars).toMatch(/Your Biology/);
    expect(pillars).toMatch(/Your Protocol/);
  });

  it('loops advance with modulo of card count', () => {
    const src = readFileSync(
      join(root, 'src/components/landing/HeroPillarsMobileMarquee.tsx'),
      'utf8',
    );
    expect(src).toMatch(/% n/);
  });
});
