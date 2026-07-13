# FormaVision Accuracy Methodology

**Status: DRAFT for Gary's publication decision. Not yet approved for external release.**

This document describes how FormaVision measures body circumference (girth) and body fat
percentage from a phone scan, and the standard its accuracy claims will be held to before any
figure is published. It is a methodology description, not a results report. As of this draft, no
labeled validation cohort has been collected, so no accuracy figure appears anywhere in this
document. Every accuracy value in the reporting format below is an explicit gated placeholder.

## 1. What this document is and is not

This whitepaper explains:

- How a scan becomes a girth or body fat prediction (the measurement pipeline).
- How that prediction will be validated against real, tape measured ground truth (the validation
  protocol).
- The numeric targets the pipeline is being built to meet (stated as targets, not results).
- The exact table format that will hold the per region accuracy figures once they exist.
- The gate that must clear before any accuracy claim reaches a user, a practitioner, or the public.

This whitepaper does not contain a measured accuracy number. FormaVision has not yet proven its
accuracy. This document describes how that proof will be produced and the bar it must clear.

## 2. Measurement pipeline

### 2.1 From scan to stored measurement

A user completes a body scan in the app. The scan pipeline derives circumference estimates for
eight girth regions (neck, upper arm, forearm, upper leg, lower leg, chest, waist, hip) and a body
fat percentage estimate, then applies a shape correction factor per region before the values are
written to the database.

- Girth values are written to `body_tracker_circumference`, keyed to a scan via `scan_id`.
- Body fat values are written to `body_tracker_segmental_fat.total_body_fat_pct`, alongside
  `body_tracker_weight`.
- Both tables are parented by a `body_tracker_entries` row carrying a nullable `scan_id`.
- The legacy `body_scan_measurements` table is not part of this pipeline and holds no data; it is
  not read by any current code path.

### 2.2 Shape correction factors

Raw circumference estimates from the scan geometry are adjusted by a per region, per sex
correction factor before they are stored. These factors live in a single versioned source of
truth, `calibrationConfig.ts`, under a `CALIBRATION_VERSION` identifier. The current version,
`v1-uncalibrated-2026-06`, is explicitly labeled as a pre-fit baseline: the factors were derived
from general anthropometric shape reasoning (for example, a hip cross-section is not a true
ellipse, a chest cross-section differs by sex), not fitted against any measured population of
FarmCeutica users. Every factor in the current table carries a `fittedMape` value of `null`,
meaning no fitted error rate has been measured for that factor yet. This is the honest starting
state: the correction logic exists and is applied consistently, but it has not yet been tuned
against real tape measurements.

The validation harness described in section 3 is the only mechanism authorized to produce a
replacement, data-fitted correction table. Fitting a new table always produces a new version
string; the harness never mutates the live correction factors in place, so the version identifier
never silently misrepresents what has and has not been measured.

### 2.3 What "a prediction" means for this whitepaper

For the purposes of the validation protocol below, a "prediction" is one calibrated circumference
value (in centimetres) for one region, from one scan session, as stored in
`body_tracker_circumference`. Predictions are compared against an independently collected ground
truth value for the same region and session.

## 3. Validation protocol

### 3.1 Labeled cohort

Accuracy is established by comparing FormaVision predictions against ground truth measurements
from consenting research participants, not from production users' unlabeled scans. Each labeled
pair links one FormaVision prediction to one independently measured truth value for the same
region and the same measurement session.

The cohort schema (migration `20260712110000_prompt_211b_cohort_ground_truth.sql`) defines three
tables:

- `cohort_subjects`: one row per consented research participant, holding minimal demographics
  (sex, height, weight, a coarse non-identifying body size bucket) needed for stratified sampling,
  plus chain-of-custody fields (`collected_by`, `collected_at`, `protocol_version`).
- `cohort_labeled_measurements`: one row per predicted-versus-truth pair, per region, per session,
  including `measurer_id`, the researcher who took the reference measurement.
- `cohort_validation_runs`: an append-only log of every run of the validation harness against the
  cohort, holding the full report and a `gary_signed_off` flag.

### 3.2 Ground truth reference

The initial protocol version (`tape-v1`) uses tape measure ground truth taken by a trained
researcher. `cohort_subjects.protocol_version` also reserves values for a DEXA-anchored protocol
(`dexa-v1`) and a Bod Pod anchored protocol (`bodpod-v1`) for future higher-fidelity reference
data; the schema and import tooling for those anchors are deferred to a later workstream and are
not part of this whitepaper's validation protocol.

### 3.3 Consent and chain-of-custody

No subject enters the cohort without a linked, revocable consent record. `cohort_subjects` carries
a `consent_ledger_id` referencing FarmCeutica's `consent_ledger`, using dedicated consent types for
research participation (for example `tape_anchor`). Chain-of-custody for every labeled pair is
explicit and auditable at the row level: who collected the measurement (`collected_by` /
`measurer_id`), when (`collected_at`), and under what protocol version. All three cohort tables are
restricted by row level security to admin, superadmin, and researcher roles only; cohort data is
never visible to consumer accounts or exposed through any consumer facing surface. Cohort tables
have no delete policy. Records are append-only by design; consent revocation and data erasure are
handled out of band as a deliberate administrative action, not a self-serve deletion path.

`cohort_validation_runs` rows are immutable after insert (report contents, pass/fail outcome,
calibration version, and timestamps cannot be altered once written), so a signed off accuracy claim
can never be retroactively edited. Only the `gary_signed_off` flag and free text notes may change
after a row is written.

