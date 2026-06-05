/**
 * Prompt 175c (2026-06-05): supplement barcode scanner overlay,
 * full-screen iOS-safe rebuild.
 *
 * 175b confirmed permission + stream attach + decode are working on
 * iOS. The remaining defect was the overlay collapsing into a thin
 * sliver at the top of the screen, with two reticles rendering at
 * different positions and the CAQ page bleeding through. 175c fixes
 * the rendering only: the camera, permission, and decode wiring
 * stays exactly as 175b left them.
 *
 * Sizing strategy (Section 2.1):
 *   - Outer container is a portaled fixed layer at inset 0, opaque
 *     black, sized with height 100dvh and a -webkit-fill-available
 *     min-height fallback. dvh resolves to the current visual
 *     viewport (collapsing in sync with the iOS address bar), unlike
 *     vh which is the larger viewport and produces the sliver when
 *     the address bar is visible.
 *   - The html5-qrcode viewport div (BARCODE_SCANNER_ELEMENT_ID)
 *     gets explicit width 100% and height 100% in style, not just
 *     inset-0, so html5-qrcode reads non-zero dimensions even while
 *     iOS is animating chrome.
 *   - Portaled to document.body so no ancestor transform or filter
 *     can constrain the fixed layer.
 *
 * Single reticle (Section 2.3):
 *   - One centered teal box at 80% width, aspect-square, with the
 *     four CornerBrackets anchored to its corners.
 *   - The supplement caller passes config.qrbox=null to useBarcodeScan
 *     so html5-qrcode does NOT render its own internal mask. Only the
 *     teal reticle is visible.
 *
 * Lifecycle (Sections 2.4 + 2.6 + Resilience):
 *   - Body scroll locked while open, restored on unmount.
 *   - On close, scan.stop() runs FIRST (html5-qrcode releases its
 *     tracks) and then a belt-and-suspenders pass stops any remaining
 *     MediaStreamTrack so the iOS camera-active indicator clears.
 */

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flashlight, X } from 'lucide-react';
import {
  useBarcodeScan,
  BARCODE_SCANNER_ELEMENT_ID,
  SUPPLEMENT_BARCODE_FORMATS,
} from '@/components/barcode/hooks/useBarcodeScan';
import { validateBarcode } from '@/lib/nutrition/barcode/checksum';
import type { BarcodeDecodedResult } from '@/lib/nutrition/barcode/types';

const COACHING_DELAY_MS = 15_000;
const ESCALATION_DELAY_MS = 30_000;
const PULSE_DURATION_MS = 300;
const REDUCED_MOTION_FLASH_MS = 200;

const TEAL = '#2DA5A0';

const HELPER_INITIAL = 'Point your camera at the barcode';
const HELPER_COACHING = 'Try moving closer, or hold the barcode flat';
const HELPER_ESCALATION = 'Having trouble? Enter the supplement by name below.';
const ARIA_DETECTION_COPY = 'Barcode detected.';

// Prompt 175c: stage-by-stage diagnostic logging carried forward from
// 175b. Vercel runtime logs do not capture browser console; this lets
// the iOS Web Inspector trace pinpoint any remaining failure stage.
function diagLog(stage: string, extra?: Record<string, unknown>): void {
  if (typeof console === 'undefined') return;
  try {
    // eslint-disable-next-line no-console
    console.info(`[caq.barcode-overlay] ${stage}`, extra ?? {});
  } catch {
    // Best effort.
  }
}

/**
 * Force iOS-required attributes on the html5-qrcode video element so
 * the stream renders inline rather than collapsing to a sliver.
 * Idempotent; safe to call on every poll tick.
 */
function hardenIosVideo(): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('barcode-scanner-viewport');
  if (!container) {
    diagLog('hardenIosVideo:container-missing');
    return;
  }
  const video = container.querySelector('video');
  if (!(video instanceof HTMLVideoElement)) {
    diagLog('hardenIosVideo:video-missing');
    return;
  }
  try {
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
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => diagLog('hardenIosVideo:play-rejected', { err: String(err) }));
    }
    diagLog('hardenIosVideo:attributes-set', {
      playsInline: video.playsInline,
      muted: video.muted,
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
    });
  } catch (err) {
    diagLog('hardenIosVideo:threw', { err: String(err) });
  }
}

