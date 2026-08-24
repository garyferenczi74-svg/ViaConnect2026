# Prompt 210c FormaVision Scan Accuracy - Confidence and Capture Brief

Section 16 deliverable 5 of 5. Documents the capture quality control gate,
the per-measurement confidence model, UNKNOWN behavior and RULE 9, the gated
accuracy claim surface (T12), and the reference-object scale booster.

---

## 1. Capture quality control

Source: `src/lib/arnold/scanning/accuracy/captureQuality.ts`

Before any circumference is computed, each captured frame passes through
`assessCaptureQuality`. The function receives a plain-data description
(`CaptureQualityInput`) derived from MediaPipe Pose landmark output plus
device metadata; it never touches raw image pixels. The adapter that maps a
`PoseSilhouette` (the T9 CV pipeline output) to a `CaptureQualityInput` is
`silhouetteToQualityInput` in
`src/lib/arnold/scanning/accuracy/silhouetteToQualityInput.ts`.

### 1.1 Blocking issues

Blocking issues set `pass = false` in the returned `CaptureQualityResult`.
A failed capture MUST cause the caller to flag the affected view's measurements
as low-confidence or UNKNOWN (RULE 9). The caller may proceed but must not treat
a failed capture as equivalent to a passing one.

| Condition | Threshold | Penalty |
|-----------|-----------|---------|
| No person detected | presence check | -0.80 |
| Full body not in frame (any of: head, shoulders, hips, ankles missing) | boolean landmark check | -0.50 |
| Orientation does not match requested view | detectedPose != requestedPose | -0.40 |
| Device tilt too high | tilt >= `TILT_BLOCK_DEG` = 25 degrees | -0.40 |
| Low contrast (image too dark or overexposed) | contrastScore < `CONTRAST_BLOCK_MIN` = 0.15 | -0.30 |

### 1.2 Soft issues

Soft issues are added to the `issues` list and reduce the score but do NOT set
`pass = false`. They lower the quality score that feeds into the confidence model.

| Condition | Threshold | Penalty |
|-----------|-----------|---------|
| Slight device tilt | `TILT_WARN_DEG` = 10 degrees <= tilt < 25 degrees | -0.15 |
| Low contrast (marginal) | `CONTRAST_BLOCK_MIN` = 0.15 <= contrastScore < `CONTRAST_WARN_MIN` = 0.35 | -0.10 |
| Low average landmark visibility | averageVisibility < `MIN_LANDMARK_VISIBILITY` = 0.50 | -0.10 |

### 1.3 Score formula

Score starts at 1.0. Each detected issue subtracts its penalty. Penalties stack
additively. The final score is clamped to [0, 1]. The `score` value maps
directly to `captureQualityScore` in `ConfidenceInputs` (Section 2 below).

### 1.4 Retake prompts

`retakePromptForIssues(issues)` in `silhouetteToQualityInput.ts` converts the
issues list to a single user-actionable sentence. Blocking issues take priority.
Examples: "Hold the camera level - it is tilted N degrees from vertical" or
"Step back so your feet are fully visible."

---

## 2. Per-measurement confidence model

Source: `src/lib/arnold/scanning/accuracy/confidenceModel.ts`

`scoreMeasurementConfidence(inputs)` returns a score in [0, 1] and a categorical
level for a single girth measurement. It is a pure weighted sum; it never reads
or writes external state.

### 2.1 The seven inputs (`ConfidenceInputs`, `confidenceModel.ts:24-77`)

Each input is normalized to [0, 1] by the caller. Higher values always mean
better quality or lower uncertainty.

| Input | What it measures |
|-------|-----------------|
| `captureQualityScore` | Overall capture quality: lighting, exposure, distance, blur. Populated by `assessCaptureQuality` (Section 1). |
| `maskEdgeCertainty` | Silhouette edge quality from the TF body-segmentation per-pixel confidence. 1 = crisp boundary. |
| `landmarkVisibility` | Average MediaPipe visibility score for the landmarks that anchor this measurement. |
| `scaleAgreement` | Agreement across front/side/reference-object scale anchors. Computed by `scaleCalibration.ts`. |
| `lrCorroboration` | Left-to-right view agreement on this girth estimate. |
| `fbCorroboration` | Front-to-back view agreement on this girth estimate. |
| `populationPriorScore` | Population-prior plausibility: Mahalanobis-style distance to the anthropometric prior. |

### 2.2 Weights (`WEIGHTS`, `confidenceModel.ts:102-110`)

```
landmarkVisibility   0.30  (primary error source: occluded landmarks)
captureQualityScore  0.25  (blurry/dark photos degrade all downstream geometry)
scaleAgreement       0.15  (scale errors multiply through every measurement)
lrCorroboration      0.12  (left-right disagreement flags pose or occlusion issues)
maskEdgeCertainty    0.10  (noisy edges affect width-at-level estimates)
fbCorroboration      0.05  (depth estimation errors from side-view model)
populationPriorScore 0.03  (soft sanity check; unusual morphology is valid)
```

Weights sum to exactly 1.00. The module validates this at load time and throws
if the table is edited incorrectly.

### 2.3 Score formula

```
score = sum(WEIGHTS[k] * clamp(inputs[k], 0, 1)) for all k
```

The score is naturally in [0, 1] because weights sum to 1 and all clamped
inputs are in [0, 1].

### 2.4 Confidence levels and thresholds (`confidenceModel.ts:126-147`)