### 3.4 Train / held-out split

Within each region, labeled samples are split into a training subset and a held-out subset (80
percent training, at least one sample held out whenever two or more samples exist). A per region
correction scale is fitted using only the training subset. The held-out subset is then evaluated
using that training-fitted scale, never using a scale fitted on the held-out data itself. This
prevents the reported accuracy from being inflated by fitting to the same data it is measured
against. The accuracy claim gate (section 5) reads the held-out result, not the training result.

### 3.5 Inter-rater agreement (ICC)

Because `cohort_labeled_measurements.measurer_id` is recorded on every row, the cohort supports
inter-rater reliability analysis: comparing measurements taken by different researchers on the same
or comparable subjects to confirm that the ground truth itself is consistent across measurers. The
harness computes an intraclass correlation coefficient (ICC) per region between predicted and truth
values using an absolute-agreement, one-way model, so that a systematic bias (not just noise)
correctly lowers the reported ICC. The same ICC computation is the basis for the per region
agreement target in section 4.

## 4. Targets (stated as goals, not measured results)

The following values are the targets the validation harness checks the cohort against. They are
goals for what the pipeline must demonstrate on a real held-out cohort. They are not measured
results, and no cohort has been run against them yet. They are quoted verbatim from
`accuracyTargets.ts`.

| Target | Value | Source constant |
|---|---|---|
| Aggregate within-tolerance rate, held-out split | greater than or equal to 90 percent | `AGGREGATE_PASS_RATE` |
| Per region mean absolute percentage error (MAPE) | less than or equal to 10 percent | `PER_MEASUREMENT_PCT` |
| Per region intraclass correlation coefficient (ICC) | greater than or equal to 0.90 | `MIN_ICC` |
| Per measurement tolerance band | the greater of 10 percent of ground truth, or 2 centimetres for limb regions (neck, upper arm, forearm, upper leg, lower leg), or 3 centimetres for torso regions (chest, waist, hip) | `PER_MEASUREMENT_PCT`, `RegionToleranceCm` |
| Minimum cohort size | at least 30 labeled pairs per region (8 regions, 240 pairs minimum total); 50 per region recommended for robust ICC estimates | `MINIMUM_SAMPLES_PER_REGION` |

These are the thresholds a real held-out cohort must clear, region by region, before the harness
reports `heldOutPass = true`. They are targets. Until a real cohort is run, no statement anywhere in
FormaVision or its marketing may claim that these targets have been met.

## 5. Per region error-band reporting format (gated placeholders, no fabricated numbers)

Once a real labeled cohort exists and the harness has been run, results will be reported in the
following table format, one row per girth region. Every cell in the Value columns below is a gated
placeholder. No number has been measured. No number may be filled in or implied by this document.

| Region | MAPE (percent) | Within-tolerance rate | ICC | Bias (cm) | n (held-out) |
|---|---|---|---|---|---|
| Neck | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort |
| Upper arm | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort |
| Forearm | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort |
| Upper leg | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort |
| Lower leg | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort |
| Chest | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort |
| Waist | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort |
| Hip | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort | pending held-out cohort |

Reporting per region, rather than a single blended aggregate figure, is a deliberate honesty
choice. A single aggregate number can hide a region that performs poorly behind regions that
perform well. FormaVision's public accuracy claim, when it is eventually published, will always be
accompanied by this per region table, not a single headline percentage alone.

The bias column exists to surface systematic over or underestimation separately from random error;
a region can have a low MAPE and still carry a consistent directional bias, and that distinction
matters for how the figure is described.

The n column exists so a reader can see, region by region, whether the minimum cohort size in
section 4 was actually met. A region below the minimum sample size does not get a published figure
even if its raw numbers would otherwise pass.

## 6. The claim gate

No accuracy figure, in this document, in the product, or in any marketing or practitioner facing
material, may be published until all of the following are true, together:

1. A real labeled cohort has been collected under the protocol in section 3, meeting the minimum
   sample size in section 4 for every region.
2. The validation harness (`runValidation`) has been run against that real cohort, and the held-out
   split result reports `heldOutPass = true` for every region, and `cohortStatus = 'proven'`.
3. The resulting `cohort_validation_runs` row has `gary_signed_off = true`, set explicitly by Gary
   after reviewing the held-out result. This flag defaults to false and is never set automatically;
   no accuracy claim can leak into the product or into any published material on the strength of a
   passing harness run alone.
4. Any user, practitioner, or public facing language describing the result uses Kelsey-worded
   copy: guidance-appropriate, non-medical, non-diagnostic phrasing that accurately reflects what
   was measured and what was not.

Until all four conditions hold, the only permitted state to display anywhere is an honest, gated
message with no number, for example "Accuracy validation has not yet been run," "Accuracy
validation is in progress. Results are not yet publishable," or "Validation pending review.
Accuracy figures will appear after sign-off," matching the closed-gate states defined in
`cohortClaimGate.ts`. This whitepaper itself is bound by the same gate: it will not be revised to
include a real number until the gate is open, and this draft is being circulated for Gary's
publication decision, not as a finished public artifact.

## 7. Current state, as of this draft

As of this draft, the underlying scan measurement tables (`body_tracker_circumference`,
`body_tracker_segmental_fat`) hold no data, no labeled cohort has been collected, and no validation
run has occurred. The correction factor version is `v1-uncalibrated-2026-06`, an unfitted baseline.
Every gate in section 6 is closed. This document exists to publish the standard FormaVision will be
held to, not a result it has already achieved.
