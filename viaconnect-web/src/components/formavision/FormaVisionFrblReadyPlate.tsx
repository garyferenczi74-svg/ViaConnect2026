'use client';

import { useEffect, useRef, useState } from 'react';
import { FrblSideToggle } from './FrblSideToggle';
import { FrblReadyModeToggle, type FrblReadyViewMode } from './FrblReadyModeToggle';
import { FrblReadyWireframeCage } from './FrblReadyWireframeCage';
import {
  defaultFrblReadySide,
  FRBL_SIDE_LABELS,
  FRBL_SIDE_UNAVAILABLE_HELPER,
  isFrblSidePresent,
} from '@/lib/formavision/viewer/frblReadySide';
import { fetchSignedFullUrl } from '@/lib/formavision/viewer/signedFullUrlCache';
import type { FrblWireframeCageSpec } from '@/lib/formavision/viewer/frblWireframeCage';
import {
  classifyWireframeThrow,
  FRBL_WIREFRAME_BUILD_TIMEOUT_MS,
  logFrblWireframeFail,
  runFrblReadyWireframeBuild,
  type FrblWireframeFailReason,
} from '@/lib/formavision/viewer/frblReadyWireframe';
import { ensureSelfieSegmenter } from '@/lib/arnold/scanning/silhouetteProcessor';
import {
  FRBL_READY_PHOTO_LOADING,
  FRBL_READY_WIREFRAME_FAIL,
  FRBL_READY_WIREFRAME_HINT,
  FRBL_READY_WIREFRAME_LOADING,
} from '@/lib/formavision/twoProtocolCopy';
import type { PoseId } from '@/lib/scan/poses';

// Brief 64 / Blueprint 64 — DESIGN-READY 2D avatar stage around retained
// FRBL photos. Still photos + toggle. Not Tripo/Meshy GLB.
// Brief 65 — Photo | Wireframe mode lives INSIDE this frbl-2d plate.
// Wireframe SUCCESS is a processSilhouette mask/contour cage only.
// Never a parametric mannequin, AnatomicalFloor, Picasso PNGs, or GLB.

export const FRBL_READY_STAGE_SPEC = {
  enterMs: 200,
  enterScaleFrom: 0.98,
  enterEasing: 'ease-out',
  crossfadeMs: 180,
  rimPulseMs: 180,
  bezelInsetPx: 10,
  apertureInsetPx: 8,
  rimPx: 1.5,
  plasmaCyan: '#2EE6D6',
  brandTeal: '#2DA5A0',
  toWireframeMs: 250,
  toPhotoMs: 200,
  wireframeSideMs: 180,
} as const;

const CROSSFADE_MS = FRBL_READY_STAGE_SPEC.crossfadeMs;
const SIGN_TIMEOUT_MS = 8000;
const WIREFRAME_TIMEOUT_MS = FRBL_WIREFRAME_BUILD_TIMEOUT_MS;

const STAGE_STYLE = `
@keyframes fv-frbl-stage-enter {
  from { transform: scale(${FRBL_READY_STAGE_SPEC.enterScaleFrom}); }
  to { transform: scale(1); }
}
@keyframes fv-frbl-rim-pulse {
  0% { opacity: 0.55; }
  40% { opacity: 1; }
  100% { opacity: 0.88; }
}
@keyframes fv-frbl-to-wireframe {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fv-frbl-to-photo {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fv-frbl-stage-enter {
  animation: fv-frbl-stage-enter ${FRBL_READY_STAGE_SPEC.enterMs}ms ${FRBL_READY_STAGE_SPEC.enterEasing} both;
}
.fv-frbl-rim-pulse {
  animation: fv-frbl-rim-pulse ${FRBL_READY_STAGE_SPEC.rimPulseMs}ms ease-out 1;
}
.fv-frbl-to-wireframe {
  animation: fv-frbl-to-wireframe ${FRBL_READY_STAGE_SPEC.toWireframeMs}ms ease-out both;
}
.fv-frbl-to-photo {
  animation: fv-frbl-to-photo ${FRBL_READY_STAGE_SPEC.toPhotoMs}ms ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .fv-frbl-stage-enter,
  .fv-frbl-rim-pulse,
  .fv-frbl-to-wireframe,
  .fv-frbl-to-photo {
    animation: none !important;
    transform: none !important;
  }
}
`;

