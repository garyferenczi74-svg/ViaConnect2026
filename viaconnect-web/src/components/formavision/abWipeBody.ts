// Pure A/B wipe baseline-body wiring for FormaVision (Brief 2).
//
// The wipe mesh is the SAME parametric body as the current avatar
// (mountBodyGeometry, identical topology), built from a historical
// BodyParamVector. Screen-space discard (uWipeMode) splits it against the
// current body. Default material knobs so both sides of the wipe read as the
// real body, not a ghost. Never fabricates a vector.

import type { BuildOptions } from '@/lib/formavision/geometry/buildBodyGeometry';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import { shouldRenderAbWipe } from '@/lib/formavision/compare/abWipe';
import { mountBodyGeometry, type MountedBody } from './mountBodyGeometry';

export { shouldRenderAbWipe };

export function mountAbWipeBody(
  wipeVector: BodyParamVector,
  buildOptions?: BuildOptions,
): MountedBody {
  return mountBodyGeometry(wipeVector, { build: buildOptions });
}
