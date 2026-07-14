# FormaVision Trust Layer Brief (Prompt 211b)

**Status: DRAFT. Prepared for Gary's review ahead of merge. Not a public-facing document.**

This brief summarizes what the 211b FormaVision Trust Layer builds and, just as important, what
it does not yet claim. It covers four workstreams: accuracy validation and the claim gate,
statistical honesty in what users see, per-user calibration fusion, and cycle-aware modeling with
pregnancy mode. No accuracy figure appears anywhere in this brief. Where a number would normally
go, this brief says so explicitly.

## 1. Accuracy validation machinery and the claim gate

FormaVision predicts body circumference and body fat percentage from a phone scan. Whether those
predictions are accurate is a question that can only be answered against real, independently
measured ground truth, not against the app's own output. 211b builds the full machinery to answer
that question honestly, and a gate that prevents any number from reaching a user, practitioner, or
public material before the answer is proven.

The held-out validation harness (`runValidation`) is pure TypeScript with no I/O, already exercised
by a passing test suite against synthetic fixtures. It computes mean absolute percentage error,
bias, within-tolerance rate, and intraclass correlation coefficient (ICC) per measurement region,
using a train and held-out split so the reported result is never fitted to the same data it is
measured against. The targets the harness checks against (aggregate within-tolerance rate,
per-region MAPE, per-region ICC, minimum sample size per region) are documented in
`accuracyTargets.ts` and in the accuracy whitepaper. They are targets the pipeline is being built
to meet. They are not results, and this brief does not restate them as numbers here.

211b adds the cohort data infrastructure that did not previously exist: a `cohort_subjects` table
(demographics, consent linkage, chain-of-custody fields for who collected data and under what
protocol), a `cohort_labeled_measurements` table (one row per predicted-versus-truth pair, with a
`measurer_id` enabling inter-rater ICC), and an append-only `cohort_validation_runs` table that
logs every harness run with a `gary_signed_off` flag. That flag defaults to false and is never set
automatically. Signed-off runs are immutable at the database level (a trigger blocks any post-insert
change to the report, the pass outcome, the calibration version, or the timestamp; only the sign-off
flag and free-text notes may change), so a claim cannot be retroactively edited once recorded.

The claim gate (`cohortClaimGate.ts`) reads the latest validation run and exposes an accuracy claim
only when both `heldOutPass` is true and `garySignedOff` is true. Every other condition, including
no run at all, a run that has not passed the held-out split, or a passed run awaiting sign-off,
returns a closed state with an honest reason and zero numeric content. The three closed-state
messages are literally "Accuracy validation has not yet been run," "Accuracy validation is in
progress. Results are not yet publishable," and "Validation pending review. Accuracy figures will
appear after sign-off." No code path in 211b can bypass this gate to surface a number.

As of this brief, all three cohort tables hold zero rows in production. There is no real labeled
cohort. **The published accuracy figure is gated on a real held-out cohort that does not yet exist**,
followed by a harness pass and Gary's explicit sign-off. 211b ships the machinery and the gate. It
does not and cannot ship the number. The accuracy methodology and reporting format are documented in
`docs/formavision/211b-accuracy-whitepaper.md` (DRAFT, gated, no fabricated numbers, pending Gary's
publication decision).

## 2. Statistical honesty

Even before any accuracy claim is proven, FormaVision must not mislead users about whether a change
they see between two scans reflects real change or ordinary measurement noise. 211b builds this
honesty layer independently of the accuracy claim itself.

The minimum detectable change engine (`mdcEngine.ts`) computes MDC95 from the error band the
validation harness reports (injected, never hardcoded), and classifies every displayed delta as
either meaningful or within-noise. Deltas classified within-noise are shown with kind, non-alarming
copy rather than a toned gain or loss arrow, consistent whether the surface is the body fat readout
or the notable-changes summary; a within-noise delta never displays a directional arrow that implies
a real change occurred. Trend confidence bands, plateau detection, and spike softening extend this
honesty to multi-point trends: a single outlier scan is softened rather than presented as a sudden
real change, and a run of stable readings is labeled a plateau rather than noise-chased into false
narratives. These are wired onto the journey timeline for body fat and, following the same pattern,
for the waist and hip girth regions. No numeric precision figure (for example a plus-or-minus
centimetre value) is displayed pre-cohort; band width is communicated qualitatively.

