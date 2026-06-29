# Prompt 210c FormaVision Scan Accuracy - STEP 0 Discovery and Baseline

Filed per Section 4 (STEP 0): no code change is made until this inventory exists. Read-only discovery, three parallel explorations, synthesized here. Each claim is anchored to a file:line found in the current tree (repo C:\Users\garyf\ViaConnect2026\viaconnect-web). Branch at discovery time: feat/210b-formavision-3d-avatar (210c build will start on its own short-lived branch after the Section 12 gate clears).

## Headline finding: two disconnected scan pipelines

There are TWO body-scan pipelines in the tree, and the accuracy-bearing one is NOT the one the active scan uses.

- PIPELINE A (ACTIVE, what Prompt 209 deployed): `supabase/functions/body-scan-analyze/index.ts`. A Claude Vision call (claude-sonnet-4-6, `ARNOLD_VISION_MODEL` env) reads four base64 photos and returns COARSE ESTIMATES ONLY: body-fat min/max %, body_type, fat_distribution, WHR min/max, muscle_development 1-5 per region, ai_confidence low|medium|high (system prompt index.ts:86-102; call index.ts:264-293). It does NOT receive height, compute scale, or produce circumferences or landmarks. Photos are ephemeral (never stored; BAA notice index.ts:254-262). Results land in `body_tracker_photo_scans`, then `POST /api/body/scan/persist` derives composition and writes total_body_fat_pct + an entry-level confidence to `body_tracker_entries` + `body_tracker_segmental_fat` (buildScanWrite.ts: "only total_body_fat_pct is written from a photo scan ... regional fat/visceral/water are UNKNOWN, never 0").

- PIPELINE B (IMPLEMENTED but DORMANT, the real CV stack): `src/lib/arnold/scanning/runScanAnalysis.ts` orchestrates a client-side geometric pipeline that is EXACTLY the Section 3 accuracy chain:
  - landmarks: `landmarkDetector.ts` uses `@mediapipe/pose` (33 keypoints, types.ts:14-49)
  - silhouette: `silhouetteProcessor.ts` uses `@tensorflow-models/body-segmentation` (MediaPipe SelfieSegmentation) -> binary mask -> contour (600 pts), and `computeScale(landmarks, heightCm, imageHeight)` (silhouetteProcessor.ts:63,117-138) derives pixels-per-cm from nose-to-ankle extent and the user's height
  - measurements: `measurementEngine.ts` derives girths from silhouettes + landmarks across the 4 poses
  - composition: Navy (`navyBodyFat.ts`) + CUN-BAE (`cunbaeBodyFat.ts`) + `compositionBlender.ts`
  It reads a DIFFERENT capture flow (`body_photo_sessions` table / `body-progress-photos` bucket via `PhotoSessionCapture.tsx`), NOT the 209 `BodyScanUploader` flow. It is not invoked by the active scan path today.

210c implication: the prompt's accuracy chain (silhouette -> landmarks -> scale-from-height -> front/side breadth -> ellipse -> circumference) is already substantially built in Pipeline B. 210c is largely about HARDENING + ACTIVATING that geometric measurement path, wiring it to write the body_tracker circumference contract the 210a/210b mesh reads, and adding the calibration config, validation harness, capture QC, and per-field confidence. This is additive hardening, consistent with Section 17.4 (do not rewrite 209): Pipeline A's composition output is preserved; the circumference/geometry path is what gets hardened and connected.

## STEP 0, item by item

### 1. How the 209 pipeline turns 4 photos into body_tracker fields today
Pipeline A only (above). Claude Vision -> coarse estimates -> `body_tracker_photo_scans` -> `/api/body/scan/persist` -> total_body_fat_pct + entry-level confidence into `body_tracker_entries`/`body_tracker_segmental_fat`. No scale, no circumferences, no landmarks. `deriveScanComposition.ts:10-27` maps ai_confidence low/medium/high -> 0.4/0.65/0.85 (entry-level only).

### 2. Existing silhouette segmentation / body-landmark capability
PRESENT and REAL (Pipeline B), not spec-only:
- Segmentation: `@tensorflow-models/body-segmentation` v1.0.2 + MediaPipe SelfieSegmentation (silhouetteProcessor.ts:26,49-60). Contour extraction implemented.
- Landmarks: `@mediapipe/pose` ^0.5.1675469404 (package.json:32), 33 keypoints (landmarkDetector.ts:46,85-90). MediaPipe Pose, equivalent to the 169-spec BlazePose GHUM reference.
- `@tensorflow/tfjs` ^4.22.0 (package.json:49) backs inference.
These are installed and operational, just not wired to the active scan.

