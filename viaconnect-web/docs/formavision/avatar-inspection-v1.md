# Body Composition Avatar Inspection Brief (v1)

Prompt #169e Section 6.3 deliverable. READ-ONLY inspection. No avatar code was changed.
Branch: feat/prompt-169e-phase1. Date: 2026-05-31.

This brief gates the Phase 1 regional composition overlay. The points below follow
the seven items in Section 6.3 exactly.

## 1. Current avatar component path(s) and primary file name(s)

The avatar is three files under `src/components/body-tracker/scanning/` plus one
generator under `src/lib/arnold/scanning/`:

- `src/components/body-tracker/scanning/AvatarViewer.tsx` (public wrapper; owns view +
  visualization state, lazy-loads the scene, exposes the `AvatarViewer` component)
- `src/components/body-tracker/scanning/AvatarThreeScene.tsx` (the Three.js / R3F scene;
  client-only, dynamically imported with `ssr: false`)
- `src/lib/arnold/scanning/avatarMeshGenerator.ts` (pure-TS mesh + color generator:
  `generateAvatarMesh`, `segmentColor`, the `AvatarSegmentSpec` type)
- `src/lib/arnold/scanning/types.ts` (the `BodyModelParameters` input contract)

Primary file to touch for Phase 1: `avatarMeshGenerator.ts` (specifically `segmentColor`).

## 2. Rendering technology

react-three-fiber over Three.js, with @react-three/drei `OrbitControls`. The scene is a
`<Canvas>` from `@react-three/fiber`; meshes are R3F `<mesh>` nodes; orbit interaction
(free view only) uses `OrbitControls` from `@react-three/drei`. Three is loaded
client-side only via `next/dynamic` so the SSR bundle stays small.

## 3. Mesh type: custom primitive-parametric (NOT SMPL-X, NOT MediaPipe GHUM)

It is a CUSTOM primitive-parametric mannequin. There is no SMPL / SMPL-X body model and
no MediaPipe GHUM mesh anywhere in this path. `generateAvatarMesh` emits an array of
`AvatarSegmentSpec` primitives: ellipsoids (scaled `SphereGeometry`) for head, torso
sections, hands, and feet, and `CylinderGeometry` for neck, upper arm, forearm, thigh,
and calf. Each primitive is sized directly from the 9 measurement parameters (1 unit =
10 cm). The file header states this plainly: "intentionally a stylized anatomical
mannequin, not a photoreal body scan ... built from primitives ... so no external mesh
assets are required." Downstream work must not assume an SMPL-X rig, skeleton, blend
shapes, or a dense vertex landmark set exists, because none do.

(Note: MediaPipe 33-point landmarks DO exist elsewhere in the scanning pipeline as the
2D measurement-extraction source, `LandmarkKey` in `types.ts`. They feed the measurement
numbers, not the 3D mesh. The mesh itself is primitive-parametric.)

## 4. Per-region coloring: already supported (YES)

Per-segment coloring already exists and a heatmap mode is already wired. In
`AvatarThreeScene.tsx` each segment is rendered with its own `MeshStandardMaterial` whose
color comes from `segmentColor(seg, bodyFatPct, visualization === 'heatmap')`. So coloring
is genuinely per-segment, not a single shared material. The `VisualizationControl` in
`AvatarViewer.tsx` already offers a "Composition heatmap" option (`visualization:
'heatmap'`) alongside solid and wireframe.

Important nuance for Phase 1: today `segmentColor` IGNORES its `segment` argument in
heatmap mode. It maps the single whole-body `bodyFatPct` (clamped 5..35) onto one hue
(teal 170 -> warm 15) and returns the SAME color for every segment. The wiring is
per-segment; the value driving it is currently uniform. That is exactly the seam the
Phase 1 overlay plugs into.

## 5. Current input data contract

Scene props (`AvatarThreeSceneProps`):
- `segments: AvatarSegmentSpec[]`
- `bodyFatPct: number`
- `viewPreset: 'free' | 'front' | 'back' | 'left' | 'right'`
- `visualization: 'solid' | 'wireframe' | 'heatmap'`

`AvatarSegmentSpec` (the per-segment shape) carries: `kind`
(head | neck | torso | upper_arm | forearm | thigh | calf | hand | foot | joint),
`position`, `rotation`, `radii`, `side` (left | right | center), and a human `label`
(e.g. "Chest", "left thigh"). Segments ARE anatomically labeled, which is what makes
regional apportionment feasible (see point 6).

`AvatarViewer` props: `params: BodyModelParameters`, plus `showControls`, `initialView`,
`initialVisualization`, `className`, and `hideNumericLabels` (a #169b forward guard; the
avatar draws no on-canvas numbers today).

