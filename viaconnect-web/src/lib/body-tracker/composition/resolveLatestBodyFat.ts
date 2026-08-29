// Latest body-fat resolver for hub / dashboard chips.
//
// Scan persist writes the estimate to body_tracker_segmental_fat.total_body_fat_pct
// and leaves body_tracker_weight.body_fat_pct NULL (photo scans are not a scale).
// Hub and dashboard used to read only the latest weight row, so a FormaVision
// upload vanished from those chips even though Body Fat / FormaVision showed it.
//
// Recency wins across the two honest sources. Null / non-finite / <= 0 stay
// UNKNOWN (never 0). Rounding is 1 decimal to match BodyFatReadout + hub chips.

export interface BodyFatCandidate {
  pct: number | null | undefined;
  createdAt: string | null | undefined;
  sourceName: string | null | undefined;
}

export interface ResolvedBodyFat {
  pct: number | null;
  sourceName: string | null;
}

function finitePositivePct(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function createdAtMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

export function resolveLatestBodyFat(candidates: BodyFatCandidate[]): ResolvedBodyFat {
  const valid = candidates
    .map((c) => ({
      pct: finitePositivePct(c.pct),
      createdAt: c.createdAt ?? null,
      sourceName: typeof c.sourceName === 'string' && c.sourceName.trim()
        ? c.sourceName
        : null,
    }))
    .filter((c): c is { pct: number; createdAt: string | null; sourceName: string | null } =>
      c.pct !== null,
    );

  if (valid.length === 0) {
    return { pct: null, sourceName: null };
  }

  valid.sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
  const winner = valid[0];
  return {
    pct: Math.round(winner.pct * 10) / 10,
    sourceName: winner.sourceName,
  };
}

export function formatBodyFatChip(pct: number): string {
  return pct.toFixed(1);
}
