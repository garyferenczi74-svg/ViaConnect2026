// Shared FormaVision analyze spine for upload saved-images and live 4-pose.
// One pipeline: upright-normalize → body-scan-analyze → persistScan (210l)
// → in-memory girths. Missing views are omitted. Photo scans write total
// body fat only (never regional fat, muscle, or Navy). Circumference
// scan_id stays null (FK → body_photo_sessions).

import { createClient } from '@/lib/supabase/client';
import { runInMemoryMeasurement } from '@/lib/arnold/scanning/runScanAnalysis';
import type { ViewQualityResult } from '@/lib/arnold/scanning/runScanAnalysis';
import type { ExtractedMeasurements } from '@/lib/arnold/scanning/types';
import type { PoseId } from '@/lib/arnold/types';
import { persistScan } from './persistScanClient';
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
}

export interface FormaVisionAnalyzeSpine {
  ok: boolean;
  result?: BodyScanResult;
  persistRes: { ok: boolean; entryId?: string; reason?: string };
  flushCirc: () => void;
  circWritePromise: Promise<void> | null;
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
): Promise<void> {
  try {
    const res = await fetch('/api/body/circumference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId, measurements }),
    });
    if (!res.ok) {
      safeLog.warn('formavision.analyze', 'circumference persist returned non-ok', {
        status: res.status,
        scanId,
      });
    }
  } catch (err) {
    safeLog.warn('formavision.analyze', 'circumference persist failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
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
  let writeTriggered = false;
  let circWritePromise: Promise<void> | null = null;

  const flushCirc = () => {
    const pending = geometricMeasurements;
    if (pending && visionScanId && !writeTriggered) {
      writeTriggered = true;
      circWritePromise = writeCircumferencesFromScan(pending, visionScanId);
    }
  };

  void (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId || !mounted()) return;

      let heightCm = args.heightCm ?? null;
      if (heightCm === null || heightCm === undefined) {
        const { data: clinicalData } = await supabase
          .from('clinical_assessments')
          .select('height_cm')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const row = clinicalData as { height_cm: number | null } | null;
        heightCm = row?.height_cm ?? null;
      }
      if (!heightCm) {
        safeLog.warn(
          'formavision.analyze',
          'Skipping geometric measurement - clinical_assessments height_cm unavailable',
          { userId },
        );
        return;
      }

      let sex: 'male' | 'female' = args.sex ?? 'male';
      if (!args.sex) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('sex')
          .eq('id', userId)
          .maybeSingle();
        sex = (profileData as { sex: string | null } | null)?.sex === 'female' ? 'female' : 'male';
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
      if (!mounted()) return;
      geometricMeasurements = measurements;
      args.onGeometricMeasurements?.(measurements);
      flushCirc();
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
    flushCirc,
    circWritePromise,
    error: persistRes.ok
      ? undefined
      : persistRes.reason === 'timeout'
        ? 'Saving your scan is taking longer than expected. Tap Analyze again to retry save, or open FormaVision after a moment.'
        : 'Scan analysis finished but could not save to your body log. Retry Analyze to save.',
  };
}
