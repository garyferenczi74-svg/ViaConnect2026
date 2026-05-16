'use client';

// CreditCardCalibrator.tsx
//
// Overlay a rectangle target on the camera preview, run the T3
// detectCreditCardAndComputeScale helper, and return the computed
// pixels-per-cm scale. On failure, falls back to user-height calibration
// via computeUserHeightScale.
//
// Props:
//   videoRef: live MediaStream video element
//   caqHeightCm: height from CAQ demographics for fallback
//   onCalibrated: called once with the CalibrationResult
//   onSkip: called when user bypasses calibration entirely

import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, CreditCard, Loader2, RotateCcw, SkipForward } from 'lucide-react';
import { detectCreditCardAndComputeScale, computeUserHeightScale } from '@/lib/body-tracker/credit-card-calibration';
import type { CalibrationResult } from '@/lib/body-tracker/scan-types';

interface CreditCardCalibratorProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  caqHeightCm: number;
  /** Called with the best available calibration result. */
  onCalibrated: (result: CalibrationResult) => void;
  /** User explicitly skips; caller should use a unity scale (1 px/cm). */
  onSkip: () => void;
}

type Phase = 'idle' | 'detecting' | 'success' | 'fallback' | 'failed';

const DETECTION_TIMEOUT_MS = 3000;

