'use client';

// The single public mount point for the FormaVision 3D avatar (Prompt 210b, P1-T4).
//
// FormaVision3DAvatar is the seam the rest of FormaVision composes around. It owns
// the resilience contract so callers do not have to: a client-only canvas mount
// (never a render-time hasWebGL hard gate — that false-negatives on SSR and iOS
// Safari), a lazy ssr:false import of the three bundle, and a render error
// boundary that paints a navy chamber + text-only notice (never a silent
// empty plate, never the teal anatomical outline).
// Later phases layer GeneticsOverlay, FutureSelfGhost and JourneyTimeline around
// THIS component; the renderTier prop and the clean scene seam are here for them.
// This task builds only the core 3D body.
//
// UNIT CONTRACT (critical): CircumferenceMeasurements values carry no embedded
// unit; useCircumferenceData converts them to a caller-chosen displayUnit. Whoever
// owns the data (the page wrapper, P1-T5) MUST pass the SAME displayUnit it
// requested from useCircumferenceData as the `unit` prop here, and this component
// forwards it verbatim into scanToParamVector. A unit is never assumed or
// hardcoded; passing the wrong one silently yields a wrong-size body.
//
// Neutral template body: with scan null and circumferences null the geometry layer
// fills every ring from the sex template and flags it estimated, so the avatar
// renders a neutral template body for the sex rather than blanking. Nothing is
// fabricated; UNKNOWN stays the template default.

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex, BodyParamVector } from '@/lib/formavision/geometry/types';
import type { AvatarGirthSource } from '@/lib/formavision/morph/avatarMorphStamp';
import type { MeshyVisualStatus } from '@/lib/formavision/meshy/types';
import type { SegmentTintRecord } from '@/lib/formavision/geometry/segmentTints';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import { floorMotionTransition } from '@/lib/formavision/motion/floorMotionSpec';
import { AvatarErrorBoundary } from './AvatarErrorBoundary';
import { FormaVisionPlateNotice } from './FormaVisionPlateNotice';

// Pending / chunk-load shroud. Navy chamber + spinner + text notice.
// Gary 2026-09-03: no teal anatomical outline. Empty navy alone is FAIL.
function CanvasLoader() {
  return (
    <div
      className="absolute inset-0"
      style={{ backgroundColor: FORMA_VISION_HEX.navy }}
      data-testid="formavision-canvas-loader"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/50">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
      </div>
      <FormaVisionPlateNotice kind="loading" />
    </div>
  );
}

// Three + r3f code is loaded client-side only so the SSR bundle stays small and
// first paint is never blocked by the 3D scene. Loading paints the navy
// chamber — never the teal anatomical outline.
const FormaVisionCanvas = dynamic(() => import('./FormaVisionCanvas'), {
  ssr: false,
  loading: () => <CanvasLoader />,
});

export interface FormaVision3DAvatarProps {
  sex: Sex;
  scan: CompositionSnapshot | null;
  firstScan?: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  // The unit the circumference values are expressed in (see the UNIT CONTRACT).
  unit: MeasurementUnit;
  heightCm?: number | null;
  activeTab: 'bodyFat' | 'muscleMass' | 'measurements';
  selectedBodyPart?: string | null;
  onSelectBodyPart?: (key: string | null) => void;
  // Optional region that gets a one-shot orange emphasis accent (a peak change or
  // win). A later task feeds this from the composition delta; unset means none.
  emphasisRegion?: string;
  // Optional per-segment status colors for the Body Fat / Muscle overlay tint, keyed
  // by segment name, or null where UNKNOWN. A later task (OV-T2/T3) computes these;
  // unset means no overlay tint and the avatar looks as today.
  segmentTints?: SegmentTintRecord | null;
  // Optional scrub shape for the time machine. When set the body follows it directly
  // (no tween); null resumes normal target-morph from the last scrubbed shape. P3-T2b
  // drives this from the timeline scrubber.
  scrubVector?: BodyParamVector | null;
  // Optional projected future-self ghost shape (projectFutureSelfVector, P5-T1a) and
  // its master gate. When showGhost is true AND ghostVector is non-null, a translucent
  // ghost is overlaid on the current avatar; both default off (avatar unchanged). The
  // toggle + goal resolution that drive these land in P5-T1c.
  ghostVector?: BodyParamVector | null;
  showGhost?: boolean;
  // Brief 2: A/B wipe against a baseline parametric vector. Forwarded verbatim.
  wipeActive?: boolean;
  wipeT?: number;
  wipeVector?: BodyParamVector | null;
  reducedMotion?: boolean;
  // Defaults to cinematic. The tier is selected by the RenderTierProvider (P7-T1);
  // lite trims geometry density.
  renderTier?: 'cinematic' | 'lite';
  // P7-T1: forwarded into the Canvas frame-budget monitor. Called (at most once per
  // sustained over-budget window) when the demand-loop frame budget is missed, so
  // the provider can step the tier down. Optional: when absent the monitor is not
  // mounted and the avatar is byte-identical to before this phase.
  onBudgetMissed?: () => void;
  // Called on a confirmed render error or WebGL context loss, so the parent can
  // wait for restore, remount, or latch the honest 2D floor. Not fired from a
  // render-time hasWebGL probe.
  onRenderError: (error: unknown) => void;
  // Fired after preventDefault(webglcontextlost) when the browser restores GL.
  // Parent remounts the r3f Canvas; it must not tear the plate empty first.
  onContextRestored?: () => void;
  // P8-T1b: forwarded into FormaVisionCanvas for the avatar_rotated telemetry seam.
  // Called once at the end of each orbit gesture. Absent means no telemetry.
  onOrbitEnd?: () => void;
  // P8-T1c: forwarded into FormaVisionCanvas for timeToFirstInteractiveMs.
  // Called once after the first PAINTED demand frame (not onCreated).
  // Absent means the metric is omitted from the quality snapshot.
  onFirstInteractive?: () => void;
  // Prompt 211a W1: forwarded into FormaVisionCanvas so the clip recorder can flip
  // the r3f frameloop to "always" during a recording (captureStream needs painted
  // frames). Absent / "demand" keeps the byte-identical demand loop.
  frameloopMode?: 'always' | 'demand';
  girthSource?: AvatarGirthSource;
  // MOTION-SPEC morph_3d: 0 while the labeled 2D floor holds, 1 after 3D is ready.
  morph3d?: number;
  morphDurationMs?: number;
  morphEasing?: string;
  meshyGlbUrl?: string | null;
  meshyStatus?: MeshyVisualStatus;
}

