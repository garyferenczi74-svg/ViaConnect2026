# Prompt 210c FormaVision Scan Accuracy - Calibration Brief

Section 16 deliverable 3 of 5. Documents the per-region shape-correction factor
system: the frozen baseline, the config location, versioning, and how the
validation harness re-fits factors without mutating the live config.

---

## 1. Purpose

The circumference prediction pipeline converts silhouette widths and landmarks into
girth estimates by fitting a Ramanujan ellipse through the front-view half-width (a)
and the side-view half-width (b). A real body cross-section is not a true ellipse.
Per-region shape-correction factors adjust the raw Ramanujan estimate upward or
downward to compensate for tissue geometry. This document describes the current
baseline factor set, its status, and the calibration lifecycle.

---

## 2. Config location and version identifier

File: `src/lib/arnold/scanning/accuracy/calibrationConfig.ts`

The current version identifier:

```
CALIBRATION_VERSION = 'v1-uncalibrated-2026-06'
```

This string identifies the factor set. The accuracy harness bumps it when
factors are re-fitted against real ground-truth tape-measure data. No consumer
should inline numeric correction factors; all reads go through `getCorrectionFactor()`.

---

## 3. fittedMape field

Every factor entry carries a `fittedMape: number | null` field (see
`CorrectionFactorEntry` interface, `calibrationConfig.ts:26-34`). This field holds
the Mean Absolute Percentage Error computed by the calibration harness on the
training split after applying the fitted factors. A `null` value means the factors
have not yet been fitted against any real measurement cohort and the number is not
known. All regions currently show `fittedMape: null` because no real cohort has
been run yet.

---

## 4. Per-region correction factors (v1-uncalibrated-2026-06 baseline)

The factor table below is extracted verbatim from `CORRECTION_FACTORS` in
`calibrationConfig.ts:40-52`. A factor above 1.00 expands the raw ellipse
estimate; below 1.00 contracts it. The per-region rationale is taken from the
inline comments in the source file.

| Region         | Male factor | Female factor | Rationale                                     |
|----------------|-------------|---------------|-----------------------------------------------|
| neck           | 1.02        | 1.02          | Near-circular cross-section                   |
| shoulder       | 0.95        | 0.96          | Shoulder is flatter than an ellipse            |
| chest          | 1.00        | 1.04          | Female chest tissue adds volume               |
| under_bust     | 1.00        | 1.00          | Close to a true ellipse                       |
| waist_natural  | 1.01        | 1.02          | Slight outward bulge at natural waist         |
| waist_navel    | 1.02        | 1.02          | Navel-height plane slightly wider             |
| hip            | 1.03        | 1.05          | Hip cross-section is not truly elliptical     |
| bicep          | 0.98        | 0.98          | Muscle belly is slightly narrower             |
| forearm        | 0.97        | 0.97          | Tapered forearm cross-section                 |
| thigh          | 1.02        | 1.03          | Thigh tissue distribution is rounder         |
| calf           | 0.99        | 0.99          | Calf is close to a true ellipse              |

These 11 regions cover the full measurement set. The `getCorrectionFactor(region, sex)`
function (`calibrationConfig.ts:65-75`) is the single access point; it returns the
factor, the `fittedMape` (null pre-calibration), and the version string.

Note from the source file header (`calibrationConfig.ts:14`): individual measurement
errors are typically +/- 3 to 7 percent; trend accuracy over repeat scans is better
because systematic bias cancels across sessions.

**These values are empirical heuristics derived from published anthropometric
studies. They have NOT been fitted against any real population dataset. The
fittedMape for every region is null.**

---

## 5. How the harness re-fits factors

The validation harness (`src/lib/arnold/scanning/accuracy/validationHarness.ts`,
`runValidation`) fits new factors from labeled measurement pairs on the training
split and writes them to a `FittedConfig` object with a bumped version string.

The process (from `validationHarness.ts:380-433`):

1. Group labeled samples by region. Split each region 80/20 (train/held-out)
   per `TRAIN_SPLIT_RATIO = 0.80`.
2. For each region, compute `scale = mean(truth / predicted)` on the training
   pairs (`fitScale`, `validationHarness.ts:300-306`). The ratio minimizes mean
   squared error when applied multiplicatively to predictions.
3. Clamp the scale to `[FACTOR_CLAMP_MIN, FACTOR_CLAMP_MAX]` = [0.85, 1.15].
   A fitted factor outside this range signals a pipeline or data problem.
4. Multiply the clamped scale against the existing `male` and `female` factors
   from `getCorrectionFactor()` to produce the candidate fitted factors
   (`validationHarness.ts:420-425`).
5. Record the training-split MAPE after applying the fitted scale as
   `fittedMape` on each `FittedCorrectionEntry`.
6. Assemble the result as a `FittedConfig` with version string formatted
   `v2-fitted-YYYY-MM-DD` (the date the harness runs).

**Critical design rule (from `validationHarness.ts:7-11`):** the harness produces
a proposal. It does NOT write to `CORRECTION_FACTORS` in `calibrationConfig.ts` at
runtime. In-place mutation would cause `CALIBRATION_VERSION` to silently lie about
what factors are active. Applying a new fit requires a human-supervised calibration
commit that:

- Updates `CORRECTION_FACTORS` in `calibrationConfig.ts`.
- Bumps `CALIBRATION_VERSION` to the new version string.
- Sets `fittedMape` to the measured values for each region.

Until that commit is made, the live pipeline continues to use the frozen v1 baseline.

---

## 6. Current status

- `CALIBRATION_VERSION`: `'v1-uncalibrated-2026-06'`
- All `fittedMape` values: `null` (no real cohort fitted)
- Status: pre-fit baseline. The validation harness infrastructure is in place. The
  accuracy claim (Section 1 target: 90 percent of measurements within tolerance) is
  NOT yet proven. It becomes provable only after the team supplies a real labeled
  cohort per the validation brief (`scan-accuracy-validation.md`) and the harness
  reports `cohortStatus = 'proven'` on a real held-out split.

---

*File: docs/formavision/scan-accuracy-calibration.md*
*Branch: feat/210c, Prompt 210c Task 15*
