// LIVE CHECK body_photo_sessions_height_cm_source_check allows only
// caq_phase_1 | pre_scan_update | manual (or NULL). The geometric resolver
// emits caq_demographics | clinical_assessment | body_goals. Map at stamp
// time. Never invent a height. Unknown source → NULL (fail-open).

import type { HeightCmSource } from '@/lib/scan/clinicalBodyMetrics';

export const HEIGHT_CM_STAMP_SOURCES = ['caq_phase_1', 'pre_scan_update', 'manual'] as const;

export type HeightCmStampSource = (typeof HEIGHT_CM_STAMP_SOURCES)[number];

const RESOLVER_TO_STAMP: Record<HeightCmSource, HeightCmStampSource> = {
  caq_demographics: 'caq_phase_1',
  clinical_assessment: 'manual',
  body_goals: 'manual',
};

export function isHeightCmStampSource(
  value: string | null | undefined,
): value is HeightCmStampSource {
  return value != null && (HEIGHT_CM_STAMP_SOURCES as readonly string[]).includes(value);
}

/**
 * Map a resolver (or already-stamped) source onto the LIVE CHECK set.
 * Does not invent height. Unknown / missing → null so the column stays NULL.
 */
export function stampHeightCmSource(
  source: HeightCmSource | HeightCmStampSource | string | null | undefined,
): HeightCmStampSource | null {
  if (source == null || source === '') return null;
  if (source in RESOLVER_TO_STAMP) {
    return RESOLVER_TO_STAMP[source as HeightCmSource];
  }
  return isHeightCmStampSource(source) ? source : null;
}

export function stampFiniteHeight(input: {
  heightCm: number | null;
  source: HeightCmSource | HeightCmStampSource | string | null;
}): { heightCm: number; source: HeightCmStampSource | null } | null {
  const heightCm = input.heightCm;
  if (heightCm === null || !Number.isFinite(heightCm) || heightCm <= 0) return null;
  return { heightCm, source: stampHeightCmSource(input.source) };
}
