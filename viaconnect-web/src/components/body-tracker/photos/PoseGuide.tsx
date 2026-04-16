'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, SkipForward, RotateCcw } from 'lucide-react';
import { SilhouetteOverlay } from './SilhouetteOverlay';
import { processPhoto } from './photoProcessing';
import { CAPTURE_TIPS, type PoseDefinition } from './poseConstants';

interface PoseGuideProps {
  pose: PoseDefinition;
  stepLabel: string;
  existingPreviewUrl: string | null;
  onCaptured: (full: Blob, thumb: Blob) => Promise<void>;
  onSkip: () => void;
  onRetake: () => void;
}

export function PoseGuide({ pose, stepLabel, existingPreviewUrl, onCaptured, onSkip, onRetake }: PoseGuideProps) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingPreviewUrl);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">{stepLabel}</p>
          <h3 className="text-base font-bold text-white">{pose.label}</h3>
        </div>
      </div>

      <div className="relative aspect-[2/5] w-full max-w-xs mx-auto rounded-2xl border border-white/[0.08] bg-[#0B1520] overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${pose.label} preview`} className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[11px] text-white/40 text-center px-4">
                Use the outline as a guide. Position yourself within the shape.
              </p>
            </div>
            <SilhouetteOverlay pose={pose.id} className="absolute inset-0 w-full h-full" />
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
