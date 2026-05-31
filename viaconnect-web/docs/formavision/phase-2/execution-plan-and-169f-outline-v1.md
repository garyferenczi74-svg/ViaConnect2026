# FormaVision Phase 2: Execution Plan and Prompt 169f Outline

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect (Via Cura consumer brand). Owner agent: Arnold, orchestration Jeffery.
Status: PLANNING ARTIFACT, drafted 2026-05-31. Phase 2 is NOT executable yet. It is gated on three dependency gates (all currently unmet) and on Gary issuing Prompt 169f after those gates close, per Prompt 169e Section 4. This document reconciles the Phase 2 scope (deferred from 169d by 169e) to the REAL codebase, maps each capability to the gate it needs, sequences the build for when the gates close, and frames the open decisions. Nothing here is built, and nothing fabricates a model output, a native plugin, or an accuracy claim.

Canonical bundle for context: 169 + 169a + 169b + 169c (the FormaVision rebrand, NOT yet in the codebase) + 169d (capability proposal, mostly deferred) + 169e (Phase 1 scope reconciliation) + 169e(a) (regional overlay decision lock). Phase 1 is complete on branch feat/prompt-169e-phase1.

## 1. The hard reality (what actually exists today)

Before any Phase 2 planning, the real state of the shipped system, verified in code this session:

- Avatar: a CUSTOM primitive-parametric mesh (react-three-fiber, scaled spheres and cylinders sized from about 9 measurements). There is NO SMPL-X and NO MediaPipe GHUM 3D mesh. MediaPipe BlazePose supplies 2D landmarks that feed the measurement numbers only.
- Composition: anthropometric Navy plus CUN-BAE regression, blended with a vision-derived range. There is NO trained composition CNN. About 14 measurements are extracted, not 102.
- Tier: resolveScanTier returns Tier 1 unconditionally and ignores all depth inputs. There are NO native depth plugins. Tier 2 and Tier 3 are coming-soon UI hooks only.
- Clinical data: no Tier A or Tier B cohort has run. No DEXA-validated accuracy exists.
- Branding: the #169c FormaVision rebrand is NOT in the codebase. The real feature is "Body Scan" under src/components/body-tracker/scanning and src/lib/arnold/scanning. The phantom names the specs use (public.body_scans, src/modules/body-tracker/formavision, FormaVision* components, formavision-process and formavision-finalize edge functions) do not exist; the real equivalents are body_photo_sessions, the scanning components, and the body-scan-analyze and body-scan-export edge functions.

Every Phase 2 capability is built on top of closing the gap between this reality and the spec's assumed stack.

## 2. The three dependency gates

Phase 2 starts only when all three close, then Gary issues 169f (Prompt 169e Section 4.4).

### Gate A: Parametric body model licensed and integrated
- Current state: UNMET. The avatar is primitive geometry; no parametric body model is licensed or integrated.
- What closes it: either close the SMPL-X commercial license with Max Planck Society, OR formally adopt the MediaPipe GHUM (Apache 2.0) fallback, with the decision recorded; then integrate the chosen mesh into the pipeline. Prompt 169a Section 5.3 set a May 22 decision deadline that needs to be reaffirmed.
- Owner: Gary (vendor decision and budget), then engineering integration.
- What it unblocks: the real body mesh, vertex-anchored landmark positions for the 100-plus landmark avatar, the anatomical region surfaces used by the heat-map and segment overlays, and avatar fidelity.
- Branch point that shapes 169f: SMPL-X gives higher fidelity and stable vertex-indexed landmarks at a one-time license cost; GHUM is free and lower fidelity and changes how landmarks are anchored. The choice affects Stage 1 below and the landmark anchor seed.

### Gate B: Tier B clinical validation cohort completed
- Current state: UNMET, not run. This is the long pole.
- What closes it: 100 to 200 participants recruited through Genemetrics partner clinics, each scanned with DEXA and with the scan on the same day, with DEXA SEGMENTAL data captured (not just whole-body), the composition model trained on the cohort, and a validation report filed documenting mean absolute error versus DEXA for whole-body and per-segment composition. Budget 40K to 80K USD authorized and spent (per 169b Section 6.2). Realistic timeline: 3 to 4 months recruitment plus about 1 month training and validation.
- Owner: Gary (budget authorization), Genemetrics clinics, and the model team.
- What it unblocks: the trained CNN heads for weight prediction, segmental composition, and the depth-dependent measurements, AND the substantiated accuracy claims. Without it there is no validated model and no defensible accuracy number.

