/**
 * Prompt 170l Phase 1c-1: scanner overlay component (Hannah §11.2).
 *
 * Full-viewport mobile / centered modal desktop. Navy 92% backdrop with
 * a transparent rectangular viewfinder cutout (3:1 ratio). Four Teal corner
 * brackets at the cutout corners; faint horizontal centerline. Auto-detect
 * (no shutter). Helper text 3-step escalation. Manual entry persistent link.
 *
 * Composition: Hannah's §11.3 inline loading state lives here too (helper
 * text region transforms in place to a Card pill during lookup). Detection
 * triggers haptic + optional chime + aria-live assertive announcement.
 *
 * What this surface does NOT do:
 *   - Render §11.4 product confirmation (Phase 1c-2)
 *   - Render §11.5 not-found fallback (Phase 1c-2)
 *   - Render §11.6 manual entry modal (Phase 1c-2)
 * Those targets are signaled via the onLookupResult callback to the parent.
 */

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Flashlight, X } from 'lucide-react';
import {
  useBarcodeScan,
  BARCODE_SCANNER_ELEMENT_ID,
} from './hooks/useBarcodeScan';
import { useOffLookup, type LookupResult } from './hooks/useOffLookup';
import type { BarcodeDecodedResult } from '@/lib/nutrition/barcode/types';

const COACHING_DELAY_MS = 15_000;
const ESCALATION_DELAY_MS = 30_000;
const PULSE_DURATION_MS = 300;
const REDUCED_MOTION_FLASH_MS = 200;

const NAVY = '#1A2744';
const CARD = '#1E3054';
const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';

export interface BarcodeScannerOverlayProps {
  open: boolean;
  onClose: () => void;
  onLookupResult: (
    barcode: string,
    decoded: BarcodeDecodedResult,
    lookup: LookupResult,
  ) => void;
  onManualEntry: () => void;
  hapticEnabled: boolean;
  audioChimeEnabled: boolean;
}

type HelperPhase = 'initial' | 'coaching' | 'escalation' | 'looking_up';

const HELPER_COPY: Record<HelperPhase, string> = {
  initial: 'Point your camera at the barcode',
  coaching: 'Try moving closer, or hold the barcode flat',
  escalation: 'Having trouble? Enter the barcode manually below.',
  looking_up: 'Looking up product...',
};

const ARIA_DETECTION_COPY = 'Barcode detected. Looking up product.';

