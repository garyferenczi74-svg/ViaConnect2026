'use client';

// Prompt #170 Phase 1l: capture intent UI.
// Prompt #170a supplement §17.1: persistent "Add a card for scale" pill anchored
// below the capture controls. STATIC (no fade-on-detect) per Deviation A of
// 170a build dispatch: client-side card-shape detection is deferred to Phase 2
// (a future 170b prompt introducing native rectangle detection). The server-
// side portion-estimation pass still reports credit_card_detected on the
// analyze response so the result-screen plate selector renders correctly when
// no card was present.
//
// Two stacked buttons: Take photo (camera source) and Upload photo (gallery
// source). Both delegate to the parent's onCapture handler with a source. A
// framing-guide overlay is shown when the capture is in flight; this is a
// pure CSS rectangle to suggest the food fill the frame. The actual native
// camera shows its own preview, so this overlay is only useful on web while
// getUserMedia is being negotiated.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useState } from 'react';
import { Camera, CreditCard, Image as ImageIcon, Loader2 } from 'lucide-react';
import { detectPlatform, type CaptureResult, type CaptureSource } from '@/lib/capacitor/camera-capture';
import { WebCameraPreview } from './WebCameraPreview';

interface CameraCaptureProps {
  onCapture: (source: CaptureSource) => void;
  isCapturing: boolean;
  error: string | null;
  // Prompt 171a: web path now mounts a WebCameraPreview overlay so users can
  // frame before capture. The overlay's Confirm callback hands the result
  // back through this prop, bypassing onCapture which would re-do the capture.
  onWebCaptureResult?: (result: CaptureResult) => void;
}

export function CameraCapture({ onCapture, isCapturing, error, onWebCaptureResult }: CameraCaptureProps) {
  const [showWebPreview, setShowWebPreview] = useState(false);

  const handleTakePhoto = useCallback(() => {
    // Native iOS / Android: Capacitor camera plugin opens the system camera UI
    // which already shows a viewfinder; reuse the existing onCapture('camera')
    // path. Web: mount WebCameraPreview overlay so the user can frame.
    const platform = detectPlatform();
    if (platform === 'web' && onWebCaptureResult) {
      setShowWebPreview(true);
      return;
    }
    onCapture('camera');
  }, [onCapture, onWebCaptureResult]);

  const handleWebConfirm = useCallback(
    (result: CaptureResult) => {
      setShowWebPreview(false);
      onWebCaptureResult?.(result);
    },
    [onWebCaptureResult],
  );

  const handleWebCancel = useCallback(() => {
    setShowWebPreview(false);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-5 backdrop-blur-md">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2DA5A0]/15 text-[#2DA5A0]">
          {isCapturing
            ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />
            : <Camera className="h-6 w-6" strokeWidth={1.5} />}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            {isCapturing ? 'Opening camera...' : 'Capture your meal'}
          </p>
          <p className="mt-1 text-[11px] text-white/55">
            Fill the frame with the plate. Keep medications, ID, and personal documents out of view.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleTakePhoto}
            disabled={isCapturing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="h-4 w-4" strokeWidth={1.5} />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => onCapture('gallery')}
            disabled={isCapturing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
            Upload photo
          </button>
        </div>
        {/* §17.1 static reference-object pill. Informational, not a button. */}
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 rounded-full border border-[#2DA5A0]/30 bg-[#1E3054]/90 px-3.5 py-2.5 text-sm font-medium text-[#2DA5A0]"
        >
          <CreditCard className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Add a card for scale</span>
          <span className="sr-only">
            Tip. For best portion accuracy, place a credit card or ID card next to
            your plate before taking the photo.
          </span>
        </div>
        {error && (
          <p className="text-[11px] text-[#FCA5A5]" role="alert">{error}</p>
        )}
      </div>
      {/* Prompt 171a: web preview overlay mounted at document root via portal-
          like fixed positioning. Native iOS / Android never opens this. */}
      <WebCameraPreview
        open={showWebPreview}
        onCancel={handleWebCancel}
        onConfirm={handleWebConfirm}
      />
    </div>
  );
}
