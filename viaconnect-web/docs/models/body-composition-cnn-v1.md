# Body Composition Model Card

Filename retained as `body-composition-cnn-v1.md` for traceability against the Prompt #169 specification (spec section 16). The filename is historical: see the very next section.

## Read this first: what Phase 1 actually ships

Phase 1 does NOT ship a trained convolutional neural network (CNN) for body composition. The spec proposed a CNN; the implementation on this branch instead uses a transparent anthropometric regression approach. This model card honestly documents the regression pipeline that is actually in the codebase, not the aspirational CNN.

What is actually shipped (Phase 1, Tier 1):

- US Navy circumference body fat equation (Hodgdon and Beckett, 1984).
- CUN-BAE body adiposity estimator (Gomez-Ambrosi et al., 2012); BMI plus age plus sex.
- A vision derived visual body fat range produced by Claude Vision (the Arnold vision analyzer), used as one cross-validation input.
- Circumference prediction from photo silhouettes via the Ramanujan ellipse perimeter approximation plus per-region empirical correction factors.
- A weighted blend of the available methods that always returns a RANGE plus a per-method breakdown.
- A parametric primitive avatar (not a trained body mesh).

A trained CNN, a learned body mesh, depth sensor fusion, and genomic priors are all FUTURE phases. They are not in this build.

## Model identity

- Name: ViaConnect Body Composition Estimator, Phase 1 (anthropometric regression).
- Owner: Arnold sub-agent, Body Tracker fleet, Farmceutica Wellness Ltd.
- Status: shipped, Phase 1, Tier 1 only.
- Surface: client side (browser and mobile web) for geometry, plus one server side vision call for the visual range input.
- Regulatory posture: FDA General Wellness, Class I, low risk. Wellness tracking, not medical diagnosis. See the transparency statement at the end.

## Intended use

- General wellness body composition tracking and trend visualization for consumers.
- Surfacing changes over repeat scans (the product is strongest at relative trend, weakest at single absolute readings).
- Feeding the Body Tracker pillar of the Bio Optimization Score.

Out of scope:

- Any medical diagnosis, screening, or clinical decision.
- Any claim of equivalence to DEXA, hydrostatic weighing, BodPod, or InBody.
- Use as a substitute for a clinician or a clinical measurement.

## Inputs and features actually used

The pipeline does not consume raw pixels as a learned feature vector. It consumes derived geometry plus profile demographics.

1. Profile demographics (from `profiles`): biological sex, date of birth (to derive age), height in cm, weight in kg. Height and weight are required; analysis refuses to run without them.
2. Pose landmarks: 33 MediaPipe Pose (BlazePose) landmarks per photo, detected client side in `src/lib/arnold/scanning/landmarkDetector.ts`. Note: the original Prompt #86C referenced "68+ landmarks"; that figure came from facial landmark models and is corrected in code to the 33 body landmarks MediaPipe actually provides.
3. Body silhouette: a binary body mask from MediaPipe Selfie Segmentation via `@tensorflow-models/body-segmentation`, contour traced client side in `src/lib/arnold/scanning/silhouetteProcessor.ts`. The photo never leaves the device for the geometry path.
4. Pixel to cm scale: derived from the user's stated height and the nose to ankle pixel span (approximately 90 percent of standing height), with a credit card calibration fallback (ISO 7810 ID-1 card geometry) when a card is present in frame (`src/lib/body-tracker/credit-card-calibration.ts`).
5. Width and depth samples: horizontal silhouette widths at characteristic landmark heights (neck, chest, natural waist, navel waist, hip, bicep, forearm, thigh, calf), plus side view depths where a side photo exists.
6. Optional manual calibration: the user's most recent tape measurements (`body_tracker_weight`) and any manual body fat reading (for example InBody, DEXA, calipers) from `body_tracker_segmental_fat`, with a stored confidence.
7. Optional vision range: a low and high body fat estimate from the Claude Vision analyzer (`arnold_analysis`), used only as a cross-validation input.

## Method actually used

### Circumference estimation

Each region circumference is predicted in `src/lib/arnold/scanning/circumferencePredictor.ts`:

- The body cross section at a landmark height is modeled as an ellipse with semi axes from front width and side depth.
- The perimeter uses Ramanujan's series I approximation.
- A per region empirical correction factor adjusts for cross sections that are not truly elliptical (for example shoulders and hips).
- When only a front view is available, side depth is guessed from a per region depth to width ratio and the reported uncertainty is widened (8 percent versus 4 percent with a side view).

The code states plainly that these correction factors are rough heuristics, not calibrated to any single population, that individual measurement error is typically plus or minus 3 to 7 percent, and that trend accuracy over repeat scans is much better than single shot accuracy. This model card does not improve on that claim.

### Body fat estimation and blending

Body fat is estimated by up to three independent methods and blended in `src/lib/arnold/scanning/compositionBlender.ts`:

- Navy equation from neck, waist, height (and hip for females).
- CUN-BAE from BMI, age, sex.
- Visual range midpoint from the vision analyzer.

