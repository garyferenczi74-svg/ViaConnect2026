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
type Html5QrcodeCtor = new (
  elementId: string,
  config: { verbose: boolean },
) => Html5QrcodeInstance;

// Prompt 175c (2026-06-05): qrbox is optional on the underlying library
// so callers can opt out of html5-qrcode's internal viewfinder mask
// (NutriVision's BarcodeScannerOverlay keeps the default mask; the CAQ
// supplement overlay sets qrbox: undefined and draws its own reticle so
// only one framing element renders per iOS Safari fix).
type QrboxValue =
  | { width: number; height: number }
  | ((viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number })
  | undefined;

interface Html5QrcodeInstance {
  start: (
    cameraConstraints: { facingMode: string },
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

const SUPPORTED_HTML5_QRCODE_FORMATS = new Set([
  'EAN_13',
  'UPC_A',
  'EAN_8',
  'ITF',
]);

function formatFromHtml5Code(code: string): BarcodeFormat | null {
  switch (code) {
    case 'EAN_13': return 'EAN_13';
    case 'UPC_A': return 'UPC_A';
    case 'EAN_8': return 'EAN_8';
    case 'ITF': return 'ITF_14';
    default: return null;
  }
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
  useEffect(() => {
    onDetectRef.current = opts.onDetect;
    onErrorRef.current = opts.onError;
  }, [opts.onDetect, opts.onError]);

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
        scannerRef.current = new mod.Html5Qrcode(BARCODE_SCANNER_ELEMENT_ID, {
          verbose: false,
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

      await scannerRef.current.start(
        { facingMode: 'environment' },
        startConfig,
        (decodedText, decodedResult) => {
          const rawFormat =
            (decodedResult as { result?: { format?: { format?: string } } }).result
              ?.format?.format ?? '';
          if (!SUPPORTED_HTML5_QRCODE_FORMATS.has(rawFormat)) return;
          const format = formatFromHtml5Code(rawFormat);
          if (format === null) return;
          const now = performance.now();
          const decoderLatencyMs = Math.max(
            0,
            Math.round(now - lastDetectionAtRef.current),
          );
          lastDetectionAtRef.current = now;
          setState('detected');
          onDetectRef.current({
            value: decodedText,
            format,
            decoder: 'html5_qrcode',
            decoder_latency_ms: decoderLatencyMs,
          });
        },
        () => {
          // Per-frame "no scan yet" callbacks. Swallow silently.
        },
      );

      setState('scanning');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (
        lower.includes('permission')
        || lower.includes('notallowed')
        || lower.includes('denied')
      ) {
        setState('permission_denied');
        setError('permission_denied');
      } else if (lower.includes('notfound') || lower.includes('no camera')) {
        setState('error');
        setError('no_camera_hardware');
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
