// Shared FormaVision analyze spine for upload saved-images and live 4-pose.
// One pipeline: upright-normalize → body-scan-analyze → persistScan (210l)
// → in-memory girths. Missing views are omitted. Photo scans write total
// body fat only (never regional fat, muscle, or Navy). Circumference
// scan_id stays null unless a valid body_photo_sessions id is known (T5/T6).

import { createClient } from '@/lib/supabase/client';
import { runInMemoryMeasurement } from '@/lib/arnold/scanning/runScanAnalysis';
import type { ViewQualityResult } from '@/lib/arnold/scanning/runScanAnalysis';
import type { ExtractedMeasurements } from '@/lib/arnold/scanning/types';
import type { PoseId } from '@/lib/arnold/types';
import { persistScan } from './persistScanClient';
import {
  CIRC_WRITE_FAIL_COPY,
  HEIGHT_MISSING_GEOMETRIC_COPY,
  type CircWriteResult,
  hasFiniteGeometricGirth,
  parseCircWriteResponse,
  resolveCircumferenceScanId,
} from './circWriteContract';
import {
  ANALYZE_CLIENT_TIMEOUT_MS,
  PHOTO_POSITIONS,
  buildAnalyzeRequestMediaFields,
  buildPresentAnalyzeRequestMediaFields,
  resolveAllPhotoMediaTypes,
  resolvePresentPhotoMediaTypes,
  type ScanPhotoPosition,
} from './scanMediaTypes';
import {
  FORMAVISION_SLOT_ORDER,
  POSITION_TO_POSE_ID,
  type PhotoPosition,
} from './formaVisionScanSlots';
import {
  normalizeScanPhotoUpright,
  type ScanPhotoSource,
} from './normalizeScanPhotoOrientation';
import { safeLog } from '@/lib/utils/safe-log';
import { sanitizeAnalyzeUserError } from './visionModel';
import {
  backfillClinicalHeightIfMissing,
  parsePositiveFinite,
} from '@/lib/scan/clinicalBodyMetrics';
import { readResolvedHeightCm } from '@/lib/scan/readHeightCm';

export interface BodyScanEstimate {
  estimated_body_fat_min: number;
  estimated_body_fat_max: number;
  body_type: string;
  fat_distribution: string;
  estimated_whr_min: number;
  estimated_whr_max: number;
  muscle_development: Record<string, number>;
  ai_confidence: 'low' | 'medium' | 'high';
}

export interface BodyScanResult {
  scanId: string;
  scanDate: string;
  estimates: BodyScanEstimate;
}

export type FormaVisionPhotoSlot = {
  file: File;
  base64: string;
};

export type FormaVisionPhotoMap = Partial<Record<PhotoPosition, FormaVisionPhotoSlot>>;

export type PersistScanFn = typeof persistScan;

export type RetainFrblFn = (input: {
  photoScanId: string;
  photos: FormaVisionPhotoMap;
}) => Promise<{ ok: boolean; sessionId?: string; error?: string }>;

export interface FormaVisionAnalyzeArgs {
  photos: FormaVisionPhotoMap;
  source: ScanPhotoSource;
  persistScanFn?: PersistScanFn;
  accessToken?: string;
  supabaseUrl?: string;
  heightCm?: number | null;
  sex?: 'male' | 'female';
  analyzeTimeoutMs?: number;
  onViewQuality?: (result: ViewQualityResult) => void;
  onGeometricMeasurements?: (m: ExtractedMeasurements) => void;
  isMounted?: () => boolean;
  /** Slot attach already baked EXIF / auto-upright — do not rotate again. */
  alreadyNormalized?: boolean;
  /** Explicit opt-in to keep FRBL. Default discard. */
  retainPhotos?: boolean;
  retainFrblFn?: RetainFrblFn;
  /** Valid body_photo_sessions.id when already known (live persist or retain). */
  photoSessionId?: string | null;
}

