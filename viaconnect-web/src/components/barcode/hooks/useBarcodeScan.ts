/**
 * Prompt 175j (2026-06-05): useBarcodeScan hook, zxing-wasm backend.
 *
 * Originally wrapped html5-qrcode 2.3.x (170l Phase 1c-1). After a day of
 * spinning on iOS Safari decode failures (175c through 175i), agent
 * research surfaced that html5-qrcode has a documented, unfixed iPhone
 * 1D-decode regression with ~9 open issues going back to 2022 and the
 * exact symptom signature my Vercel telemetry showed (camera attaches,
 * getState reports SCANNING, zero decodes). 175j swaps to zxing-wasm
 * v3.1.0 (released June 1 2026) which is the WASM-compiled ZXing
 * decoder used by production retail apps; the public hook API is
 * preserved so SupplementBarcodeOverlay and NutriVision's
 * BarcodeScannerOverlay see no breaking change.
 *
 * Pattern (per agent research, see prompt 175j commit body):
 *   1. Raw video element created on demand, mounted into the existing
 *      BARCODE_SCANNER_ELEMENT_ID container.
 *   2. getUserMedia({ facingMode: { ideal: 'environment' },
 *      width: 1920 ideal, height: 1080 ideal }) attaches a high-res
 *      stream. iOS gotchas handled: playsinline + muted + autoplay set
 *      as HTML attributes; video.play() awaited.
 *   3. requestAnimationFrame loop draws each video frame to a hidden
 *      canvas (willReadFrequently: true for ~5x throughput on Safari),
 *      reads ImageData, calls zxing-wasm readBarcodes with
 *      tryHarder: true and the per-caller formats list.
 *   4. Full-frame decode, NOT a cropped region. ZXing's 1D decoders
 *      need the start + end guard bars and any crop excludes them at
 *      handheld distance (the actual root cause of 175c-175i's
 *      failure to decode UPC-A bottles).
 *   5. On hit, single-fire via stopped flag; release stream tracks
 *      explicitly so the iOS camera-active indicator clears.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ReaderOptions,
  ReadResult,
  ReadInputBarcodeFormat,
} from 'zxing-wasm/reader';
import type { BarcodeDecodedResult, BarcodeFormat } from '@/lib/nutrition/barcode/types';

// =============================================================================
// Public re-exports kept for backward compatibility with callers.
// =============================================================================

/**
 * DOM id the overlay components reserve for the scanner viewport. The
 * hook mounts its own video element into this container at start() and
 * removes it at stop(). Stable across html5-qrcode -> zxing-wasm swap
 * so SupplementBarcodeOverlay and BarcodeScannerOverlay keep rendering
 * the same div.
 */
export const BARCODE_SCANNER_ELEMENT_ID = 'barcode-scanner-viewport';

/**
 * Numeric format ids kept as named constants for backward compatibility
 * with callers that imported HTML5_QRCODE_FORMATS by name. The numeric
 * values are no longer fed to a library; SUPPLEMENT_BARCODE_FORMATS now
 * carries zxing-wasm string ids instead. New code should import
 * SUPPLEMENT_BARCODE_FORMATS directly.
 *
 * @deprecated Use SUPPLEMENT_BARCODE_FORMATS instead. These numeric
 * constants are retained only because existing tests probe them.
 */
export const HTML5_QRCODE_FORMATS = {
  QR_CODE: 0,
  CODE_128: 5,
  CODE_39: 6,
  CODE_93: 7,
  EAN_13: 11,
  EAN_8: 12,
  ITF: 13,
  UPC_A: 14,
  UPC_E: 15,
  UPC_EAN_EXTENSION: 16,
} as const;

/**
 * Symbology set for retail product barcodes. zxing-wasm string format
 * names (the contract changed from the html5-qrcode numeric ids; existing
 * callers pass this through to the hook so no import-site changes are
 * required, only the internal type is different).
 */
export const SUPPLEMENT_BARCODE_FORMATS: ReadonlyArray<ReadInputBarcodeFormat> = [
  'UPCA',
  'UPCE',
  'EAN13',
  'EAN8',
  'Code128',
  'ITF',
];

