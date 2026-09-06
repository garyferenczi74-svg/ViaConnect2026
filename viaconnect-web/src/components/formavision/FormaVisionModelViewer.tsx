'use client';

// Phone Ready success: in-page Meshy GLB via Google <model-viewer> 4.3.0.
// F3 is a cyan sheen on the loaded mesh, not a navy solid and not R3F.

import { useEffect, useRef, useState } from 'react';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import { applyF3HolographicOverlay } from '@/lib/formavision/viewer/applyF3HolographicOverlay';
import {
  modelViewerCameraOrbit,
  modelViewerCameraTarget,
  modelViewerFieldOfView,
} from '@/lib/formavision/viewer/modelViewerFraming';
import {
  MODEL_VIEWER_VERSION,
  ensureModelViewerScript,
} from '@/lib/formavision/viewer/modelViewerPin';
import type { ModelViewerModel } from '@/lib/formavision/viewer/applyF3HolographicOverlay';
import { FormaVisionPlateNotice } from './FormaVisionPlateNotice';

const F3_RIM = '#2EE6D6';

export const FORMAVISION_MODEL_VIEWER_TESTID = 'formavision-model-viewer';
export const FORMAVISION_F3_OVERLAY_TESTID = 'formavision-f3-overlay';

interface ModelViewerHost extends HTMLElement {
  model?: ModelViewerModel;
}

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
  const [f3Applied, setF3Applied] = useState(0);

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
      const applied = applyF3HolographicOverlay((el as ModelViewerHost).model);
      setF3Applied(applied);
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
      data-f3-applied={String(f3Applied)}
      data-f3-look="holographic-f3"
      className="absolute inset-0 h-full w-full"
      style={{ backgroundColor: FORMA_VISION_HEX.navy }}
    >
      <model-viewer
        src={src}
        ios-src={iosSrc ?? undefined}
        alt={alt}
        camera-controls
        disable-pan
        touch-action="pan-y"
        interaction-prompt="none"
        camera-orbit={modelViewerCameraOrbit()}
        camera-target={modelViewerCameraTarget()}
        field-of-view={modelViewerFieldOfView()}
        min-field-of-view="35deg"
        max-field-of-view="40deg"
        shadow-intensity="0.15"
        exposure="0.92"
        environment-image="neutral"
        tone-mapping="aces"
        auto-rotate
        auto-rotate-delay="800"
        rotation-per-second="8deg"
        reveal="auto"
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
          background: `radial-gradient(ellipse at 50% 42%, transparent 52%, ${FORMA_VISION_HEX.navy}88 100%)`,
          boxShadow: `inset 0 0 64px ${F3_RIM}26`,
        }}
      />
      {showNotice ? (
        <FormaVisionPlateNotice kind={scriptFailed ? 'unavailable' : 'loading'} />
      ) : null}
    </div>
  );
}

export default FormaVisionModelViewer;