export interface FormaVisionAnalyzeSpine {
  ok: boolean;
  result?: BodyScanResult;
  persistRes: { ok: boolean; entryId?: string; reason?: string };
  flushCirc: () => void;
  circWritePromise: Promise<CircWriteResult> | null;
  circWrite?: CircWriteResult | null;
  heightMissing?: boolean;
  heightMissingCopy?: string;
  error?: string;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
  '';

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return reject(new Error('Read failed'));
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

export function presentPhotoPositions(photos: FormaVisionPhotoMap): PhotoPosition[] {
  return FORMAVISION_SLOT_ORDER.map((s) => s.key).filter((key) => {
    const slot = photos[key];
    return Boolean(slot?.file && slot.base64);
  });
}

export async function uprightFormaVisionPhotos(
  photos: FormaVisionPhotoMap,
  source: ScanPhotoSource,
): Promise<FormaVisionPhotoMap> {
  const out: FormaVisionPhotoMap = {};
  for (const slot of FORMAVISION_SLOT_ORDER) {
    const current = photos[slot.key];
    if (!current?.file) continue;
    const upright = await normalizeScanPhotoUpright(current.file, source);
    out[slot.key] = {
      file: upright,
      base64: await fileToBase64(upright),
    };
  }
  return out;
}

export async function liveFramesToFormaVisionPhotos(
  frames: ReadonlyArray<{ pose: PoseId; skipped?: boolean; blob: Blob } | null>,
): Promise<FormaVisionPhotoMap> {
  const out: FormaVisionPhotoMap = {};
  for (const frame of frames) {
    if (!frame || frame.skipped || !frame.blob) continue;
    const key = FORMAVISION_SLOT_ORDER.find((s) => s.poseId === frame.pose)?.key;
    if (!key) continue;
    const file = new File([frame.blob], `${frame.pose}.jpg`, {
      type: frame.blob.type || 'image/jpeg',
    });
    out[key] = { file, base64: await fileToBase64(file) };
  }
  return out;
}

export async function writeCircumferencesFromScan(
  measurements: ExtractedMeasurements,
  scanId: string,
  opts?: { photoSessionId?: string | null },
): Promise<CircWriteResult> {
  if (!hasFiniteGeometricGirth(measurements)) {
    safeLog.info('formavision.analyze', 'skipping all-UNKNOWN circumference payload', {
      scanId,
    });
    return { ok: true, skipped: true, reason: 'all_unknown' };
  }
  const photoSessionId = resolveCircumferenceScanId({
    visionScanId: scanId,
    photoSessionId: opts?.photoSessionId,
  });
  try {
    const res = await fetch('/api/body/circumference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scanId,
        measurements,
        ...(photoSessionId ? { photoSessionId } : {}),
      }),
    });
    const json: unknown = await res.json().catch(() => null);
    const parsed = parseCircWriteResponse({ httpOk: res.ok, json });
    if (!parsed.ok) {
      safeLog.warn('formavision.analyze', 'circumference persist failed (non-fatal)', {
        status: res.status,
        scanId,
        photoSessionId,
        reason: parsed.reason,
      });
    }
    return parsed;
  } catch (err) {
    safeLog.warn('formavision.analyze', 'circumference persist failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: 'network' };
  }
}

function buildPhotoPayload(photos: FormaVisionPhotoMap): {
  photos: Partial<Record<ScanPhotoPosition, string>>;
  slots: Record<ScanPhotoPosition, { fileType?: string | null; base64?: string | null }>;
  allFilled: boolean;
} {
  const payload: Partial<Record<ScanPhotoPosition, string>> = {};
  const slots = {
    front: { fileType: photos.front?.file.type, base64: photos.front?.base64 ?? null },
    back: { fileType: photos.back?.file.type, base64: photos.back?.base64 ?? null },
    left_side: { fileType: photos.left_side?.file.type, base64: photos.left_side?.base64 ?? null },
    right_side: { fileType: photos.right_side?.file.type, base64: photos.right_side?.base64 ?? null },
  };
  for (const pos of PHOTO_POSITIONS) {
    const b64 = slots[pos].base64;
    if (b64) payload[pos] = b64;
  }
  const allFilled = PHOTO_POSITIONS.every((pos) => Boolean(slots[pos].base64));
  return { photos: payload, slots, allFilled };
}

