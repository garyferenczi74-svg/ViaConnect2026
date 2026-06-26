'use client';

// The single public mount point for the FormaVision 3D avatar (Prompt 210b, P1-T4).
//
// FormaVision3DAvatar is the seam the rest of FormaVision composes around. It owns
// the resilience contract so callers do not have to: a WebGL capability gate, a
// lazy ssr:false import of the three bundle, and a render error boundary that drops
// to nothing (so the page wrapper can swap in its 2D floor). Later phases layer
// GeneticsOverlay, FutureSelfGhost and JourneyTimeline around THIS component; the
// renderTier prop and the clean scene seam are here for them. This task builds only
// the core 3D body.
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

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';
import { safeLog } from '@/lib/utils/safe-log';
import { AvatarErrorBoundary } from './AvatarErrorBoundary';
import { hasWebGL } from './hasWebGL';

const LOG_SCOPE = 'formavision.avatar';

// Loading shroud mirrored from AvatarViewer: a centered spinning Loader2 over the
// navy canvas while the three bundle resolves.
function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white/50">
      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
    </div>
  );
}

// Three + r3f code is loaded client-side only so the SSR bundle stays small and
// first paint is never blocked by the 3D scene.
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
  reducedMotion?: boolean;
  // Defaults to cinematic. The full tier provider is Phase 7; lite trims density.
  renderTier?: 'cinematic' | 'lite';
  // Called on a WebGL-unavailable gate OR a render error, so the parent can show
  // its 2D floor in place of the 3D avatar.
  onRenderError: (error: unknown) => void;
}

export function FormaVision3DAvatar({
  sex,
  scan,
  circumferences,
  unit,
  heightCm,
  reducedMotion,
  renderTier = 'cinematic',
  onRenderError,
}: FormaVision3DAvatarProps) {
  // Probe WebGL once per mount. When it is unavailable the component renders
  // nothing and signals the parent to fall back to 2D; the three bundle is never
  // even imported.
  const webglAvailable = useMemo(() => hasWebGL(), []);

  // Latch so the WebGL-unavailable signal fires exactly once, not on every render.
  const [signalled, setSignalled] = useState(false);

  const handleRenderError = useCallback(
    (error: unknown) => {
      onRenderError(error);
    },
    [onRenderError],
  );

  if (!webglAvailable) {
    if (!signalled) {
      safeLog.warn(LOG_SCOPE, 'WebGL unavailable, falling back to 2D floor');
      // Defer the parent callback out of render to avoid a setState-in-render warning.
      queueMicrotask(() => {
        onRenderError(new Error('WebGL unavailable'));
      });
      setSignalled(true);
    }
    return null;
  }

  return (
    <div className="relative h-full w-full">
      <AvatarErrorBoundary onRenderError={handleRenderError}>
        <FormaVisionCanvas
          sex={sex}
          scan={scan}
          circumferences={circumferences}
          unit={unit}
          heightCm={heightCm}
          reducedMotion={reducedMotion}
          renderTier={renderTier}
        />
      </AvatarErrorBoundary>
    </div>
  );
}

export default FormaVision3DAvatar;
