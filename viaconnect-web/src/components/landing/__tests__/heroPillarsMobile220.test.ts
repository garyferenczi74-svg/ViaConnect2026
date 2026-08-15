/**
 * Prompt 220: mobile journey cards snap carousel (not marquee).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Prompt 220 HeroPillars mobile carousel', () => {
  it('uses scroll-snap track, not CSS marquee animation', () => {
    const src = readFileSync(
      join(root, 'src/components/landing/HeroPillarsMobileMarquee.tsx'),
      'utf8',
    );
    expect(src).toMatch(/scroll-snap-type:\s*x\s+mandatory/);
    expect(src).toMatch(/scroll-snap-align:\s*center/);
    expect(src).toMatch(/85vw/);
    expect(src).toMatch(/overflow-x:\s*auto/);
    expect(src).not.toMatch(/@keyframes hero-pillar-marquee/);
    expect(src).not.toMatch(/animation:\s*hero-pillar-marquee/);
    // No infinite clone sets of cards
    expect(src).not.toMatch(/\[0,\s*1,\s*2\]\.map/);
  });

  it('has pagination dots with aria-labels and teal active', () => {
    const src = readFileSync(
      join(root, 'src/components/landing/HeroPillarsMobileMarquee.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Go to step \$\{i \+ 1\}|Go to step/);
    expect(src).toMatch(/#2DA5A0/);
    expect(src).toMatch(/hero-pillars-mobile-dots/);
    expect(src).toMatch(/prefers-reduced-motion|reducedMotion/);
  });

  it('desktop grid remains sm:grid and mobile carousel sm:hidden', () => {
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
    expect(pillars).toMatch(/HeroPillarsMobileMarquee/);
  });

  it('preserves journey copy tokens', () => {
    const pillars = readFileSync(
      join(root, 'src/components/landing/HeroPillars.tsx'),
      'utf8',
    );
    expect(pillars).toMatch(/Your Story/);
    expect(pillars).toMatch(/Your Biology/);
    expect(pillars).toMatch(/Your Protocol/);
    expect(pillars).toMatch(/Discovery/);
    expect(pillars).toMatch(/Precision/);
    expect(pillars).toMatch(/Transformation/);
  });
});
