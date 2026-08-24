'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Minus, Package, SkipForward, RotateCcw, Smartphone } from 'lucide-react';
import { SilhouetteOverlay } from './SilhouetteOverlay';
import { processPhoto } from './photoProcessing';
import { CAPTURE_TIPS, type PoseDefinition } from './poseConstants';

// Reference-object opt-in state passed to the parent via callback.
export interface ReferenceObjectParams {
  enabled: boolean;
  /** Known longest dimension of the reference object in cm, or null when not set. */
  knownSizeCm: number | null;
}

// Built-in reference-object presets for common objects.
const REFERENCE_PRESETS: Array<{ label: string; sizeCm: number }> = [
  { label: 'Credit card (long edge)', sizeCm: 8.56 },
  { label: 'A4 paper (long edge)',    sizeCm: 29.7 },
  { label: 'US Letter (long edge)',   sizeCm: 27.94 },
  { label: 'Custom',                  sizeCm: 0 },
];

interface PoseGuideProps {
  pose: PoseDefinition;
  stepLabel: string;
  existingPreviewUrl: string | null;
  onCaptured: (full: Blob, thumb: Blob) => Promise<void>;
  onSkip: () => void;
  onRetake: () => void;
  /**
   * Task 13b (Task C) - Reference-object opt-in callback.
   * Called whenever the reference-object toggle or size input changes.
   * Omit (or pass undefined) to hide the reference-object section entirely.
   * The pipeline seam: the parent passes this data toward scaleFromReference
   * (referenceObjectScale.ts) when the user opts in. Remaining wiring is noted
   * below (see WIRING NOTE).
   */
  onReferenceObjectChange?: (params: ReferenceObjectParams) => void;
}

// Per-pose camera orientation label for the UI badge.
const POSE_CAMERA_HINT: Record<string, string> = {
  front: 'Camera faces you',
  back:  'Camera behind you',
  left:  'Camera on your right',
  right: 'Camera on your left',
};