function pollHardenIosVideo(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const MAX_ATTEMPTS = 8;
  const INTERVAL_MS = 250;
  let attempts = 0;
  const tick = (): void => {
    attempts += 1;
    hardenIosVideo();
    const video = document.querySelector('#barcode-scanner-viewport video');
    const isRendering = video instanceof HTMLVideoElement && video.videoWidth > 0;
    if (isRendering) {
      diagLog('pollHardenIosVideo:rendering', { attempts });
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      diagLog('pollHardenIosVideo:gave-up', { attempts });
      return;
    }
    window.setTimeout(tick, INTERVAL_MS);
  };
  window.setTimeout(tick, INTERVAL_MS);
}

/**
 * Belt-and-suspenders camera release. html5-qrcode's stop() should
 * release the underlying tracks, but on iOS WKWebView the track
 * objects can survive past stop() and keep the camera indicator lit.
 * Explicitly enumerate every MediaStreamTrack on the video's
 * srcObject and stop them.
 */
function releaseCameraTracks(): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('barcode-scanner-viewport');
  const video = container?.querySelector('video');
  if (!(video instanceof HTMLVideoElement)) return;
  const stream = video.srcObject;
  if (stream && typeof (stream as MediaStream).getTracks === 'function') {
    const tracks = (stream as MediaStream).getTracks();
    diagLog('releaseCameraTracks:stopping', { count: tracks.length });
    tracks.forEach((track) => {
      try { track.stop(); } catch { /* best effort */ }
    });
  } else {
    diagLog('releaseCameraTracks:no-stream', {});
  }
}

/**
 * Prompt 175e Section 2.4: wait for the video element to reach a usable
 * readyState before any post-attach work touches the track. html5-qrcode's
 * loadedmetadata fires when videoWidth + videoHeight are populated; if
 * we run applyConstraints before then, iOS sometimes silently rejects.
 * Resolves on either the event firing or a 3 second timeout so a quiet
 * stream does not strand the enhancement chain.
 */
function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      video.removeEventListener('loadedmetadata', finish);
      resolve();
    };
    video.addEventListener('loadedmetadata', finish, { once: true });
    window.setTimeout(finish, 3000);
  });
}

/**
 * Prompt 175e Section 2.1 + 2.5: post-attach enhancements applied to
 * the live track AFTER the stream has been attached. Each enhancement
 * is independently guarded so a single rejection (older device,
 * unsupported constraint) does not tear down the live stream.
 *
 *   * Resolution bump to 1920x1080 ideal. Failed bump leaves the
 *     auto-negotiated default in place; decode still works at the
 *     lower resolution.
 *   * focusMode: continuous. Falls back to the device's default focus
 *     behavior when unsupported.
 *
 * Torch is NOT applied here; it remains an explicit user toggle
 * through scan.toggleFlashlight per 175c.
 */
async function enhanceTrack(): Promise<void> {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('barcode-scanner-viewport');
  const video = container?.querySelector('video');
  if (!(video instanceof HTMLVideoElement)) {
    diagLog('enhanceTrack:video-missing');
    return;
  }
  await waitForVideoReady(video);
  const stream = video.srcObject;
  if (!stream || typeof (stream as MediaStream).getVideoTracks !== 'function') {
    diagLog('enhanceTrack:no-stream');
    return;
  }
  const track = (stream as MediaStream).getVideoTracks()[0];
  if (!track) {
    diagLog('enhanceTrack:no-track');
    return;
  }

  const settings = track.getSettings();
  diagLog('enhanceTrack:initial-settings', {
    width: settings.width,
    height: settings.height,
    frameRate: settings.frameRate,
    facingMode: settings.facingMode,
  });

  // Resolution bump. Independent try/catch so a rejection does not
  // skip the focus enhancement below.
  try {
    await track.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 } });
    const after = track.getSettings();
    diagLog('enhanceTrack:resolution-applied', { width: after.width, height: after.height });
  } catch (err) {
    diagLog('enhanceTrack:resolution-rejected', { err: String(err) });
  }

  // Continuous focus. Independent try/catch.
  try {
    await track.applyConstraints({
      advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
    });
    diagLog('enhanceTrack:focus-applied');
  } catch (err) {
    diagLog('enhanceTrack:focus-rejected', { err: String(err) });
  }
}

