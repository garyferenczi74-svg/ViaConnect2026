/**
 * Prompt 216a: mobile layout contracts for Your Journey page.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const coaching = () =>
  readFileSync(join(root, 'src/components/journey/YourJourneyCoaching.tsx'), 'utf8');
const video = () =>
  readFileSync(join(root, 'src/components/journey/JourneyGraphHeroVideo.tsx'), 'utf8');

describe('Prompt 216a mobile Journey layout', () => {
  it('hides redundant page header on mobile only', () => {
    const src = coaching();
    expect(src).toMatch(/vc-page-header/);
    expect(src).toMatch(/@media \(max-width: 767px\)/);
    expect(src).toMatch(/\.vc-page-header\s*\{\s*display:\s*none\s*!important/);
  });

  it('flattens profile card nesting and uses 16px shell padding on mobile', () => {
    const src = coaching();
    expect(src).toMatch(/vc-profile-card/);
    expect(src).toMatch(/vc-hero-shell/);
    expect(src).toMatch(/\.vc-profile-card[\s\S]*border:\s*none\s*!important/);
    expect(src).toMatch(/\.vc-hero-shell[\s\S]*padding:\s*16px\s*!important/);
  });

  it('metric tiles use horizontal snap carousel on mobile', () => {
    const src = coaching();
    expect(src).toMatch(/scroll-snap-type:\s*x\s*mandatory/);
    expect(src).toMatch(/vc-gauge-tile/);
    expect(src).toMatch(/3\.5/);
  });

  it('chart uses taller mobile plot, every-20 ticks, 44px controls, two-column legend', () => {
    const src = coaching();
    expect(src).toMatch(/isMobile \? 320 : 248/);
    expect(src).toMatch(/0, 20, 40, 60, 80, 100/);
    expect(src).toMatch(/minHeight: isMobile \? 44/);
    expect(src).toMatch(/vc-journey-legend/);
    expect(src).toMatch(/grid-template-columns:\s*1fr 1fr/);
  });

  it('hero heading steps down on mobile and page uses safe-area padding', () => {
    const src = coaching();
    expect(src).toMatch(/vc-hero-heading/);
    expect(src).toMatch(/font-size:\s*30px\s*!important/);
    expect(src).toMatch(/safe-area-inset-bottom/);
    expect(src).toMatch(/overflow-x:\s*hidden\s*!important/);
  });

  it('mobile video scrim is deepened only when video is playing', () => {
    const src = video();
    expect(src).toMatch(/data-scrim-mode/);
    expect(src).toMatch(/0\.82/);
    expect(src).toMatch(/0\.94/);
    expect(src).toMatch(/data-scrim-mode="video"/);
  });

  it('desktop media rules for hero grid remain present', () => {
    const src = coaching();
    expect(src).toMatch(/\.vc-hero \{ display: grid; grid-template-columns: 220px 1fr/);
    expect(src).toMatch(/@media \(max-width: 960px\)/);
  });
});
