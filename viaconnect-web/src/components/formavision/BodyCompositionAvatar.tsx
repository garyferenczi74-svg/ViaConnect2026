'use client';

// Capability-gated mount point for the Body Composition avatar (Prompt 210b, P1-T5).
//
// This wrapper is what the composition page renders in place of the bare 2D
// SegmentalHeatMap. It decides which avatar the user sees:
//
//   3D FormaVision3DAvatar  when WebGL is available and no render error occurred
//   2D floor (children)     otherwise (WebGL off, low-power, or a render error)
//
// The 2D path is the GUARANTEED FALLBACK FLOOR (Section 2/17): it is passed in
// verbatim as children and rendered unchanged whenever the 3D avatar cannot or
// should not run, so the page looks and works exactly as it does today when
// WebGL is unavailable. The 3D avatar owns its own WebGL probe and render error
// boundary and reports both through onRenderError; this wrapper latches that
// signal once and swaps to the floor, never recovering mid-session so the user
// is not flipped back and forth.
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
import type { SegmentTintRecord } from '@/lib/formavision/geometry/segmentTints';
import type { AvatarQualitySignals } from '@/lib/formavision/telemetry/avatarTelemetry';
import { buildAvatarQualitySnapshot } from '@/lib/formavision/telemetry/avatarTelemetry';
import { FormaVision3DAvatar } from './FormaVision3DAvatar';
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
  children,
}: BodyCompositionAvatarProps) {
  // Latched once the avatar reports a WebGL-unavailable gate or a render error.
  // From that point on the 2D floor is shown for the rest of the session.
  const [fellBack, setFellBack] = useState(false);

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

  // P8-T1c: called from FormaVisionCanvas onCreated (GL context ready). Fires
  // once per canvas mount; subsequent calls are no-ops (the null guard prevents
  // overwrite). Used to populate timeToFirstInteractiveMs in the quality snapshot.
  const handleFirstInteractive = useCallback((): void => {
    if (firstInteractiveMsRef.current !== null) return;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    firstInteractiveMsRef.current = Math.round(now - mountTimeRef.current);
  }, []); // refs are stable; no deps needed

  // The runtime step-down past 'lite' converges on the SAME fallback latch the WebGL
  // gate and the render-error boundary use: a '2d' tier flips fellBack, so there is
  // exactly one 2D-floor decision and one render branch, never a parallel 2D path.
  useEffect(() => {
    if (tier === '2d') {
      setFellBack(true);
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

  if (fellBack || tier === '2d') {
    return <>{children}</>;
  }

  // Only the two 3D tiers reach the avatar here; '2d' was handled above. On a capable
  // device this is 'cinematic', so the avatar is byte-identical to before this phase.
  const renderTier: 'cinematic' | 'lite' = tier === 'lite' ? 'lite' : 'cinematic';

  // The 3D avatar canvas fills its box absolutely, so it needs an explicit
  // footprint. Height comes from the FormaVision plate (viewport-capped), not
  // from aspect-[720/1152] × max-w-[600px] (~960px — taller than a laptop
  // content viewport). Fill the plate, stay centered, keep a 600px width cap.
  // Muscle / Body Fat / Measurements use the 2D SegmentalHeatMap, not this
  // wrapper, so their column-fill classes stay untouched.
  return (
    <div
      data-testid="formavision-avatar-footprint"
      className="relative mx-auto h-full w-full max-h-full max-w-[600px]"
    >
      <FormaVision3DAvatar
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
        onRenderError={() => {
          errorCountRef.current += 1;
          setFellBack(true);
        }}
        onOrbitEnd={onOrbitEnd}
        onFirstInteractive={handleFirstInteractive}
        frameloopMode={frameloopMode}
      />
    </div>
  );
}

export default BodyCompositionAvatar;
