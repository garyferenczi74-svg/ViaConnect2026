'use client';

// Capability-gated mount point for the Body Composition avatar (Prompt 210b, P1-T5).
//
// This wrapper is what the FormaVision plate renders in place of a bare 2D
// SegmentalHeatMap. selectAvatarSurface decides which avatar the user sees:
//
//   3D FormaVision3DAvatar  preferred whenever 3D has not confirmed-failed
//   2D floor (children)     after a fresh-canvas probe is unavailable, remounts
//                           are exhausted, or tier 2d
//
// A render-time hasWebGL() false (SSR, iOS Safari false-negative) must NOT
// latch the floor. A live-canvas / renderer miss while a fresh getContext still
// works remounts 3D — that is not "device has no WebGL". The 2D path is the
// GUARANTEED FALLBACK FLOOR (Section 2/17) and is wrapped in
// FormaVisionFallbackNotice so a lean SVG cannot be mistaken for a morph.
//
// UNIT CONTRACT: the page passes the SAME displayUnit it requested from
// useCircumferenceData as the unit prop, which is forwarded verbatim to the
// avatar (and onward to scanToParamVector). The unit is never assumed here.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex, BodyParamVector } from '@/lib/formavision/geometry/types';
import type { AvatarGirthSource } from '@/lib/formavision/morph/avatarMorphStamp';
import type { SegmentTintRecord } from '@/lib/formavision/geometry/segmentTints';
import type { AvatarQualitySignals } from '@/lib/formavision/telemetry/avatarTelemetry';
import { buildAvatarQualitySnapshot } from '@/lib/formavision/telemetry/avatarTelemetry';
import {
  selectAvatarSurface,
  shouldPaintPlateFloor,
  type WebGLAvailability,
} from '@/lib/formavision/tier/avatarSurfaceDecision';
import {
  errorMessageFromUnknown,
  shouldLatchFallback2d,
} from '@/lib/formavision/tier/fallbackNoticeCopy';
import {
  CONTEXT_RESTORE_WAIT_MS,
  WEBGL_REMOUNT_BUDGET,
  decideContextLossAction,
  decideZeroSizeAction,
  isWebGLContextLostMessage,
  isZeroSizeCanvasMessage,
} from '@/lib/formavision/gl/webglContextRecovery';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import { FormaVision3DAvatar } from './FormaVision3DAvatar';
import { FormaVisionFallbackNotice } from './FormaVisionFallbackNotice';
import { FormaVisionAnatomicalFloor } from './FormaVisionAnatomicalFloor';
import { selectFloorGirths } from './anatomicalFloorGeometry';
import { probeWebGL } from './hasWebGL';
import { useRenderTier, useReportBudgetMiss } from './RenderTierProvider';

