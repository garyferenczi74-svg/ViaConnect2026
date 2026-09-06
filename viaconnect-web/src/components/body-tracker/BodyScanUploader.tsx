'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Check, ImagePlus, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { persistScan } from '@/lib/body-tracker/composition/persistScanClient';
import {
  ANALYZE_CLIENT_TIMEOUT_MS,
  buildAnalyzeRequestMediaFields,
  resolveAllPhotoMediaTypes,
} from '@/lib/body-tracker/composition/scanMediaTypes';
import {
  SCAN_SLOT_ACCEPT,
  SCAN_SLOT_FILE_INPUT_CLASS,
  inspectScanSlotFile,
  isHeicLike,
  needsScanSlotReencode,
  takeScanSlotFile,
} from '@/lib/body-tracker/composition/attachScanSlotPhoto';
import { processPhoto } from '@/components/body-tracker/photos/photoProcessing';
import { normalizeScanPhotoUpright } from '@/lib/body-tracker/composition/normalizeScanPhotoOrientation';
import {
  FORMAVISION_SLOT_ORDER,
  POSE_ID_TO_POSITION,
  emptyFormaVisionSlots,
  type PhotoPosition,
} from '@/lib/body-tracker/composition/formaVisionScanSlots';
import {
  runFormaVisionAnalyzeSpine,
  type BodyScanEstimate,
  type BodyScanResult,
  type FormaVisionPhotoMap,
} from '@/lib/body-tracker/composition/runFormaVisionAnalyze';
import type { ViewQualityResult } from '@/lib/arnold/scanning/runScanAnalysis';
import type { ExtractedMeasurements } from '@/lib/arnold/scanning/types';
import { sanitizeAnalyzeUserError } from '@/lib/body-tracker/composition/visionModel';
import {
  PHOTO_FLAGGED_PHOTOS_FOR_BEST_RESULTS,
  PHOTO_RETAKE_FOR_BEST_RESULTS,
  PHOTO_UPLOADER_PRIVACY_STRIP,
  PHOTO_WHAT_YOU_DO_NOT_GET,
  PHOTO_WHAT_YOU_GET,
} from '@/lib/formavision/twoProtocolCopy';

export type { PhotoPosition, BodyScanEstimate, BodyScanResult };

