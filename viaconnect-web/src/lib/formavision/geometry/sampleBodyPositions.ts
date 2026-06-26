// Sample the non-indexed position array for a body param vector (Prompt 210b, P2-T2b).
//
// The rendered avatar geometry is the non-indexed clone produced in mountBodyGeometry
// (buildBodyGeometry then toNonIndexed, so the barycentric wireframe gets one
// independent vertex triple per triangle). The live morph lerps THAT position array,
// so the morph endpoints must be sampled the same way: build with the same options,
// convert to non-indexed, and read the position attribute. Building with the same
// options guarantees the topology (and therefore the position-attribute length and
// vertex order) is identical to the mounted body and to the other endpoint.
//
// This owns and disposes the scratch geometries it builds; it returns only a plain
// Float32Array copy, so nothing it allocates leaks past the call.

import { buildBodyGeometry, type BuildOptions } from './buildBodyGeometry';
import type { BodyParamVector } from './types';

export function sampleBodyPositions(
  param: BodyParamVector,
  build?: BuildOptions,
): Float32Array {
  const built = buildBodyGeometry(param, build);
  const nonIndexed = built.geometry.toNonIndexed();
  const attr = nonIndexed.getAttribute('position');
  // Copy out of the GPU-bound buffer so the returned array outlives the disposed
  // scratch geometries.
  const positions = new Float32Array(attr.array as ArrayLike<number>);
  nonIndexed.dispose();
  built.dispose();
  return positions;
}
