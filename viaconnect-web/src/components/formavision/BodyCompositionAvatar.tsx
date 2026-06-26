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

import { useState } from 'react';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';
import { FormaVision3DAvatar } from './FormaVision3DAvatar';

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
  // The 2D floor for this section, rendered as-is on any fallback.
  children: React.ReactNode;
}

export function BodyCompositionAvatar({
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
  children,
}: BodyCompositionAvatarProps) {
  // Latched once the avatar reports a WebGL-unavailable gate or a render error.
  // From that point on the 2D floor is shown for the rest of the session.
  const [fellBack, setFellBack] = useState(false);

  if (fellBack) {
    return <>{children}</>;
  }

  // The 3D avatar canvas fills its box absolutely, so it needs an explicit
  // footprint. This mirrors the 2D figure: on mobile a 720/1152 portrait box
  // capped at max-w-[600px] and centered; on desktop it fills the column height.
  return (
    <div className="relative mx-auto aspect-[720/1152] w-full max-w-[600px] lg:h-full lg:w-auto lg:max-w-none">
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
        onRenderError={() => setFellBack(true)}
      />
    </div>
  );
}

export default BodyCompositionAvatar;
