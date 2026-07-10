# Prompt 210e STEP 0: FormaVision Seam Map

Date: 2026-07-06. Branch: feat/210e-integration (worktree, base 30d686bf). Read-only per Section 3; no fix applied yet.
Method: three parallel read-only code traces (data spine, body and life, meaning and proof) plus the 210d live-schema snapshot as the schema source of truth.

## 1. Merge state of the 210 series

| Prompt | State |
|---|---|
| 210 / 210a | On main (210a: 4 commits incl. gate record and parametric mesh) |
| 210b | On main (113 commits, all 8 phases; branch feat/210b closed out fully merged at 30d686bf) |
| 210c | On main (21 commits incl. confidence surfacing, LiDAR booster, scan_id FK fix) |
| 210d | feat/210d-schema-integrity, STEP 0 ONLY (baseline d693b92b). Drift report, remediation, reason-tagging, strict mode, CI guardrails NOT BUILT |
| 210e | This branch |

Parallel 208 work: journey surfaces shipped through 208k; no overlap with FormaVision paths.

## 2. Seam matrix baseline (Section 5 seams, status from reading)

| Seam | Producer | Consumer | Status |
|---|---|---|---|
| Capture to extraction | PhotoSessionCapture.tsx:87-160 (bucket body-progress-photos, exists live) | arnold-vision-analyze edge fn (live) writes body_photo_sessions.arnold_analysis | WIRED. Quality gate SURFACES failures (runScanAnalysis silhouetteToQualityInput); retake prompt is the UI callback consumer: matrix must verify the specific retake prompt renders |
| Extraction to vector | runScanAnalysis.ts extractMeasurements + buildConfidenceMap; buildCircumferenceWrite.ts | body_scan_measurements + body_tracker_circumference (+ hip in body_tracker_weight.hips_in per 85d) | WIRED. Per-field confidence written (0.85/0.60/0.35/null). scan_id null is the documented 210c FK fix; row persists via entry_id (silent no-write AVOIDED). UNKNOWN stays null, never 0 |
| Vector contract (write vs read) | runScanAnalysis buildAvatarParameters | scanToParamVector.ts:73-122 (BodyParamVector) | WIRED, SAME body_tracker contract, no translation layer. Nulls preserved both sides; estimated flag derived from null; toMeters never returns 0 |
| Vector to mesh | scanToParamVector | buildBodyGeometry.ts:72-97 + mountBodyGeometry | WIRED. UNKNOWN regions use template defaults and are carried in estimatedRingIds to the render layer |
| Mesh to overlays | composSegmentTints (canonical RegionMap, mirrors 2D floor change semantics) | FormaVisionCanvas setSegmentTints; MeasurementCallouts + MeasurementRing via scanToParamVector | WIRED. Overlays read the SAME scan and circumference hooks as the cards; unknown regions render neutral, never guessed |
| Scan history to time machine | useCompositionHistory / useCircumferenceHistory (cap 60 plus genuine earliest = 210a Gate 4 first-scan read) | JourneyTimeline + lerpParamVector + scrubController | WIRED. Snap points on real scans only; interpolated states labeled as transitions; reduced-motion snaps scan to scan |
| Vector deltas to results | compositionDeltas.ts (latest vs first, canonical polarity) | BodyFatReadout + NotableChanges | WIRED. Direction never re-derived in UI; shoulderWidth neutral; null on either side omits the delta, never 0 |
| Region tap to protocol | RegionProtocolPanel.tsx:93-119 | GET /api/protocol/synthesis (getOrComputeUserProtocolSynthesis = real Via Cura engine) | WIRED with a scope note: the engine returns the WHOLE user protocol; there is no per-region protocol output in the existing engine. A region tap lands on the real protocol, not a region-filtered one. Decision for Gary below |
| Scan to score | /api/bos/current via use-bos-current (SSOT) | BOSMovementReadout.tsx:264-271 | WIRED. No parallel compute; null score and null baseline render honestly |
| Milestone to Helix | body_tracker_milestones read | MilestoneMoment.tsx (celebrate-only), mounted ONLY in the (consumer) composition page | PARTIALLY VERIFIED. Consumer-only holds at the route layer; the data-layer absence from practitioner views is a matrix test to write. Helix crediting itself is the existing 169-lane event, not this overlay (celebrate-only by 210b design) |
| Agents to surface | agentNarration.ts templates (getDisplayName for arnold and hannah) | AgentNarration.tsx | WIRED. Deterministic templated copy, fail-open, first-scan welcome on null deltas. Kelsey clearance of copy pending (Section 10) |
| Genetics / future self | GeneticsOverlay (useGeneticsVariants, absent state CTA), FutureSelfPanel + GhostMesh (goal-driven, ghost default OFF) | props exist on the avatar | WIRED as honest data-driven disabled states, zero fabricated bands or bodies. NOTE: no feature flag exists; both are always-mounted data-driven surfaces (absent data = honest state). Activation is data arrival, not a flag flip |
| Ladder | capabilityProbe + tierLadder (cinematic, lite, 2d; sticky, no step-up) + frame-budget step-down | FormaVision3DAvatar WebGL gate + AvatarErrorBoundary to 2D floor (children = existing 2D cards, numbers intact) | WIRED. All three tiers real (lite reduces segment density); forced render error lands on the floor with readouts mounted in the parent |
| Telemetry | avatarTelemetry.ts 12 events, sink INTO analytics_events (table exists live per 210d snapshot) | NO READER EXISTS. No dashboard reads analytics_events anywhere in src | HALF WIRED: emit side wired, consume side absent. Walk step 10 (confirm events in the dashboard) cannot pass as written. Decision for Gary below. Also: live arrival has never been verified (210b P8-T2b was held) |
| Guardrails / CI | root .github/workflows: ci.yml (advisory tsc, next build with ignoreBuildErrors, expo check) + gold-set-eval.yml; web .github/workflows: no-dashes.yml | E2E suite would land beside these | NOT READY FOR 210e ACCEPTANCE AS WRITTEN: no Playwright job, no drift check, no migration parity, no strict mode. All four are 210d deliverables not yet built. Playwright itself IS in the repo (@playwright/test 1.59.1 + playwright.config.ts), so the suite can be authored without touching package.json |

