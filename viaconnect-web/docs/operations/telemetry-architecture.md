# ViaConnect Telemetry Architecture (Prompt 171, reconciled)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect (Via Cura consumer brand). Owner agents: Arnold (Body Scan and Body Tracker), Sherlock (analytics aggregation), Gary (executive review cadence).
Status: RECONCILED FOUNDATION DOC, drafted 2026-06-01. Prompt 171 is a POST-LAUNCH operations and telemetry prompt (activation July 1, 2026). This document reconciles 171 to the REAL codebase: it records what the telemetry foundation actually is today, the seam where the external tools 171 proposes would attach, the full map of 171's phantom names to reality, and what is external operations, gated, or deferred. It is the authoritative reference for the launch-time build, so nothing in 171 is implemented against a name or surface that does not exist.

171 introduces no new product capability. It is the operational layer. Much of it (deploying SaaS monitoring, the on-call rotation, the 30, 60, and 90 day reviews, capture-failure analysis from real traffic) is genuinely post-launch and cannot be completed before there is a live launch and real traffic. This doc plus the review templates and the biometric-exclusion test are the pieces that are ready pre-launch.

## 1. The real telemetry foundation (already shipped, do not rebuild)

The data source 171 builds on already exists. 171 Section 1 says the events catalog was "locked in 169b Section 14 and renamed with the formavision_ prefix." The catalog is real and every event name carries the formavision_ prefix (the FormaVision brand for the body-scan surface).

- Events catalog: src/lib/body-tracker/scan-analytics.ts. A frozen TypeScript const FORMAVISION_EVENTS with 24 event names (formavision_dashboard_card_viewed, formavision_capture_started, formavision_capture_step_completed, formavision_quality_check_failed, formavision_processing_started, formavision_processing_completed, formavision_processing_failed, formavision_results_viewed, formavision_compare_used, formavision_pdf_export, formavision_premium_paywall_shown, formavision_premium_upgrade_completed, formavision_helix_event_emitted, and so on). The canonical type is FormaVisionEventName.
- PII and biometric guard: same file. THREE layers at a single emit() choke point:
  1. Allow-list: only 17 metadata keys may appear on any event payload (tier, is_premium, capture_mode, device_model, step_name, duration_seconds, latency_seconds, error_code, tab_name, scan_count, consent_version, model_improvement_opt_in, event_type, sku, trigger_point, requested_capability, for_audience, and a few flags).
  2. Block-list: a case-insensitive substring deny-list of biometric and health fragments (body_fat, lean_mass, fat_mass, ffmi, bmi, measurement, circumference, silhouette, avatar, landmark, photo, image_data, weight_kg, height_cm, waist, hip, chest, thigh, bicep, calf, disordered_eating, cycle_phase, biological_age, health_score, and more).
  3. Value guard: only primitives (string, number, boolean, null) pass; objects and arrays are dropped.
  Functions: isForbiddenBiometricKey, findBiometricKeys (deep nested scan), assertNoBiometric (throws in dev and test), sanitizeProperties (strips non-allowed, blocked, and non-primitive keys). sanitizeProperties runs before transport so production is fail-safe.
- Transport: the emit() choke point routes to an injected, swappable ScanAnalyticsTransport. The default is defaultTrackEvent from src/lib/analytics/track-events.ts, which writes to the Supabase analytics_events table (id, user_id, event, properties jsonb, timestamp, page, device, session_id). No external analytics provider is wired; the seam is explicitly built for a later swap.
- Analytics engines: src/lib/analytics/ already contains retention-engine, ltv-engine, cohort-engine, cohort-bucket-loader, cac-engine, payback-period, acquisition-attribution, archetype-engine, behavioral-refinement, snapshot-builder, variable-costs. These compute the retention, LTV, cohort, CAC, and funnel math 171 Sections 5 and 6 describe.
- Structured logging: src/lib/utils/safe-log.ts (debug, info, warn, error as JSON per line to Vercel logs), used by the edge functions and API routes. AI route auditing lives in src/lib/observability/ (audit-recorder to ai_route_audit, ai-pricing). Error taxonomy in src/lib/errors/classify-ai.ts.
- Admin dashboards: src/app/(app)/admin/ already has analytics (overview, cohorts, ltv, cac, snapshots, board-pack, marketing-spend, archetypes, alerts), compliance, alerts, exec-reporting, board, and flags (feature flags), all RLS-gated.

