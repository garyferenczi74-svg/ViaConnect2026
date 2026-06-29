'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { runInMemoryMeasurement } from '@/lib/arnold/scanning/runScanAnalysis';
import { safeLog } from '@/lib/utils/safe-log';
import type { ExtractedMeasurements } from '@/lib/arnold/scanning/types';
import type { PoseId } from '@/lib/arnold/types';

export type PhotoPosition = 'front' | 'back' | 'left_side' | 'right_side';

const POSITIONS: Array<{ key: PhotoPosition; label: string }> = [
  { key: 'front',      label: 'Front' },
  { key: 'back',       label: 'Back' },
  { key: 'left_side',  label: 'Left' },
  { key: 'right_side', label: 'Right' },
];

// Map from BodyScanUploader PhotoPosition keys to canonical PoseId values
// (left_side -> left, right_side -> right; front/back are unchanged).
const POSITION_TO_POSE_ID: Record<PhotoPosition, PoseId> = {
  front:      'front',
  back:       'back',
  left_side:  'left',
  right_side: 'right',
};

const MAX_PHOTO_BYTES = 5_000_000; // 5 MB binary
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
  '';

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

// Profile shape for the geometric measurement (sex only; height_cm comes from
// clinical_assessments per the 209 fix - profiles.height_cm does not exist).
interface ProfileSnapshot {
  sex: string | null;
}

// Shape of the clinical_assessments row we read for height_cm.
interface ClinicalSnapshot {
  height_cm: number | null;
}

// Attempt to write geometric circumference measurements to the DB.
// Fire-and-forget helper: called when both the scan entry (scanId) and the
// geometric measurements are available. Uses the /api/body/circumference route
// which looks up the entry_id internally and retries for the composition-persist race.
async function writeCircumferencesFromScan(
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
      safeLog.warn(
        'arnold.scanning.uploader',
        'circumference persist returned non-ok',
        { status: res.status, scanId },
      );
    }
  } catch (err) {
    safeLog.warn(
      'arnold.scanning.uploader',
      'circumference persist failed (non-fatal)',
      { error: err instanceof Error ? err.message : String(err) },
    );
  }
}

interface BodyScanUploaderProps {
  onComplete: (result: BodyScanResult) => void;
  onCancel: () => void;
  /**
   * Optional callback invoked with the client-side geometric measurements
   * once the in-memory pipeline completes (Task 9 additive path).
   * Fires in the background alongside the Claude Vision call; does not
   * block the composition result or the UI.
   */
  onGeometricMeasurements?: (m: ExtractedMeasurements) => void;
}

interface SlotState {
  file: File | null;
  base64: string | null;
}

