// Shared contract for geometric → body_tracker_circumference writes.
// Cards SSOT is that table only. BF→girth morph helpers must never import this
// write path. Vision photo_scans ids are not a valid circ.scan_id FK.

import type { ExtractedMeasurements, MeasuredValue } from '@/lib/arnold/scanning/types';

export const CIRC_WRITE_FAIL_COPY =
  'Tape measurements did not save. Your body-fat estimate is still ready.';

export const HEIGHT_MISSING_GEOMETRIC_COPY =
  'Photo measurements need your height. We never guess it.';

export const ENTER_HEIGHT_CTA = 'Enter height';

export const MEASUREMENTS_EMPTY_COPY =
  'No tape measurements yet. Photo scans estimate body fat only — they do not invent girths.';

export const LOG_MEASUREMENTS_CTA = 'Log measurements';

export const PHOTO_SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GEOMETRIC_CIRC_KEYS = [
  'neckCirc',
  'shoulderCirc',
  'chestCirc',
  'waistNaturalCirc',
  'waistNavelCirc',
  'hipCirc',
  'rightBicepCirc',
  'leftBicepCirc',
  'rightForearmCirc',
  'leftForearmCirc',
  'rightThighCirc',
  'leftThighCirc',
  'rightCalfCirc',
  'leftCalfCirc',
] as const;

export type CircWriteResult = {
  ok: boolean;
  reason?: string;
  skipped?: boolean;
  entryId?: string;
};

export function isFiniteCm(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function measuredCmOrNull(v: MeasuredValue | undefined): number | null {
  if (!v || !isFiniteCm(v.cm)) return null;
  return Math.round(v.cm * 10) / 10;
}

/** True when at least one geometric girth is a finite cm value. */
export function hasFiniteGeometricGirth(measurements: ExtractedMeasurements): boolean {
  return GEOMETRIC_CIRC_KEYS.some((key) => isFiniteCm(measurements[key]?.cm ?? null));
}

/**
 * Vision body_tracker_photo_scans ids are not body_photo_sessions ids.
 * Only a caller-supplied photo-session UUID may land on circ.scan_id.
 */
export function resolveCircumferenceScanId(args: {
  visionScanId?: string | null;
  photoSessionId?: string | null;
}): string | null {
  const session = args.photoSessionId?.trim() ?? '';
  if (PHOTO_SESSION_ID_RE.test(session)) return session;
  return null;
}

export function parseCircWriteResponse(args: {
  httpOk: boolean;
  json: unknown;
}): CircWriteResult {
  if (!args.httpOk) {
    return { ok: false, reason: 'http_not_ok' };
  }
  const rec = args.json && typeof args.json === 'object' ? (args.json as Record<string, unknown>) : null;
  if (!rec) return { ok: false, reason: 'bad_json' };
  if (rec.ok === false) {
    return {
      ok: false,
      reason: typeof rec.reason === 'string' ? rec.reason : 'ok_false',
      entryId: typeof rec.entryId === 'string' ? rec.entryId : undefined,
    };
  }
  if (rec.ok !== true) {
    return { ok: false, reason: 'ok_false' };
  }
  return {
    ok: true,
    skipped: rec.skipped === true,
    reason: typeof rec.reason === 'string' ? rec.reason : undefined,
    entryId: typeof rec.entryId === 'string' ? rec.entryId : undefined,
  };
}

export function isUniqueScanConstraintError(code: string | undefined): boolean {
  return code === '23505';
}