export interface BodyCompositionAvatarProps {
  sex: Sex;
  scan: CompositionSnapshot | null;
  firstScan?: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  unit: MeasurementUnit;
  heightCm?: number | null;
  activeTab: 'bodyFat' | 'muscleMass' | 'measurements';
  selectedBodyPart?: string | null;
  onSelectBodyPart?: (key: string | null) => void;
  reducedMotion?: boolean;
  // OV-T2: per-segment tint colors (heat-map hex) the avatar ramps in by tab.
  // Forwarded verbatim to the 3D avatar; null or absent segments stay neutral.
  segmentTints?: SegmentTintRecord | null;
  // P3-T2b: the Time Machine scrub shape. When set, the body follows it directly
  // (no tween, per P3-T2a); null rests the body at its last shape. Forwarded
  // verbatim to the 3D avatar.
  scrubVector?: BodyParamVector | null;
  // P5-T1b: the projected future-self ghost shape (projectFutureSelfVector, P5-T1a)
  // and its master gate, forwarded verbatim to the 3D avatar. When showGhost is true
  // AND ghostVector is non-null, a translucent ghost overlays the current body; both
  // default off so the avatar is unchanged. P5-T1c wires the toggle + goal resolution.
  ghostVector?: BodyParamVector | null;
  showGhost?: boolean;
  // Brief 2: A/B wipe against a baseline parametric vector. Forwarded verbatim.
  wipeActive?: boolean;
  wipeT?: number;
  wipeVector?: BodyParamVector | null;
  // P8-T1b: telemetry seam forwarded to FormaVisionCanvas. Called once at the end
  // of each orbit gesture (formavision.avatar_rotated). Absent means no telemetry.
  onOrbitEnd?: () => void;
  // P8-T1b/T1c: telemetry seam. Called once when the tier first steps down below
  // cinematic (lite) or reaches the 2D floor (2d). The quality signals snapshot
  // is included so the call site can enrich the fallback_tier_served event.
  // Absent means no telemetry.
  onTierStepDown?: (tier: 'lite' | '2d', signals: AvatarQualitySignals) => void;
  // Prompt 211a W1: forwarded verbatim to the 3D avatar so the clip recorder can
  // flip the r3f frameloop to "always" during a recording. Absent / "demand"
  // keeps the byte-identical demand loop. The 2D floor ignores it (no canvas).
  frameloopMode?: 'always' | 'demand';
  girthSource?: AvatarGirthSource;
  // The 2D floor for this section, rendered as-is on any fallback.
  children: React.ReactNode;
}

export function BodyCompositionAvatar(props: BodyCompositionAvatarProps) {
  // P7-T2: the RenderTierProvider has been hoisted to the composition surface
  // (page.tsx) so page-level layers can also read the ambient tier. This component
  // now consumes the ambient provider via useRenderTier/useReportBudgetMiss (in
  // BodyCompositionAvatarInner). The context default value is 'cinematic', so the
  // avatar is byte-identical to before when rendered outside a provider.
  return <BodyCompositionAvatarInner {...props} />;
}