export interface FormaVisionFrblReadyPlateProps {
  sessionId: string;
  poses: Record<string, boolean>;
  reducedMotion?: boolean;
  onPainted?: () => void;
  /** Test hook only. Product cold start is always Photo. */
  initialMode?: FrblReadyViewMode;
  /** Test hook: Wireframe already failed — stay on Wireframe + honesty. */
  initialWireframeFail?: boolean;
  /** Test hook: fail-reason when initialWireframeFail is set. */
  initialWireframeFailReason?: FrblWireframeFailReason;
}

export function FormaVisionFrblReadyPlate({
  sessionId,
  poses,
  reducedMotion = false,
  onPainted,
  initialMode = 'photo',
  initialWireframeFail = false,
  initialWireframeFailReason = 'unknown',
}: FormaVisionFrblReadyPlateProps) {
  const [side, setSide] = useState<PoseId>(() => defaultFrblReadySide(poses) ?? 'front');
  const [mode, setMode] = useState<FrblReadyViewMode>(
    initialWireframeFail ? 'wireframe' : initialMode,
  );
  const [url, setUrl] = useState<string | null>(null);
  const [shownUrl, setShownUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fading, setFading] = useState(false);
  const [rimPulse, setRimPulse] = useState(false);
  const [wireframeSpec, setWireframeSpec] = useState<FrblWireframeCageSpec | null>(null);
  const [wireframeFail, setWireframeFail] = useState(initialWireframeFail);
  const [wireframeFailReason, setWireframeFailReason] = useState<FrblWireframeFailReason | null>(
    initialWireframeFail ? initialWireframeFailReason : null,
  );
  const [wireframeLoading, setWireframeLoading] = useState(
    () =>
      !initialWireframeFail &&
      initialMode === 'wireframe' &&
      isFrblSidePresent(poses, defaultFrblReadySide(poses) ?? 'front'),
  );
  const [modeMotion, setModeMotion] = useState<'to-wireframe' | 'to-photo' | null>(null);
  const cageCacheRef = useRef<Map<string, FrblWireframeCageSpec>>(new Map());
  const skipInitialFailRetryRef = useRef(initialWireframeFail);
  const selfiePrewarmStartedRef = useRef(false);

  useEffect(() => {
    if (selfiePrewarmStartedRef.current) return;
    selfiePrewarmStartedRef.current = true;
    // H1: scan path pre-warms TFJS selfie; Ready Wireframe must too.
    void ensureSelfieSegmenter();
  }, []);

  useEffect(() => {
    if (mode !== 'wireframe') return;
    void ensureSelfieSegmenter();
  }, [mode]);

  useEffect(() => {
    const next = defaultFrblReadySide(poses);
    if (next && !isFrblSidePresent(poses, side)) {
      setSide(next);
    }
  }, [poses, side]);

  useEffect(() => {
    if (!isFrblSidePresent(poses, side)) {
      setUrl(null);
      setShownUrl(null);
      setFailed(false);
      setRimPulse(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SIGN_TIMEOUT_MS);
    setFailed(false);
    setUrl(null);
    (async () => {
      try {
        const signed = await fetchSignedFullUrl(sessionId, side, controller.signal);
        if (cancelled) return;
        if (signed) {
          setUrl(signed);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [sessionId, side, poses]);

  useEffect(() => {
    if (mode !== 'wireframe') {
      setWireframeLoading(false);
      return;
    }
    if (!isFrblSidePresent(poses, side)) {
      setWireframeSpec(null);
      setWireframeFail(false);
      setWireframeFailReason(null);
      setWireframeLoading(false);
      return;
    }
    if (skipInitialFailRetryRef.current) {
      skipInitialFailRetryRef.current = false;
      return;
    }
    const cacheKey = `${sessionId}:${side}`;
    const cached = cageCacheRef.current.get(cacheKey);
    if (cached) {
      setWireframeSpec(cached);
      setWireframeFail(false);
      setWireframeFailReason(null);
      setWireframeLoading(false);
      onPainted?.();
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setWireframeLoading(true);
    setWireframeFail(false);
    setWireframeFailReason(null);
    setWireframeSpec(null);

    const stayOnWireframeFail = (reason: FrblWireframeFailReason): void => {
      // Soft UX: honesty stays in the Wireframe chamber. Photo is one tap.
      setWireframeFail(true);
      setWireframeFailReason(reason);
      setWireframeLoading(false);
      setWireframeSpec(null);
    };

    (async () => {
      try {
        // Same-origin blob — never fetch the Storage signed URL in-page.
        const result = await runFrblReadyWireframeBuild({
          sessionId,
          side,
          signal: controller.signal,
          timeoutMs: WIREFRAME_TIMEOUT_MS,
        });
        if (cancelled) return;
        if (!result.ok) {
          stayOnWireframeFail(result.reason);
          return;
        }
        cageCacheRef.current.set(cacheKey, result.spec);
        setWireframeSpec(result.spec);
        setWireframeFail(false);
        setWireframeFailReason(null);
        setWireframeLoading(false);
        onPainted?.();
      } catch (error) {
        if (cancelled) return;
        const reason = classifyWireframeThrow(error, controller.signal);
        logFrblWireframeFail(reason, { poseId: side, error });
        stayOnWireframeFail(reason);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mode, sessionId, side, poses, onPainted]);

  const handleLoad = (): void => {
    if (!url) return;
    const isSideChange = Boolean(shownUrl && shownUrl !== url);
    if (!reducedMotion && isSideChange) {
      setFading(true);
      setRimPulse(true);
      window.setTimeout(() => {
        setShownUrl(url);
        setFading(false);
        setRimPulse(false);
        onPainted?.();
      }, CROSSFADE_MS);
      return;
    }
    setShownUrl(url);
    setFading(false);
    if (reducedMotion) setRimPulse(false);
    onPainted?.();
  };

  const handleModeChange = (next: FrblReadyViewMode): void => {
    if (next === mode) return;
    setMode(next);
    if (reducedMotion) {
      setModeMotion(null);
      setRimPulse(false);
      return;
    }
    setModeMotion(next === 'wireframe' ? 'to-wireframe' : 'to-photo');
    if (next === 'wireframe') setRimPulse(true);
    window.setTimeout(
      () => {
        setModeMotion(null);
        setRimPulse(false);
      },
      next === 'wireframe'
        ? FRBL_READY_STAGE_SPEC.toWireframeMs
        : FRBL_READY_STAGE_SPEC.toPhotoMs,
    );
  };

  const handleSideChange = (next: PoseId): void => {
    if (next === side) return;
    setSide(next);
    if (mode === 'wireframe' && !reducedMotion) {
      setRimPulse(true);
      window.setTimeout(() => setRimPulse(false), FRBL_READY_STAGE_SPEC.wireframeSideMs);
    }
  };

  const displayUrl = shownUrl ?? url;
  const present = isFrblSidePresent(poses, side);
  const chamber = !present
    ? 'empty'
    : mode === 'wireframe'
      ? wireframeSpec
        ? 'wireframe'
        : wireframeFail
          ? 'fail'
          : 'loading'
      : displayUrl
        ? 'photo'
        : 'empty';

  const modeMotionClass =
    !reducedMotion && modeMotion === 'to-wireframe'
      ? 'fv-frbl-to-wireframe'
      : !reducedMotion && modeMotion === 'to-photo'
        ? 'fv-frbl-to-photo'
        : '';

  return (
    <div
      data-testid="formavision-frbl-ready-plate"
      data-ready-side={side}
      data-ready-mode={mode}
      data-avatar-stage="frbl-2d"
      data-chamber={chamber}
      data-wireframe-loading={wireframeLoading ? 'true' : 'false'}
      data-wireframe-fail-reason={wireframeFail ? (wireframeFailReason ?? 'unknown') : undefined}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      className="absolute inset-0 overflow-hidden"
    >
      <style>{STAGE_STYLE}</style>
      <div
        data-testid="formavision-frbl-ready-bezel"
        className={`absolute inset-[10px] rounded-[1.75rem] border border-white/15 bg-[rgba(26,39,68,0.22)] backdrop-blur-[2px] ${
          reducedMotion ? '' : 'fv-frbl-stage-enter'
        }`}
      >
        <FrblReadyModeToggle active={mode} onChange={handleModeChange} />
        <div
          data-testid="formavision-frbl-ready-aperture"
          className={`absolute inset-x-2 top-[3.75rem] bottom-[4.75rem] overflow-hidden rounded-[1.5rem] bg-[#111827] sm:bottom-[5.25rem] sm:rounded-[1.75rem] ${
            !reducedMotion && rimPulse ? 'fv-frbl-rim-pulse' : ''
          }`}
          style={{
            boxShadow: [
              `inset 0 0 0 ${FRBL_READY_STAGE_SPEC.rimPx}px rgba(46,230,214,0.88)`,
              '0 0 14px 1px rgba(46,230,214,0.32)',
              '0 0 28px 4px rgba(45,165,160,0.16)',
            ].join(', '),
          }}
        >
          <div
            data-testid="formavision-frbl-ready-vignette"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{
              background:
                'radial-gradient(ellipse 58% 72% at 50% 46%, rgba(17,24,39,0) 38%, rgba(17,24,39,0.55) 78%, rgba(11,21,32,0.82) 100%)',
            }}
          />
          {mode === 'photo' && displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed Ready full URL, not an optimizable remote asset
            <img
              key={url ?? displayUrl}
              src={displayUrl}
              alt={`${FRBL_SIDE_LABELS[side]} Ready photo`}
              data-testid="formavision-frbl-ready-photo"
              onLoad={handleLoad}
              className={`absolute inset-0 z-[1] h-full w-full object-contain ${modeMotionClass}`}
              style={{
                opacity: fading && url && url !== shownUrl ? 0.35 : 1,
                transition: reducedMotion ? undefined : `opacity ${CROSSFADE_MS}ms ease`,
              }}
            />
          ) : null}
          {mode === 'wireframe' && wireframeSpec ? (
            <div className={`absolute inset-0 z-[1] ${modeMotionClass}`}>
              <FrblReadyWireframeCage spec={wireframeSpec} />
              <p
                data-testid="formavision-frbl-ready-wireframe-hint"
                className="pointer-events-none absolute inset-x-3 bottom-3 z-[3] text-center text-[10px] leading-relaxed text-white/55 sm:text-xs"
              >
                {FRBL_READY_WIREFRAME_HINT}
              </p>
            </div>
          ) : null}
          {mode === 'photo' && !displayUrl && present && !failed ? (
            <p
              data-testid="formavision-frbl-ready-loading"
              className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center text-sm text-white/70"
              role="status"
            >
              {FRBL_READY_PHOTO_LOADING}
            </p>
          ) : mode === 'wireframe' && present && !wireframeSpec && !wireframeFail ? (
            <p
              data-testid="formavision-frbl-ready-wireframe-loading"
              className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center text-sm text-white/70"
              role="status"
            >
              {FRBL_READY_WIREFRAME_LOADING}
            </p>
          ) : mode === 'wireframe' && present && wireframeFail && !wireframeSpec ? (
            <p
              data-testid="formavision-frbl-ready-wireframe-fail"
              className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center text-sm text-white/70"
              role="status"
            >
              {FRBL_READY_WIREFRAME_FAIL}
            </p>
          ) : !present || (mode === 'photo' && failed && !wireframeFail) ? (
            <p
              data-testid="formavision-frbl-ready-empty"
              className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center text-sm text-white/70"
              role="status"
            >
              {FRBL_SIDE_UNAVAILABLE_HELPER}
            </p>
          ) : null}
          {(displayUrl && mode === 'photo') || wireframeSpec ? (
            <div
              data-testid="formavision-frbl-ready-ground-glow"
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[7%] left-1/2 z-[1] h-7 w-[42%] -translate-x-1/2 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse, rgba(46,230,214,0.3) 0%, rgba(45,165,160,0.08) 46%, transparent 72%)',
                filter: 'blur(10px)',
              }}
            />
          ) : null}
        </div>
      </div>
      <FrblSideToggle active={side} poses={poses} onChange={handleSideChange} />
    </div>
  );
}