### Gate C: Native depth plugins shipping in production
- Current state: UNMET. No native depth plugins exist; Tier resolves to 1; capture sends depth_sensor_type none.
- What closes it: the iOS Swift and Android Kotlin BodyScanDepth Capacitor plugins built, tested, App Store and Play Store approved, and live in production on the target device matrix without critical bugs.
- Owner: native engineering (Swift and Kotlin) plus store review. This work cannot be built or tested in the web environment this Phase 1 was built in.
- What it unblocks: the continuous-rotation depth capture (the Tier 2 and Tier 3 flow), depth-fused circumference and segmental extraction, and the Tier 2 and Tier 3 ramp.

## 3. Capability to gate dependency matrix

| Phase 2 capability (deferred from 169d) | Gate(s) required | Real-codebase reconciliation |
|---|---|---|
| 102-measurement extraction service + catalog seed | Mostly Gate B for validation; the silhouette-derivable subset is algorithmic but still needs the service and validation | Catalog table body_scan_measurement_types (deferred). body_scan_measurements is one-row-per-scan with named columns, NOT one-row-per-measurement-type; reconcile the model before seeding |
| Weight prediction CNN head (3.5 percent target) | Gate B (trained on cohort) | Add predicted_weight columns to body_scan_composition (append-only). No model exists today |
| Segmental composition CNN head (per-segment fat and lean) | Gate B (segmental DEXA) + Gate C (depth) + Gate A (region surfaces) | body_scan_segmental_composition table (deferred), keyed by session_id on body_photo_sessions. Phase 1 ships a demographic-typical regional ESTIMATE only (the 169e(a) overlay), not measured segmental |
| Continuous-rotation depth capture (Tier 2 and Tier 3) | Gate C (native depth) | Extend the capture flow; capture_pose_count gains the value 12 (Phase 1 constrains to 2 or 4) |
| Interactive 100-plus landmark avatar | Gate A (SMPL-X or GHUM mesh + vertex landmarks) | SUPERSEDES the primitive avatar and the Phase 1 regional overlay. The Phase 1 overlay was written additively (169e(a), per 169e Section 6.4) so it lifts off cleanly when the parametric avatar lands |
| Heat-map, symmetry, segment, compare shader overlays | Gate A (mesh) for all; heat map also needs Gate B (segmental engine) | The symmetry overlay can reuse the Phase 1 asymmetry arithmetic (already shipped); the heat map needs real per-region composition, not the demographic estimate |

## 4. Build sequence once the gates close

The order is gate-driven. Stages can overlap where their gates are independent, but each stage cannot start before its gate.

- Stage 1 (after Gate A): integrate the chosen parametric mesh (SMPL-X or GHUM). Define the anatomical region surfaces and the 102 landmark anchor positions (SMPL-X vertex indices, or the GHUM equivalent). Build the interactive landmark avatar shell with raycast tap-picking (Phase 1 used a legend affordance because the primitive canvas has no pick). Lift off the Phase 1 regional overlay and re-home its disclaimer.
- Stage 2 (after Gate B): train and integrate the composition CNN with the whole-body, weight, and segmental heads. Populate body_scan_segmental_composition. Build the segmental panel and the weight reconciliation flow. Update and un-retract the accuracy claims strictly per the Tier B validation report.
- Stage 3 (after Gate C): the continuous-rotation depth capture and the Tier 2 and Tier 3 ramp. Depth-fused measurement and segmental extraction. The depth-dependent subset of the 102-measurement service.
- Cross-stage: the shader overlays (symmetry first, reusing the Phase 1 asymmetry; heat map after Gate B; segment isolation and compare after Gate A). The measurement-type catalog and seed. The marketing-claims unlock (Section 7), each claim gated on its validation.

