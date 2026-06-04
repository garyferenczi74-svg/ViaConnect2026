/**
 * Prompt 175a Part 1 (2026-06-04): supplement barcode scanner overlay.
 *
 * Mounts the existing html5-qrcode camera via the project's useBarcodeScan
 * hook (170l) without coupling to the Open Food Facts food lookup. On
 * detection, returns the raw barcode value plus format to the parent and
 * closes. No lookup is performed inside this batch (175a batch 1, no
 * resolver yet); identity confirmation happens in the parent surface.
 *
 * Visual chrome mirrors the food scanner so the two surfaces feel like
 * one product: navy 92% backdrop with a transparent 280 by 96 cutout,
 * four teal corner brackets, a faint horizontal centerline, helper-text
 * escalation at 15s + 30s, and a persistent manual entry link.
 *
 * Reused from the existing barcode infrastructure (no new dep):
 *   - useBarcodeScan: camera lifecycle, format filter, flashlight toggle
 *   - BARCODE_SCANNER_ELEMENT_ID: the DOM id html5-qrcode mounts into
 *   - BarcodeDecodedResult: the typed decoded value
 */

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Flashlight, X } from 'lucide-react';
import {
  useBarcodeScan,
  BARCODE_SCANNER_ELEMENT_ID,
} from '@/components/barcode/hooks/useBarcodeScan';
import type { BarcodeDecodedResult } from '@/lib/nutrition/barcode/types';

const COACHING_DELAY_MS = 15_000;
const ESCALATION_DELAY_MS = 30_000;
const PULSE_DURATION_MS = 300;
const REDUCED_MOTION_FLASH_MS = 200;

const NAVY = '#1A2744';
const CARD = '#1E3054';
const TEAL = '#2DA5A0';

const HELPER_INITIAL = 'Point your camera at the barcode';
const HELPER_COACHING = 'Try moving closer, or hold the barcode flat';
const HELPER_ESCALATION = 'Having trouble? Enter the supplement by name below.';
const ARIA_DETECTION_COPY = 'Barcode detected.';

export interface SupplementBarcodeOverlayProps {
  open: boolean;
  onClose: () => void;
  /**
   * Fired exactly once per successful detection. The parent is responsible
   * for advancing to the confirmation surface and for dismissing this
   * overlay.
   */
  onScanned: (decoded: BarcodeDecodedResult) => void;
  /**
   * Fired when the user taps "Enter the supplement by name below."
   */
  onManualEntry: () => void;
  hapticEnabled?: boolean;
}

type HelperPhase = 'initial' | 'coaching' | 'escalation';