### 3. Current per-measurement accuracy baseline
NONE. No labeled ground-truth set, no accuracy/RMSE/MAPE/ICC test anywhere in the repo (zero matches for accuracy|ground_truth|benchmark|RMSE|validation_set; no `src/lib/arnold/scanning/__tests__`). `crossValidator.ts` only does consistency checks between the visual estimate and a manual device body-fat value (boost to 0.95 if within 3%, review if >6%); that is NOT ground-truth validation. 210c builds the harness; the team supplies the labeled set (Section 10).

### 4. body_tracker fields + parameter-vector shape the mesh reads (the contract 210c must write)
- BodyParamVector (`src/lib/formavision/geometry/types.ts:43-52`): { sex; heightM; rings: BodyRing[]; arms: ArmParam[] }.
  - BodyRing (types.ts:16-30): id (neck|chest|waist|hip|rThigh|lThigh|rCalf|lCalf), levelN (0=feet,1=crown), circumferenceM: number|null (NULL=UNKNOWN -> template default), aspectRatio (depth/width of the cross-section ellipse), estimated: boolean.
  - ArmParam (types.ts:33-41): side r|l, bicepM|forearmM: number|null, estimated.
- scanToParamVector (`src/lib/formavision/geometry/scanToParamVector.ts:32-122`): consumes { snapshot, circumferences (13 keys), sex, heightCm?, unit? } and maps RING_TO_MEASUREMENT (neck/chest/waist/hip + rThigh=rightQuadriceps etc.; shoulderWidth intentionally excluded as a width not a girth) and arm keys to the vector; `toMeters` preserves null as UNKNOWN (scanToParamVector.ts:65-71). heightCm null -> sex template default.
- Storage: girths live in `body_tracker_circumference` (columns neck, shoulder_width, right_upper_arm/left_upper_arm = biceps, right_forearm/left_forearm, chest, waist, right_upper_thigh/left_upper_thigh = quads, right_calf/left_calf); HIP lives in `body_tracker_weight.hips_in` (storedUnit in). Keys + DB mapping: `src/lib/body-tracker/circumference.ts:11-25,48-62` (MEASUREMENT_KEYS 13, MEASUREMENT_DB_COLUMN, MEASUREMENT_EXTERNAL_KEYS hip).
- CompositionSnapshot (`src/lib/body-tracker/composition/types.ts:4-23`): totalBodyFatPct, regionFatPct (5 regions), visceralFatRating, bodyWaterPct, regionMuscleLbs (5), totals; all nullable (null=UNKNOWN). Read by `useLatestComposition.ts` (segmental_fat + segmental_muscle + entries; BMI from clinical_assessments.height_cm + body_tracker_weight). Circumferences read by `useCircumferenceData.ts` / `useCircumferenceHistory.ts` (hip joined from body_tracker_weight).
- CONTRACT for 210c: write the 13 circumference girths (in `body_tracker_circumference` + hip in `body_tracker_weight`) so scanToParamVector -> BodyParamVector yields a MEASURED mesh; preserve null=UNKNOWN; do not regress the composition path. No second source, no downstream recompute (Sections 11.1, 15.2, 17.3).

### 5. Device depth (ARKit/ARCore) reachability
ABSENT. No depth/ARKit/ARCore/LiDAR/intrinsics references in src/; Capacitor plugins are camera/core/ios/android only (no AR/depth plugin); AndroidManifest has no camera.depth/lidar feature; iOS Info.plist has no ARKit keys. Depth would be NET-NEW native work (plugin + native bridge + intrinsics + depth-silhouette fusion). The prompt treats depth as an OPTIONAL booster with graceful degradation (Sections 2.1, 6.3), so it is not required for v1.

### 6. Models/libraries a robust extraction needs that are NOT installed
For the CORE geometric pipeline: NONE missing. @mediapipe/pose, @tensorflow-models/body-segmentation, and @tensorflow/tfjs are already in package.json and operational (Pipeline B). Supporting libs present: sharp ^0.33.5 (server image ops), three ^0.184.0, canvas/OffscreenCanvas, @google-cloud/vision (used elsewhere), tesseract.js, unpdf. The ONLY net-new capability would be optional device depth (ARKit/ARCore plugin) - recommended DEFERRED per the prompt's graceful-degradation design.