export interface SupplementBarcodeOverlayProps {
  open: boolean;
  onClose: () => void;
  /**
   * Fired exactly once per successful detection. The parent advances to
   * the confirmation surface and dismisses this overlay.
   */
  onScanned: (decoded: BarcodeDecodedResult) => void;
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
  const [mounted, setMounted] = useState(false);
  const inFlightBarcodeRef = useRef<string | null>(null);
  const manualEntryLinkRef = useRef<HTMLButtonElement | null>(null);

  // Portal target. createPortal requires a real DOM node; this state
  // flips true after first client render so SSR does not call
  // createPortal during hydration.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (ev: MediaQueryListEvent) => setReducedMotion(ev.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Prompt 175c Section 2.4: lock body scroll while the scanner is
  // open and restore it on close so the CAQ page underneath cannot
  // scroll behind a full-screen modal.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onDetect = useCallback(
    (decoded: BarcodeDecodedResult) => {
      // Prompt 175d Section 2.6: belt-and-suspenders checksum validation
      // before we hand the code to the confirmation panel. html5-qrcode's
      // internal check rejects most garbage but a curved 1D read on a
      // bottle can occasionally surface a digit-shifted false positive.
      const validation = validateBarcode(decoded.value);
      if (!validation.valid) {
        diagLog('onDetect:checksum-rejected', {
          value: decoded.value,
          reason: validation.reason,
        });
        return;
      }

      // De-duplicate rapid repeat detections of the same barcode value.
      // Single-fire lock per Section 2.6: once we have a validated read
      // the decode loop must not surface it again.
      if (inFlightBarcodeRef.current === decoded.value) return;
      inFlightBarcodeRef.current = decoded.value;

      diagLog('onDetect:accepted', {
        value: decoded.value,
        format: validation.format,
        decoder: decoded.decoder,
        latencyMs: decoded.decoder_latency_ms,
      });

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

  // Prompt 175c Section 2.3 + 175d Section 2.3 + 175e Section 2.1:
  // full-frame scan (qrbox: null) with explicit symbology hints
  // restricted to product barcodes, native BarcodeDetector enabled on
  // Chrome / Edge / Android as a free speed-up. Initial camera
  // constraints are deliberately MINIMAL (string facingMode only,
  // no resolution, no torch, no focus): 175d's resolution + focus +
  // torch are applied post-attach by enhanceTrack so iOS Safari can
  // start the stream first and then negotiate the higher resolution
  // without the address-bar-animation hang that the 175d initial
  // 1920x1080 ideal hint triggered.
  const scan = useBarcodeScan({
    onDetect,
    config: {
      qrbox: null,
      cameraConstraints: { facingMode: 'environment' },
      formatsToSupport: SUPPLEMENT_BARCODE_FORMATS,
      useBarCodeDetectorIfSupported: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    setHelperPhase('initial');
    setDetectionAnnounce('');
    inFlightBarcodeRef.current = null;
    diagLog('overlay:open');
    void scan.start().then(() => {
      diagLog('scan.start:resolved', { state: scan.state, error: scan.error });
      pollHardenIosVideo();
      // Prompt 175e Section 2.1: post-attach enhancement chain
      // (resolution bump + continuous focus). Each step independently
      // guarded; a single failure never tears down the live stream.
      void enhanceTrack();
    });
    return () => {
      diagLog('overlay:close');
      void scan.stop().finally(() => {
        // Section 2.6 belt-and-suspenders: html5-qrcode's stop() can
        // leave tracks live on iOS WKWebView. Explicitly stop every
        // track so the camera-active indicator clears.
        releaseCameraTracks();
      });
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

  useEffect(() => {
    if (!open) return;
    diagLog('scan-state-change', { state: scan.state, error: scan.error, flashlightOn: scan.flashlightOn });
  }, [scan.state, scan.error, scan.flashlightOn, open]);

  const handleClose = useCallback(() => {
    void scan.stop().finally(() => {
      releaseCameraTracks();
    });
    onClose();
  }, [onClose, scan]);

  if (!open || !mounted || typeof document === 'undefined') return null;

  const bracketScale = pulsing && !reducedMotion ? 1.15 : 1;
  const bracketOpacity = pulsing && reducedMotion ? 0.7 : 1;
  const showPermissionFallback = scan.state === 'permission_denied';

  const helperCopy =
    helperPhase === 'initial' ? HELPER_INITIAL
    : helperPhase === 'coaching' ? HELPER_COACHING
    : HELPER_ESCALATION;

  const handleTapToFocus = (): void => {
    // Prompt 175d Section 2.5 + 175e: tap anywhere on the backdrop to
    // nudge the camera into refocusing. Re-running the enhancement chain
    // is a portable refocus signal that works on iOS and Chrome without
    // requiring pointsOfInterest, which iOS WKWebView does not honor.
    diagLog('tap-to-focus');
    void enhanceTrack();
  };

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleTapToFocus}
      className="fixed inset-0 z-[120] bg-black"
      style={{
        // Prompt 175c Section 2.1: 100dvh tracks the visual viewport
        // (collapses with the iOS address bar). webkit-fill-available
        // is the Safari fallback for browsers without dvh support.
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
    >
      <span id={titleId} className="sr-only">Supplement barcode scanner</span>

      {/* Video viewport. Explicit 100%/100% style so html5-qrcode reads
          non-zero dimensions even while iOS animates chrome. */}
      <div
        id={BARCODE_SCANNER_ELEMENT_ID}
        aria-hidden="true"
        className="absolute inset-0 bg-black"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      />

      {/* Single centered teal reticle. 80% width, square aspect.
          Replaces the prior box-shadow cutout + duplicate framing. */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className="relative rounded-xl"
          style={{
            width: 'min(80vw, 380px)',
            aspectRatio: '1 / 1',
            border: `2px solid ${TEAL}`,
            boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.35)',
          }}
        >
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

      {/* Top action bar. Safe-area padding so the close + flashlight
          controls clear the iOS notch. */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 z-10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: 12,
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

      {/* Bottom region. Helper text + manual entry link. Safe-area
          padding for the home indicator. */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center text-center px-6 z-10"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}
      >
        <p
          aria-live="polite"
          style={{ color: '#FFFFFF', fontSize: 14, marginBottom: 18 }}
        >
          {helperCopy}
        </p>

        <button
          type="button"
          ref={manualEntryLinkRef}
          onClick={onManualEntry}
          className="underline focus-visible:ring-2 pointer-events-auto"
          aria-label="Enter the supplement by name instead"
          style={{
            color: 'rgba(255, 255, 255, 0.85)',
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
          style={{ backgroundColor: '#1E3054', color: '#FFFFFF' }}
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
          style={{ backgroundColor: '#1E3054', color: '#FFFFFF' }}
        >
          {/* Prompt 175e Section 2.3: cause-specific copy per error
              code so the user sees an actionable message rather than
              the generic startup line. */}
          <p style={{ fontSize: 14, fontWeight: 500 }}>
            {scan.error === 'no_camera_hardware'
              ? 'This device does not have a camera available.'
              : scan.error === 'camera_in_use'
                ? 'Another app is using the camera. Close it and try again, or enter the supplement by name.'
                : 'Scanner did not start. Try again, or enter the supplement by name.'}
          </p>
        </div>
      ) : null}
    </div>
  );

  return createPortal(overlay, document.body);
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
    width: 28,
    height: 28,
    borderColor: TEAL,
    borderStyle: 'solid',
    transition: durationMs > 0 ? `transform ${durationMs}ms ease-out, opacity ${durationMs}ms ease-out` : 'none',
    transform: `scale(${scale})`,
    opacity,
  };
  const corner: React.CSSProperties = (() => {
    switch (position) {
      case 'tl': return { top: -4, left: -4, borderWidth: '4px 0 0 4px', borderTopLeftRadius: 12 };
      case 'tr': return { top: -4, right: -4, borderWidth: '4px 4px 0 0', borderTopRightRadius: 12 };
      case 'bl': return { bottom: -4, left: -4, borderWidth: '0 0 4px 4px', borderBottomLeftRadius: 12 };
      case 'br':
      default:   return { bottom: -4, right: -4, borderWidth: '0 4px 4px 0', borderBottomRightRadius: 12 };
    }
  })();
  return <div style={{ ...base, ...corner }} aria-hidden="true" />;
}