## 2. The biometric exclusion guarantee (171 Section 2.3 and 13)

171 Section 2.3 lists payload prohibitions (raw photos, silhouettes, avatar mesh, body fat percentages, lean and fat mass, measurements in cm, weight in kg, genetic data, CAQ health data, free text) and 171 Section 13 requires an automated test that asserts none of these reach the analytics payload. The guard in Section 1 already enforces every one of those prohibitions; the §13 acceptance is met by an automated test asserting the guard (see tests/body-tracker/scan-analytics-pii.test.ts, added with this doc). Because PostHog is not wired, the assertion is against the real transport (the analytics_events payload). When PostHog is later added, the same guard sits in front of it unchanged, so the guarantee carries over.

Session replay masking (171 Section 2.3) is a PostHog configuration concern and is deferred with PostHog itself (Section 5). There is no session replay today.

## 3. The vendor seam (where PostHog and Sentry attach later)

171's external tools attach at two existing seams without rewriting the foundation:
- Product analytics (PostHog): replace or augment the default ScanAnalyticsTransport in src/lib/analytics/track-events.ts. The biometric guard stays in front of it, so PostHog never receives a prohibited field. A posthog-client wrapper would be a new transport, not a new pipeline.
- Error tracking (Sentry): wrap or extend src/lib/utils/safe-log.ts (and add a client error boundary) to forward errors. Today errors are local (safe-log to Vercel, classify-ai taxonomy).

BLOCKER: PostHog and Sentry SDKs are NOT installed (zero references in package.json or code). Adding posthog-js, posthog-node, or any Sentry SDK is a package.json change, which is locked and requires Gary's approval (171 Section 14). Until approved, the seam stays documented but unwired.

## 4. Phantom to real reconciliation

| 171 reference | Reality |
|---|---|
| formavision_ event prefix | formavision_ prefix (24 events in scan-analytics.ts) |
| formavision-process, formavision-finalize, formavision-compare, formavision-export edge functions | Do not exist. Real: body-scan-analyze (ephemeral Vision flow) and body-scan-export (PDF). The PRIMARY scan path is client-side runScanAnalysis and calls NO edge function, so per-edge-function latency panels (171 Section 3.1) mostly do not apply; the client emits formavision_processing_completed with latency_seconds instead |
| Composition CNN inference telemetry | No CNN. Phase 1 is MediaPipe Pose Lite landmarks plus Navy and CUN-BAE math; the avatar is a parametric mesh. CNN is Phase 2 (gate B, unmet) |
| iOS and Android BodyScanDepth plugin telemetry, depth frame capture, Tier 2 | No depth plugins. depth_sensor_type is logged as none in body_scan_tier_log; Tier resolves to 1 only. Depth is Phase 2 (gate C, unmet) |
| body_scan_quality as the quality source of truth | Canonical quality is on body_photo_sessions (scan_quality_score, quality_issues). body_scan_quality is a supplementary 1:1 child table with the six sub-scores (lighting, pose, clothing, bgClutter, cameraLevel, frameCoverage) |
| formavision_quality_check_failed event (171 Section 4.1) | Real event is formavision_quality_check_failed (formavision_ catalog). The Section 4.1 failure taxonomy maps onto that event plus the body_scan_quality sub-scores |
| Platinum Plus | The real tier slug is platinum_family (169f). Tiers: free, gold, platinum, platinum_family |
| Helix event emitted server-side from an edge function (171 Section 2.2) | Helix events fire from a DB trigger on body_photo_sessions.scan_status to complete, not from code |
| src/services/telemetry/ and src/modules/operations/ | Neither src/services nor src/modules exists. Real homes: src/lib/ (shared logic, e.g. src/lib/telemetry/ if a wrapper is added), src/hooks/, src/components/, src/app/(app)/admin/ for dashboard surfaces, supabase/functions/ for edge functions |
| infrastructure/ at repo root | Does not exist. Tool config (PostHog, Sentry, Better Uptime) would be a new directory, created only when those tools are adopted |

