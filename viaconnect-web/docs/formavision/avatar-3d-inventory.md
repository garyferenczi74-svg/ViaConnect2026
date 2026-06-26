# FormaVision 3D Avatar - STEP 0 Read-Only Inventory (Prompt 210)

Filed before any code change, per Prompt 210 STEP 0. Read-only discovery of the
as-built Body Composition surface, the Prompt 209 data contract, the 3D stack,
and the assets/components a 3D avatar must reuse. No code was modified to produce
this document.

Date: 2026-06-25
Author of build: dev agent under Jeffery / Arnold (Prompt 210)

---

## 0. Headline conclusions (the gates)

- Prompt 209 composition engine is LIVE on main (commits c25dd726..6ca938ba plus
  BMI fix 5a226d2a). The avatar can read its output directly.
- The current avatar is genuinely 2D (SVG + CSS alpha-mask). The prompt premise
  holds: the 2D avatar is retained as the guaranteed fallback; the 3D avatar is new.
- 3D deps already installed: three ^0.184.0, @react-three/fiber ^9.6.0,
  @react-three/drei ^10.7.7. MISSING: @react-three/postprocessing (bloom) and
  gsap (camera tweens). Both have spec-defined fallbacks. -> DEPENDENCY GATE (5.4).
- No GLB/GLTF base human mesh exists anywhere in the repo. -> ASSET GATE (5.2).
- No latest-vs-first scan comparison read exists; useLatestComposition is LIMIT 1.
  Section 8 requires the latest-vs-first delta + Notable Changes. -> a small
  additive first-scan read against the SAME tables is required (no second source
  of truth, no recompute). DECISION TO CONFIRM.

---

## 1. Existing avatar component, route, and tab structure

- Route: `src/app/(app)/(consumer)/body-tracker/composition/page.tsx`
  (route `/body-tracker/composition`, component `CompositionPageInner`).
- Avatar render today: `src/components/body-tracker/SegmentalHeatMap.tsx`
  wrapped by a `HoverSystem` (mounted at page.tsx ~lines 575-576 fat section and
  ~677-678 muscle section).
- Section tabs: `CompositionSectionToggle` (page.tsx ~line 398). Section state is
  'fat' | 'muscle' | 'measurements' (page.tsx ~lines 189-192). Fat section
  ~509-648, muscle ~650-748, measurements ~750-769.
- Male / Female toggle: page.tsx ~lines 522-546 (`data-testid` gender-toggle-male
  / gender-toggle-female), state `gender` (~line 202), persisted via
  `useUserBiologicalSex` (~line 207). The base mesh is chosen by this toggle,
  never guessed.
- Existing 3D scene (NOT on composition page): `AvatarThreeScene.tsx` +
  `AvatarViewer.tsx` under `src/components/body-tracker/scanning/`. Used only on
  the scanning/comparison surface today. Reusable patterns documented in section 7.

## 2. Current render technology

- Technology: SVG asset + CSS `mask-image` alpha overlays with
  `mix-blend-mode: screen` and `filter: blur(3px)` (SegmentalHeatMap.tsx ~85-100).
- SVG assets hosted on Supabase Storage CDN (Body Tracker / Male Avatar.svg etc).
- Dimensionality: 2D. (The separate `AvatarThreeScene` is react-three-fiber, but
  it is not mounted on the composition surface.)

## 3. Data contract (single source of truth)

Hook: `src/hooks/body-tracker/useLatestComposition.ts` -> `UseLatestCompositionResult`
{ snapshot: CompositionSnapshot | null; bmi: number | null; loading; error; refresh }.

`CompositionSnapshot` (`.../composition/types.ts` ~12-23):
- entryId: string
- source: 'scan' | 'manual'
- recordedAt: string (ISO)
- totalBodyFatPct: number | null      (Total Body Fat readout)
- regionFatPct: RegionMap             (Body Fat overlay tinting)
- visceralFatRating: number | null
- bodyWaterPct: number | null
- regionMuscleLbs: RegionMap          (Muscle Mass overlay magnitudes)
- totalMuscleMassLbs: number | null
- skeletalMuscleMassLbs: number | null

`RegionMap` (5 regions, NOT 12): { right_arm, left_arm, trunk, right_leg, left_leg },
each number | null.

Circumferences: SEPARATE hook `useCircumferenceData` -> `CircumferenceMeasurements`
with 13 keys (`MEASUREMENT_KEYS`, `src/.../circumference.ts` ~11-25): neck,
shoulderWidth, rightBicep, rightForearm, leftBicep, leftForearm, chest, waist, hip,
rightQuadriceps, rightCalf, leftQuadriceps, leftCalf. Each number | null.
NOTE vs spec: spec says "twelve circumferences" and lists Neck/Chest/Waist/Hips/
R-L Upper Arm/R-L Lower Arm/R-L Upper Leg/R-L Lower Leg. The codebase has 13 keys
(adds shoulderWidth). Ring mapping will use the actual keys; shoulderWidth either
gets a ring or is omitted by decision. No new fields invented.

Muscle status (Muscle Gain / No Change / Muscle Loss): NOT a stored field. Derived
by `src/hooks/body-tracker/useMuscleChangeData.ts` -> `RegionChangeData` map of
region -> { current, previous, change, direction }, direction 'gain' | 'loss' |
'neutral' (heatmap-colors.ts ~13). Fat metric inverts good/bad vs muscle.

