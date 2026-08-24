// Prompt Brief 2: screen-space A/B wipe helpers for the parametric body.
//
// The wipe is a left/right split of two BodyParamVector meshes (baseline on
// the left, current on the right). Mode 0 is off so the current-body shader
// path stays visually identical until compare is enabled. Both sides are
// mountBodyGeometry meshes. No photographic reconstruction.

import type { BodyParamVector } from '@/lib/formavision/geometry/types';

export type WipeClipMode = 0 | 1 | 2;

export const WIPE_OFF: WipeClipMode = 0;
export const WIPE_KEEP_LEFT: WipeClipMode = 1;
export const WIPE_KEEP_RIGHT: WipeClipMode = 2;

export type WipeRole = 'current' | 'baseline';

export function clampWipeT(t: number): number {
  if (!Number.isFinite(t)) return 0.5;
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

export function shouldRenderAbWipe(
  enabled: boolean | undefined,
  baselineVector: BodyParamVector | null | undefined,
): boolean {
  return enabled === true && baselineVector != null;
}

export function wipeModeForRole(role: WipeRole, enabled: boolean): WipeClipMode {
  if (!enabled) return WIPE_OFF;
  return role === 'baseline' ? WIPE_KEEP_LEFT : WIPE_KEEP_RIGHT;
}

export function wipePercentFromT(t: number): number {
  return Math.round(clampWipeT(t) * 100);
}

export function wipeTFromPercent(pct: number): number {
  if (!Number.isFinite(pct)) return 0.5;
  return clampWipeT(pct / 100);
}
