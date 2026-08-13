/**
 * Prompt 216: Journey graph hero video unit checks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JOURNEY_GRAPH_VIDEO_ASSETS } from '../JourneyGraphHeroVideo';

const root = process.cwd();

describe('Prompt 216 Journey graph hero video', () => {
  it('uses the exact desktop and mobile asset URLs', () => {
    expect(JOURNEY_GRAPH_VIDEO_ASSETS.desktop).toContain('Unwind%20Forest%2016x9.mp4');
    expect(JOURNEY_GRAPH_VIDEO_ASSETS.mobile).toContain('Unwind%20Forest%209x16.mp4');
    expect(JOURNEY_GRAPH_VIDEO_ASSETS.mobileBreakpoint).toBe('(max-width: 767px)');
  });

  it('is mounted only on the Journey graph card in YourJourneyCoaching', () => {
    const src = readFileSync(
      join(root, 'src/components/journey/YourJourneyCoaching.tsx'),
      'utf8',
    );
    expect(src).toMatch(/JourneyGraphHeroVideo/);
    expect(src).toMatch(/data-testid="journey-graph-card"/);
    // Single mount site
    expect(src.split('JourneyGraphHeroVideo').length - 1).toBeGreaterThanOrEqual(2); // import + jsx
    expect((src.match(/<JourneyGraphHeroVideo/g) ?? []).length).toBe(1);
  });

  it('shared HeroVideoBackground owns decorative video contracts', () => {
    const src = readFileSync(
      join(root, 'src/components/journey/HeroVideoBackground.tsx'),
      'utf8',
    );
    expect(src).toMatch(/aria-hidden="true"/);
    expect(src).toMatch(/preload="metadata"/);
    expect(src).toMatch(/prefers-reduced-motion/);
    expect(src).toMatch(/IntersectionObserver/);
    expect(src).toMatch(/safeLog\.warn/);
    expect(src).toMatch(/playsInline/);
    expect(src).toMatch(/muted/);
    expect(src).not.toMatch(/from ['\"]react-player|video\.js|plyr/);
  });

  it('journey-graph scrim uses Deep Navy with documented opacities', () => {
    const src = readFileSync(
      join(root, 'src/components/journey/HeroVideoBackground.tsx'),
      'utf8',
    );
    expect(src).toMatch(/rgba\(26,39,68,0\.72\)/);
    expect(src).toMatch(/rgba\(26,39,68,0\.78\)/);
    expect(src).toMatch(/rgba\(26,39,68,0\.88\)/);
    expect(src).toMatch(/#1A2744/);
  });
});