export function CreditCardCalibrator({
  videoRef,
  caqHeightCm,
  onCalibrated,
  onSkip,
}: CreditCardCalibratorProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string>('Place a credit card flat on the floor in front of you inside the rectangle, then tap Detect.');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /** Grab current frame from the video, run detection. */
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setMessage('Camera not ready. Please wait a moment and try again.');
      return;
    }

    setPhase('detecting');
    setMessage('Scanning for credit card...');

    // Snapshot the current video frame onto an offscreen canvas
    const w = video.videoWidth  || 640;
    const h = video.videoHeight || 480;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setPhase('failed');
      setMessage('Canvas context unavailable. Using height-based calibration.');
      runHeightFallback(video, w, h);
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    // Arm a timeout to fall back to height calibration
    timerRef.current = setTimeout(() => {
      setPhase('fallback');
      setMessage('Card not detected. Switching to height-based calibration.');
      runHeightFallback(video, w, h);
    }, DETECTION_TIMEOUT_MS);

    try {
      const result = await detectCreditCardAndComputeScale(imageData);
      if (timerRef.current) clearTimeout(timerRef.current);

      if (result) {
        const calibration: CalibrationResult = {
          source: 'credit_card',
          scaleFactorPxPerCm: result.scaleFactorPxPerCm,
          floorPlaneInclinationDeg: result.floorPlaneInclinationDeg,
        };
        setPhase('success');
        setMessage(`Card detected. Scale: ${result.scaleFactorPxPerCm.toFixed(1)} px/cm.`);
        onCalibrated(calibration);
      } else {
        setPhase('fallback');
        setMessage('Card not detected. Using height-based calibration.');
        runHeightFallback(video, w, h);
      }
    } catch {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase('fallback');
      setMessage('Detection error. Using height-based calibration.');
      runHeightFallback(video, w, h);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, caqHeightCm, onCalibrated]);

  /** Height-based fallback: derive scale from the video's known display height. */
  function runHeightFallback(video: HTMLVideoElement, w: number, h: number) {
    // Head crown approximation: top 10% of frame; ankle midpoint: bottom 5%
    const headCrown    = { x: w / 2, y: h * 0.05 };
    const ankleMidpoint = { x: w / 2, y: h * 0.93 };
    if (caqHeightCm > 0) {
      try {
        const { scaleFactorPxPerCm } = computeUserHeightScale(headCrown, ankleMidpoint, caqHeightCm);
        const calibration: CalibrationResult = {
          source: 'user_height',
          scaleFactorPxPerCm,
          floorPlaneInclinationDeg: null,
        };
        onCalibrated(calibration);
      } catch {
        // If height is invalid, emit unity scale
        onCalibrated({ source: 'user_height', scaleFactorPxPerCm: 1, floorPlaneInclinationDeg: null });
      }
    } else {
      onCalibrated({ source: 'user_height', scaleFactorPxPerCm: 1, floorPlaneInclinationDeg: null });
    }
  }

  function handleRetake() {
    setPhase('idle');
    setMessage('Place the card flat on the floor again inside the rectangle, then tap Detect.');
  }

  const isDetecting = phase === 'detecting';
  const isDone      = phase === 'success' || phase === 'fallback';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">
            Calibration Step
          </p>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
            Tier 1 Scan
          </h3>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-2.5 py-1">
          <Award className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold text-[#2DA5A0]">Tier 1</span>
        </div>
      </div>

      {/* Camera preview with card target overlay */}
      <div className="relative aspect-video w-full rounded-2xl border border-white/[0.08] bg-[#0B1520] overflow-hidden">
        {/* Camera feed is in the parent; this component overlays on it */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Target rectangle for card placement (bottom center, landscape card) */}
          <div
            className="absolute"
            style={{
              bottom: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
              width:  '38%',
              height: '24%',
              border: `2px solid ${phase === 'success' ? 'rgba(45,165,160,0.9)' : 'rgba(45,165,160,0.5)'}`,
              borderRadius: '6px',
              boxShadow: phase === 'success' ? '0 0 12px rgba(45,165,160,0.4)' : 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
          >
            {/* Corner accents */}
            {['top-left','top-right','bottom-left','bottom-right'].map((pos) => {
              const [v, h2] = pos.split('-') as ['top'|'bottom', 'left'|'right'];
              return (
                <span
                  key={pos}
                  className="absolute w-3 h-3"
                  style={{
                    [v]: -1,
                    [h2]: -1,
                    borderTop:    v === 'top'    ? '2px solid rgba(45,165,160,0.9)' : undefined,
                    borderBottom: v === 'bottom' ? '2px solid rgba(45,165,160,0.9)' : undefined,
                    borderLeft:   h2 === 'left'  ? '2px solid rgba(45,165,160,0.9)' : undefined,
                    borderRight:  h2 === 'right' ? '2px solid rgba(45,165,160,0.9)' : undefined,
                  }}
                />
              );
            })}
            {/* Label inside target */}
            <span className="absolute -top-5 left-0 right-0 text-center text-[9px] font-medium text-[#2DA5A0]/80">
              Credit card here
            </span>
          </div>
        </div>

        {/* Phase indicator overlay */}
        {isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-8 w-8 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
        )}
        {phase === 'success' && (
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2 rounded-xl bg-[#2DA5A0]/20 border border-[#2DA5A0]/40 px-3 py-2">
            <CreditCard className="h-4 w-4 text-[#2DA5A0] shrink-0" strokeWidth={1.5} />
            <span className="text-xs text-[#2DA5A0] font-medium">Card calibration complete</span>
          </div>
        )}
        {phase === 'fallback' && (
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-3 py-2">
            <Award className="h-4 w-4 text-yellow-400 shrink-0" strokeWidth={1.5} />
            <span className="text-xs text-yellow-300/80 font-medium">Height-based calibration active</span>
          </div>
        )}
      </div>

      <p className="text-xs text-white/60 leading-relaxed">{message}</p>

      {/* Actions */}
      {!isDone ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={runDetection}
            disabled={isDetecting}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-3 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[48px] disabled:opacity-50"
          >
            {isDetecting
              ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              : <CreditCard className="h-4 w-4" strokeWidth={1.5} />
            }
            {isDetecting ? 'Detecting' : 'Detect card'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={isDetecting}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-transparent px-4 py-3 text-sm font-medium text-white/55 hover:bg-white/[0.04] min-h-[48px] disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" strokeWidth={1.5} />
            Skip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleRetake}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/[0.08] min-h-[48px]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            Retake
          </button>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-4 py-3 text-sm font-semibold text-[#2DA5A0] min-h-[48px]">
            <Award className="h-4 w-4" strokeWidth={1.5} />
            Calibrated
          </div>
        </div>
      )}
    </div>
  );
}
