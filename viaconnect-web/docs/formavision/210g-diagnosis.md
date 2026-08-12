# Prompt 210g Diagnosis: Barrel Avatar Regression

**Date:** 2026-08-11  
**Surface:** production `viaconnectapp.com/body-tracker/composition`  
**Evidence standard:** git history + source inspection of the deployed geometry path

## Defect signature (Gary Aug 11 screenshot)

1. Uniform tube / stacked-ellipse torso and legs  
2. Detached head sphere above the neck  
3. Hip flare / skirt discontinuity  
4. Arms socketed as vertical tubes without 25 degree hang  

## Hypothesis checklist

| # | Hypothesis | Verdict | Evidence |
|---|------------|---------|----------|
| 1 | Never landed | **CONFIRMED (primary)** | No commit ever introduced 64-vertex angular shape-correction, integrated neck/head loft, or 25 degree arm articulation into `buildBodyGeometry`. Closest work is `210b P1-T1` / `P1-T1c` (ellipse + Catmull-Rom, **40** radial pts, separate head ovoid). |
| 2 | Overwritten by design handoff | **NOT supported** | Git lineage of `src/lib/formavision/geometry/buildBodyGeometry.ts` is continuous 210b parametric builder. No handoff GLB/GLTF or crude cylinder stack replaced a Revision C engine, because Revision C was never merged. |
| 3 | Present but inert | **PARTIAL** | Catmull-Rom loft + sex templates + aspect ratios **are** live. Angular shape-correction coefficients **do not exist** (not defaulting to unity; the function is absent). Pure `ellipsePointsForPerimeter` samples a Ramanujan ellipse only. |
| 4 | Scan calibration confused with mesh | **CONFIRMED distraction** | Commit `6a4f0f84` (`210c T7` shape-correction factors) calibrates **Arnold scan circumference prediction**, not WebGL ring vertices. |

## Code evidence (main @ diagnosis time)

| Spec (210e-2 Rev C) | Production code | File |
|---------------------|-----------------|------|
| 64-vertex rings | `DEFAULT_RADIAL_SEGMENTS = 40`; cinematic tier `{ radialSegments: 40 }` | `geometry/buildBodyGeometry.ts`, `FormaVisionCanvas.tsx` `TIER_BUILD` |
| Angular shape-correction | None. Only `ellipsePointsForPerimeter` | `geometry/ellipse.ts` |
| Sex slice-ratio templates | Present (`MALE_TEMPLATE` / `FEMALE_TEMPLATE` trunkLevels) | `geometry/types.ts` |
| Catmull-Rom loft | Present | `buildLimb` in `buildBodyGeometry.ts` |
| Integrated meshed head | Separate full ovoid; bottom pole sits at neckY (point contact) | `buildHead` |
| 25 degree arms | Wrists share shoulder X (vertical tubes) | arm loop in `buildBodyGeometry` |
| Ghost same engine | Yes (`mountGhostBody` / `buildBodyGeometry`) | `ghostBody.ts` |

## Process gap (how this reached production)

1. 210b shipped a credible **first-pass** parametric loft (ellipse rings + Catmull-Rom) that still reads as a barrel under wireframe.  
2. 210e focused on materials, E2E, and design conformance docs; **geometry math for Rev C was not a landed task**.  
3. 210c "shape-correction" landed on the **scan calibration** path, naming collision with mesh shape-correction.  
4. No geometry sanity assertion required non-ellipse angular spread or 64-ring density, so CI stayed green while the flagship still looked tubular.  
5. Production walked without a visual regression gate on male/female front and three-quarter renders.

## Root cause (one sentence)

**The Revision C anatomical geometry engine was never implemented in the mesh builder; production correctly runs the 210b ellipse-stack loft (40 rings, detached head ovoid, vertical arms), which matches Gary's barrel defect signature.**

## Repair direction

Implement Rev C in place on `buildBodyGeometry` / ring sampling: 64 radial default, angular shape-correction with perimeter re-normalization, continuous head from neck ring, 25 degree arm hang, geometry sanity tests that fail on pure-ellipse / unity-correction, tier density 64 cinematic.
