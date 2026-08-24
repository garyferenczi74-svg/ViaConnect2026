'use client';

/**
 * Prompt 216 Journey graph card: thin wrapper over shared HeroVideoBackground.
 * Responsive 16x9 desktop / 9x16 mobile. Do not fork playback logic here.
 */

import {
  HeroVideoBackground,
  HERO_VIDEO_ASSETS,
  type HeroVideoBackgroundProps,
} from './HeroVideoBackground';

export type JourneyGraphHeroVideoProps = Pick<HeroVideoBackgroundProps, 'forceError'>;

export function JourneyGraphHeroVideo({ forceError = false }: JourneyGraphHeroVideoProps) {
  return (
    <HeroVideoBackground
      sourceMode="responsive"
      scrimPreset="journey-graph"
      testId="journey-graph-hero-video"
      logScope="journey.graphVideo"
      forceError={forceError}
    />
  );
}

/** @deprecated Prefer HERO_VIDEO_ASSETS; kept for 216 test compatibility. */
export const JOURNEY_GRAPH_VIDEO_ASSETS = {
  desktop: HERO_VIDEO_ASSETS.desktop,
  mobile: HERO_VIDEO_ASSETS.portrait,
  mobileBreakpoint: HERO_VIDEO_ASSETS.mobileBreakpoint,
  poster: HERO_VIDEO_ASSETS.poster,
  notes:
    'Posters: solid Deep Navy data-URI until still frames are uploaded next to the mp4 assets.',
} as const;

export default JourneyGraphHeroVideo;