Blending rules:

- If a strong manual reading exists (manual confidence at or above 0.80), the output is anchored to that manual value, with a narrow plus or minus 2 percent spread, and the other methods are used only for cross validation.
- Otherwise the available methods are combined with fixed weights: Navy 0.45, visual 0.35, CUN-BAE 0.20. The output spread is the larger of 2 percent or the maximum disagreement between methods, so the displayed range honestly widens when methods disagree.
- Blended confidence is derived from the spread, not asserted: spread at or under 3 gives 0.78, at or under 5 gives 0.65, otherwise 0.52.

Bone mineral content is explicitly NOT estimated. The code comment is direct: BMC requires DEXA; we do not estimate it from photos.

### Avatar

The avatar in `src/lib/arnold/scanning/avatarMeshGenerator.ts` is a stylized anatomical mannequin built from geometric primitives (sphere, ellipsoid, cylinder) driven by 9 measurement parameters. It is intentionally NOT a photoreal scan and NOT a learned body mesh. No external mesh assets are required. This is a deliberate divergence from the spec's higher fidelity avatar language; see the licensing record in `docs/licensing/smpl-x-commercial-license.md`.

### Quality, fusion, and trend smoothing

- Capture quality is scored across lighting, pose, clothing fit, camera level, frame coverage (blocking) and background clutter (advisory) in `src/lib/body-tracker/scan-quality.ts`.
- Multi frame fusion (`src/lib/body-tracker/multi-frame-fusion.ts`) takes 3 frames, runs a per pixel mask median, and a confidence weighted keypoint average.
- Personal baseline drift (`src/lib/body-tracker/personal-baseline-drift.ts`) computes a rolling standard deviation noise floor after 3 scans, flags 2 sigma outliers, and applies a simple recursive low pass smoothing for the public trend chart.

## Known failure modes and limitations

- Single scan absolute body fat can be off by several percentage points; the product mitigates this by always showing a range and by being honest that trend beats absolute.
- Circumference correction factors are population agnostic heuristics; they are not fitted to any cohort.
- Loose or baggy clothing inflates the silhouette and biases circumferences upward; the clothing tightness check is the only guard and it is heuristic.
- Front only captures (no side photo) carry materially higher uncertainty because depth is guessed.
- Scale depends on accurate self reported height; an error in height propagates linearly into every measurement. Credit card calibration mitigates this only when a card is visible.
- Pose deviation from the expected A pose degrades landmark to measurement mapping; the pose score guards this but cannot fully correct it.
- The vision range input is itself an estimate from photos and inherits all photographic estimation limits.
- Lighting extremes, occlusion, cropping, mirrors, and cluttered backgrounds reduce segmentation and landmark quality.

## Demographic coverage caveats

- The Navy equation was derived on US military populations and is known to be less accurate at the extremes of body fat and for body shapes unlike the derivation cohort.
- CUN-BAE was derived on a primarily white Spanish adult cohort; transferability to other ancestries, ages, and body compositions is imperfect.
- The model uses a binary biological sex term (male or female) because both source equations are sex specific. There is no validated handling for intersex or for users whose body composition diverges from the sex term used.
- No equation here is calibrated for pregnancy, for pediatric bodies, for very high muscle mass athletes, or for clinical edema or fluid shifts.
- The product has NOT been validated across skin tones for the segmentation step; segmentation models are known to vary in quality across skin tone and lighting.

## Accuracy claims

This product makes NO validated accuracy claim. No DEXA equivalence has been demonstrated on this build. The clinical validation cohort described in `docs/validation/body-scan-v1-clinical-validation.md` has not been run.

Published literature design targets, clearly labeled as targets and NOT as this product's measured results:

- US Navy method: published mean absolute error versus hydrostatic weighing is commonly cited around 3 to 4 percentage points of body fat in general adult populations.
- CUN-BAE: published correlation with DEXA fat percentage is commonly cited as strong (reported R squared in the high 0.7s to low 0.8s in the derivation work), better than BMI alone.

These figures are the literature for the underlying equations. They are NOT a claim that the ViaConnect pipeline achieves them, and they must not be presented to users as ViaConnect accuracy.

## FDA General Wellness transparency statement

ViaConnect Body Scan is a general wellness product under the FDA General Wellness policy (Class I, low risk). It is intended for general wellness use: tracking and encouraging healthy body composition trends over time. It is NOT a medical device, it does NOT diagnose, treat, cure, mitigate, or prevent any disease or condition, and its outputs are estimates, not clinical measurements. Body composition values are presented as ranges with explicit confidence and method breakdowns. Users should consult a qualified healthcare professional for any medical concern and should not rely on this product for medical decisions.

## Provenance

- Spec: Prompt #169 / #169a, section 16 (documentation deliverables).
- Implementation: `src/lib/arnold/scanning/` and `src/lib/body-tracker/` on branch `feat/prompt-169-finish`.
- This card describes the build as of the Phase 1 implementation and must be revised if a trained model, depth fusion, or genomic priors ship.
