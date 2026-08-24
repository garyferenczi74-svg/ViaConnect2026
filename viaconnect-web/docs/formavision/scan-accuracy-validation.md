# Prompt 210c FormaVision Scan Accuracy - Validation Report

Section 16 deliverable 4 of 5. Documents the per-region metrics the harness
reports, the accuracy targets those metrics must meet, the train/held-out method,
the minimum defensible cohort, the written ground-truth protocol the team must
supply, and the current unproven status.

---

## 1. Section 1 accuracy targets

Source: `src/lib/arnold/scanning/accuracy/accuracyTargets.ts`

Three criteria must ALL pass on the held-out split for the 90 percent accuracy
claim to be surfaced to users:

| Criterion | Constant | Value |
|-----------|----------|-------|
| Aggregate within-tolerance pass rate | `AGGREGATE_PASS_RATE` | 0.90 (90 percent) |
| Per-region MAPE limit | `PER_MEASUREMENT_PCT * 100` | 10 percent |
| Per-region minimum ICC | `MIN_ICC` | 0.90 |

All three constants are frozen named exports. No consumer should inline these
values; they are the single source of truth.

---

## 2. Region tolerance bands

Source: `accuracyTargets.ts:45-54` (`RegionToleranceCm`)

The within-tolerance check uses the GREATER of two bands for each measurement
(`withinTolerance`, `accuracyTargets.ts:66-75`):

- 10 percent of the ground-truth value (`PER_MEASUREMENT_PCT = 0.10`).
- The per-region fixed centimetre band from the table below.

This implements Section 1.1: "within the greater of 10 percent or a region
tolerance band."

| GirthRegion | Fixed band (cm) | Type   |
|-------------|-----------------|--------|
| neck        | 2               | limb   |
| upperArm    | 2               | limb   |
| forearm     | 2               | limb   |
| upperLeg    | 2               | limb   |
| lowerLeg    | 2               | limb   |
| chest       | 3               | torso  |
| waist       | 3               | torso  |
| hip         | 3               | torso  |

Limb girths carry a 2 cm fixed band; torso girths carry 3 cm. For a waist of
80 cm the effective tolerance is max(8 cm, 3 cm) = 8 cm. For a forearm of
28 cm the effective tolerance is max(2.8 cm, 2 cm) = 2.8 cm. Smaller
measurements are governed by the fixed band; larger measurements by the
10 percent band.

---

## 3. Per-region metrics reported by the harness

Source: `validationHarness.ts:91-113` (`RegionMetrics` interface and its
`computeMAPE`, `computeWithinTolerancePct`, `computeICC`, `computeBias` helpers)

For each `GirthRegion` present in the labeled set, `runValidation` reports:

### 3.1 MAPE (Mean Absolute Percentage Error)
Formula (`validationHarness.ts:198-202`): mean(|predicted - truth| / truth) x 100.
Range: 0 to 100 (percent). Returns 0 for empty input. Target: <= 10 percent per
region.

### 3.2 Within-tolerance pass rate
Fraction of samples meeting `withinTolerance(predicted, truth, region)` from
Section 2 above. Range: 0 to 1. Returns 0 for empty input. The aggregate
(weighted by n) must reach 0.90 across all regions.

### 3.3 ICC[1,1] - Intraclass Correlation Coefficient
Model: one-way ANOVA ICC(1,1), Shrout-Fleiss absolute-agreement form
(`validationHarness.ts:224-261`). This is the absolute-agreement model: it
includes systematic bias in the error term. A pipeline that perfectly
overestimates every girth by 5 cm will have ICC below 1.0 even though all
errors are consistent.

Computation:
- n subjects, 2 raters (predicted and truth), k = 2.
- Subject mean: M_i = (predicted_i + truth_i) / 2.
- Grand mean: G = sum of all 2n values / 2n.
- SSB = 2 * sum((M_i - G)^2), MSB = SSB / (n-1).
- SSW = sum((predicted_i - M_i)^2) + sum((truth_i - M_i)^2), MSW = SSW / n.
- ICC = (MSB - MSW) / (MSB + MSW), clamped to [0, 1].

Returns 0 when n < 2 (not computable). Returns 1 when all values are identical.
Target: >= 0.90 per region.