export function FormaVision3DAvatar({
  sex,
  scan,
  circumferences,
  unit,
  heightCm,
  reducedMotion,
  selectedBodyPart,
  emphasisRegion,
  activeTab,
  segmentTints,
  scrubVector,
  ghostVector,
  showGhost,
  wipeActive,
  wipeT,
  wipeVector,
  renderTier = 'cinematic',
  onBudgetMissed,
  onRenderError,
  onContextRestored,
  onOrbitEnd,
  onFirstInteractive,
  frameloopMode,
  girthSource,
  morph3d = 1,
  morphDurationMs = 0,
  morphEasing = 'linear',
  meshyGlbUrl = null,
  meshyStatus = 'idle',
}: FormaVision3DAvatarProps) {
  // Client-only mount of the r3f canvas. SSR and the first hydrated paint share
  // the pending loader so a Node hasWebGL() === false cannot queue onRenderError
  // and latch the anatomical 2D floor before WebGL is even asked for on the device.
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const handleRenderError = useCallback(
    (error: unknown) => {
      onRenderError(error);
    },
    [onRenderError],
  );

  if (!clientReady) {
    return (
      <div className="absolute inset-0 h-full w-full" data-testid="formavision-3d-pending">
        <CanvasLoader />
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 h-full w-full"
      data-testid="formavision-3d-mount"
      data-morph-3d={morph3d}
      style={{
        opacity: morph3d,
        isolation: 'isolate',
        transform: 'translateZ(0)',
        transition: floorMotionTransition(morphDurationMs, morphEasing),
      }}
    >
      <AvatarErrorBoundary
        onRenderError={handleRenderError}
        fallback={
          <div
            className="absolute inset-0"
            style={{ backgroundColor: FORMA_VISION_HEX.navy }}
            data-testid="formavision-3d-unavailable-notice"
          >
            <FormaVisionPlateNotice kind="unavailable" />
          </div>
        }
      >
        <FormaVisionCanvas
          sex={sex}
          scan={scan}
          circumferences={circumferences}
          unit={unit}
          heightCm={heightCm}
          reducedMotion={reducedMotion}
          selectedBodyPart={selectedBodyPart}
          emphasisRegion={emphasisRegion}
          activeTab={activeTab}
          segmentTints={segmentTints}
          scrubVector={scrubVector}
          ghostVector={ghostVector}
          showGhost={showGhost}
          wipeActive={wipeActive}
          wipeT={wipeT}
          wipeVector={wipeVector}
          renderTier={renderTier}
          onBudgetMissed={onBudgetMissed}
          onOrbitEnd={onOrbitEnd}
          onFirstInteractive={onFirstInteractive}
          onContextLost={handleRenderError}
          onContextRestored={onContextRestored}
          frameloopMode={frameloopMode}
          girthSource={girthSource}
          meshyGlbUrl={meshyGlbUrl}
          meshyStatus={meshyStatus}
        />
      </AvatarErrorBoundary>
    </div>
  );
}

export default FormaVision3DAvatar;