/**
 * Prompt 175e Section 2.2: classify a getUserMedia error as
 * OverconstrainedError. Used to drive the environment-to-any
 * fallback retry inside start(). DOM error name first; message
 * substring as fallback for the wrapped string shapes some
 * platforms produce.
 */
export function isOverconstrainedError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'OverconstrainedError') return true;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('overconstrained')
    || lower.includes('constraint')
  );
}

// =============================================================================
// Types
// =============================================================================

export type BarcodeScanState =
  | 'idle'
  | 'requesting_permission'
  | 'scanning'
  | 'detected'
  | 'permission_denied'
  | 'error';

type CameraConstraintsArg =
  | { facingMode: string }
  | {
      facingMode?: string | { ideal?: string; exact?: string };
      width?: { ideal?: number; min?: number };
      height?: { ideal?: number; min?: number };
      frameRate?: { ideal?: number };
    };

export interface UseBarcodeScanOptions {
  onDetect: (result: BarcodeDecodedResult) => void;
  onError?: (error: Error) => void;
  /**
   * Per-frame "no scan yet" hook so callers can prove the decode loop
   * is iterating. Fires once per rAF tick when no code was found.
   */
  onFrameAttempt?: () => void;
  config?: {
    /**
     * Camera constraints for the initial getUserMedia call. iOS
     * Safari is happiest with a string facingMode; resolution hints
     * apply post-attach via track.applyConstraints inside the
     * overlay (175e Section 2.1).
     */
    cameraConstraints?: CameraConstraintsArg;
    /**
     * zxing-wasm symbology hints. Defaults to the supplement set
     * (UPC-A / UPC-E / EAN-13 / EAN-8 / Code128 / ITF). Restricting
     * formats reduces ZXing latency per frame and false positives.
     */
    formatsToSupport?: ReadonlyArray<ReadInputBarcodeFormat>;
    /**
     * @deprecated Kept for backward-compat with the html5-qrcode era.
     * 1D barcode decode needs the FULL frame to capture start/end
     * guard bars; the hook ignores any qrbox value and decodes the
     * full frame.
     */
    qrbox?: { width: number; height: number } | ((vw: number, vh: number) => { width: number; height: number }) | null;
    /**
     * @deprecated zxing-wasm runs on a rAF loop; the fps cap from the
     * html5-qrcode era is no longer meaningful and is ignored.
     */
    fps?: number;
    /**
     * @deprecated html5-qrcode took an aspectRatio hint; getUserMedia
     * negotiates this from width/height. Ignored.
     */
    aspectRatio?: number;
    /**
     * @deprecated html5-qrcode-specific. zxing-wasm always uses its
     * own decoder; the browser's BarcodeDetector is not consulted.
     */
    useBarCodeDetectorIfSupported?: boolean;
  };
}

export interface UseBarcodeScanResult {
  state: BarcodeScanState;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  toggleFlashlight: () => Promise<boolean>;
  flashlightOn: boolean;
  /**
   * Backwards-compat shim for the html5-qrcode telemetry that 175g
   * shipped. Returns 2 (the old SCANNING enum value) while the loop
   * is active so existing diagnostic queries keep matching; null
   * otherwise.
   */
  queryHtml5QrcodeState: () => number | null;
}

// =============================================================================
// Internal helpers
// =============================================================================

const DEFAULT_FORMATS = SUPPLEMENT_BARCODE_FORMATS;

interface ActiveScanner {
  video: HTMLVideoElement;
  stream: MediaStream;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  rafId: number;
  stopped: boolean;
}

function mapZxingFormat(f: ReadResult['format']): BarcodeFormat | null {
  switch (f) {
    case 'UPCA':    return 'UPC_A';
    case 'UPCE':    return 'UPC_E';
    case 'EAN13':   return 'EAN_13';
    case 'EAN8':    return 'EAN_8';
    case 'ITF':     return 'ITF_14';
    case 'ITF14':   return 'ITF_14';
    case 'Code128': return 'CODE_128';
    default:        return null;
  }
}

let zxingModulePrepared = false;
async function ensureZxingPrepared(): Promise<void> {
  if (zxingModulePrepared) return;
  const { prepareZXingModule } = await import('zxing-wasm/reader');
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? `/wasm/${path}` : prefix + path,
    },
  });
  zxingModulePrepared = true;
}