Asymmetry: implicit in left/right RegionMap + circumference pairs. An explicit
`AsymmetryReport` type exists under arnold/scanning/types.ts (~147-152) but is not
on CompositionSnapshot and is used elsewhere.

UNKNOWN handling: every numeric field is null when absent or non-positive; null is
rendered as a neutral no-data callout, never 0, never fabricated (page.tsx ~89,
hook header comment ~5-8).

## 4. Scan history (latest vs first)

- Latest scan: `useLatestComposition(userId)` reads the newest
  `body_tracker_segmental_fat` and `body_tracker_segmental_muscle` rows
  (order created_at DESC, limit 1) and their parent `body_tracker_entries` row.
  Date field `created_at`; surfaced as `recordedAt` on the snapshot.
- FIRST scan: NOT IMPLEMENTED. The hook reads latest only. There is no
  latest-vs-first comparison on the composition page.
- Existing comparison infra elsewhere (reusable as reference, not as a data path):
  `useMuscleChangeData` (current vs previous), `scanning/AvatarComparison.tsx`
  (two BodyModelParameters -> before/after + deltas), `photos/ComparisonPanel.tsx`.
- Implication: Section 8 (body-fat readout latest-vs-first + Notable Changes)
  requires reading the FIRST scan. Proposed: extend the canonical read (or add a
  sibling `useFirstScan`/`useCompositionHistory`) that queries the SAME tables for
  the oldest scan row. This reads existing scan history; it does not create a
  second source of truth and does not recompute composition. Confirm before build.

## 5. Overlay color logic to reuse (no new scale)

- `src/lib/body-tracker/heatmap-colors.ts`:
  - `getOvalColorFromChange(change, metric)` -> 'green' | 'yellow' | 'red'
    (green #22C55E, yellow #FACC15, red #EF4444). Fat: gain=red, loss=green.
    Muscle: gain=green, loss=red. CHANGE_THRESHOLD 0.2 (sub-threshold = neutral).
  - `getOvalColorFromStatus(status)` for static SegmentStatus labels.
- `src/components/body-tracker/body-graphic/utils/color-scale.ts`:
  - `colorScale(value?, status?)` -> hex via STATUS_COLORS { healthy #2DA5A0,
    caution #B75E18, alert #C94040, no-data #475569 } (Via Cura tokens).
- Body Fat overlay reuses the body-fat heat helper; Muscle overlay reuses the
  muscle direction helper. No new color scale, per acceptance criteria.

## 6. Safeguard + AI-estimate disclaimer to reuse

- AI-estimate disclaimer: `src/components/body-tracker/.../BodyScanResults.tsx`
  ~107-112, lucide `Info` icon, copy "These are AI estimates from photos. For
  clinical accuracy, use a smart scale, DEXA scan, or enter measurements manually."
- No dedicated, separate body-image safeguard component exists on the composition
  surface. Reuse the BodyScanResults disclaimer pattern (non-dismissible, visible
  on the results surface) for the 3D avatar.

## 7. Capability / fallback / disposal / reduced-motion patterns

- Dynamic import (SSR-safe) pattern to copy: `AvatarViewer.tsx` ~10-17
  `dynamic(() => import('./AvatarThreeScene')..., { ssr: false, loading: <Loader/> })`.
- WebGL capability check: NOT present today. New component must add one.
- Error boundary around the 3D subtree: NOT present today. New component must add
  one and call `onRenderError` -> 2D fallback.
- Canvas config today (`AvatarThreeScene.tsx` ~33-36): `dpr={[1,2]}` (pixel ratio
  capped at 2). `frameloop` NOT set (defaults to "always"). New component must set
  `frameloop="demand"`.
- Disposal on unmount: NOT explicit today. New component must dispose geometry,
  materials, textures and pause when offscreen / tab hidden.
- Reduced motion: `useBodyGraphicState.ts` ~8-21 uses
  `window.matchMedia('(prefers-reduced-motion: reduce)')`; reuse this detection.

## 8. Dependency inventory (package.json)

Installed: three ^0.184.0 (line 67), @react-three/fiber ^9.6.0 (line 43),
@react-three/drei ^10.7.7 (line 42).
Missing: @react-three/postprocessing (bloom), gsap (camera tweens).
Fallbacks if not approved: additive wireframe pass + fresnel rim instead of bloom;
manual camera lerp instead of gsap tweens. No package.json edit without approval.

## 9. Asset inventory

No `.glb` / `.gltf` under `public/` or `src/`. Two license-clean base human meshes
(male, female) are a REQUIRED NEW ASSET: 8k-15k tris, watertight, A-pose, centered
at origin, real-world meters, clean UVs, morph targets preferred. NOT SMPL/SMPL-X
(non-commercial). Source must be CC0 or commercially licensed or internally owned;
proposed and approved before any build proceeds.

---

## 10. Open decisions for Gary (gates)

1. ASSET (5.2): approve a license-clean base mesh source (male + female).
2. DEPENDENCY (5.4): approve @react-three/postprocessing + gsap, or build with the
   fresnel/additive + manual-lerp fallbacks only.
3. WORKFLOW: direct-to-main vs a feature branch (active parallel 208 session is on
   main; this is a large build).
4. FIRST-SCAN READ: confirm the small additive first-scan read against the existing
   body_tracker tables to satisfy Section 8 (no second source of truth, no recompute).
