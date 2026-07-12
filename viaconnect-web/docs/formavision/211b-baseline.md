# Prompt 211b Baseline (STEP 0 Discovery, read-only)

FormaVision Trust Layer. Authoritative data contract for the 211b build. Read-only findings as
of 2026-07-12, on `feat/211b-trust` off the merged 211a `main`. No code changed in this step.

## The pivotal reality: pre-launch, no real scan data, no cohort

Live prod query (project nnhkcufyqjojdbvdrpky):

| Table | rows | users | max/user |
|---|---|---|---|
| body_tracker_entries | 14 | 2 | 10 |
| body_tracker_weight | 13 | 2 | 10 |
| body_photo_sessions | 7 | 2 | 5 |
| **body_tracker_circumference** | **0** | **0** | - |
| **body_tracker_segmental_fat** | **0** | **0** | - |
| body_scan_measurements (legacy) | 0 | 0 | - |

Only two test users, and the girth + body-fat measurement tables are EMPTY. There is **no real
scan measurement data and no labeled cohort**. Consequence, and it aligns with the prompt's
Section 0: the **published accuracy figure is gated on a real held-out cohort that the team must
collect**. 211b's build delivers the trust MACHINERY and the honest gating; it cannot and must not
produce an accuracy number until that cohort passes the harness.

## Workstream 1 - the 210c harness + the claim gate

- **Harness:** `src/lib/arnold/scanning/accuracy/validationHarness.ts` - `runValidation(labeledSet: LabeledSample[]): ValidationReport`. Pure TS, no IO, fully runnable; passing Vitest suite against synthetic fixtures.
- **Current state:** `cohortStatus='unproven'`, `heldOutPass=false`, all `fittedMape=null`. The claim gate keys on `heldOutPass`, so the accuracy claim stays hidden until a real cohort passes.
- **Targets (210c Section 1, `accuracyTargets.ts`), all on the HELD-OUT split:** aggregate within-tolerance >= 90%; per-region MAPE <= 10%; per-region ICC >= 0.90; tolerance band = greater of 10% of ground-truth or 2cm (limb) / 3cm (torso); minimum >= 30 samples per region.
- **Calibration config (fusion sits BESIDE this, never forks it):** `src/lib/arnold/scanning/accuracy/calibrationConfig.ts` - `CALIBRATION_VERSION='v1-uncalibrated-2026-06'`, frozen `CORRECTION_FACTORS` (11 regions x male/female, `fittedMape:null`), `getCorrectionFactor(region, sex)`.
- **Cohort data infrastructure: entirely must-build.** No table/type/ingestion exists; `LabeledSample` is an in-memory type only. W1 builds: a cohort-subjects table (demographics, consent, chain-of-custody), a labeled-measurements table (predicted_cm, truth_cm, region, session, measurer -> enables inter-rater ICC), a DEXA/clinic import type, and the collection tooling that feeds batches to `runValidation`.

## Authoritative scan-measurement model (what calibration reads)

Confirmed by the 211a W3 one-source fix and the ingest trace:
- **Girths:** `body_tracker_circumference` (source='scan', `scan_id` FK, Platinum-gated, written by `ingestScanMeasurements.ts`).
- **Body fat:** `body_tracker_segmental_fat.total_body_fat_pct` (+ `body_tracker_weight`), written by `buildScanWrite.ts`.
- Both parented by a `body_tracker_entries` row carrying nullable `scan_id` (Prompt 209).
- `body_scan_measurements` is the OLD divergent table (0 rows, no longer read). Do NOT use it.

## Workstream 3 - anchor sources for calibration fusion (a correction to the prompt)

The prompt says scale weight arrives "via 211a health sync." It does NOT. The 211a W2 `healthSync`
is a **write-only, flag-off, iOS-stubbed** outbound service; zero anchor data flows from it.

