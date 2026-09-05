// Geometry-to-material mount wiring for FormaVision (Prompt 210b, task P1-T4).
//
// This is the seam where the parametric body geometry (buildBodyGeometry) and
// the Ready success material (makeBodyHolographicMaterial — Brief 60 F3) meet.
// Ghost overlays may still request solid or additive wireframe. Kept pure and
// free of r3f so the
// MATERIAL MOUNT CONTRACT can be unit tested without a GPU.
//
// MATERIAL MOUNT CONTRACT (from the P1-T3 review):
//  1. Build the indexed geometry from the param vector.
//  2. Convert it to non-indexed triangles (toNonIndexed). The barycentric
//     wireframe needs one independent vertex triple per triangle; an indexed
//     geometry shares vertices and produces a silently-wrong wireframe, not a
//     crash, so this step is mandatory.
//  3. Bake the barycentric attribute onto the non-indexed clone, guarded by an
//     invariant that the geometry really is non-indexed (index === null).
//  4. Compute the real bounding box and feed uBoundsMin / uBoundsMax so the
//     shader's height normalization and scan band line up with the mesh extent.
//  5. Thread uCellRepeat so the cell grain tiles cleanly.
//
// The returned handle owns every disposable it created (the indexed source, the
// non-indexed clone, and the material with its texture) and frees them all in
// one dispose() so the render layer cannot leak across remounts.

import { Box3, Vector3, type BufferGeometry } from 'three';
import { buildBodyGeometry, type BuildOptions } from '@/lib/formavision/geometry/buildBodyGeometry';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import {
  makeBodyWireframeMaterial,
  addBarycentricAttribute,
  type BodyWireframeMaterial,
  type BodyWireframeOptions,
} from '@/lib/formavision/materials/bodyWireframeMaterial';
import { makeBodySolidMaterial } from '@/lib/formavision/materials/bodySolidMaterial';
import { makeBodyHolographicMaterial } from '@/lib/formavision/materials/bodyHolographicMaterial';

export type PlateBodyLook = 'holographic' | 'solid' | 'wireframe';

export interface MountOptions {
  build?: BuildOptions;
  material?: BodyWireframeOptions;
  // Ready success is holographic-f3. Solid/wireframe are ghost or compare only.
  look?: PlateBodyLook;
}

export interface MountedBody {
  // The non-indexed geometry carrying position, uv, normal and aBary, ready for
  // the wireframe material.
  geometry: BufferGeometry;
  // The material handle (material, uniforms, setScan, setMorph, dispose).
  materialHandle: BodyWireframeMaterial;
  // Every ring or limb that fell back to a template default (UNKNOWN), passed
  // straight through from the builder so the render layer can flag estimates.
  estimatedRingIds: string[];
  // World-space extent of the mesh, useful for camera framing and grounding.
  boundsMin: Vector3;
  boundsMax: Vector3;
  // Frees the source geometry, the non-indexed clone and the material/texture.
  dispose(): void;
}

// Invariant guard: addBarycentricAttribute requires non-indexed geometry. A
// thrown error here is a programming mistake (the contract was not followed),
// not a runtime data condition, so it is surfaced loudly rather than swallowed.
function assertNonIndexed(geometry: BufferGeometry): void {
  if (geometry.index !== null) {
    throw new Error(
      'mountBodyGeometry: geometry passed to addBarycentricAttribute must be non-indexed (index === null)',
    );
  }
}

// Build, convert, bake and wire the body into a ready-to-render geometry plus
// material. Pure with respect to react: no hooks, no Canvas, no global state.
export function mountBodyGeometry(
  param: BodyParamVector,
  opts: MountOptions = {},
): MountedBody {
  const built = buildBodyGeometry(param, opts.build);
  const indexed = built.geometry;

  // Non-indexed clone for the barycentric wireframe. toNonIndexed returns a new
  // geometry, leaving the indexed source intact, so both are disposed below.
  const nonIndexed = indexed.toNonIndexed();
  assertNonIndexed(nonIndexed);
  addBarycentricAttribute(nonIndexed);

  // Real mesh extent for the height normalization uniforms.
  nonIndexed.computeBoundingBox();
  const box = nonIndexed.boundingBox ?? new Box3(new Vector3(0, -1, 0), new Vector3(0, 1, 0));
  const boundsMin = box.min.clone();
  const boundsMax = box.max.clone();

  const look: PlateBodyLook = opts.look ?? 'holographic';
  const materialHandle =
    look === 'wireframe'
      ? makeBodyWireframeMaterial(opts.material)
      : look === 'solid'
        ? makeBodySolidMaterial()
        : makeBodyHolographicMaterial();
  materialHandle.uniforms.uBoundsMin.value = boundsMin.clone();
  materialHandle.uniforms.uBoundsMax.value = boundsMax.clone();

  function dispose(): void {
    // Dispose the non-indexed clone we created, then the indexed source via the
    // builder's own dispose, then the material and its owned texture.
    nonIndexed.dispose();
    built.dispose();
    materialHandle.dispose();
  }

  return {
    geometry: nonIndexed,
    materialHandle,
    estimatedRingIds: built.estimatedRingIds,
    boundsMin,
    boundsMax,
    dispose,
  };
}