| Level    | Score range          | Constant                |
|----------|----------------------|-------------------------|
| high     | score >= 0.75        | `HIGH_SCORE_THRESHOLD`  |
| moderate | 0.45 <= score < 0.75 | `MODERATE_SCORE_THRESHOLD` |
| low      | score < 0.45         | (below moderate)        |

```
CONFIDENCE_THRESHOLD = 0.35
```

A score below `CONFIDENCE_THRESHOLD` (0.35) signals to the caller that the
measurement must be rendered as UNKNOWN or "estimated - low confidence." This
threshold is strictly below `MODERATE_SCORE_THRESHOLD` (0.45), so any
sub-threshold score also produces level `'low'`.

---

## 3. UNKNOWN behavior and RULE 9

RULE 9 is the backbone of the honesty contract across the entire confidence
stack: a module only reports a score or assessment. It never fabricates a value,
never substitutes 0, and never silently promotes a failed or sub-threshold result
to a passing one. The caller decides what to display.

Consequences at each layer:

- **Capture quality** (`captureQuality.ts`): `pass = false` signals the caller
  to flag the view's measurements. The assessor does not suppress or replace the
  measurement.
- **Scale reconciliation** (`scaleCalibration.ts`): when no valid anchor is
  present, `scaleCmPerPx` is `null` (UNKNOWN), never 0. A single anchor returns
  `agreement = SINGLE_SOURCE_AGREEMENT = 0.60` (cross-verification not possible,
  confidence is partial, not full).
- **Reference object scale** (`referenceObjectScale.ts`): returns `null` for
  any invalid input (zero, negative, non-finite). Never fabricates a scale value.
- **Confidence model** (`confidenceModel.ts`): returns the score and level only.
  A sub-threshold score does not automatically suppress or alter the downstream
  measurement; the caller surfaces UNKNOWN based on the score.
- **Avatar rendering**: when `circumferenceM` on a `BodyRing` is `null` (UNKNOWN),
  the 3D avatar uses the sex-specific template default for that ring, not 0 or an
  invented estimate. This ensures the avatar is always renderable without
  fabricating data.

---

## 4. Scale calibration and the reference-object booster

Source: `src/lib/arnold/scanning/accuracy/scaleCalibration.ts`
Source: `src/lib/arnold/scanning/accuracy/referenceObjectScale.ts`

`reconcileScale(inputs)` combines up to three independent scale anchors:

- `frontScaleCmPerPx`: height-derived scale from the front-pose silhouette.
- `sideScaleCmPerPx`: height-derived scale from the side-pose silhouette.
- `refObjectScaleCmPerPx` (optional): reference-object anchor from
  `scaleFromReference(knownSizeCm, measuredPx)` in `referenceObjectScale.ts`.

Reconciliation uses the arithmetic mean of all valid (positive, finite) anchors.
The `agreement` field is computed as:

```
agreement = clamp(1 - relativeSpread / AGREEMENT_NORMALIZATION, 0, 1)
```

where `relativeSpread = (max_anchor - min_anchor) / mean_anchor` and
`AGREEMENT_NORMALIZATION = 0.20`. The flag threshold `DISAGREEMENT_RELATIVE_SPREAD_THRESHOLD
= 0.10` (10 percent) maps to `agreement = 0.5`, so all flagged disagreements
produce `agreement < 0.5`.

A single available anchor returns `agreement = SINGLE_SOURCE_AGREEMENT = 0.60`
because cross-verification is not possible. Zero valid anchors return
`scaleCmPerPx = null` (UNKNOWN, per RULE 9) and `agreement = 0`.

The `refObjectScaleCmPerPx` input is OPT-IN ONLY (Section 6.2). The caller
passes it only when the user has explicitly chosen to include a reference object
in the frame. `scaleFromReference` returns `null` for any invalid input.

**Native device depth (ARKit/ARCore)** is a further accuracy booster for torso
front-to-back estimation, approved by Gary in the Section 12 gate
(see `scan-accuracy-baseline.md`). The specific Capacitor depth plugin is not
yet selected; the depth path must degrade gracefully so the rest of the
pipeline never blocks on it.

---

## 5. Gated accuracy claim surfacing (T12)

The accuracy claim ("90 percent of measurements within tolerance") is shown to
users ONLY when the validation harness reports `heldOutPass = true` on a real
labeled cohort (`validationHarness.ts:1-5`). Until then, the claim is hidden.

`scoreMeasurementConfidence` and `assessCaptureQuality` are in place and
operational. They feed per-measurement confidence scores that the rendering
layer uses to determine whether to show a numeric result or the UNKNOWN
indicator. The accuracy claim gate (`heldOutPass`) is a separate condition
evaluated by the validation harness on a supplied labeled cohort; it is not
derived from the per-measurement confidence scores. Both mechanisms are
necessary and independent.

---

## 6. Current status

- Capture quality control: implemented and tested.
- Confidence model: implemented and tested (weights sum validated at load time).
- Scale reconciliation: implemented and tested.
- Reference-object booster: opt-in, implemented and tested.
- UNKNOWN/RULE 9 discipline: enforced across all modules.
- Native depth booster: approved as future work; plugin selection pending.
- Accuracy claim gate: `heldOutPass = false` (no real cohort supplied yet).
  See `scan-accuracy-validation.md` for the full validation status.

---

*File: docs/formavision/scan-accuracy-confidence.md*
*Branch: feat/210c, Prompt 210c Task 15*