- **Scale weight anchor (real source):** the pre-211a **Prompt 201** pipeline - Apple Health XML import (`src/app/api/body-tracker/connected-sources/apple-health/parse/route.ts`) + Google Health connector (`src/lib/integrations/google-health/`) -> `ingest-body-composition` edge fn -> `body_composition_readings` -> projected into `body_tracker_weight`. 211b reads scale anchors HERE.
- **Tape measurement anchor:** build the in-app guided-entry flow (new).
- **DEXA/clinic import anchor:** build the one-time import (new). Each anchor carries its own stated reliability; the fusion never averages a low-reliability anchor silently.

## Workstream 4 - cycle data (partly exists; privacy pattern)

- `body_photo_sessions.cycle_phase_at_scan TEXT NULL` EXISTS in the live DB but has **NO repo migration** (schema drift added directly to prod - FLAGGED for cleanup). `user_health_context.pregnancy_status TEXT` exists (migration 20260621134000) and is the natural home for pregnancy mode.
- **W4 opt-in model:** a new consumer-private `user_cycle_context` table mirroring the 211a `scan_cadence_reminders` pattern (one row per user, `opt_in BOOLEAN DEFAULT false`, own-row RLS only, NO practitioner policy, `opted_in_at` audit, revocable, full deletion on request), invisible to practitioners unless an explicit share row is added, never in identifiable telemetry.

## Consent primitives to reuse

- **`consent_ledger`** (migration 20260424000500): version-pinned, revocable, `consent_type/version/granted/revoked_at/evidence`, own-row read/write + compliance-reader SELECT, SOC2-collected. Use it for W1 cohort anchors (`consent_type='scale_anchor'/'tape_anchor'/'dexa_anchor'`) and W4 cycle sharing (`'cycle_tracking'`, `'cycle_data_practitioner_share'`).
- `user_consents` (Prompt 204) is the signup privacy/terms consent; not the per-feature mechanism.

## Section 7 dependency gate: CLEAN - no new dependency needed

All 211b statistics are plain TypeScript within the locked `package.json`:
- OLS per-user linear correction (slope+intercept): ~10 lines.
- MDC95 = 1.96 * sqrt(2) * SE: 2 lines.
- ICC(1,1): already implemented privately in the harness (extract/reuse).
- Confidence intervals: existing `normalCdf` (winnerCheck.ts) for z-based, plus a small 5-row t-quantile lookup (df 5/10/20/30/inf) for small-n cohorts.
- Missing-but-trivial standalone helpers (stddev, full OLS, MDC, percentile) are a few lines each.

`simple-statistics` (MIT, ~15kB) is the only conceivable candidate and is NOT required. **No Gary dependency approval needed.**

## Honest scope: buildable now vs gated on the cohort

**Buildable now (the machinery, no new dep):**
- W1: cohort-subjects + labeled-measurements + DEXA-import schema, the collection/labeling tooling, and the harness wiring so a real batch can be run the moment data exists.
- W2: minimum-detectable-change classification of every displayed delta, sourced from the harness error bands, with Hannah-toned within-noise copy + trend confidence bands.
- W3: the per-user calibration-fusion math beside `calibrationConfig.ts`, anchor ingestion (scale via Prompt 201, tape guided flow, DEXA import), the fusion-mode harness evaluation, honest band-tightening.
- W4: `user_cycle_context` opt-in, phase-aware trend/noise handling, pregnancy mode, all Kelsey-gated and private.

**Gated on the team (data + sign-off), NOT a build deliverable:**
- Collecting the real labeled cohort (subjects, tape/reference values, consent, chain-of-custody).
- Running the harness on the real held-out split.
- The PUBLISHED accuracy claim + the whitepaper's per-region error numbers (Gary-signed, Kelsey-worded). Until then, every accuracy surface renders honestly gated/UNKNOWN.

## Flags for Gary
1. The accuracy claim + whitepaper numbers cannot be produced this build - no cohort exists. 211b ships the machinery + the gate; the number follows the cohort.
2. Anchor scale weight comes from Prompt 201, not the 211a W2 bridge (prompt wording imprecise). No behavior change needed, just reading the right source.
3. `body_photo_sessions.cycle_phase_at_scan` is live-but-unmigrated schema drift; W4 can formalize it with a migration or leave it and add `user_cycle_context` cleanly beside it.
