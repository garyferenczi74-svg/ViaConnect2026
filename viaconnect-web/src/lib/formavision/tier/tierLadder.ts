// The render-tier step-down ladder (Prompt 210b, P7-T1).
//
// One pure, sticky transition the provider applies on each sustained budget-miss:
// cinematic -> lite -> 2d. It never steps up (a degrade is sticky for the session,
// so the user is never flipped back and forth) and never advances past the 2d
// floor. The 2d step is the handoff to the existing 2D SegmentalHeatMap floor.

import type { RenderTier } from './types';

const NEXT_DOWN: Record<RenderTier, RenderTier> = {
  cinematic: 'lite',
  lite: '2d',
  '2d': '2d',
};

// One step down the ladder. Pure and idempotent at the floor.
export function stepTierDown(tier: RenderTier): RenderTier {
  return NEXT_DOWN[tier];
}

// True when the tier is the 2D floor (the avatar hands off to the SegmentalHeatMap).
export function isFloorTier(tier: RenderTier): boolean {
  return tier === '2d';
}