export function SupplementBarcodeOverlay({
  open,
  onClose,
  onScanned,
  onManualEntry,
  hapticEnabled = true,
}: SupplementBarcodeOverlayProps): JSX.Element | null {
  const titleId = useId();
  const [helperPhase, setHelperPhase] = useState<HelperPhase>('initial');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [detectionAnnounce, setDetectionAnnounce] = useState<string>('');
  const inFlightBarcodeRef = useRef<string | null>(null);
  const manualEntryLinkRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (ev: MediaQueryListEvent) => setReducedMotion(ev.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const onDetect = useCallback(
    (decoded: BarcodeDecodedResult) => {
      // De-duplicate rapid repeat detections of the same barcode value.
      if (inFlightBarcodeRef.current === decoded.value) return;
      inFlightBarcodeRef.current = decoded.value;

      setPulsing(true);
      setDetectionAnnounce(ARIA_DETECTION_COPY);
      const pulseDuration = reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS;
      window.setTimeout(() => setPulsing(false), pulseDuration);

      if (hapticEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(20);
        } catch {
          // Best effort.
        }
      }

      onScanned(decoded);
    },
    [hapticEnabled, onScanned, reducedMotion],
  );

  const scan = useBarcodeScan({ onDetect });

  useEffect(() => {
    if (!open) return;
    setHelperPhase('initial');
    setDetectionAnnounce('');
    inFlightBarcodeRef.current = null;
    void scan.start();
    return () => {
      void scan.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || helperPhase !== 'initial') return;
    const coachingT = window.setTimeout(() => setHelperPhase('coaching'), COACHING_DELAY_MS);
    const escalationT = window.setTimeout(() => setHelperPhase('escalation'), ESCALATION_DELAY_MS);
    return () => {
      window.clearTimeout(coachingT);
      window.clearTimeout(escalationT);
    };
  }, [open, helperPhase]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      manualEntryLinkRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const handleClose = useCallback(() => {
    void scan.stop();
    onClose();
  }, [onClose, scan]);

  if (!open) return null;

  const bracketScale = pulsing && !reducedMotion ? 1.15 : 1;
  const bracketOpacity = pulsing && reducedMotion ? 0.7 : 1;
  const showPermissionFallback = scan.state === 'permission_denied';

  const helperCopy =
    helperPhase === 'initial' ? HELPER_INITIAL
    : helperPhase === 'coaching' ? HELPER_COACHING
    : HELPER_ESCALATION;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[120] flex items-center justify-center"
      style={{ backgroundColor: 'transparent' }}
    >
      <span id={titleId} className="sr-only">Supplement barcode scanner</span>

      <div
        id={BARCODE_SCANNER_ELEMENT_ID}
        aria-hidden="true"
        className="absolute inset-0 bg-black"
        style={{ overflow: 'hidden' }}
      />

      <div className="absolute inset-0 pointer-events-none flex flex-col items-center">
        <div
          className="relative"
          style={{
            marginTop: 'calc(40vh - 48px)',
            width: 280,
            height: 96,
            boxShadow: `0 0 0 9999px rgba(26, 39, 68, 0.92)`,
          }}
        >
          <div
            className="absolute left-0 right-0 top-1/2"
            style={{
              height: 1,
              backgroundColor: TEAL,
              opacity: 0.4,
              transform: 'translateY(-0.5px)',
            }}
          />
          <CornerBracket position="tl" scale={bracketScale} opacity={bracketOpacity}
            durationMs={pulsing ? (reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS) : 0} />
          <CornerBracket position="tr" scale={bracketScale} opacity={bracketOpacity}
            durationMs={pulsing ? (reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS) : 0} />
          <CornerBracket position="bl" scale={bracketScale} opacity={bracketOpacity}
            durationMs={pulsing ? (reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS) : 0} />
          <CornerBracket position="br" scale={bracketScale} opacity={bracketOpacity}
            durationMs={pulsing ? (reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS) : 0} />
        </div>
      </div>

      <div
        className="absolute top-0 left-0 right-0 flex justify-between items-center px-4"
        style={{
          height: 56,
          paddingTop: 'env(safe-area-inset-top, 0)',
          color: NAVY,
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close scanner"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ color: '#FFFFFF' }}
        >
          <X size={24} strokeWidth={1.5} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => { void scan.toggleFlashlight(); }}
          aria-label="Toggle flashlight"
          aria-pressed={scan.flashlightOn}
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            color: '#FFFFFF',
            backgroundColor: scan.flashlightOn ? TEAL : 'transparent',
          }}
        >
          <Flashlight size={24} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <div
        className="absolute left-0 right-0 flex flex-col items-center text-center pointer-events-none"
        style={{ top: 'calc(40vh + 80px)' }}
      >
        <p
          aria-live="polite"
          style={{ color: '#FFFFFF', fontSize: 14, padding: '0 24px' }}
        >
          {helperCopy}
        </p>

        <button
          type="button"
          ref={manualEntryLinkRef}
          onClick={onManualEntry}
          className="pointer-events-auto mt-6 underline focus-visible:ring-2"
          aria-label="Enter the supplement by name instead"
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: 13,
            background: 'transparent',
            border: 'none',
            padding: '8px 16px',
          }}
        >
          Can&apos;t scan? Enter the supplement by name
        </button>
      </div>

      {showPermissionFallback ? (
        <div
          role="alert"
          className="absolute inset-x-4 bottom-24 mx-auto max-w-md rounded-2xl p-4"
          style={{ backgroundColor: CARD, color: '#FFFFFF' }}
        >
          <p style={{ fontSize: 14, fontWeight: 500 }}>
            Camera access is off. Enable it in Settings to scan barcodes.
          </p>
        </div>
      ) : null}

      <div role="status" aria-live="assertive" className="sr-only">
        {detectionAnnounce}
      </div>

      {scan.state === 'error' && scan.error !== null ? (
        <div
          role="alert"
          className="absolute inset-x-4 bottom-24 mx-auto max-w-md rounded-2xl p-4"
          style={{ backgroundColor: CARD, color: '#FFFFFF' }}
        >
          <p style={{ fontSize: 14, fontWeight: 500 }}>
            {scan.error === 'no_camera_hardware'
              ? 'This device does not have a camera available.'
              : 'Scanner did not start. Try again, or enter the supplement by name.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}

interface CornerBracketProps {
  position: 'tl' | 'tr' | 'bl' | 'br';
  scale: number;
  opacity: number;
  durationMs: number;
}

function CornerBracket({ position, scale, opacity, durationMs }: CornerBracketProps): JSX.Element {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: TEAL,
    borderStyle: 'solid',
    transition: durationMs > 0 ? `transform ${durationMs}ms ease-out, opacity ${durationMs}ms ease-out` : 'none',
    transform: `scale(${scale})`,
    opacity,
  };
  const corner: React.CSSProperties = (() => {
    switch (position) {
      case 'tl': return { top: -3, left: -3, borderWidth: '3px 0 0 3px' };
      case 'tr': return { top: -3, right: -3, borderWidth: '3px 3px 0 0' };
      case 'bl': return { bottom: -3, left: -3, borderWidth: '0 0 3px 3px' };
      case 'br':
      default:   return { bottom: -3, right: -3, borderWidth: '0 3px 3px 0' };
    }
  })();
  return <div style={{ ...base, ...corner }} aria-hidden="true" />;
}
