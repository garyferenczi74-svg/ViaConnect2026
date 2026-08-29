'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Check, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { runInMemoryMeasurement } from '@/lib/arnold/scanning/runScanAnalysis';
import type { ViewQualityResult } from '@/lib/arnold/scanning/runScanAnalysis';
import { persistScan } from '@/lib/body-tracker/composition/persistScanClient';
import {
  ANALYZE_CLIENT_TIMEOUT_MS,
  buildAnalyzeRequestMediaFields,
  resolveAllPhotoMediaTypes,
} from '@/lib/body-tracker/composition/scanMediaTypes';
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
  const [analyzeElapsedSec, setAnalyzeElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Task 13b: per-view quality results, populated by the geometric pipeline as it runs.
  // Map from PhotoPosition to the quality result for that view.
  // Null means the view has not been quality-assessed yet (pipeline still running or skipped).
  const [viewQuality, setViewQuality] = useState<Partial<Record<PhotoPosition, ViewQualityResult>>>({});
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
  const circWritePromiseRef = useRef<Promise<void> | null>(null);

  const allFilled = POSITIONS.every((p) => slots[p.key].base64 !== null);

  useEffect(() => {
    if (!submitting) {
      setAnalyzeElapsedSec(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      setAnalyzeElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submitting]);

  function clearSlot(key: PhotoPosition) {
    setSlots((s) => ({ ...s, [key]: { file: null, base64: null } }));
    setViewQuality((q) => { const next = { ...q }; delete next[key]; return next; });
    if (inputRefs.current[key]) inputRefs.current[key]!.value = '';
  }

  async function handleFile(key: PhotoPosition, file: File) {
    setError(null);
    if (file.size > MAX_PHOTO_BYTES) {
      setError(`Photo too large (max 5 MB). Try compressing or retaking.`);
      return;
    }
    const declared = (file.type || '').toLowerCase();
    if (declared === 'image/heic' || declared === 'image/heif') {
      setError('HEIC photos are not supported. Use JPEG or PNG.');
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
    circWritePromiseRef.current = null;
    // Reset per-view quality state for this new analysis run.
    setViewQuality({});

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

          // POSITION_TO_POSE_ID inverse: map PoseId back to PhotoPosition for quality state updates.
          const POSE_ID_TO_POSITION: Record<string, PhotoPosition> = {
            front: 'front',
            back:  'back',
            left:  'left_side',
            right: 'right_side',
          };

          const measurements = await runInMemoryMeasurement({
            photos,
            heightCm,
            sex,
            // Task 13b: collect per-view quality results as they arrive.
            // Updates the viewQuality state so the UI can show retake prompts.
            // Guard against post-unmount state updates.
            onViewQuality: (result) => {
              if (!isMountedRef.current) return;
              const position = POSE_ID_TO_POSITION[result.poseId];
              if (position) {
                setViewQuality((prev) => ({ ...prev, [position]: result }));
              }
            },
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
            circWritePromiseRef.current = writeCircumferencesFromScan(measurements, scanId);
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

      const mediaResolved = resolveAllPhotoMediaTypes({
        front:      { fileType: slots.front.file?.type,      base64: slots.front.base64 },
        back:       { fileType: slots.back.file?.type,       base64: slots.back.base64 },
        left_side:  { fileType: slots.left_side.file?.type,  base64: slots.left_side.base64 },
        right_side: { fileType: slots.right_side.file?.type, base64: slots.right_side.base64 },
      });
      if (!mediaResolved.ok) {
        throw new Error(mediaResolved.error);
      }
      const mediaFields = buildAnalyzeRequestMediaFields(mediaResolved.mediaTypes);

      const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/body-scan-analyze`;
      const analyzeController = new AbortController();
      const analyzeTimer = window.setTimeout(() => analyzeController.abort(), ANALYZE_CLIENT_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: analyzeController.signal,
          body: JSON.stringify({
            photos: {
              front:      slots.front.base64,
              back:       slots.back.base64,
              left_side:  slots.left_side.base64,
              right_side: slots.right_side.base64,
            },
            ...mediaFields,
          }),
        });
      } catch (fetchErr) {
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          throw new Error('vision timed out');
        }
        throw fetchErr;
      } finally {
        window.clearTimeout(analyzeTimer);
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? `Vision request failed (${res.status})`);
      }
      const out = (await res.json()) as {
        scan_id: string;
        scan_date: string;
        estimates: BodyScanEstimate;
      };

      // Prompt 210l: persist the composition spine BEFORE circumference write
      // so entry lookup does not race-fail. persistScan is idempotent; the
      // composition page may call it again after onComplete.
      visionScanIdRef.current = out.scan_id;
      const persistRes = await persistScan(out.scan_id);
      if (!persistRes.ok) {
        safeLog.warn('arnold.scanning.uploader', 'scan persist failed after vision', {
          scanId: out.scan_id,
          reason: persistRes.reason ?? 'unknown',
        });
        // Still hand off to parent so the UI can show retry (parent also persists).
        // Do not pretend success without a spine row.
        if (persistRes.reason === 'timeout') {
          setError(
            'Saving your scan is taking longer than expected. Tap Analyze again to retry save, or open FormaVision after a moment.',
          );
        } else {
          setError(
            'Scan analysis finished but could not save to your body log. Retry Analyze to save.',
          );
        }
      }

      // After persist (or on failure), still try girth write if geometric finished.
      // Circumference route retries entry lookup; longer window after 210l.
      const flushCirc = () => {
        const pending = geometricMeasurementsRef.current;
        if (pending && !writeTriggeredRef.current) {
          writeTriggeredRef.current = true;
          circWritePromiseRef.current = writeCircumferencesFromScan(pending, out.scan_id);
        }
      };
      flushCirc();
      // Wait up to 10s for in-memory geometric pipeline if vision finished first.
      if (!writeTriggeredRef.current) {
        for (let i = 0; i < 20 && !writeTriggeredRef.current; i++) {
          await new Promise<void>((r) => setTimeout(r, 500));
          if (!isMountedRef.current) return;
          flushCirc();
        }
      }
      if (circWritePromiseRef.current) {
        await circWritePromiseRef.current;
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
          const quality = viewQuality[pos.key];
          // Quality indicator: only shown when filled + quality has been assessed.
          // pass=false means the view failed quality (low-confidence results expected).
          const qualityFailed = quality !== undefined && !quality.pass;
          const qualityWarning = quality !== undefined && quality.pass && quality.issues.length > 0;
          return (
            <div key={pos.key} className="space-y-2">
              <label
                htmlFor={`scan-${pos.key}`}
                className={`relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all ${
                  qualityFailed
                    ? 'border border-[#B75E18]/60 bg-[#B75E18]/10 text-[#B75E18]'
                    : filled
                      ? 'border border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                      : 'border border-dashed border-white/20 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
                }`}
              >
                {filled ? (
                  <>
                    {qualityFailed ? (
                      <AlertTriangle size={20} strokeWidth={1.5} />
                    ) : (
                      <Check size={20} strokeWidth={1.5} />
                    )}
                    <span>{pos.label}</span>
                    {qualityFailed && (
                      <span className="text-[10px] text-[#B75E18]/90 text-center px-1 leading-tight">
                        Retake for accuracy
                      </span>
                    )}
                    {qualityWarning && (
                      <span className="text-[10px] text-amber-400/80">Quality warning</span>
                    )}
                    {!qualityFailed && !qualityWarning && quality?.pass && (
                      <span className="text-[10px] text-[#2DA5A0]/80">Quality OK</span>
                    )}
                    {!quality && (
                      <span className="text-[10px] text-[#2DA5A0]/80">Captured</span>
                    )}
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
                  accept="image/jpeg,image/png,image/webp"
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
                  className={`inline-flex w-full items-center justify-center gap-1 rounded-md text-[11px] transition-colors hover:text-white ${
                    qualityFailed ? 'text-[#B75E18]/80 font-semibold' : 'text-white/50'
                  }`}
                >
                  <RotateCcw size={12} strokeWidth={1.5} />
                  {qualityFailed ? 'Retake' : 'Replace'}
                </button>
              )}
              {/* Task 13b: specific retake prompt for failed views */}
              {qualityFailed && quality?.retakePrompt && (
                <p className="text-[10px] leading-tight text-[#B75E18]/80 px-0.5">
                  {quality.retakePrompt}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Task 13b: quality summary banner - shown when at least one view has results */}
      {Object.keys(viewQuality).length > 0 && (() => {
        const failedViews = POSITIONS.filter((p) => {
          const q = viewQuality[p.key];
          return q !== undefined && !q.pass;
        });
        if (failedViews.length === 0) return null;
        return (
          <div className="flex items-start gap-2 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/10 p-3 text-xs text-white/70">
            <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-[#B75E18]" />
            <div>
              <p className="font-semibold text-[#B75E18]">
                {failedViews.length === 1
                  ? `${failedViews[0].label} view needs attention`
                  : `${failedViews.length} views need attention`}
              </p>
              <p className="mt-0.5 text-white/60">
                Measurements from low-quality views will be marked low-confidence. Retake
                the flagged photos for best accuracy.
              </p>
            </div>
          </div>
        );
      })()}

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

      {error && (
        <p data-testid="body-scan-error" className="text-xs text-[#FCA5A5]">
          {error}
        </p>
      )}
      {submitting && (
        <p data-testid="body-scan-progress" className="text-xs text-white/55">
          Analyzing photos… this can take up to 60 seconds
          {analyzeElapsedSec > 0 ? ` (${analyzeElapsedSec}s)` : ''}. Keep this screen open.
        </p>
      )}

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
          {submitting
            ? analyzeElapsedSec >= 45
              ? 'Still analyzing'
              : 'Analyzing'
            : 'Analyze My Composition'}
        </button>
      </div>
    </div>
  );
}