// =============================================================================
// Hook
// =============================================================================

export function useBarcodeScan(opts: UseBarcodeScanOptions): UseBarcodeScanResult {
  const [state, setState] = useState<BarcodeScanState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const scannerRef = useRef<ActiveScanner | null>(null);

  const onDetectRef = useRef(opts.onDetect);
  const onErrorRef = useRef(opts.onError);
  const onFrameAttemptRef = useRef(opts.onFrameAttempt);
  useEffect(() => {
    onDetectRef.current = opts.onDetect;
    onErrorRef.current = opts.onError;
    onFrameAttemptRef.current = opts.onFrameAttempt;
  }, [opts.onDetect, opts.onError, opts.onFrameAttempt]);

  const stop = useCallback(async () => {
    const active = scannerRef.current;
    scannerRef.current = null;
    if (active) {
      active.stopped = true;
      try { cancelAnimationFrame(active.rafId); } catch { /* noop */ }
      try {
        active.stream.getTracks().forEach((t) => {
          try { t.stop(); } catch { /* noop */ }
        });
      } catch { /* noop */ }
      try {
        active.video.srcObject = null;
        active.video.remove();
      } catch { /* noop */ }
    }
    setFlashlightOn(false);
    setState('idle');
  }, []);

  const start = useCallback(async () => {
    if (typeof document === 'undefined') return;
    const container = document.getElementById(BARCODE_SCANNER_ELEMENT_ID);
    if (!container) {
      setError('scanner_mount_missing');
      setState('error');
      return;
    }

    setState('requesting_permission');
    setError(null);

    try {
      await ensureZxingPrepared();
      const { readBarcodes } = await import('zxing-wasm/reader');

      const callerConfig = opts.config ?? {};
      const cameraConstraints: CameraConstraintsArg =
        callerConfig.cameraConstraints ?? { facingMode: 'environment' };
      const formats: ReadOnlyArrayLike<ReadInputBarcodeFormat> =
        callerConfig.formatsToSupport ?? DEFAULT_FORMATS;

      // Build the video element. iOS Safari REQUIRES playsinline +
      // muted + autoplay as HTML attributes (175j Section "iOS gotchas
      // 1-3"). Setting just the property is not enough on older Safari.
      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('muted', 'true');
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      // Replace the container's children with this video so duplicate
      // mounts (e.g. dev double-render) do not stack streams.
      container.replaceChildren(video);

      // Request the stream. Environment-to-any fallback per 175e Section
      // 2.2: if the first attempt OverconstrainedErrors, retry with bare
      // video: true. NotAllowedError / NotFoundError bubble up.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraConstraints as MediaTrackConstraints,
          audio: false,
        });
      } catch (firstErr) {
        if (isOverconstrainedError(firstErr)) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw firstErr;
        }
      }

      video.srcObject = stream;
      // iOS rejects play() promises silently when not awaited; without
      // awaiting, readyState may never reach HAVE_CURRENT_DATA and the
      // rAF loop draws blank frames forever. This is one of the two
      // root causes of the 175c-175i 175h "SCANNING but no decode"
      // symptom.
      try { await video.play(); } catch { /* iOS sometimes rejects after gesture */ }

      // Build the off-DOM canvas the rAF loop draws into.
      // willReadFrequently: true is required on Safari to keep
      // getImageData on the CPU path (175j Section "iOS gotchas 6").
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        // Treat a missing 2D context as a init failure; very rare path.
        stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* noop */ } });
        setState('error');
        setError('canvas_unavailable');
        return;
      }

      const active: ActiveScanner = {
        video,
        stream,
        canvas,
        ctx,
        rafId: 0,
        stopped: false,
      };
      scannerRef.current = active;

      // Prompt 175k (2026-06-05): rAF loop uses the captured active
      // closure only; the prior 175j version queried scannerRef.current
      // at the top of every tick and returned WITHOUT requeueing on a
      // null read. Any external stop() or remount nulled the ref and
      // killed the loop after a single tick. With the closure pattern
      // the loop exits only on active.stopped or on a detected match,
      // and the requeue is unconditional in every other path.
      const readerOptions: ReaderOptions = {
        formats: formats as ReadInputBarcodeFormat[],
        tryHarder: true,
        maxNumberOfSymbols: 1,
      };
      const tick = async (): Promise<void> => {
        if (active.stopped) return;
        // If a newer scanner has taken over (re-mount / re-start), this
        // stale closure must yield. Mark stopped so any in-flight async
        // returns early and the loop dies without surfacing a result.
        if (scannerRef.current !== active) {
          active.stopped = true;
          return;
        }
        try {
          if (
            active.video.readyState >= 2
            && active.video.videoWidth > 0
            && active.video.videoHeight > 0
          ) {
            active.canvas.width = active.video.videoWidth;
            active.canvas.height = active.video.videoHeight;
            active.ctx.drawImage(active.video, 0, 0);
            const img = active.ctx.getImageData(0, 0, active.canvas.width, active.canvas.height);
            try { onFrameAttemptRef.current?.(); } catch { /* noop */ }
            const results = await readBarcodes(img, readerOptions);
            if (active.stopped) return;
            if (results.length > 0) {
              const r = results[0];
              const mapped = mapZxingFormat(r.format);
              if (mapped !== null && r.text) {
                setState('detected');
                onDetectRef.current({
                  value: r.text,
                  format: mapped,
                  decoder: 'zxing_wasm',
                  decoder_latency_ms: 0,
                });
                return; // single-fire; caller drives stop()
              }
            }
          }
        } catch {
          // Decode errors are normal for frames without a code; swallow.
        }
        if (!active.stopped) {
          active.rafId = requestAnimationFrame(() => { void tick(); });
        }
      };
      active.rafId = requestAnimationFrame(() => { void tick(); });

      setState('scanning');
    } catch (err) {
      const errName = err instanceof Error ? err.name : '';
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (
        errName === 'NotAllowedError'
        || lower.includes('permission')
        || lower.includes('notallowed')
        || lower.includes('denied')
      ) {
        setState('permission_denied');
        setError('permission_denied');
      } else if (
        errName === 'NotFoundError'
        || lower.includes('notfound')
        || lower.includes('no camera')
      ) {
        setState('error');
        setError('no_camera_hardware');
      } else if (
        errName === 'NotReadableError'
        || lower.includes('notreadable')
        || lower.includes('in use')
      ) {
        setState('error');
        setError('camera_in_use');
      } else {
        setState('error');
        setError('scanner_init_failed');
      }
      if (err instanceof Error) onErrorRef.current?.(err);
    }
  // start does not depend on opts.config because opts.config is stable
  // for a given mount; callers that need to change config remount the
  // hook by toggling open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFlashlight = useCallback(async (): Promise<boolean> => {
    const active = scannerRef.current;
    if (!active) return false;
    const track = active.stream.getVideoTracks()[0];
    if (!track) return false;
    try {
      const next = !flashlightOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setFlashlightOn(next);
      return next;
    } catch {
      return flashlightOn;
    }
  }, [flashlightOn]);

  // Unmount cleanup so a hot-reload or component-tree teardown does not
  // leave a stream live.
  useEffect(() => {
    return () => {
      const active = scannerRef.current;
      scannerRef.current = null;
      if (active) {
        active.stopped = true;
        try { cancelAnimationFrame(active.rafId); } catch { /* noop */ }
        try { active.stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* noop */ } }); } catch { /* noop */ }
      }
    };
  }, []);

  // Backwards-compat: 175g shipped a queryHtml5QrcodeState() field on
  // the hook return so the telemetry could read the html5-qrcode internal
  // enum (NOT_STARTED=1, SCANNING=2, PAUSED=3). Existing logs query for
  // "html5QrcodeState":2; keep the matcher truthful by returning 2 while
  // an active scanner exists.
  const queryHtml5QrcodeState = useCallback((): number | null => {
    if (!scannerRef.current) return null;
    return 2;
  }, []);

  return { state, error, start, stop, toggleFlashlight, flashlightOn, queryHtml5QrcodeState };
}

// =============================================================================
// Local helper type
// =============================================================================

type ReadOnlyArrayLike<T> = ReadonlyArray<T>;