## 5. External operations and Gary decisions (not codeable here)

These are SaaS deployments and organizational process, not codebase work, and several are 171 Section 15 decisions:
- PostHog (product analytics): Cloud EU vs self-hosted (Section 15.1). Recommendation per 171: Cloud EU at launch. Needs the package.json SDK approval (Section 3).
- Sentry (error tracking): project setup, source maps, SDK approval.
- Metabase (BI dashboards querying Supabase): deployment; the SQL query library would live in a new infrastructure/ or docs/operations/ path.
- App store reviews: AppFollow vs Appbot vs the free console tools (Section 15.2).
- Better Uptime or Healthchecks (uptime, status page); Help Scout (support and in-app feedback); PagerDuty or Opsgenie (alerting and on-call).
- On-call rotation participants (Section 15.3) and the §9.2 launch metrics targets (Section 15.4) are Gary's to set; the targets in the review templates are marked as estimates to confirm.
- Dr. Fadi Dagher Safety Dashboard access (Section 15.5): naming a specific person with a clinical role and granting dashboard access needs Gary's explicit confirmation per the standing attribution rule; until confirmed, the Safety Dashboard audience is described by role, not by name.

## 6. The five dashboards mapped to what exists

171 Section 3 specifies five dashboards. Most map onto existing admin surfaces; the gaps are the parts that need the external tools.
- Product and Business: largely covered by /admin/analytics and /admin/exec-reporting plus the analytics engines; the tier-mix, funnel, retention, and LTV math already exists. Metabase would add the BI presentation layer.
- Compliance: /admin/compliance exists; the consent, deletion, retention, geo, and age-gate panels map to real tables (biometric_consents, the age gate in the finalize trigger, the inclusivity waitlist).
- Engineering: the system-health, latency, and error panels need Sentry plus an uptime tool; the capture-flow funnel and capture-failure panels map to the real formavision_ events and the body_scan_quality scores. The edge-function latency panels need instrumentation only on body-scan-analyze and body-scan-export (the client path emits its own latency).
- Safety and Clinical: the safeguard, frequency-limiter, numbers-optional, and inclusivity panels map to the real 169b mechanisms; the audience naming is a Gary decision (Section 5).

## 7. Deferred (tracks features that do not exist yet)

Hold until the underlying feature ships, so telemetry never reports on a phantom: depth plugin success and crash telemetry, depth frame capture failures, Tier 2 capture metrics, Composition CNN inference latency and failure, and any formavision-* edge-function latency. All are Phase 2, behind gates A, B, and C (see docs/formavision/phase-2/). When Phase 2 lands, add their telemetry against the real names then in place.

## 8. What is built pre-launch with this prompt

Reconciled, unblocked, no SDK and no SaaS:
- tests/body-tracker/scan-analytics-pii.test.ts: the §13 biometric-exclusion acceptance test against the real guard.
- This telemetry-architecture doc.
- The review-cadence scaffolding: docs/operations/post-launch-review-30-day-template.md, -60-day, -90-day; docs/operations/customer-voice-template.md; docs/operations/funnel-optimization-log.md. All reconciled to formavision_ event names and the real tiers, with the §9.2 metric targets flagged as Gary-to-confirm estimates.

Everything else in 171 (the SDK wrappers, the dashboard embeds, the telemetry relay edge function, the on-call playbooks tied to live alert thresholds, the SaaS deployments, and the running of the reviews) is launch-time work that depends on the Section 5 decisions, the package.json approval, and real traffic.