## 5. Prompt 169f spec outline (to issue after the gates close)

When the gates close, 169f should contain, reconciled to the real codebase throughout:
1. Gate closure confirmation: which gates closed, the SMPL-X vs GHUM outcome, the Tier B report reference, the native plugin production status.
2. Confirmed Phase 2 scope: which of the six capabilities ship in 169f given the gate outcomes (for example, if only Gate A closes, the avatar and overlays ship but segmental and weight wait for Gate B).
3. The resolved avatar approach (SMPL-X or GHUM), the landmark anchor seed, and the migration off the primitive avatar.
4. The trained-model integration: the CNN heads, their hosting (Fly.io or Modal per 169 Section 5.3), and the inference path.
5. Schema, now populated: body_scan_segmental_composition, the measurement-type catalog and seed, the predicted_weight columns, the landmark and overlay data columns. All append-only, reconciled to body_photo_sessions.
6. The substantiated marketing claims, drawn directly from the Tier B report numbers.
7. Acceptance criteria and the standing-rules compliance checklist.
8. A reconciliation appendix mapping every phantom reference to the real path, so no Phase 2 file is created against body_scans or src/modules/formavision.

## 6. Open decisions for Gary (to close the gates and shape 169f)

- Gate A: authorize the SMPL-X license (budget and the Max Planck contact at ps-license@tuebingen.mpg.de per 169a) OR formally commit to the GHUM fallback.
- Gate B: authorize the Tier B cohort spend (40K to 80K USD) and the start date. This drives the entire Phase 2 timeline.
- Gate C: staff the native iOS Swift and Android Kotlin depth plugin work and the store submission.
- Still open from 169d Section 14: confirm the 102-measurement taxonomy and the 10 anatomical segments (needed before the catalog seed and the segmental schema).
- Ship window: 169e Section 4 estimates October to December 2026 if Gate B is authorized in June 2026 and completes on schedule.

## 7. Marketing claims unlock map

Each retracted claim becomes shippable only after its gate validates. No claim ships before then (169b Section 9 substantiation lock governs).

| Claim (currently retracted) | Unlocks after |
|---|---|
| Up to 102 measurements | the extraction service ships and is validated |
| Predict weight within 3.5 percent error | Gate B validation confirms the number |
| Direct per-segment composition | Gate B validation (until then, the Phase 1 "regional estimate" language stands) |
| Interactive avatar with 100-plus landmark points | Gate A (the parametric avatar ships) |
| Heat map of body fat distribution | Gate A plus Gate B (real per-region composition) |
| Approaches DEXA segmental output | Gate B validation only |
| Any specific numeric accuracy claim | the corresponding validation report, same rule as 169b Section 9 |

## 8. Honesty guardrails (non-negotiable, carry into 169f)

- No accuracy or DEXA-comparison claim ships until the Tier B report substantiates it.
- No SMPL-X assumption in code until Gate A closes; until then the avatar is primitive geometry.
- No Tier 2, Tier 3, depth, or segmental MEASUREMENT until Gate C and Gate B; Phase 1 ships the demographic-typical regional estimate and labels it as such.
- No fabricated model outputs. If a model does not exist, the feature does not ship; it stays a coming-soon hook.
- All Phase 2 migrations are append-only and reconciled to the real schema. No phantom body_scans or src/modules/formavision.
- All standing rules continue: no em or en dashes, no emojis, Lucide strokeWidth 1.5, getDisplayName for client-facing identity, Bio Optimization Score canonical, Helix consumer-only with segmental and asymmetry flowing to practitioners as clinical context only, Farmceutica Wellness Ltd on legal and PDF surfaces, package.json changes surfaced for Gary approval.

## 9. Summary

Phase 2 is real and valuable, but it is not a code task today. It is unblocked by three things that are external, budgeted, multi-month, and native, not by anything that can be written in this repo right now: a parametric body model decision and integration, a 40K to 80K clinical cohort over 3 to 4 months, and native depth plugins through store review. When those close, this plan plus the Tier B numbers convert directly into Prompt 169f and an executable build, sequenced as in Section 4. Until then, the correct posture is to hold the build and make the gate decisions in Section 6.
