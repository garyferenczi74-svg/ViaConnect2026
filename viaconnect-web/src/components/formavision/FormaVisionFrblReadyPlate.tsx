'use client';

import { useEffect, useState } from 'react';
import { FrblSideToggle } from './FrblSideToggle';
import {
  defaultFrblReadySide,
  FRBL_SIDE_LABELS,
  FRBL_SIDE_UNAVAILABLE_HELPER,
  isFrblSidePresent,
} from '@/lib/formavision/viewer/frblReadySide';
import { fetchSignedFullUrl } from '@/lib/formavision/viewer/signedFullUrlCache';
import type { PoseId } from '@/lib/scan/poses';

// Brief 64 / Blueprint 64 — DESIGN-READY 2D avatar stage around retained
// FRBL photos. Still photos + toggle. Not Tripo/Meshy GLB. Not cyan
// wireframe / AnatomicalFloor. Pick/list logic stays in #214/#215.

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
} as const;

const CROSSFADE_MS = FRBL_READY_STAGE_SPEC.crossfadeMs;
const SIGN_TIMEOUT_MS = 8000;

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
.fv-frbl-stage-enter {
  animation: fv-frbl-stage-enter ${FRBL_READY_STAGE_SPEC.enterMs}ms ${FRBL_READY_STAGE_SPEC.enterEasing} both;
}
.fv-frbl-rim-pulse {
  animation: fv-frbl-rim-pulse ${FRBL_READY_STAGE_SPEC.rimPulseMs}ms ease-out 1;
}
@media (prefers-reduced-motion: reduce) {
  .fv-frbl-stage-enter,
  .fv-frbl-rim-pulse {
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
}

export function FormaVisionFrblReadyPlate({
  sessionId,
  poses,
  reducedMotion = false,
  onPainted,
}: FormaVisionFrblReadyPlateProps) {
  const [side, setSide] = useState<PoseId>(() => defaultFrblReadySide(poses) ?? 'front');
  const [url, setUrl] = useState<string | null>(null);
  const [shownUrl, setShownUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fading, setFading] = useState(false);
  const [rimPulse, setRimPulse] = useState(false);

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

  const displayUrl = shownUrl ?? url;
  const present = isFrblSidePresent(poses, side);
  const chamber = displayUrl ? 'photo' : 'empty';

  return (
    <div
      data-testid="formavision-frbl-ready-plate"
      data-ready-side={side}
      data-avatar-stage="frbl-2d"
      data-chamber={chamber}
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
        <div
          data-testid="formavision-frbl-ready-aperture"
          className={`absolute inset-x-2 top-2 bottom-[4.75rem] overflow-hidden rounded-[1.5rem] bg-[#111827] sm:bottom-[5.25rem] sm:rounded-[1.75rem] ${
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
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed Ready full URL, not an optimizable remote asset
            <img
              key={url ?? displayUrl}
              src={displayUrl}
              alt={`${FRBL_SIDE_LABELS[side]} Ready photo`}
              data-testid="formavision-frbl-ready-photo"
              onLoad={handleLoad}
              className="absolute inset-0 z-[1] h-full w-full object-contain"
              style={{
                opacity: fading && url && url !== shownUrl ? 0.35 : 1,
                transition: reducedMotion ? undefined : `opacity ${CROSSFADE_MS}ms ease`,
              }}
            />
          ) : present && !failed ? (
            <p
              data-testid="formavision-frbl-ready-loading"
              className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center text-sm text-white/70"
              role="status"
            >
              Loading Ready photo from your scan.
            </p>
          ) : (
            <p
              data-testid="formavision-frbl-ready-empty"
              className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center text-sm text-white/70"
              role="status"
            >
              {FRBL_SIDE_UNAVAILABLE_HELPER}
            </p>
          )}
          {displayUrl ? (
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
      <FrblSideToggle active={side} poses={poses} onChange={setSide} />
    </div>
  );
}