function BodyCompositionAvatarInner({
  sex,
  scan,
  firstScan = null,
  circumferences,
  unit,
  heightCm = null,
  activeTab,
  selectedBodyPart = null,
  onSelectBodyPart,
  reducedMotion,
  segmentTints = null,
  scrubVector = null,
  ghostVector = null,
  showGhost = false,
  wipeActive = false,
  wipeT = 0.5,
  wipeVector = null,
  onOrbitEnd,
  onTierStepDown,
  frameloopMode,
  girthSource,
  children,
}: BodyCompositionAvatarProps) {
  // Remounts a live-canvas miss while getContext still works (not "no WebGL").
  // Context-loss waits for webglcontextrestored before remounting; only a
  // restore timeout burns remountsRef. After remountsRef >= budget, latch the
  // 2D floor + honest fallbackReason. Anatomical 2D ALWAYS paints until
  // the live canvas has presented pixels (GL created ≠ painted).
  const [fellBack, setFellBack] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [canvasHasPainted, setCanvasHasPainted] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [fallbackWebgl, setFallbackWebgl] = useState<WebGLAvailability>('unknown');
  const [mountEpoch, setMountEpoch] = useState(0);
  const remountsRef = useRef(0);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The active render tier (capability probe initially; stepped down at runtime) and
  // the sticky step-down trigger passed into the Canvas frame-budget monitor.
  const tier = useRenderTier();
  const reportBudgetMiss = useReportBudgetMiss();

  // P8-T1b: once-guard for the tier step-down telemetry event. Tracks the lowest
  // tier we have already fired to avoid re-firing on renders after a step-down.
  // 'none' -> first step-down fires; 'lite' -> already fired lite; '2d' -> floor.
  const tierFiredRef = useRef<'none' | 'lite' | '2d'>('none');

  // P8-T1c: quality-signal counters. Incremented on each genuine step-down or
  // render error. Read only when emitting fallback_tier_served.
  const stepDownCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  // P8-T1c: mount time for timeToFirstInteractiveMs. Set once at component
  // instantiation (not in a useEffect, so it captures the actual render time).
  const mountTimeRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0,
  );
  const firstInteractiveMsRef = useRef<number | null>(null);

  // P8-T1c: called after the first PAINTED demand frame (not Canvas
  // onCreated — GL ready ≠ pixels). Fires once per canvas mount.
  const clearRestoreTimer = useCallback((): void => {
    if (restoreTimerRef.current !== null) {
      clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
  }, []);

  const handleFirstInteractive = useCallback((): void => {
    if (firstInteractiveMsRef.current === null) {
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      firstInteractiveMsRef.current = Math.round(now - mountTimeRef.current);
    }
    setCanvasHasPainted(true);
    setFallbackReason(null);
    setRecovering(false);
    clearRestoreTimer();
  }, [clearRestoreTimer]);

  const latchHonestFloor = useCallback((message: string): void => {
    clearRestoreTimer();
    setRecovering(false);
    setFallbackReason(message);
    setFellBack(true);
  }, [clearRestoreTimer]);

  const handleRenderError = useCallback((error: unknown): void => {
    errorCountRef.current += 1;
    const message = errorMessageFromUnknown(error);
    const probe = probeWebGL();
    setFallbackReason(message);
    setFallbackWebgl(probe);
    setCanvasHasPainted(false);
    setRecovering(true);

    if (isZeroSizeCanvasMessage(message) && decideZeroSizeAction() === 'latch-2d') {
      latchHonestFloor(message);
      return;
    }

    if (isWebGLContextLostMessage(message)) {
      const decision = decideContextLossAction({
        remountsUsed: remountsRef.current,
        restoreSeen: false,
        timedOut: false,
      });
      if (decision === 'wait-restore') {
        clearRestoreTimer();
        restoreTimerRef.current = setTimeout(() => {
          const timedOut = decideContextLossAction({
            remountsUsed: remountsRef.current,
            restoreSeen: false,
            timedOut: true,
          });
          if (timedOut === 'remount') {
            remountsRef.current += 1;
            setMountEpoch((n) => n + 1);
            return;
          }
          latchHonestFloor(message);
        }, CONTEXT_RESTORE_WAIT_MS);
        return;
      }
    }

    if (!shouldLatchFallback2d(probe) && remountsRef.current < WEBGL_REMOUNT_BUDGET) {
      remountsRef.current += 1;
      setMountEpoch((n) => n + 1);
      return;
    }
    latchHonestFloor(message);
  }, [clearRestoreTimer, latchHonestFloor]);

  const handleContextRestored = useCallback((): void => {
    clearRestoreTimer();
    setCanvasHasPainted(false);
    setRecovering(true);
    setMountEpoch((n) => n + 1);
  }, [clearRestoreTimer]);

  useEffect(() => {
    return () => {
      clearRestoreTimer();
    };
  }, [clearRestoreTimer]);

  // The runtime step-down past 'lite' converges on the SAME fallback latch the WebGL
  // gate and the render-error boundary use: a '2d' tier flips fellBack, so there is
  // exactly one 2D-floor decision and one render branch, never a parallel 2D path.
  useEffect(() => {
    if (tier === '2d') {
      setFellBack(true);
      setFallbackReason((current) => current ?? '3D stepped down after a sustained frame-budget miss');
      setFallbackWebgl(probeWebGL());
    }
    // P8-T1b/T1c: fire the step-down telemetry event on the first drop below
    // cinematic, enriched with the quality snapshot (P8-T1c).
    if (tier === 'lite' && tierFiredRef.current === 'none') {
      tierFiredRef.current = 'lite';
      stepDownCountRef.current += 1;
      onTierStepDown?.(
        'lite',
        buildAvatarQualitySnapshot('lite', stepDownCountRef.current, errorCountRef.current, firstInteractiveMsRef.current),
      );
    } else if (tier === '2d' && tierFiredRef.current !== '2d') {
      tierFiredRef.current = '2d';
      stepDownCountRef.current += 1;
      onTierStepDown?.(
        '2d',
        buildAvatarQualitySnapshot('2d', stepDownCountRef.current, errorCountRef.current, firstInteractiveMsRef.current),
      );
    }
  }, [tier, onTierStepDown]);

  // P8-T1b/T1c: also fire the '2d' tier event when fellBack is set by the WebGL
  // gate or render-error boundary (which do not go through the tier ladder).
  // The errorCount has already been incremented by the onRenderError handler.
  useEffect(() => {
    if (fellBack && tierFiredRef.current !== '2d') {
      tierFiredRef.current = '2d';
      stepDownCountRef.current += 1;
      onTierStepDown?.(
        '2d',
        buildAvatarQualitySnapshot('2d', stepDownCountRef.current, errorCountRef.current, firstInteractiveMsRef.current),
      );
    }
  }, [fellBack, onTierStepDown]);

  const surface = selectAvatarSurface({
    renderTier: tier,
    confirmedFailure: fellBack,
    webgl: 'unknown',
  });
  if (surface === 'fallback2d') {
    return (
      <div
        data-testid="formavision-avatar-footprint"
        className="absolute inset-0 mx-auto h-full w-full max-w-[600px]"
      >
        <FormaVisionFallbackNotice reason={fallbackReason} webgl={fallbackWebgl}>
          {children}
        </FormaVisionFallbackNotice>
      </div>
    );
  }

  // Only the two 3D tiers reach the avatar here; '2d' was handled above. On a capable
  // device this is 'cinematic', so the avatar is byte-identical to before this phase.
  const renderTier: 'cinematic' | 'lite' = tier === 'lite' ? 'lite' : 'cinematic';

  // The 3D canvas is position:absolute inset-0. A flex items-center plate
  // plus h-full-only footprint collapses to 0×0 on iPhone WebKit (DOM attrs
  // still stamp → attr PASS / visual FAIL). Absolute inset-0 sizes against
  // the plate's definite min(52vh, 520px) box.
  return (
    <div
      data-testid="formavision-avatar-footprint"
      className="absolute inset-0 mx-auto h-full w-full max-w-[600px]"
    >
      {shouldPaintPlateFloor({ liveCanvasHasPainted: canvasHasPainted }) || recovering ? (
        <div
          data-testid="formavision-recovering-floor"
          className={`pointer-events-none absolute inset-0 ${recovering ? 'z-20' : 'z-0'}`}
          style={{ backgroundColor: FORMA_VISION_HEX.navy }}
        >
          <FormaVisionAnatomicalFloor
            sex={sex}
            girths={selectFloorGirths(circumferences, girthSource)}
          />
        </div>
      ) : null}
      <FormaVision3DAvatar
        key={mountEpoch}
        sex={sex}
        scan={scan}
        firstScan={firstScan}
        circumferences={circumferences}
        unit={unit}
        heightCm={heightCm}
        activeTab={activeTab}
        selectedBodyPart={selectedBodyPart}
        onSelectBodyPart={onSelectBodyPart}
        reducedMotion={reducedMotion}
        segmentTints={segmentTints}
        scrubVector={scrubVector}
        ghostVector={ghostVector}
        showGhost={showGhost}
        wipeActive={wipeActive}
        wipeT={wipeT}
        wipeVector={wipeVector}
        renderTier={renderTier}
        onBudgetMissed={reportBudgetMiss}
        onRenderError={handleRenderError}
        onContextRestored={handleContextRestored}
        onOrbitEnd={onOrbitEnd}
        onFirstInteractive={handleFirstInteractive}
        frameloopMode={frameloopMode}
        girthSource={girthSource}
      />
    </div>
  );
}

export default BodyCompositionAvatar;
