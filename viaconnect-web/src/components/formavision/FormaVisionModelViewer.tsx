'use client';

// Option A Ready plate: in-page Meshy GLB via Google <model-viewer> 4.3.0.
// Phone WebKit paints this path. R3F is not required for Ready success.
// USDZ / Quick Look is bonus (ar + auto-generated ios-src in 4.3.0), not
// the success bar. F3 holographic grid is a CSS overlay on the live GLB.

import { useEffect, useRef, useState } from 'react';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  MODEL_VIEWER_VERSION,
  ensureModelViewerScript,
} from '@/lib/formavision/viewer/modelViewerPin';
import { FormaVisionPlateNotice } from './FormaVisionPlateNotice';

// Brief 60 Frame 3 line color (Chrome plasma teal). Overlay only — the
// four locked brand tokens stay unchanged.
const F3_GRID_TEAL = '#2EE6D6';

export const FORMAVISION_MODEL_VIEWER_TESTID = 'formavision-model-viewer';
export const FORMAVISION_F3_OVERLAY_TESTID = 'formavision-f3-overlay';

export interface FormaVisionModelViewerProps {
  src: string;
  iosSrc?: string | null;
  alt?: string;
  painted?: boolean;
  onPainted?: () => void;
  onError?: () => void;
}

export function FormaVisionModelViewer({
  src,
  iosSrc = null,
  alt = '3D body visual from your scan',
  painted = false,
  onPainted,
  onError,
}: FormaVisionModelViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureModelViewerScript().then(
      () => {
        if (!cancelled) setScriptReady(true);
      },
      () => {
        if (!cancelled) {
          setScriptFailed(true);
          onError?.();
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el = host.querySelector('model-viewer');
    if (!el) return;

    const handleLoad = (): void => {
      onPainted?.();
    };
    const handleError = (): void => {
      onError?.();
    };
    el.addEventListener('load', handleLoad);
    el.addEventListener('error', handleError);
    return () => {
      el.removeEventListener('load', handleLoad);
      el.removeEventListener('error', handleError);
    };
  }, [onError, onPainted, src]);

  const showNotice = !painted || scriptFailed;

  return (
    <div
      ref={hostRef}
      data-testid={FORMAVISION_MODEL_VIEWER_TESTID}
      data-model-viewer-version={MODEL_VIEWER_VERSION}
      data-painted={painted ? 'true' : 'false'}
      className="absolute inset-0 h-full w-full"
      style={{ backgroundColor: FORMA_VISION_HEX.navy }}
    >
      <model-viewer
        src={src}
        ios-src={iosSrc ?? undefined}
        alt={alt}
        camera-controls
        touch-action="pan-y"
        interaction-prompt="none"
        camera-orbit="180deg 75deg 2.7m"
        field-of-view="38deg"
        shadow-intensity="0"
        exposure="0.9"
        reveal="auto"
        ar
        ar-modes="webxr scene-viewer quick-look"
        data-testid="formavision-model-viewer-el"
        data-script-ready={scriptReady ? 'true' : 'false'}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: FORMA_VISION_HEX.navy,
          display: 'block',
        }}
      />
      <div
        data-testid={FORMAVISION_F3_OVERLAY_TESTID}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage: [
            `repeating-linear-gradient(0deg, transparent 0 7px, ${F3_GRID_TEAL}14 7px 8px)`,
            `repeating-linear-gradient(90deg, transparent 0 7px, ${F3_GRID_TEAL}10 7px 8px)`,
          ].join(', '),
          mixBlendMode: 'screen',
          boxShadow: `inset 0 0 80px ${F3_GRID_TEAL}40`,
        }}
      />
      {showNotice ? (
        <FormaVisionPlateNotice kind={scriptFailed ? 'unavailable' : 'loading'} />
      ) : null}
    </div>
  );
}

export default FormaVisionModelViewer;
