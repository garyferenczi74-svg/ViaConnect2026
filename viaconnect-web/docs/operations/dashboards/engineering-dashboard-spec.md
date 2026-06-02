# Engineering Dashboard Spec (Prompt 171 Section 3.1, reconciled)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura. Tagline: Built For Your Biology.

Status: RECONCILED SPEC, drafted 2026-06-01. This transcribes the Prompt 171 Section 3.1 panel list and the Section 4 capture-failure analysis framework, then reconciles EVERY panel to the real codebase per docs/operations/telemetry-architecture.md. Phantom panels (Composition CNN, depth plugins, depth frames, Tier 2, formavision_* edge functions) are marked DEFERRED, not drawn as live panels.

- Audience: engineering on-call and the platform owner.
- Refresh cadence: near real time for system health and error panels (1 to 5 minute auto refresh); hourly for the capture-flow funnel; daily for the trend rollups.
- Tool: Metabase (BI layer over Supabase) for the funnel and rollup panels; Sentry plus an uptime tool (Better Uptime) for the health, error, and uptime panels. NONE of these is deployed yet. Until they are, the funnel and error panels are read from the Supabase analytics_events table and src/lib/utils/safe-log.ts (Vercel logs), and the uptime and exception panels have no source. Adopting the SaaS tools and their SDKs is a Gary decision plus a package.json approval (171 Section 14, 15.1).
- Existing admin surfaces: /admin/alerts and /admin/analytics/alerts already exist (RLS gated) and are the nearest live home for the alerting and error-rollup panels until Sentry lands.

## Real foundation this dashboard reads

- Events: src/lib/body-tracker/scan-analytics.ts, the frozen formavision_ catalog (24 events). The capture-flow funnel and the failure panels are built from these. The event prefix is formavision_.
- Primary scan path: the client-side runScanAnalysis pipeline. It calls NO edge function and emits formavision_processing_started, then formavision_processing_completed with latency_seconds (or formavision_processing_failed with error_code) itself. So latency for the primary path is a client metric, not an edge-function metric.
- Edge functions that exist: body-scan-analyze (the ephemeral 4-photo Vision path) and body-scan-export (the PDF). These are the ONLY two scan edge functions. They use safe-log structured logging (one JSON line per event to Vercel) with stage fields and a circuit breaker on the Vision call.
- Quality data: canonical on body_photo_sessions (scan_quality_score, quality_issues). Sub-scores live in the supplementary body_scan_quality table (lighting, pose, clothing, bgClutter, cameraLevel, frameCoverage). The capture-failure event is formavision_quality_check_failed.

## Section 3.1 panels (reconciled)

| 171 panel | Reconciled mapping | Source | Status |
| --- | --- | --- | --- |
| System health / uptime | Overall app and Supabase availability | uptime tool (Better Uptime); not deployed | NEEDS TOOL (no source until adopted) |
| API latency p50 to p99 | App route latency | Vercel logs / Sentry performance; not deployed | NEEDS TOOL |
| Edge-function latency (per function) | body-scan-analyze and body-scan-export ONLY. Instrument these two; the primary scan path is client-side runScanAnalysis and emits its own latency, so it is NOT an edge-function panel | safe-log lines from the two functions; Sentry once wired | RECONCILED (two functions only) |
| formavision-process / finalize / compare / export latency | These functions DO NOT EXIST | n/a | DEFERRED: feature not built (the FormaVision rebrand is not in code; real functions are the two above) |
| Composition CNN inference latency / failure | No CNN in Phase 1 (MediaPipe Pose Lite plus Navy and CUN-BAE math) | n/a | DEFERRED: feature not built (Phase 2, gate B; see docs/formavision/phase-2-dependency-gates.md) |
| Depth-plugin success / crash telemetry | No native depth plugins; depth_sensor_type is always none | n/a | DEFERRED: feature not built (Phase 2, gate C) |
| Depth-frame capture failure rate | No depth capture path | n/a | DEFERRED: feature not built (Phase 2, gate C) |
| Tier 2 capture metrics | resolveScanTier returns Tier 1 unconditionally; Tier resolves to 1 only | n/a | DEFERRED: feature not built (Phase 2, gate C) |
| Client processing latency (scan) | formavision_processing_completed latency_seconds (p50 to p99), split by success vs formavision_processing_failed | analytics_events (formavision_) | RECONCILED |
| Capture-flow funnel | formavision_capture_started to formavision_capture_step_completed to formavision_processing_started to formavision_processing_completed to formavision_results_viewed, with formavision_capture_abandoned and formavision_capture_retake as drop and friction signals | analytics_events (formavision_) | RECONCILED |
| Error rate / top error codes | formavision_processing_failed.error_code (coarse: no_photos, rate_limited, transient, and so on) plus safe-log error lines from the two edge functions | analytics_events + Vercel logs; Sentry once wired | RECONCILED (Sentry adds exception grouping) |
| Vision dependency health | body-scan-analyze circuit-breaker state (claude-vision breaker open / closed) and the 502 / 503 / 504 mix (breaker open, timeout, anthropic error) | safe-log lines (breaker open, timeout, failed) | RECONCILED |
| Vision egress / cost | total_base64_bytes per scan logged pre-call by body-scan-analyze | safe-log egress lines | RECONCILED |
| Database write health | body_tracker_photo_scans insert failures and body_photo_sessions finalize failures (the finalize trigger path) | safe-log lines (insert failed, session finalize failed) | RECONCILED |