## Per-field confidence gap (net-new, additive)
Today only ENTRY-LEVEL confidence exists (`body_tracker_entries.confidence`, 0-1, written by deriveScanComposition). There is NO per-measurement/per-ring confidence anywhere (no confidence columns on body_tracker_circumference/segmental_fat/segmental_muscle; no per-ring field on BodyParamVector). Section 9 + 11.6 require per-measurement confidence + UNKNOWN. This needs an ADDITIVE migration (append-only per Standing Rule 5) adding per-girth confidence (and, ideally, a per-ring confidence carried alongside the param vector for the render layer), plus threshold logic mapping sub-threshold -> UNKNOWN/estimated.

## GARY GATE DECISIONS (2026-06-28)
1. DEPENDENCY/SCOPE = "Also approve depth plugin now". Reuse the installed MediaPipe/TFJS CV stack (no change there) AND approve a net-new ARKit/ARCore Capacitor depth plugin for v1 (better torso front-to-back accuracy). package.json UNLOCKED for the depth plugin only. OPEN SUB-ITEM: the SPECIFIC depth plugin is not yet selected; there is no canonical Capacitor LiDAR/depth plugin, so this needs a short feasibility/selection pass (community plugin vs custom Capacitor plugin) presented with its tradeoff before the native bridge is built. Depth path MUST degrade gracefully (Section 2.1/6.3) so the rest of the pipeline never blocks on it.
2. CAPTURE FLOW = "Client-side on in-memory photos". Run segmentation + landmarks IN-BROWSER on the 209 capture photos before discard; pixels never leave the device for the geometric measurement (privacy-positive; only the existing Claude Vision composition call has egress + its BAA).

## Section 12 dependency-gate verdict (route to Gary) [RESOLVED above]
- Core pipeline: NO new model or dependency required. Reuse the already-installed @mediapipe/pose + @tensorflow-models/body-segmentation + @tensorflow/tfjs (client-side). This satisfies "prefer reusing existing capability" (Section 12) and avoids a package.json unlock.
- Optional depth booster (ARKit/ARCore): net-new native dependency. RECOMMEND DEFER (prompt allows graceful degradation; large native effort; privacy/bundle cost). Surface to Gary as a future accuracy booster, not a v1 requirement.
- Therefore the gate is most likely a GO WITHOUT a package.json change, pending Gary's sign-off on the approach below.

## Open architecture decisions for Gary (before build)
1. Activate Pipeline B: harden the existing client-side CV measurement pipeline (silhouette -> landmark -> scale-from-height -> 4-view breadth -> calibrated ellipse circumference) and wire it to write `body_tracker_circumference` + the param vector, so the mesh becomes a measured body. (Pipeline A's composition output preserved, not rewritten.) This is the path that makes "the avatar is the body" true.
2. Capture-flow reconciliation: the active 209 scan (`BodyScanUploader`, ephemeral base64 -> Claude Vision) does not persist photos, while Pipeline B reads stored photos (`body_photo_sessions`). Decide whether the hardened CV runs client-side on the in-memory 209 photos (keeps the ephemeral/BAA posture) or on the stored body_photo_sessions flow. Recommend client-side-on-capture to preserve the no-store posture and run segmentation/landmarks before discard.
3. Per-field confidence migration: additive columns for per-girth confidence (append-only).
4. Ground-truth cohort: 210c builds the harness; the team supplies the labeled tape-measure/3D-scan set per Section 10. Define the minimum defensible cohort in the validation brief.
5. Depth: defer (optional booster).

## Recommended build shape (post-gate, on a new feature branch)
Additive hardening: (a) capture QC overlay + retake prompts (additive guidance only, no locked-structure change); (b) reuse+harden silhouette/landmark; (c) scale calibration (height primary, cross-view check, optional reference object); (d) 4-view breadth -> per-level a,b -> versioned calibrated shape-correction config -> circumferences; (e) per-measurement confidence + UNKNOWN thresholds; (f) write the existing body_tracker circumference contract with per-field confidence; (g) re-runnable validation harness (MAPE/within-tolerance/ICC/bias, train/held-out split, CI) gating the 90% claim; (h) the four Section 16 briefs. No new dependency; no rewrite of 209; one model end-to-end (the same a,b feed circumference and mesh cross-section).
