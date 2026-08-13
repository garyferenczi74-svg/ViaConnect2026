/**
 * Prompt 216c: shared HeroVideoBackground + profile + graph consumers.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HERO_VIDEO_ASSETS,
  HERO_VIDEO_PORTRAIT_9x16,
} from '../HeroVideoBackground';
import { JOURNEY_GRAPH_VIDEO_ASSETS } from '../JourneyGraphHeroVideo';

const root = process.cwd();

describe('Prompt 216c shared HeroVideoBackground', () => {
  it('exports portrait 9x16 asset used by profile card', () => {
    expect(HERO_VIDEO_PORTRAIT_9x16).toContain('Unwind%20Forest%209x16.mp4');
    expect(HERO_VIDEO_ASSETS.portrait).toBe(HERO_VIDEO_PORTRAIT_9x16);
  });

  it('JourneyGraphHeroVideo is a thin wrapper over HeroVideoBackground', () => {
    const src = readFileSync(
      join(root, 'src/components/journey/JourneyGraphHeroVideo.tsx'),
      'utf8',
    );
    expect(src).toMatch(/HeroVideoBackground/);
    expect(src).toMatch(/scrimPreset="journey-graph"/);
    expect(src).toMatch(/sourceMode="responsive"/);
    // No duplicated IntersectionObserver / play logic in the wrapper
    expect(src).not.toMatch(/IntersectionObserver/);
    expect(src).not.toMatch(/safeLog/);
  });

  it('single HeroVideoBackground implementation (grep one implementation file)', () => {
    const hero = readFileSync(
      join(root, 'src/components/journey/HeroVideoBackground.tsx'),
      'utf8',
    );
    expect(hero).toMatch(/export function HeroVideoBackground/);
    expect(hero).toMatch(/IntersectionObserver/);
    expect(hero).toMatch(/prefers-reduced-motion/);
    expect(hero).toMatch(/preload="metadata"/);
    expect(hero).toMatch(/aria-hidden="true"/);
  });

  it('profile card and journey graph both consume the shared component', () => {
    const coaching = readFileSync(
      join(root, 'src/components/journey/YourJourneyCoaching.tsx'),
      'utf8',
    );
    expect(coaching).toMatch(/HeroVideoBackground/);
    expect(coaching).toMatch(/sourceMode="portrait"/);
    expect(coaching).toMatch(/scrimPreset="profile"/);
    expect(coaching).toMatch(/JourneyGraphHeroVideo/);
    expect(coaching).toMatch(/data-testid="journey-profile-card"/);
    // Profile mounts HeroVideoBackground once; graph mounts via wrapper
    expect((coaching.match(/<HeroVideoBackground/g) ?? []).length).toBe(1);
    expect((coaching.match(/<JourneyGraphHeroVideo/g) ?? []).length).toBe(1);
  });

  it('profile scrim is denser than journey-graph desktop video scrim', () => {
    const hero = readFileSync(
      join(root, 'src/components/journey/HeroVideoBackground.tsx'),
      'utf8',
    );
    expect(hero).toMatch(/profile:[\s\S]*0\.78[\s\S]*0\.86[\s\S]*0\.93/);
    expect(hero).toMatch(/'journey-graph':[\s\S]*0\.72[\s\S]*0\.78[\s\S]*0\.88/);
  });

  it('JOURNEY_GRAPH_VIDEO_ASSETS still re-exports shared assets', () => {
    expect(JOURNEY_GRAPH_VIDEO_ASSETS.desktop).toBe(HERO_VIDEO_ASSETS.desktop);
    expect(JOURNEY_GRAPH_VIDEO_ASSETS.mobile).toBe(HERO_VIDEO_ASSETS.portrait);
  });
});