Note on latency notation: report all latency panels as p50 to p99. Do not mix in an edge-function latency for the primary scan path; that path is client-side and self-reports latency_seconds.

## Section 4: capture-failure analysis framework (reconciled)

171 Section 4 specifies a capture-failure taxonomy and action triggers. Reconciled, the failure signal is the formavision_quality_check_failed event (formavision_ catalog), whose error_code is the COARSE reason category, cross-referenced with the six body_scan_quality sub-scores for the underlying detail. The blocking-vs-advisory split is defined by aggregateQualityScores in src/lib/body-tracker/scan-quality.ts.

### 4.1 Failure taxonomy (reconciled to formavision_quality_check_failed.error_code plus body_scan_quality sub-scores)

| 171 taxonomy bucket | formavision_quality_check_failed.error_code (coarse) | body_scan_quality sub-score | Blocking or advisory |
| --- | --- | --- | --- |
| Lighting out of range | lighting | lighting (scoreLighting: mean luminance and std-dev band) | Blocking |
| Pose deviation too high | pose | pose (scorePose: avg and max joint deviation vs A-pose) | Blocking |
| Clothing fit out of range | clothing | clothing (scoreClothingTightness: silhouette-to-body area ratio) | Blocking |
| Camera not level | framing (camera) | cameraLevel (scoreCameraLevel: device pitch) | Blocking |
| Body not fully in frame | framing (coverage) | frameCoverage (scoreFrameCoverage: head crown and feet inside margins) | Blocking |
| High background clutter | clutter | bgClutter (scoreBackgroundClutter: edge density outside person) | Advisory only (does NOT block capture; routes to advisoryNotes, never blockingIssues) |

Panel guidance: show the formavision_quality_check_failed rate over formavision_capture_started as the headline, then break it down by error_code. For depth detail, pull the matching body_scan_quality sub-score distribution for the failing category. There is NO depth-frame or sensor failure bucket; depth does not exist in Phase 1 (mark any such request DEFERRED, Phase 2 gate C).

### 4.2 Sub-score distributions

For each of the six sub-scores, plot the distribution and the pass-rate (the per-scorer pass flag). bgClutter is advisory: track it, but never count it against the blocking failure rate. Quality headline numbers (scan_quality_score, quality_issues) are canonical on body_photo_sessions; the six sub-scores come from body_scan_quality.

### 4.3 Device and mode slices

Slice the failure taxonomy by capture_mode and device_model (both allowed metadata on formavision_capture_started). Do NOT slice by depth_sensor_type beyond confirming it is none for every scan; a non-none value would itself be an anomaly to investigate (it should not occur in Phase 1).

### 4.4 Action triggers (171 Section 4.4, reconciled)

Each trigger fires off the reconciled metrics above. Thresholds here are the SPEC to configure at launch; the alerting layer (PagerDuty / Opsgenie plus Sentry plus Better Uptime) is not deployed yet, so these are wired by hand into the alert config when those tools land. The 171 Section 8.2 thresholds are the source of truth and are restated in the on-call playbooks.

| Trigger | Condition (reconciled metric) | Action |
| --- | --- | --- |
| Capture-failure spike | formavision_quality_check_failed over formavision_capture_started exceeds the Section 8.2 threshold over a rolling window | Open the Sev 3 capture-failure playbook (docs/operations/on-call-playbooks/sev-3-capture-failure-spike.md); identify the dominant error_code; check whether a recent release changed the scan-quality thresholds (scan-constants.ts) or the capture UI |
| Single failure category dominates | one error_code is the majority of failures (for example lighting) and its sub-score pass-rate drops | Investigate the matching scorer and its threshold; consider a guidance copy or UX nudge change (no threshold change without sign-off) |
| Processing-failure spike | formavision_processing_failed over formavision_processing_started exceeds the Section 8.2 elevated-error threshold | Open the Sev 2 elevated-errors playbook; check the body-scan-analyze breaker state and the Vision dependency (502 / 503 / 504 mix) |
| Vision dependency degraded | claude-vision breaker open lines appear, or the 503 / 504 rate climbs | Treat as a dependency incident; the client path also fails when Vision is down. See the Sev 2 Body Scan path playbook |
| Advisory clutter climbing | bgClutter advisory rate rises sharply | Informational only; never page. Note for the product team as a capture-environment signal |

## Open items / ambiguities

- Uptime, API latency, and exception grouping have NO data source until Better Uptime and Sentry are adopted (Gary decision plus package.json approval). Marked NEEDS TOOL above, not invented.
- The two real edge functions need explicit latency instrumentation to populate the per-function latency panel; today they log stage lines via safe-log but do not emit a duration metric. This is launch-time instrumentation, not a data source that already exists.