export function BarcodeScannerOverlay({
  open,
  onClose,
  onLookupResult,
  onManualEntry,
  hapticEnabled,
  audioChimeEnabled,
}: BarcodeScannerOverlayProps): JSX.Element | null {
  const titleId = useId();
  const [helperPhase, setHelperPhase] = useState<HelperPhase>('initial');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [detectionAnnounce, setDetectionAnnounce] = useState<string>('');
  const inFlightBarcodeRef = useRef<string | null>(null);
  const manualEntryLinkRef = useRef<HTMLButtonElement | null>(null);

  const { lookup } = useOffLookup();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (ev: MediaQueryListEvent) => setReducedMotion(ev.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const onDetect = useCallback(
    async (decoded: BarcodeDecodedResult): Promise<void> => {
      // De-duplicate rapid repeat detections of the same barcode.
      if (inFlightBarcodeRef.current === decoded.value) return;
      inFlightBarcodeRef.current = decoded.value;

      // Visual + tactile + audio feedback.
      setPulsing(true);
      setHelperPhase('looking_up');
      setDetectionAnnounce(ARIA_DETECTION_COPY);
      const pulseDuration = reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS;
      window.setTimeout(() => setPulsing(false), pulseDuration);

      if (hapticEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(20);
        } catch {
          // Best effort
        }
      }

      if (audioChimeEnabled && typeof window !== 'undefined' && 'AudioContext' in window) {
        try {
          const Ctx = (window as unknown as { AudioContext: typeof AudioContext })
            .AudioContext;
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.05;
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        } catch {
          // Best effort
        }
      }

      const result = await lookup(decoded.value);
      onLookupResult(decoded.value, decoded, result);
      // Caller is expected to dismiss / advance the surface. We do not clear
      // inFlightBarcodeRef here so a re-scan of the same barcode is suppressed
      // until the overlay is unmounted.
    },
    [hapticEnabled, audioChimeEnabled, lookup, onLookupResult, reducedMotion],
  );

  const scan = useBarcodeScan({ onDetect });

  // Lifecycle: start scanner when overlay opens; stop when it closes.
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

  // Helper text escalation: 15s coaching, 30s escalation. Suspended when
  // we transition to looking_up via a detection.
  useEffect(() => {
    if (!open || helperPhase !== 'initial') return;
    const coachingT = window.setTimeout(() => setHelperPhase('coaching'), COACHING_DELAY_MS);
    const escalationT = window.setTimeout(
      () => setHelperPhase('escalation'),
      ESCALATION_DELAY_MS,
    );
    return () => {
      window.clearTimeout(coachingT);
      window.clearTimeout(escalationT);
    };
  }, [open, helperPhase]);

  // Move focus to manual entry link on mount per Hannah's accessibility
  // commitment ("keyboard users can tab to the controls without having to
  // navigate the camera affordance which is gesture-only").
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

  const onLookingUp = helperPhase === 'looking_up';
  const bracketScale = pulsing && !reducedMotion ? 1.15 : 1;
  const bracketOpacity = pulsing && reducedMotion ? 0.7 : 1;
  const showPermissionFallback = scan.state === 'permission_denied';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[120] flex items-center justify-center"
      style={{ backgroundColor: 'transparent' }}
    >
      <span id={titleId} className="sr-only">Barcode scanner</span>

      {/* Camera feed lives behind everything. html5-qrcode mounts into this
          element. */}
      <div
        id={BARCODE_SCANNER_ELEMENT_ID}
        aria-hidden="true"
        className="absolute inset-0 bg-black"
        style={{ overflow: 'hidden' }}
      />

      {/* Backdrop with cutout: a transparent rectangle at the viewfinder
          position has a massive box-shadow that paints Navy 92% everywhere
          outside the cutout. */}
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
          {/* Faint horizontal centerline */}
          <div
            className="absolute left-0 right-0 top-1/2"
            style={{
              height: 1,
              backgroundColor: TEAL,
              opacity: 0.4,
              transform: 'translateY(-0.5px)',
            }}
          />
          {/* Four corner brackets */}
          <CornerBracket
            position="tl"
            scale={bracketScale}
            opacity={bracketOpacity}
            durationMs={pulsing ? (reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS) : 0}
          />
          <CornerBracket
            position="tr"
            scale={bracketScale}
            opacity={bracketOpacity}
            durationMs={pulsing ? (reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS) : 0}
          />
          <CornerBracket
            position="bl"
            scale={bracketScale}
            opacity={bracketOpacity}
            durationMs={pulsing ? (reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS) : 0}
          />
          <CornerBracket
            position="br"
            scale={bracketScale}
            opacity={bracketOpacity}
            durationMs={pulsing ? (reducedMotion ? REDUCED_MOTION_FLASH_MS : PULSE_DURATION_MS) : 0}
          />
        </div>
      </div>

      {/* Top action bar: close X left, flashlight right. */}
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

      {/* Helper region: text or loading pill, anchored below viewfinder. */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center text-center pointer-events-none"
        style={{
          top: 'calc(40vh + 80px)',
        }}
      >
        {onLookingUp ? (
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 px-4 rounded-full"
            style={{
              width: 220,
              height: 36,
              backgroundColor: `${CARD}E6`,
              color: '#FFFFFF',
              fontSize: 14,
            }}
          >
            <LoadingDots reducedMotion={reducedMotion} />
            <span>{HELPER_COPY.looking_up}</span>
          </div>
        ) : (
          <p
            aria-live="polite"
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              padding: '0 24px',
            }}
          >
            {HELPER_COPY[helperPhase]}
          </p>
        )}

        {/* Persistent manual entry link, 24px below helper text. */}
        <button
          type="button"
          ref={manualEntryLinkRef}
          onClick={onManualEntry}
          className="pointer-events-auto mt-6 underline focus-visible:ring-2"
          aria-label="Enter barcode manually"
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: 13,
            background: 'transparent',
            border: 'none',
            padding: '8px 16px',
          }}
        >
          Can&apos;t scan? Enter barcode manually
        </button>
      </div>

      {/* Permission-denied fallback overlay. */}
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

      {/* aria-live assertive announcement on detection. */}
      <div role="status" aria-live="assertive" className="sr-only">
        {detectionAnnounce}
      </div>

      {/* Permission error edge case. */}
      {scan.state === 'error' && scan.error !== null ? (
        <div
          role="alert"
          className="absolute inset-x-4 bottom-24 mx-auto max-w-md rounded-2xl p-4"
          style={{ backgroundColor: CARD, color: '#FFFFFF' }}
        >
          <p style={{ fontSize: 14, fontWeight: 500 }}>
            {scan.error === 'no_camera_hardware'
              ? 'This device does not have a camera available.'
              : 'Scanner did not start. Try again or enter the barcode manually.'}
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
      case 'tl':
        return { top: -3, left: -3, borderWidth: '3px 0 0 3px' };
      case 'tr':
        return { top: -3, right: -3, borderWidth: '3px 3px 0 0' };
      case 'bl':
        return { bottom: -3, left: -3, borderWidth: '0 0 3px 3px' };
      case 'br':
      default:
        return { bottom: -3, right: -3, borderWidth: '0 3px 3px 0' };
    }
  })();
  return <div style={{ ...base, ...corner }} aria-hidden="true" />;
}

interface LoadingDotsProps {
  reducedMotion: boolean;
}

function LoadingDots({ reducedMotion }: LoadingDotsProps): JSX.Element {
  // Three pulsing dots; degrades to opacity flicker under reduced-motion.
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: TEAL,
            animation: reducedMotion
              ? `barcodeDotFade 1.4s ${i * 0.2}s infinite`
              : `barcodeDotBounce 1.2s ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes barcodeDotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes barcodeDotFade {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </span>
  );
}