export async function runFormaVisionAnalyzeSpine(
  args: FormaVisionAnalyzeArgs,
): Promise<FormaVisionAnalyzeSpine> {
  const fail = (error: string): FormaVisionAnalyzeSpine => ({
    ok: false,
    persistRes: { ok: false, reason: 'analyze_failed' },
    flushCirc: () => undefined,
    circWritePromise: null,
    circWrite: null,
    heightMissing: false,
    error: sanitizeAnalyzeUserError(error),
  });

  const mounted = args.isMounted ?? (() => true);
  const upright = args.alreadyNormalized
    ? args.photos
    : await uprightFormaVisionPhotos(args.photos, args.source);
  if (!mounted()) return fail('unmounted');

  const present = presentPhotoPositions(upright);
  if (present.length === 0) {
    return fail('Add at least one photo. Missing views are skipped, not invented.');
  }

  const { photos, slots, allFilled } = buildPhotoPayload(upright);
  let mediaFields: ReturnType<typeof buildAnalyzeRequestMediaFields> | ReturnType<
    typeof buildPresentAnalyzeRequestMediaFields
  >;
  if (allFilled) {
    const mediaResolved = resolveAllPhotoMediaTypes(slots);
    if (!mediaResolved.ok) return fail(mediaResolved.error);
    mediaFields = buildAnalyzeRequestMediaFields(mediaResolved.mediaTypes);
  } else {
    const mediaResolved = resolvePresentPhotoMediaTypes(slots);
    if (!mediaResolved.ok) return fail(mediaResolved.error);
    mediaFields = buildPresentAnalyzeRequestMediaFields(mediaResolved.mediaTypes);
  }

  let token = args.accessToken;
  const supabase = createClient();
  if (!token) {
    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData?.session?.access_token;
  }
  if (!token) return fail('Not signed in');

  const supabaseUrl = (args.supabaseUrl ?? SUPABASE_URL).replace(/\/$/, '');
  const timeoutMs = args.analyzeTimeoutMs ?? ANALYZE_CLIENT_TIMEOUT_MS;

  let geometricMeasurements: ExtractedMeasurements | null = null;
  let visionScanId: string | null = null;
  let photoSessionId: string | null = resolveCircumferenceScanId({
    photoSessionId: args.photoSessionId,
  });
  let writeTriggered = false;
  let t6Triggered = false;
  let heightMissing = false;
  let resolvedHeightCm: number | null = args.heightCm ?? null;
  let resolvedSex: 'male' | 'female' | null = args.sex ?? null;
  const circState: { promise: Promise<CircWriteResult> | null } = { promise: null };

  const flushCirc = () => {
    const pending = geometricMeasurements;
    if (pending && visionScanId && !writeTriggered) {
      writeTriggered = true;
      circState.promise = writeCircumferencesFromScan(pending, visionScanId);
    }
  };

  const flushT6 = () => {
    const pending = geometricMeasurements;
    if (!pending || !visionScanId || !photoSessionId || t6Triggered) return;
    t6Triggered = true;
    const t6 = writeCircumferencesFromScan(pending, visionScanId, { photoSessionId });
    circState.promise = circState.promise
      ? circState.promise.then(async (first) => {
          const second = await t6;
          return second.ok || first.ok ? (second.ok ? second : first) : second;
        })
      : t6;
  };

  async function resolveHeightAndSex(userId: string): Promise<{
    heightCm: number | null;
    sex: 'male' | 'female';
  }> {
    let heightCm = parsePositiveFinite(resolvedHeightCm);
    if (heightCm === null) {
      const resolved = await readResolvedHeightCm(supabase, userId);
      heightCm = resolved.heightCm;
      if (heightCm !== null) {
        void backfillClinicalHeightIfMissing(supabase, userId);
      }
    }
    resolvedHeightCm = heightCm;

    let sex: 'male' | 'female' = resolvedSex ?? 'male';
    if (!args.sex) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('sex')
        .eq('id', userId)
        .maybeSingle();
      sex = (profileData as { sex: string | null } | null)?.sex === 'female' ? 'female' : 'male';
    }
    resolvedSex = sex;
    return { heightCm, sex };
  }

  async function runGeometricFromPhotos(userId: string): Promise<ExtractedMeasurements | null> {
    const { heightCm, sex } = await resolveHeightAndSex(userId);
    if (!heightCm) {
      heightMissing = true;
      safeLog.warn(
        'formavision.analyze',
        'Skipping geometric measurement - height unknown from CAQ, clinical, and body_goals',
        { userId },
      );
      return null;
    }

    const posePhotos: Partial<Record<PoseId, Blob>> = {};
    for (const pos of present) {
      const file = upright[pos]?.file;
      if (file) posePhotos[POSITION_TO_POSE_ID[pos]] = file;
    }

    const measurements = await runInMemoryMeasurement({
      photos: posePhotos,
      heightCm,
      sex,
      onViewQuality: args.onViewQuality,
    });
    if (!mounted()) return null;
    geometricMeasurements = measurements;
    args.onGeometricMeasurements?.(measurements);
    return measurements;
  }

  void (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId || !mounted()) return;
      const measurements = await runGeometricFromPhotos(userId);
      if (!measurements) return;
      flushCirc();
      flushT6();
    } catch (err) {
      safeLog.warn('formavision.analyze', 'Geometric measurement failed (non-fatal)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();

  const analyzeController = new AbortController();
  const analyzeTimer = setTimeout(() => analyzeController.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/body-scan-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: analyzeController.signal,
      body: JSON.stringify({
        photos,
        ...mediaFields,
      }),
    });
  } catch (fetchErr) {
    if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
      return fail('vision timed out');
    }
    return fail(fetchErr instanceof Error ? fetchErr.message : 'Analysis failed');
  } finally {
    clearTimeout(analyzeTimer);
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    return fail(errBody.error ?? `Vision request failed (${res.status})`);
  }

  const out = (await res.json()) as {
    scan_id: string;
    scan_date: string;
    estimates: BodyScanEstimate;
  };

  visionScanId = out.scan_id;
  const persistScanFn = args.persistScanFn ?? persistScan;
  const persistRes = await persistScanFn(out.scan_id);
  flushCirc();

  if (args.retainPhotos === true && persistRes.ok && args.retainFrblFn) {
    try {
      const retained = await args.retainFrblFn({
        photoScanId: out.scan_id,
        photos: upright,
      });
      if (!retained.ok) {
        safeLog.warn('formavision.analyze', 'FRBL retain failed (non-fatal)', {
          error: retained.error ?? 'retain_failed',
        });
      } else if (retained.sessionId) {
        photoSessionId = retained.sessionId;
        // T6: remasure from the same retained FRBL; write with session FK.
        // Fail-open — never blocks BF persist / Ready settle.
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData.session?.user?.id;
          if (userId && mounted()) {
            await runGeometricFromPhotos(userId);
          }
        } catch (remeasureErr) {
          safeLog.warn('formavision.analyze', 'T6 remasure failed (non-fatal)', {
            error: remeasureErr instanceof Error ? remeasureErr.message : 'unknown',
          });
        }
        flushT6();
      }
    } catch (retainErr) {
      safeLog.warn('formavision.analyze', 'FRBL retain threw (non-fatal)', {
        error: retainErr instanceof Error ? retainErr.message : 'unknown',
      });
    }
  }

  return {
    ok: persistRes.ok,
    result: { scanId: out.scan_id, scanDate: out.scan_date, estimates: out.estimates },
    persistRes,
    flushCirc: () => {
      flushCirc();
      flushT6();
    },
    get circWritePromise() {
      return circState.promise;
    },
    heightMissing,
    heightMissingCopy: heightMissing ? HEIGHT_MISSING_GEOMETRIC_COPY : undefined,
    error: persistRes.ok
      ? undefined
      : persistRes.reason === 'timeout'
        ? 'Saving your scan is taking longer than expected. Tap Analyze again to retry save, or open FormaVision after a moment.'
        : 'Scan analysis finished but could not save to your body log. Retry Analyze to save.',
  };
}

export { CIRC_WRITE_FAIL_COPY, HEIGHT_MISSING_GEOMETRIC_COPY };
