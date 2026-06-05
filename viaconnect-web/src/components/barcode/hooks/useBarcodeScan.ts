/**
 * Prompt 170l Phase 1c-1: useBarcodeScan hook.
 *
 * Wraps html5-qrcode (already installed at package.json line 55) and exposes
 * a stable scan lifecycle: idle > requesting permission > scanning > detected.
 * The hook handles permission flow, decoder lifecycle, and reports decoded
 * BarcodeDecodedResult through the onDetect callback.
 *
 * QR codes and unsupported barcode types are silently rejected so the user
 * sees no "false" detections that aren't EAN-13 / UPC-A / EAN-8 / ITF-14.
 *
 * Per Gate 1: html5-qrcode is the web decoder; native ML Kit lands Phase 1c-5.
 * For now html5-qrcode is the sole decoder via the 'html5_qrcode' decoder kind.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BarcodeDecodedResult, BarcodeFormat } from '@/lib/nutrition/barcode/types';

// html5-qrcode is dynamically imported inside start() to avoid SSR issues:
// the library references `window` and `document` at module load time and the
// existing src/components/shared/BarcodeScanner.tsx uses the same pattern.
// Prompt 175d (2026-06-05): constructor config widened to accept
// formatsToSupport + experimentalFeatures so callers can restrict the
// decoder to a known set of symbologies (faster + fewer false reads)
// and opt in to the native BarcodeDetector on Chrome.
type Html5QrcodeCtor = new (
  elementId: string,
  config: {
    verbose: boolean;
    formatsToSupport?: ReadonlyArray<number>;
    experimentalFeatures?: { useBarCodeDetectorIfSupported?: boolean };
  },
) => Html5QrcodeInstance;

// Prompt 175d: html5-qrcode 2.x Html5QrcodeSupportedFormats numeric ids.
// Imported as constants so callers do not have to pull the runtime enum
// just to specify which symbologies to scan. Verified against html5-qrcode
// 2.3.x type declarations; the numeric values are stable across the 2.x
// line. Spec 175d Section 2.3: enable UPC_A, UPC_E, EAN_13, EAN_8,
// CODE_128, ITF at minimum.
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

// Default symbology set for product barcodes. Used by the CAQ
// supplement overlay; other call sites can override via
// UseBarcodeScanOptions.config.formatsToSupport.
export const SUPPLEMENT_BARCODE_FORMATS = [
  HTML5_QRCODE_FORMATS.UPC_A,
  HTML5_QRCODE_FORMATS.UPC_E,
  HTML5_QRCODE_FORMATS.EAN_13,
  HTML5_QRCODE_FORMATS.EAN_8,
  HTML5_QRCODE_FORMATS.CODE_128,
  HTML5_QRCODE_FORMATS.ITF,
] as ReadonlyArray<number>;

// Prompt 175c (2026-06-05): qrbox is optional on the underlying library
// so callers can opt out of html5-qrcode's internal viewfinder mask
// (NutriVision's BarcodeScannerOverlay keeps the default mask; the CAQ
// supplement overlay sets qrbox: undefined and draws its own reticle so
// only one framing element renders per iOS Safari fix).
type QrboxValue =
  | { width: number; height: number }
  | ((viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number })
  | undefined;

// Prompt 175d (2026-06-05): cameraConstraints widened to a real
// MediaTrackConstraints shape so callers can request a high-resolution
// environment-facing track (Section 2.4: do not downscale before decode).
type CameraConstraintsArg =
  | { facingMode: string }
  | {
      facingMode?: string | { ideal?: string; exact?: string };
      width?: { ideal?: number; min?: number };
      height?: { ideal?: number; min?: number };
      frameRate?: { ideal?: number };
    };

interface Html5QrcodeInstance {
  start: (
    cameraConstraints: CameraConstraintsArg,
    config: {
      fps: number;
      qrbox?: QrboxValue;
      aspectRatio?: number;
      disableFlip?: boolean;
    },
    onSuccess: (
      decodedText: string,
      decodedResult: { result?: { format?: { format?: string } } },
    ) => void,
    onFrame: () => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  // Prompt 175c (2026-06-05): html5-qrcode's clear() returns
  // Promise<void> per its 2.x types; the prior local declaration of
  // Promise<void> | void allowed a void inference path that prevented
  // .catch from typechecking on the unmount cleanup.
  clear: () => Promise<void>;
  applyVideoConstraints: (constraints: MediaTrackConstraints) => Promise<void>;
}

export const BARCODE_SCANNER_ELEMENT_ID = 'barcode-scanner-viewport';

// Prompt 175d (2026-06-05): post-decode filter widened to UPC_E +
// CODE_128 so html5-qrcode reads of those symbologies are not silently
// dropped after the constructor's formatsToSupport widens to the full
// SUPPLEMENT_BARCODE_FORMATS list.
const SUPPORTED_HTML5_QRCODE_FORMATS = new Set([
  'EAN_13',
  'UPC_A',
  'UPC_E',
  'EAN_8',
  'ITF',
  'CODE_128',
]);

function formatFromHtml5Code(code: string): BarcodeFormat | null {
  switch (code) {
    case 'EAN_13': return 'EAN_13';
    case 'UPC_A': return 'UPC_A';
    case 'UPC_E': return 'UPC_E';
    case 'EAN_8': return 'EAN_8';
    case 'ITF': return 'ITF_14';
    case 'CODE_128': return 'CODE_128';
    default: return null;
  }
}

/**
 * Prompt 175e Section 2.2: detect an OverconstrainedError from any of
 * the surface shapes html5-qrcode and the WebRTC stack produce. The
 * DOM error name is the most reliable signal; the library sometimes
 * wraps the error in a string with the constraint name, so a message
 * substring match is the fallback. Exported for unit-testing the
 * environment-to-any fallback classifier without standing up the
 * scanner.
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

export type BarcodeScanState =
  | 'idle'
  | 'requesting_permission'
  | 'scanning'
  | 'detected'
  | 'permission_denied'
  | 'error';

export interface UseBarcodeScanOptions {
  onDetect: (result: BarcodeDecodedResult) => void;
  onError?: (error: Error) => void;
  /**
   * Prompt 175f Section 2.1 + 11.O: per-frame "no scan yet" hook so the
   * caller can prove the decode loop is actually iterating. html5-qrcode
   * invokes the underlying callback for every frame it analyzed without
   * producing a result, so the count here divided by elapsed time is
   * the empirical decode-attempt rate. Optional; absence is a no-op.
   */
  onFrameAttempt?: () => void;
  /**
   * Prompt 175c (2026-06-05): per-caller override of html5-qrcode start
   * config. Defaults preserve the NutriVision behavior (qrbox 280x96, fps
   * 10, aspectRatio 1.777). The supplement-vision overlay passes
   * { qrbox: null } to opt out of the internal viewfinder mask so only
   * the overlay's own teal reticle is visible.
   */
  config?: {
    /**
     * Pass null to omit qrbox entirely (no internal mask + full-frame
     * scanning). Pass an object or a function to override the default
     * 280x96 box.
     */
    qrbox?: { width: number; height: number } | ((vw: number, vh: number) => { width: number; height: number }) | null;
    fps?: number;
    aspectRatio?: number;
    /**
     * Prompt 175d (2026-06-05): per-caller camera constraints. Defaults
     * to { facingMode: 'environment' } for the food scanner which works
     * fine at the auto-negotiated resolution. The supplement scanner
     * passes high-resolution hints (width + height ideal 1920 + 1080)
     * so UPC-A bars have enough pixels per module to decode.
     */
    cameraConstraints?: CameraConstraintsArg;
    /**
     * Prompt 175d Section 2.3: per-caller symbology hints. When set,
     * html5-qrcode restricts the decoder to these formats only, which
     * improves both decode speed and false-positive resistance. Use
     * SUPPLEMENT_BARCODE_FORMATS for the standard product barcode set.
     */
    formatsToSupport?: ReadonlyArray<number>;
    /**
     * Prompt 175d: enable html5-qrcode's experimental native
     * BarcodeDetector path when the browser supports it. Chrome and
     * Edge on Android implement it; iOS Safari does not, so this is
     * a no-op on iOS and a speed-up everywhere else.
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
}

export function useBarcodeScan(opts: UseBarcodeScanOptions): UseBarcodeScanResult {
  const [state, setState] = useState<BarcodeScanState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const lastDetectionAtRef = useRef<number>(0);

  const onDetectRef = useRef(opts.onDetect);
  const onErrorRef = useRef(opts.onError);
  const onFrameAttemptRef = useRef(opts.onFrameAttempt);
  useEffect(() => {
    onDetectRef.current = opts.onDetect;
    onErrorRef.current = opts.onError;
    onFrameAttemptRef.current = opts.onFrameAttempt;
  }, [opts.onDetect, opts.onError, opts.onFrameAttempt]);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        // benign: scanner may already be stopped
      }
    }
    setFlashlightOn(false);
    setState('idle');
  }, []);

  const start = useCallback(async () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(BARCODE_SCANNER_ELEMENT_ID);
    if (!el) {
      setError('scanner_mount_missing');
      setState('error');
      return;
    }

    setState('requesting_permission');
    setError(null);

    try {
      if (!scannerRef.current) {
        const mod = (await import('html5-qrcode')) as unknown as {
          Html5Qrcode: Html5QrcodeCtor;
        };
        // Prompt 175d: pass formatsToSupport + experimentalFeatures at
        // construction time. The library applies these for the lifetime
        // of the instance, so any later start() inherits them.
        const callerCtor = opts.config ?? {};
        scannerRef.current = new mod.Html5Qrcode(BARCODE_SCANNER_ELEMENT_ID, {
          verbose: false,
          formatsToSupport: callerCtor.formatsToSupport,
          experimentalFeatures: callerCtor.useBarCodeDetectorIfSupported
            ? { useBarCodeDetectorIfSupported: true }
            : undefined,
        });
      }

      lastDetectionAtRef.current = performance.now();

      // Prompt 175c: resolve per-caller config overrides. Default values
      // preserve NutriVision's existing scan behavior. qrbox === null
      // (explicit) opts out of html5-qrcode's internal viewfinder mask.
      const callerConfig = opts.config ?? {};
      const startConfig: {
        fps: number;
        qrbox?: QrboxValue;
        aspectRatio?: number;
        disableFlip?: boolean;
      } = {
        fps: callerConfig.fps ?? 10,
        aspectRatio: callerConfig.aspectRatio ?? 1.777,
        disableFlip: true,
      };
      if (callerConfig.qrbox !== null) {
        startConfig.qrbox = callerConfig.qrbox ?? { width: 280, height: 96 };
      }

      // Prompt 175d Section 2.4 + 175e Section 2.1: per-caller camera
      // constraints with a safe default of just facingMode for backward
      // compatibility. The supplement scanner now passes a string
      // facingMode (no resolution / torch / focus) per 175e Section 2.1.
      const cameraConstraints: CameraConstraintsArg =
        callerConfig.cameraConstraints ?? { facingMode: 'environment' };

      const successCallback = (decodedText: string, decodedResult: { result?: { format?: { format?: string } } }) => {
        const rawFormat = decodedResult.result?.format?.format ?? '';
        if (!SUPPORTED_HTML5_QRCODE_FORMATS.has(rawFormat)) return;
        const format = formatFromHtml5Code(rawFormat);
        if (format === null) return;
        const now = performance.now();
        const decoderLatencyMs = Math.max(0, Math.round(now - lastDetectionAtRef.current));
        lastDetectionAtRef.current = now;
        setState('detected');
        onDetectRef.current({
          value: decodedText,
          format,
          decoder: 'html5_qrcode',
          decoder_latency_ms: decoderLatencyMs,
        });
      };
      // Prompt 175f Section 2.1: forward html5-qrcode's per-frame
      // no-scan-yet callback to the caller so the overlay can count
      // decode attempts and prove the loop is running.
      const noopFrameCallback = () => {
        const cb = onFrameAttemptRef.current;
        if (cb) {
          try { cb(); } catch { /* best effort */ }
        }
      };

      try {
        await scannerRef.current.start(cameraConstraints, startConfig, successCallback, noopFrameCallback);
      } catch (firstErr) {
        // Prompt 175e Section 2.2: environment-to-any fallback. If the
        // first attempt failed with a constraint mismatch (the most
        // likely cause of the 175d regression on devices that hang on
        // an over-specified initial constraint), retry once with the
        // minimal MediaTrackConstraints object {} so the browser picks
        // any available camera. NotAllowedError + NotFoundError do NOT
        // fall back; they bubble up to the outer catch for the right
        // user-facing message.
        if (isOverconstrainedError(firstErr)) {
          // eslint-disable-next-line no-console
          console.warn('[useBarcodeScan] OverconstrainedError on initial start, retrying with bare constraints', firstErr);
          await scannerRef.current.start({} as CameraConstraintsArg, startConfig, successCallback, noopFrameCallback);
        } else {
          throw firstErr;
        }
      }

      setState('scanning');
    } catch (err) {
      // Prompt 175e Section 2.3: prefer err.name over message substring
      // because the JS error name is the stable WebRTC contract and
      // localized error messages can defeat substring matching.
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
        // Prompt 175e Section 2.3: camera is in use by another app or
        // browser tab. Surface a distinct error code so the overlay can
        // show a meaningful prompt.
        setState('error');
        setError('camera_in_use');
      } else {
        setState('error');
        setError('scanner_init_failed');
      }
      if (err instanceof Error) onErrorRef.current?.(err);
    }
  }, []);

  const toggleFlashlight = useCallback(async (): Promise<boolean> => {
    const scanner = scannerRef.current;
    if (!scanner) return false;
    try {
      const next = !flashlightOn;
      await scanner.applyVideoConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setFlashlightOn(next);
      return next;
    } catch {
      return flashlightOn;
    }
  }, [flashlightOn]);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop().catch(() => undefined).then(() =>
          scanner.clear().catch(() => undefined),
        );
      }
    };
  }, []);

  return { state, error, start, stop, toggleFlashlight, flashlightOn };
}