## 3. Parameter-vector contract (Section 3 item 3)

Confirmed one contract, both sides, no drift: the 210c pipeline writes body_scan_measurements / body_tracker_circumference / body_tracker_weight.hips_in with per-field confidence and null for UNKNOWN; scanToParamVector reads the same rows into BodyParamVector with circumferenceM: number or null and estimated: boolean per ring. Field-by-field check (neck, chest, waist, hip, biceps, forearms, thighs, calves) found null-preservation and estimated-marking symmetric. No translation layer exists.

## 4. 210d guardrail state in CI

Not built. 210d is at STEP 0 (read-only baseline). Consequences for 210e acceptance criteria: the E2E suite cannot run beside a drift check or strict mode that do not exist, and the planted-phantom test has no gate to be caught by. Sequencing decision required (see report).

## 5. Defects and conflicts visible from reading

1. TELEMETRY CONSUMER MISSING: analytics_events is write-only. Either accept SQL-level verification for walk step 10 and the seam test, or authorize a minimal admin reader panel (which is arguably new scope under Section 2). Gary decision.
2. REGION-TAP PROTOCOL SCOPE: the real engine is whole-protocol; walk step 6 lands on the real Via Cura protocol but not a region-filtered one. Region targeting would be new engine scope (banned here). Gary accepts the whole-protocol landing or defers region targeting to a future prompt.
3. DORMANT PHANTOM CODE IN THE LANE (from 210d): arnold-recommender.ts and arnold-reconciler.ts reference arnold_recommendations, arnold_user_profiles, body_tracker_reconciliation_log which DO NOT EXIST live. Both modules have ZERO imports (dormant); they cannot break the walk but are 210d remediation targets. Not a 210e blocker.
4. CAPTURE RETAKE PROMPT: quality failure is surfaced via callback; the specific retake prompt rendering is a UI concern the matrix must verify (walk step 1 depends on it).
5. INTRO CALLOUT STAGGER: materializeIntro defers callout staggering to MeasurementCallouts own staggered mount (OV-T4). Walk step 2 expectation should hold; matrix verifies.
6. MILESTONE DATA-LAYER CHECK: consumer-only currently enforced by route grouping; the matrix needs the data-layer assertion (practitioner contexts never receive Helix milestone data).
7. P8-T2b CARRYOVER: the 12 events have never been verified arriving in live analytics_events. The E2E trace covers this.
8. body-scan-analyze live edge function has a nonstandard entrypoint path (source/body-scan-analyze/index.ts per the 210d snapshot); repo and live should be reconciled during 210d function-parity work. Not walk-blocking.

## 6. Reference confirmations (Section 16)

Playwright present (config + dependency). My Biology hub = /body-tracker (Prompt 180 title), scan entry = Body Composition surface, avatar hosts there behind the WebGL gate. Capacitor config present (hosted-shell model pointing at production URL). BOS path = /api/bos/current SSOT. Via Cura engine = getOrComputeUserProtocolSynthesis behind /api/protocol/synthesis. The 171-series dashboards read helix and engagement tables, NOT analytics_events.