## 3. Per-user calibration fusion

Separate from the population-level accuracy claim, a user can supply independent measurements of
their own body (a connected scale, a guided tape measurement, or an imported DEXA result) so
FormaVision can compare its own predictions against that person's specific anchors over time. This
personal correction is entirely distinct from the calibration factors in `calibrationConfig.ts`;
fusion sits beside that config and never forks or silently rewrites it.

Anchor sources are: scale weight read from the existing Prompt 201 Apple Health and Google Health
import pipeline (not the 211a health-sync bridge, which is write-only and flag-off), a new guided
tape-entry flow, and a new DEXA import flow. Each anchor carries its own stated reliability, and the
fusion logic never silently averages a low-reliability anchor in with high-reliability ones. If any
single region's anchor data is judged unreliable, the personal correction for that whole result is
withheld rather than partially applied. The personal correction can never manufacture agreement it
has not earned and can never display a band tighter than the evidence supports; the consumer-facing
display is qualitative only (tightened or not-tightened status), with no numeric personal band
shown by default. Whether a labeled numeric personal band should ever be shown is an open Kelsey and
Gary decision, not resolved by this build. A fusion-mode evaluation harness validates the fusion
math the same way the population harness validates the base pipeline, keeping the honesty standard
consistent across both.

## 4. Cycle-aware modeling and pregnancy mode

Girth measurements, particularly waist and hip, can shift with a user's menstrual cycle phase due to
ordinary, non-fat water retention. 211b adds an opt-in, consumer-private `user_cycle_context` table
(own-row row-level security only, no practitioner visibility unless a user explicitly shares) and a
pure, additive phase-aware wrapper (`cyclePhaseAware.ts`) that composes over the already-reviewed
noise classifier. This wrapper never changes the underlying classification or hides a data point; it
only adds optional, non-judgmental phase-context copy alongside a delta that is already classified
meaningful, when that delta is typical of water retention for the user's current phase on a
bloat-prone region. When opt-in is false or the phase is unknown, the result is the base
classification, unchanged.

Pregnancy mode reads the existing `user_health_context.pregnancy_status` field and, when active,
suppresses composition estimates (body fat, composition deltas, future-self projection, personal
precision bands) with supportive, non-alarming copy. Girth measurements are never suppressed; only
composition estimates are. This gate **fails closed**: on a loading state, an error, or any
ambiguity, composition estimates are suppressed rather than risking a flash of an estimate to a
pregnant or lactating user. This was corrected during build review, which caught an initial
fail-open condition before it shipped. The health-context write path was also corrected to a
read-modify-write pattern so that setting pregnancy status never overwrites or blanks other
protected health fields (medications, allergies, conditions) already on that row.

Cycle-aware and pregnancy-mode copy is clinical-sensitivity territory. **Kelsey clinical clearance
is the merge gate before any of this ships to a user-facing surface**, per the build mandate. The
machinery is built and reviewed; the human clearance step has not occurred as of this brief.

## 5. Honesty posture, throughout

Every workstream in 211b follows the same rule: unknown stays UNKNOWN, nothing is fabricated, and no
accuracy figure appears anywhere, in code, in copy, or in this brief, before the held-out cohort
pass and Gary's sign-off. Where a number does not yet exist, the honest gated state is what renders.
Targets appear only labeled as targets, never as results.

## Human gates outstanding

- Kelsey clinical clearance for cycle-aware and pregnancy-mode user-facing copy (merge gate).
- Gary's publication decision on the accuracy whitepaper (`211b-accuracy-whitepaper.md`).
- Collection of a real labeled cohort, a passing held-out harness run, and Gary's explicit
  `gary_signed_off` before any accuracy figure may be published anywhere.
- Gary and Kelsey decision on whether a labeled numeric personal-precision band may ever be shown
  to a consumer (default shipped behavior is qualitative only).