Upstream pipeline (composition -> segments):
- `runScanAnalysis.ts` builds `BodyModelParameters` (9 circumferences + height/inseam/
  torso, `sex: BiologicalSex`, and `bodyFatPct = composition.bodyFatPct.mid`). It computes
  `age` and `sex` locally from the profile, but only `sex` is carried into
  `BodyModelParameters`; `age` is NOT persisted on the param object.
- `AvatarViewer` calls `generateAvatarMesh(params)` (memoized) and passes
  `mesh.segments` + `mesh.bodyFatPct` (= `params.bodyFatPct`) into the scene.
- Mount points: `ScanResultsPanel.tsx` (Measurements tab, interactive, `solid` default,
  full controls, `hideNumericLabels` honored), `AvatarComparison.tsx` (before/after, two
  static front views), and `FutureMeGenerator.tsx` (current vs projected, static front
  views). `avatar_parameters` is read from the `body_scans` row in Supabase.

So the data contract is: one whole-body `bodyFatPct` (a single number) + anatomically
labeled segments. There is currently no per-region body-fat array flowing in.

## 6. Recommended Phase 1 regional-overlay approach

Recommended: ENHANCE the existing per-segment coloring (overlay-on-existing-mesh). This
is confirmed feasible by reading `segmentColor` and `AvatarSegmentSpec`: segments are
anatomically labeled by `kind` (and `side`, `label`, and vertical `position.y`), and the
heatmap color is already computed per segment, so the adjacent-labeled-diagram fallback
is NOT needed.

Approach, written additively so Phase 2's SMPL-X landmark avatar can later supersede it
without unwinding this work (per Section 6.4):
- Add a pure helper (e.g. `regionalBodyFat(kind, side, wholeBodyPct, sex)`) that returns a
  per-region body-fat estimate by applying demographic-typical regional distribution
  ratios (published anthropometric / DXA regional-fat research, apportioned by sex) to the
  whole-body value. Example shape of the effect: in a male pattern, abdomen/torso regions
  read higher than the whole-body number and limbs read lower; in a female pattern,
  hip/thigh (gynoid) regions read higher. Ratios live in one small constant table so they
  are auditable and easy to retune.
- Have `segmentColor` (heatmap mode only) call that helper using `segment.kind` instead of
  feeding the flat `bodyFatPct` to every segment. Solid and wireframe modes are untouched.
- This is a layer ON the existing primitive mesh: no geometry, mount, or data-contract
  changes are required for the minimum version. `sex` is already available in
  `BodyModelParameters`; thread it from `AvatarViewer` -> scene -> `segmentColor`
  (currently `segmentColor` only receives `segment` + `bodyFatPct`, so it needs `sex`
  added to its signature, plus the scene passing `mesh` sex through). If age-banding of the
  ratios is wanted, `age` must additionally be plumbed onto `BodyModelParameters` in
  `runScanAnalysis` (it is computed there but not currently carried); recommend deferring
  age-banding to keep Phase 1 to sex-only banding unless Gary wants the extra plumbing.
- UI disclaimer (required): render a short label near the heatmap legend reading
  "Regional estimate based on demographic-typical distribution patterns; direct
  per-segment measurement is part of a future release." Place it in `AvatarViewer.tsx`
  near `VisualizationControl`, visible whenever heatmap is active. No dashes, no emojis,
  comma-separated copy per house style.

Why this beats the fallback: the per-segment material pipeline and a heatmap toggle
already ship and are mounted in `ScanResultsPanel`; the change is concentrated in one pure
function plus one prop thread plus one disclaimer string. It is the smallest honest step
that turns "uniform tint" into "regionally differentiated estimate" without claiming
measurement precision we do not have, and it leaves Phase 2 SMPL-X free to replace the
mesh + supply true per-region values later (the helper and disclaimer simply retire).

Honest framing to preserve: this is a demographic-typical MODEL, not measured regional
fat. The disclaimer and the "estimate" wording are load-bearing and must ship with the
color change, not after it.

## 7. Engineering effort estimate (recommended approach)

Small. Roughly 0.75 to 1.5 engineer-days for the sex-banded minimum:
- `regionalBodyFat` helper + ratio constant table + unit tests: ~0.5 day (the research
  lookup table and getting the ratios right is the real cost, not the code).
- `segmentColor` signature change + scene/`AvatarViewer` `sex` thread-through: ~0.25 day.
- Disclaimer label + heatmap-active wiring + a snapshot/visual check across the three
  mount points: ~0.25 day.

Add ~0.5 day if Gary wants age-banding (plumbing `age` onto `BodyModelParameters` in
`runScanAnalysis` and persistence). Add ~0.25 day if the ratio table must be sourced and
citation-checked to a documented reference rather than a single review figure.

No new dependencies. No `package.json` change. No mesh-geometry rewrite. Fully reversible
and additive, so Phase 2 can supersede it cleanly.