export function PoseGuide({ pose, stepLabel, existingPreviewUrl, onCaptured, onSkip, onRetake, onReferenceObjectChange }: PoseGuideProps) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingPreviewUrl);
  const [error, setError] = useState<string | null>(null);

  // Task 13b Task C: reference-object opt-in state (OFF by default).
  const [refEnabled, setRefEnabled] = useState(false);
  const [refPresetIdx, setRefPresetIdx] = useState(0);
  const [refCustomCm, setRefCustomCm] = useState<string>('');
  const isCustomPreset = REFERENCE_PRESETS[refPresetIdx]?.sizeCm === 0;

  function notifyRefChange(enabled: boolean, presetIdx: number, customVal: string) {
    if (!onReferenceObjectChange) return;
    const preset = REFERENCE_PRESETS[presetIdx];
    let sizeCm: number | null = null;
    if (enabled) {
      if (preset && preset.sizeCm > 0) {
        sizeCm = preset.sizeCm;
      } else {
        const parsed = parseFloat(customVal);
        sizeCm = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      }
    }
    onReferenceObjectChange({ enabled, knownSizeCm: sizeCm });
  }

  function handleRefToggle(enabled: boolean) {
    setRefEnabled(enabled);
    notifyRefChange(enabled, refPresetIdx, refCustomCm);
  }

  function handleRefPreset(idx: number) {
    setRefPresetIdx(idx);
    notifyRefChange(refEnabled, idx, refCustomCm);
  }

  function handleRefCustom(val: string) {
    setRefCustomCm(val);
    notifyRefChange(refEnabled, refPresetIdx, val);
  }

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const pair = await processPhoto(file);
      const url = URL.createObjectURL(pair.full);
      setPreview(url);
      await onCaptured(pair.full, pair.thumb);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Processing failed');
    } finally {
      setBusy(false);
    }
  }

  function clickCamera() { cameraRef.current?.click(); }
  function clickGallery() { galleryRef.current?.click(); }

  const cameraHint = POSE_CAMERA_HINT[pose.id] ?? '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">{stepLabel}</p>
          <h3 className="text-base font-bold text-white">{pose.label}</h3>
        </div>
        {/* Task 13b Task A: camera placement badge (orientation hint) */}
        {cameraHint && (
          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#1A2744] px-2.5 py-1">
            <Camera className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
            <span className="text-[10px] text-white/60 whitespace-nowrap">{cameraHint}</span>
          </div>
        )}
      </div>

      {/* Capture area: silhouette overlay + level indicator */}
      <div className="relative aspect-[2/5] w-full max-w-xs mx-auto rounded-2xl border border-white/[0.08] bg-[#0B1520] overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${pose.label} preview`} className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[11px] text-white/40 text-center px-4">
                Align your body within the outline from head to feet.
              </p>
            </div>
            <SilhouetteOverlay pose={pose.id} className="absolute inset-0 w-full h-full" />

            {/* Task 13b Task A: level indicator overlay (bottom strip) */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 pointer-events-none">
              {/* Horizontal reference line */}
              <div className="h-px w-12 bg-[#2DA5A0]/30" />
              <div className="flex items-center gap-1 rounded-full bg-[#1A2744]/80 px-2.5 py-1">
                <Smartphone className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
                <Minus className="h-2.5 w-2.5 text-[#2DA5A0]/70" strokeWidth={1.5} />
                <span className="text-[9px] text-white/60 uppercase tracking-wide font-medium">Hold level</span>
              </div>
              <div className="h-px w-12 bg-[#2DA5A0]/30" />
            </div>
          </>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <p className="text-xs text-white/70 leading-relaxed">{pose.instruction}</p>

      <details className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/55">
        <summary className="cursor-pointer text-white/75">Capture tips</summary>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          {CAPTURE_TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </details>

      {/* Task 13b Task C: reference-object opt-in (only rendered when parent supplies the callback) */}
      {onReferenceObjectChange && (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={refEnabled}
              onChange={(e) => handleRefToggle(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#2DA5A0]"
            />
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
              <span className="text-xs text-white/75">
                Include a reference object for scale (optional)
              </span>
            </div>
          </label>

          {refEnabled && (
            <div className="pl-6 space-y-2">
              <p className="text-[10px] text-white/45 leading-snug">
                Place a known-size object next to you in the photo. This provides an
                independent scale anchor and may improve measurement accuracy.
              </p>
              <div className="space-y-1.5">
                <label className="block text-[10px] text-white/55 uppercase tracking-wide">
                  Reference object
                </label>
                <select
                  value={refPresetIdx}
                  onChange={(e) => handleRefPreset(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/[0.12] bg-[#1A2744] px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[#2DA5A0]/40"
                >
                  {REFERENCE_PRESETS.map((p, i) => (
                    <option key={p.label} value={i}>{p.label}</option>
                  ))}
                </select>
                {isCustomPreset && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      placeholder="Size in cm"
                      value={refCustomCm}
                      onChange={(e) => handleRefCustom(e.target.value)}
                      className="flex-1 rounded-lg border border-white/[0.12] bg-[#1A2744] px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[#2DA5A0]/40 placeholder:text-white/30"
                    />
                    <span className="text-[10px] text-white/45">cm</span>
                  </div>
                )}
              </div>
              {/* WIRING NOTE: onReferenceObjectChange fires with the current params.
                  The parent should pass enabled + knownSizeCm toward scaleFromReference
                  in referenceObjectScale.ts via the reconcileScale path (Task 4/T5).
                  Full pipeline wiring (reconcileScale -> measurementEngine) is a
                  follow-up step; this UI + prop seam is the complete Task 13b T5 deliverable. */}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

      {!preview ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={clickCamera}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-3 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[48px] disabled:opacity-50"
          >
            <Camera className="h-4 w-4" strokeWidth={1.5} />
            Camera
          </button>
          <button
            type="button"
            onClick={clickGallery}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/[0.08] min-h-[48px] disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
            Upload
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-transparent px-4 py-3 text-sm font-medium text-white/55 hover:bg-white/[0.04] min-h-[48px] disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" strokeWidth={1.5} />
            Skip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setPreview(null); onRetake(); }}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/[0.08] min-h-[48px]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            Retake
          </button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
    </div>
  );
}
