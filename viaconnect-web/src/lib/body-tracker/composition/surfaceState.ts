// Pure resolver: determines the display state of the body composition surface.
// States: loading -> error -> empty -> partial -> ready

import type { CompositionSnapshot } from './types';

export type SurfaceState = 'loading' | 'empty' | 'partial' | 'ready' | 'error';

// Core metrics that define a "ready" surface (all four main metric cards populated).
// A snapshot with only totalBodyFatPct set (e.g. a photo-only scan) is "partial".
function allCoreMetricsPresent(snap: CompositionSnapshot): boolean {
  return (
    snap.totalBodyFatPct !== null &&
    snap.visceralFatRating !== null &&
    snap.bodyWaterPct !== null &&
    snap.totalMuscleMassLbs !== null
  );
}

export function resolveSurfaceState(a: {
  loading: boolean;
  error: boolean;
  snapshot: CompositionSnapshot | null;
}): SurfaceState {
  if (a.loading) return 'loading';
  if (a.error) return 'error';
  if (!a.snapshot) return 'empty';
  if (allCoreMetricsPresent(a.snapshot)) return 'ready';
  return 'partial';
}