### 3.4 Signed bias
Mean signed error (predicted minus truth) in centimetres
(`validationHarness.ts:208-212`). Positive = systematic overestimate. This is
a diagnostic field; no pass/fail threshold is set. Persistent nonzero bias flags
a systematic issue in the correction factors or scale derivation.

---

## 4. Train / held-out method

Source: `validationHarness.ts:321-336` (`splitRegion`) and `runValidation:380-433`

Each region's labeled samples are split independently:

- Training fraction: `TRAIN_SPLIT_RATIO = 0.80` (first 80 percent of samples).
- Held-out fraction: remaining 20 percent (at least 1 sample when n >= 2).
- The calibration harness fits correction factors on the training split only.
- Held-out metrics are computed after applying the fitted factors to held-out
  predictions (`applyScale`, `validationHarness.ts:312-314`).

This prevents the pass/fail report from being overfit to the training split. The
gate that the Task 12 accuracy claim reads is `heldOutPass`, not `overallPass`.
`heldOutPass` is true only when the held-out metrics meet all three criteria
across all regions.

---

## 5. Minimum defensible cohort

Source: `validationHarness.ts:36-54`

```
MINIMUM_SAMPLES_PER_REGION = 30
```

8 GirthRegions x 30 samples = 240 labeled measurement pairs minimum.

The recommendation from the source file is 50 per region for robust ICC
estimates, which yields 400 pairs total.

`cohortStatus` in the `ValidationReport` is `'proven'` only when BOTH conditions hold:
- `heldOutPass` is true (all three metric targets met on the held-out split).
- Every GirthRegion has at least 30 samples in the labeled set.

If either condition is false, `cohortStatus` is `'unproven'`.

---

## 6. Written ground-truth protocol (team responsibility)

The harness consumes a `LabeledSample[]` array
(`validationHarness.ts:82-88`). Each element has:

```
predictedCm : number   - pipeline output (correction factors already applied)
truthCm     : number   - tape-measure ground truth in centimetres
region      : GirthRegion
sex?        : 'male' | 'female'
```

The labeled set is supplied by the team per a written protocol. The protocol must
specify:

1. **Measurement method.** Tape-measure or calibrated 3D scanner at the same
   anatomical plane as the pipeline measurement. Both predictedCm and truthCm
   must reference the same plane.
2. **Session structure.** Photos taken with the same device and setup as
   production captures. The pipeline is run unmodified; no manual corrections
   are applied before recording predictedCm.
3. **Cohort composition.** At minimum 30 subjects per GirthRegion (50
   recommended for robust ICC). The set should span biological sex (male and
   female), a range of BMI values (lean through obese), and different body types
   to avoid a narrow demographic bias.
4. **Inter-rater consistency.** If more than one person measures with the tape,
   inter-rater reliability (a second ICC pass) should be recorded to bound the
   ground-truth error.
5. **Exclusion criteria.** Define conditions that make a measurement pair
   invalid (e.g., photo rejection by the capture QC gate, landmark detection
   failure rate above a threshold, or tape-measure procedural errors).

No labeled cohort has been supplied at the time of this writing. The harness
infrastructure is in place but has only been exercised on synthetic fixtures
(small sets, below the minimum-sample threshold). The synthetic runs confirm
the metric implementations are correct; they do NOT constitute a real accuracy
validation.

---

## 7. Current status: UNPROVEN

As of `CALIBRATION_VERSION = 'v1-uncalibrated-2026-06'`:

- No real labeled measurement cohort has been supplied to the harness.
- Synthetic fixture runs correctly produce `cohortStatus = 'unproven'` and
  `heldOutPass = false` because the synthetic set is intentionally too small
  and/or the metrics do not meet thresholds.
- The 90 percent accuracy claim is NOT surfaced to users (Task 12 / T12 gate
  reads `heldOutPass`).
- The claim remains hidden until a real held-out cohort passes all three metric
  targets AND a human reviewer signs off on the cohort protocol and harness
  output.

**Do not state or imply that 90 percent accuracy has been achieved. It is
unproven until the cohort is run and the harness reports `cohortStatus =
'proven'` on a real held-out split.**

---

*File: docs/formavision/scan-accuracy-validation.md*
*Branch: feat/210c, Prompt 210c Task 15*
