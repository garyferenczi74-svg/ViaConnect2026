// Pure render-cost knobs scaled by render tier (Prompt 210b, P7-T2).
//
// Every function is pure with no side effects. Cinematic values are byte-identical
// to the hardcoded constants that existed before this phase: dpr cap [1, 2] and
// particles always shown when emphasisRegion is set. Cost reductions are gated
// strictly on tier === 'lite', so a capable device sees zero change.
//
// These helpers are consumed by FormaVisionCanvas (which already receives renderTier
// as a prop) to scale the Canvas dpr and gate the decorative EmphasisParticles mount.

import type { RenderTier3D } from './types';

// Canvas devicePixelRatio range per tier. Cinematic stays [1, 2] (same as the
// hardcoded value before P7-T2). Lite caps at 1.5 to cut fill-rate on low-power
// GPUs without making the avatar unreadably soft (1.5x is still crisp on all
// common phone displays, and reduces fragment-shader cost by up to 44% vs 2x).
const DPR_RANGES: Record<RenderTier3D, [number, number]> = {
  cinematic: [1, 2],
  lite: [1, 1.5],
} as const;

export function dprForTier(tier: RenderTier3D, safariLike = false): [number, number] {
  // iPhone WebKit first-paint is more reliable at 1×. Cinematic [1, 2] stays
  // for Chromium / desktop so existing cost tests remain byte-identical.
  if (safariLike) return [1, 1];
  return DPR_RANGES[tier];
}

// Whether the decorative EmphasisParticles orange burst should be mounted per tier.
// The burst is pure GPU decoration (additive blending, 14 points) and adds nothing
// to data legibility. On lite it is suppressed entirely while all data layers
// (measurement rings, callouts, overlay tints, ghost mesh) stay functional.
// Cinematic returns true -- byte-identical to today (EmphasisParticles always mounts
// when emphasisRegion is set, as before this phase).
export function showParticlesForTier(tier: RenderTier3D): boolean {
  return tier === 'cinematic';
}