function fileToBase64(file: File): Promise<string> {
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

export function BodyScanUploader({ onComplete, onCancel, onGeometricMeasurements }: BodyScanUploaderProps) {
  const initialSlots: Record<PhotoPosition, SlotState> = {
    front:      { file: null, base64: null },
    back:       { file: null, base64: null },
    left_side:  { file: null, base64: null },
    right_side: { file: null, base64: null },
  };
  const [slots, setSlots] = useState<Record<PhotoPosition, SlotState>>(initialSlots);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<PhotoPosition, HTMLInputElement | null>>({
    front: null, back: null, left_side: null, right_side: null,
  });

  // Unmount guard: prevents any post-unmount state updates from the async IIFE.
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  // Cross-path coordination refs: whichever of (geometric pipeline | Claude Vision)
  // completes LAST will trigger the circumference write (Task 10).
  // Both refs are reset at the start of each handleAnalyze call.
  const geometricMeasurementsRef = useRef<ExtractedMeasurements | null>(null);
  const visionScanIdRef = useRef<string | null>(null);
  const writeTriggeredRef = useRef(false);

  const allFilled = POSITIONS.every((p) => slots[p.key].base64 !== null);

  function clearSlot(key: PhotoPosition) {
    setSlots((s) => ({ ...s, [key]: { file: null, base64: null } }));
    if (inputRefs.current[key]) inputRefs.current[key]!.value = '';
  }

  async function handleFile(key: PhotoPosition, file: File) {
    setError(null);
    if (file.size > MAX_PHOTO_BYTES) {
      setError(`Photo too large (max 5 MB). Try compressing or retaking.`);
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      setSlots((s) => ({ ...s, [key]: { file, base64: b64 } }));
    } catch {
      setError('Could not read photo. Try a different image.');
    }
  }

  async function handleAnalyze() {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    setError(null);

    // Reset cross-path coordination refs for this scan attempt.
    geometricMeasurementsRef.current = null;
    visionScanIdRef.current = null;
    writeTriggeredRef.current = false;

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      // Client-side geometric measurement (Task 9 additive path, Task 10 write).
      // Runs in-memory on the captured Blobs before they are discarded.
      // Pixels never leave the device for this path (Gary decision: ephemeral no-store).
      // Fire-and-forget: does NOT block the Claude Vision composition call or the UX.
      //
      // Height read: uses clinical_assessments.height_cm (not profiles.height_cm which
      // does not exist - 209 fix applied per commit 5a226d2a). Skips gracefully when null.
      //
      // Coordination (Task 10): after measurements are ready, if the Claude Vision
      // call has already returned the scanId, trigger the circumference write immediately.
      // Otherwise, store measurements in geometricMeasurementsRef and let the Vision
      // completion path pick them up. Either way the write fires exactly once.
      void (async () => {
        try {
          const userId = sessionData.session?.user?.id;
          if (!userId) return;

          // height_cm from clinical_assessments (the correct source after 209).
          // profiles.height_cm does not exist in this schema.
          const { data: clinicalData } = await supabase
            .from('clinical_assessments')
            .select('height_cm')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const heightCm = (clinicalData as ClinicalSnapshot | null)?.height_cm ?? null;
          if (!heightCm) {
            safeLog.warn(
              'arnold.scanning.uploader',
              'Skipping geometric measurement - clinical_assessments height_cm unavailable',
              { userId },
            );
            return;
          }

          // Sex still read from profiles (clinical_assessments does not carry sex).
          const { data: profileData } = await supabase
            .from('profiles')
            .select('sex')
            .eq('id', userId)
            .maybeSingle();
          const sex = (profileData as ProfileSnapshot | null)?.sex === 'female' ? 'female' : 'male';

          const photos: Partial<Record<PoseId, Blob>> = {};
          for (const pos of POSITIONS) {
            const file = slots[pos.key].file;
            if (file) photos[POSITION_TO_POSE_ID[pos.key]] = file;
          }

          const measurements = await runInMemoryMeasurement({
            photos,
            heightCm,
            sex,
          });

          // Guard: do not update state or trigger writes after unmount.
          if (!isMountedRef.current) return;

          geometricMeasurementsRef.current = measurements;
          onGeometricMeasurements?.(measurements);

          // Coordinate with Claude Vision path (Task 10):
          // if the scanId is already known, trigger circumference write now.
          const scanId = visionScanIdRef.current;
          if (scanId && !writeTriggeredRef.current) {
            writeTriggeredRef.current = true;
            void writeCircumferencesFromScan(measurements, scanId);
          }
        } catch (err) {
          // Non-fatal: log and continue. The Claude Vision path is unaffected.
          safeLog.warn(
            'arnold.scanning.uploader',
            'Geometric measurement failed (non-fatal)',
            { error: err instanceof Error ? err.message : String(err) },
          );
        }
      })();

      const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/body-scan-analyze`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          photos: {
            front:      slots.front.base64,
            back:       slots.back.base64,
            left_side:  slots.left_side.base64,
            right_side: slots.right_side.base64,
          },
          media_type: slots.front.file?.type?.startsWith('image/png') ? 'image/png' : 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? `Vision request failed (${res.status})`);
      }
      const out = (await res.json()) as {
        scan_id: string;
        scan_date: string;
        estimates: BodyScanEstimate;
      };

      // Coordinate with geometric path (Task 10):
      // if measurements are already ready, trigger circumference write now.
      visionScanIdRef.current = out.scan_id;
      const pendingMeasurements = geometricMeasurementsRef.current;
      if (pendingMeasurements && !writeTriggeredRef.current) {
        writeTriggeredRef.current = true;
        void writeCircumferencesFromScan(pendingMeasurements, out.scan_id);
      }

      onComplete({ scanId: out.scan_id, scanDate: out.scan_date, estimates: out.estimates });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60">
        Take 4 photos for an AI body composition estimate.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POSITIONS.map((pos) => {
          const slot = slots[pos.key];
          const filled = slot.base64 !== null;
          return (
            <div key={pos.key} className="space-y-2">
              <label
                htmlFor={`scan-${pos.key}`}
                className={`relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all ${
                  filled
                    ? 'border border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                    : 'border border-dashed border-white/20 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
                }`}
              >
                {filled ? (
                  <>
                    <Check size={20} strokeWidth={1.5} />
                    <span>{pos.label}</span>
                    <span className="text-[10px] text-[#2DA5A0]/80">Captured</span>
                  </>
                ) : (
                  <>
                    <Camera size={20} strokeWidth={1.5} />
                    <span>{pos.label}</span>
                    <span className="text-[10px] text-white/40">Tap to capture</span>
                  </>
                )}
                <input
                  ref={(el) => { inputRefs.current[pos.key] = el; }}
                  id={`scan-${pos.key}`}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif"
                  capture="environment"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(pos.key, f);
                  }}
                />
              </label>
              {filled && (
                <button
                  type="button"
                  onClick={() => clearSlot(pos.key)}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md text-[11px] text-white/50 transition-colors hover:text-white"
                >
                  <X size={12} strokeWidth={1.5} /> Retake
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/55">
        <p className="font-semibold text-white/70">Tips for best results:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Wear form fitting clothing</li>
          <li>Stand in consistent lighting</li>
          <li>Arms slightly away from body</li>
          <li>Full body visible from head to feet</li>
        </ul>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-3 text-xs text-white/70">
        <ShieldCheck size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-[#2DA5A0]" />
        <p>
          Photos are sent securely for analysis and immediately discarded. Only the
          estimated metrics are saved to your profile.
        </p>
      </div>

      {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg px-4 py-2 text-sm text-white/60 transition-colors hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!allFilled || submitting}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2DA5A0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
          {submitting ? 'Analyzing' : 'Analyze My Composition'}
        </button>
      </div>
    </div>
  );
}
