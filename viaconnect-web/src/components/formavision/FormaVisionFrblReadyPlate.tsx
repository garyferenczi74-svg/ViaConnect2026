'use client';

import { useEffect, useState } from 'react';
import { FrblSideToggle } from './FrblSideToggle';
import {
  defaultFrblReadySide,
  FRBL_SIDE_LABELS,
  isFrblSidePresent,
} from '@/lib/formavision/viewer/frblReadySide';
import { fetchSignedFullUrl } from '@/lib/formavision/viewer/signedFullUrlCache';
import type { PoseId } from '@/lib/scan/poses';

const CROSSFADE_MS = 180;
const SIGN_TIMEOUT_MS = 8000;

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
    if (!reducedMotion && shownUrl && shownUrl !== url) {
      setFading(true);
      window.setTimeout(() => {
        setShownUrl(url);
        setFading(false);
        onPainted?.();
      }, CROSSFADE_MS);
      return;
    }
    setShownUrl(url);
    setFading(false);
    onPainted?.();
  };

  const displayUrl = shownUrl ?? url;
  const present = isFrblSidePresent(poses, side);

  return (
    <div
      data-testid="formavision-frbl-ready-plate"
      data-ready-side={side}
      className="absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Ready full URL, not an optimizable remote asset
          <img
            key={url ?? displayUrl}
            src={displayUrl}
            alt={`${FRBL_SIDE_LABELS[side]} Ready photo`}
            data-testid="formavision-frbl-ready-photo"
            onLoad={handleLoad}
            className="h-full w-full object-contain"
            style={{
              opacity: fading && url && url !== shownUrl ? 0.35 : 1,
              transition: reducedMotion ? undefined : `opacity ${CROSSFADE_MS}ms ease`,
            }}
          />
        ) : present && !failed ? (
          <p
            data-testid="formavision-frbl-ready-loading"
            className="px-6 text-center text-sm text-white/70"
            role="status"
          >
            Loading Ready photo from your scan.
          </p>
        ) : (
          <p
            data-testid="formavision-frbl-ready-empty"
            className="px-6 text-center text-sm text-white/70"
            role="status"
          >
            This side was not kept. Choose another Ready photo.
          </p>
        )}
      </div>
      <FrblSideToggle active={side} poses={poses} onChange={setSide} />
    </div>
  );
}
