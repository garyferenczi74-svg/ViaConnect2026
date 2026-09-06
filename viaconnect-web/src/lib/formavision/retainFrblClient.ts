// Client retain FRBL after photo analyze. Default path still discards.
// Uploads go to body-progress-photos via signed URLs — bytes never hit a
// NEXT_PUBLIC_ key and never go to Tripo from the browser.

import { createClient } from '@/lib/supabase/client';
import { POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import {
  FORMAVISION_SLOT_ORDER,
  POSITION_TO_POSE_ID,
  type PhotoPosition,
} from '@/lib/body-tracker/composition/formaVisionScanSlots';
import type { FormaVisionPhotoMap } from '@/lib/body-tracker/composition/runFormaVisionAnalyze';

const BUCKET = 'body-progress-photos';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RetainFrblResult {
  ok: boolean;
  sessionId?: string;
  views?: PoseId[];
  error?: string;
}

interface SignedUploadTarget {
  path: string;
  token: string;
}

interface PrepareUpload {
  pose: PoseId;
  full: SignedUploadTarget;
  thumb: SignedUploadTarget;
}

export async function retainFrblPhotos(input: {
  photoScanId: string;
  photos: FormaVisionPhotoMap;
}): Promise<RetainFrblResult> {
  if (!UUID_RE.test(input.photoScanId)) {
    return { ok: false, error: 'invalid_scan' };
  }

  const poses = POSE_ORDER.map((pose) => {
    const slot = slotForPose(input.photos, pose);
    return { pose, skipped: !slot?.file };
  });

  if (poses.every((p) => p.skipped)) {
    return { ok: false, error: 'no_photos' };
  }

  const prepared = await postJson<{
    ok?: boolean;
    sessionId?: string;
    uploads?: PrepareUpload[];
    error?: string;
  }>('/api/formavision/retain-frbl', {
    action: 'prepare',
    photoScanId: input.photoScanId,
    poses,
  });
  if (!prepared?.ok || !prepared.sessionId) {
    return { ok: false, error: prepared?.error ?? 'prepare_failed' };
  }

  const supabase = createClient();
  const uploadedPaths = new Map<PoseId, { full: string; thumb: string }>();
  for (const upload of prepared.uploads ?? []) {
    const slot = slotForPose(input.photos, upload.pose);
    if (!slot?.file) continue;
    const [fullOk, thumbOk] = await Promise.all([
      uploadOne(supabase, upload.full.path, upload.full.token, slot.file),
      uploadOne(supabase, upload.thumb.path, upload.thumb.token, slot.file),
    ]);
    if (fullOk && thumbOk) {
      uploadedPaths.set(upload.pose, { full: upload.full.path, thumb: upload.thumb.path });
    }
  }

  const views = POSE_ORDER.filter((pose) => uploadedPaths.has(pose));
  const finalized = await postJson<{
    ok?: boolean;
    sessionId?: string;
    views?: PoseId[];
    error?: string;
  }>('/api/formavision/retain-frbl', {
    action: 'finalize',
    photoScanId: input.photoScanId,
    sessionId: prepared.sessionId,
    paths: Object.fromEntries(
      [...uploadedPaths.entries()].map(([pose, paths]) => [pose, paths]),
    ),
  });

  if (!finalized?.ok) {
    return { ok: false, sessionId: prepared.sessionId, error: finalized?.error ?? 'finalize_failed' };
  }
  return {
    ok: true,
    sessionId: finalized.sessionId ?? prepared.sessionId,
    views: finalized.views ?? views,
  };
}

function slotForPose(
  photos: FormaVisionPhotoMap,
  pose: PoseId,
): { file: File; base64: string } | undefined {
  const position = FORMAVISION_SLOT_ORDER.find((slot) => POSITION_TO_POSE_ID[slot.key] === pose);
  const key = (position?.key ?? pose) as PhotoPosition;
  return photos[key] ?? photos[pose as PhotoPosition];
}

async function uploadOne(
  supabase: ReturnType<typeof createClient>,
  path: string,
  token: string,
  blob: Blob,
): Promise<boolean> {
  try {
    const res = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, token, blob);
    return !res.error;
  } catch {
    return false;
  }
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json().catch(() => null)) as T | null;
  } catch {
    return null;
  }
}