const POSITIONS = FORMAVISION_SLOT_ORDER;

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
  previewUrl: string | null;
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
  const initialSlots: Record<PhotoPosition, SlotState> = emptyFormaVisionSlots({
    file: null,
    base64: null,
    previewUrl: null,
  });
  const [slots, setSlots] = useState<Record<PhotoPosition, SlotState>>(initialSlots);
  const [submitting, setSubmitting] = useState(false);
  const [analyzeElapsedSec, setAnalyzeElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Task 13b: per-view quality results, populated by the geometric pipeline as it runs.
  // Map from PhotoPosition to the quality result for that view.
  // Null means the view has not been quality-assessed yet (pipeline still running or skipped).
  const [viewQuality, setViewQuality] = useState<Partial<Record<PhotoPosition, ViewQualityResult>>>({});
  // Unmount guard: prevents any post-unmount state updates from the async IIFE.
  const isMountedRef = useRef(true);
  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  useEffect(() => () => {
    for (const pos of POSITIONS) {
      const url = slotsRef.current[pos.key].previewUrl;
      if (url) URL.revokeObjectURL(url);
    }
  }, []);

  // Cross-path coordination refs: whichever of (geometric pipeline | Claude Vision)
  // completes LAST will trigger the circumference write (Task 10).
  // Both refs are reset at the start of each handleAnalyze call.
  const geometricMeasurementsRef = useRef<ExtractedMeasurements | null>(null);
  const visionScanIdRef = useRef<string | null>(null);
  const circWritePromiseRef = useRef<Promise<void> | null>(null);

  const allFilled = POSITIONS.every((p) => slots[p.key].base64 !== null);
  const anyFilled = POSITIONS.some((p) => slots[p.key].base64 !== null);

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

  async function handleFile(key: PhotoPosition, file: File) {
    setError(null);
    const inspected = inspectScanSlotFile(file);
    if (!inspected.ok) {
      setError(inspected.error);
      return;
    }

    // Hold the slot as Attaching — never preview a raw camera/gallery ObjectURL.
    // Preview + analyze share the post-bake blob only (from-image pixels).
    setSlots((s) => {
      if (s[key].previewUrl) URL.revokeObjectURL(s[key].previewUrl);
      return { ...s, [key]: { file, base64: null, previewUrl: null } };
    });
    setViewQuality((q) => { const next = { ...q }; delete next[key]; return next; });

    try {
      let stored = file;
      // HEIC must become JPEG before canvas upright. processPhoto uses the same
      // from-image decode as normalize so EXIF is not stripped as `none`.
      if (isHeicLike(file) && needsScanSlotReencode(file)) {
        const pair = await processPhoto(file);
        stored = new File([pair.full], 'scan.jpg', { type: 'image/jpeg' });
      }
      stored = await normalizeScanPhotoUpright(stored, 'upload');
      if (needsScanSlotReencode(stored)) {
        const pair = await processPhoto(stored);
        stored = new File([pair.full], 'scan.jpg', { type: 'image/jpeg' });
      }
      const shownUrl = URL.createObjectURL(stored);
      const b64 = await fileToBase64(stored);
      if (!isMountedRef.current) {
        URL.revokeObjectURL(shownUrl);
        return;
      }
      setSlots((s) => {
        if (s[key].previewUrl) URL.revokeObjectURL(s[key].previewUrl);
        return { ...s, [key]: { file: stored, base64: b64, previewUrl: shownUrl } };
      });
    } catch {
      if (!isMountedRef.current) return;
      setSlots((s) => {
        if (s[key].previewUrl) URL.revokeObjectURL(s[key].previewUrl);
        return { ...s, [key]: { file: null, base64: null, previewUrl: null } };
      });
      setError(
        isHeicLike(file)
          ? 'HEIC photos are not supported. Use JPEG or PNG.'
          : 'Could not read photo. Try a different image.',
      );
    }
  }

  async function handleAnalyze() {
    if (!anyFilled || submitting) return;
    setSubmitting(true);
    setError(null);

    geometricMeasurementsRef.current = null;
    visionScanIdRef.current = null;
    circWritePromiseRef.current = null;
    setViewQuality({});

    try {
      const photos: FormaVisionPhotoMap = {};
      for (const pos of POSITIONS) {
        const slot = slots[pos.key];
        if (slot.file && slot.base64) {
          photos[pos.key] = { file: slot.file, base64: slot.base64 };
        }
      }

      // 210l lock: four-filled path still resolves media via the original helpers.
      if (allFilled) {
        const mediaResolved = resolveAllPhotoMediaTypes({
          front: { fileType: slots.front.file?.type, base64: slots.front.base64 },
          back: { fileType: slots.back.file?.type, base64: slots.back.base64 },
          left_side: { fileType: slots.left_side.file?.type, base64: slots.left_side.base64 },
          right_side: { fileType: slots.right_side.file?.type, base64: slots.right_side.base64 },
        });
        if (!mediaResolved.ok) throw new Error(mediaResolved.error);
        void buildAnalyzeRequestMediaFields(mediaResolved.mediaTypes);
      }

      const spine = await runFormaVisionAnalyzeSpine({
        photos,
        source: 'upload',
        persistScanFn: persistScan,
        analyzeTimeoutMs: ANALYZE_CLIENT_TIMEOUT_MS,
        alreadyNormalized: true,
        onGeometricMeasurements: (m) => {
          geometricMeasurementsRef.current = m;
          onGeometricMeasurements?.(m);
        },
        onViewQuality: (result) => {
          if (!isMountedRef.current) return;
          const position = POSE_ID_TO_POSITION[result.poseId];
          if (position) {
            setViewQuality((prev) => ({ ...prev, [position]: result }));
          }
        },
        isMounted: () => isMountedRef.current,
      });

      // Prompt 210l: persist the composition spine BEFORE circumference write.
      // Girth flush is POST /api/body/circumference via the shared analyzer.
      const persistRes = spine.persistRes;
      visionScanIdRef.current = spine.result?.scanId ?? null;
      const flushCirc = spine.flushCirc;
      circWritePromiseRef.current = spine.circWritePromise;
      flushCirc();
      if (!circWritePromiseRef.current) {
        for (let i = 0; i < 20 && !circWritePromiseRef.current; i++) {
          await new Promise<void>((r) => setTimeout(r, 500));
          if (!isMountedRef.current) return;
          flushCirc();
          circWritePromiseRef.current = spine.circWritePromise;
        }
      }
      if (circWritePromiseRef.current) {
        await circWritePromiseRef.current;
      }

      if (!persistRes.ok) {
        setError(
          persistRes.reason === 'timeout'
            ? 'Saving your scan is taking longer than expected. Tap Analyze again to retry save, or open FormaVision after a moment.'
            : (spine.error ??
              'Scan analysis finished but could not save to your body log. Retry Analyze to save.'),
        );
        return;
      }

      if (spine.result) {
        onComplete(spine.result);
      } else if (spine.error) {
        throw new Error(spine.error);
      }
    } catch (e) {
      setError(sanitizeAnalyzeUserError(e instanceof Error ? e.message : 'Analysis failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60">
        Upload saved images from your phone or desktop — Front, Right, Back, Left.
        Skip a view you do not have. Photos are uprighted (EXIF Orientation, or
        auto-upright when inverted) before analysis. Total body fat only; missing
        views are not invented.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POSITIONS.map((pos) => {
          const slot = slots[pos.key];
          const attached = slot.file !== null || slot.previewUrl !== null;
          const filled = slot.base64 !== null;
          const quality = viewQuality[pos.key];
          // Quality indicator: only shown when filled + quality has been assessed.
          // pass=false means the view failed quality (low-confidence results expected).
          const qualityFailed = quality !== undefined && !quality.pass;
          const qualityWarning = quality !== undefined && quality.pass && quality.issues.length > 0;
          const inputId = `scan-${pos.key}-upload`;
          return (
            <div key={pos.key} className="space-y-2">
              {/*
                One label wraps the portrait frame, the Upload affordance,
                and the opacity-0 inset overlay input. The input itself is
                the tap target (real hit geometry — never sr-only / hidden /
                h-px). Do not set capture — the OS then offers Camera |
                Photo Library. Do not add a second htmlFor label on this id.
              */}
              <label className="relative block w-full cursor-pointer">
                <span
                  data-testid={`scan-slot-frame-${pos.key}`}
                  className={`relative flex aspect-[3/4] w-full min-h-[44px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl text-xs font-medium transition-all ${
                    qualityFailed
                      ? 'border border-[#B75E18]/60 bg-[#B75E18]/10 text-[#B75E18]'
                      : attached
                        ? 'border border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                        : 'border border-dashed border-white/20 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
                  }`}
                >
                  {slot.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- object URL, not a remote asset
                    <img
                      src={slot.previewUrl}
                      alt={`${pos.label} photo`}
                      data-testid={`scan-slot-preview-${pos.key}`}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : null}
                  {attached ? (
                    <span className="relative z-10 flex flex-col items-center gap-1 rounded-md bg-black/45 px-2 py-1">
                      {qualityFailed ? (
                        <AlertTriangle size={20} strokeWidth={1.5} />
                      ) : (
                        <Check size={20} strokeWidth={1.5} />
                      )}
                      <span>{pos.label}</span>
                      {qualityFailed && (
                        <span className="text-[10px] text-[#B75E18]/90 text-center px-1 leading-tight">
                          {PHOTO_RETAKE_FOR_BEST_RESULTS}
                        </span>
                      )}
                      {qualityWarning && (
                        <span className="text-[10px] text-amber-400/80">Quality warning</span>
                      )}
                      {!qualityFailed && !qualityWarning && quality?.pass && (
                        <span className="text-[10px] text-[#2DA5A0]/80">Quality OK</span>
                      )}
                      {!quality && (
                        <span className="text-[10px] text-[#2DA5A0]/80">
                          {filled ? 'Captured' : 'Attaching'}
                        </span>
                      )}
                    </span>
                  ) : (
                    <>
                      <Camera size={20} strokeWidth={1.5} />
                      <span>{pos.label}</span>
                      <span className="text-[10px] text-white/40">Camera or gallery</span>
                    </>
                  )}
                </span>
                <span
                  data-testid={`scan-slot-upload-${pos.key}`}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center gap-1 rounded-md text-[11px] ${
                    qualityFailed ? 'text-[#B75E18]/80 font-semibold' : 'text-white/50'
                  }`}
                >
                  {attached ? (
                    <>
                      <RotateCcw size={12} strokeWidth={1.5} />
                      {qualityFailed ? 'Retake' : 'Replace'}
                    </>
                  ) : (
                    <>
                      <ImagePlus size={12} strokeWidth={1.5} />
                      Upload
                    </>
                  )}
                </span>
                <input
                  id={inputId}
                  type="file"
                  accept={SCAN_SLOT_ACCEPT}
                  data-testid={`scan-slot-input-${pos.key}`}
                  className={SCAN_SLOT_FILE_INPUT_CLASS}
                  aria-label={`${pos.label} photo, camera or library`}
                  onChange={(e) => {
                    const f = takeScanSlotFile(e.currentTarget);
                    if (f) void handleFile(pos.key, f);
                  }}
                />
              </label>
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
                {PHOTO_FLAGGED_PHOTOS_FOR_BEST_RESULTS}
              </p>
            </div>
          </div>
        );
      })()}

      <div
        data-testid="photo-estimate-explainer"
        className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/55"
      >
        <p className="font-semibold text-white/70">Photo estimate</p>
        <p className="mt-2">
          <span className="font-semibold text-white/65">What you get: </span>
          {PHOTO_WHAT_YOU_GET}
        </p>
        <p className="mt-1.5">
          <span className="font-semibold text-white/65">What you do not get: </span>
          {PHOTO_WHAT_YOU_DO_NOT_GET}
        </p>
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
          {PHOTO_UPLOADER_PRIVACY_STRIP}
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
          disabled={!anyFilled || submitting}
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
