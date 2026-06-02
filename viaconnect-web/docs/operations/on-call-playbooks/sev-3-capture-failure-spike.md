# Sev 3: Capture Failure Spike (on-call playbook)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.

Status: RECONCILED PLAYBOOK, drafted 2026-06-01 (Prompt 171 Sections 8.2, 8.3, 4.1). Reconciled to the real quality_check_failed event and the body_scan_quality sub-scores per docs/operations/telemetry-architecture.md.

NOTE ON ALERTING: the alerting layer (PagerDuty or Opsgenie plus Sentry plus Better Uptime) is NOT deployed yet. The thresholds below are the SPEC to configure at launch; until then the capture-failure rate is watched manually via the body_scan_ events in analytics_events and the Engineering Dashboard (docs/operations/dashboards/engineering-dashboard-spec.md).

## Alert and threshold (Section 8.2)

- Trigger: the capture quality-check failure rate spikes, so users cannot get past capture into processing.
- Threshold (spec to configure): quality_check_failed over capture_started breaches the Section 8.2 capture-failure threshold over a rolling window. Configure the exact value when the pager is wired.
- Severity: Sev 3 (degraded capture experience; no outage, and processing for users who pass is unaffected).

## Real capture-failure signal

- Event: quality_check_failed (body_scan_ catalog). error_code is the COARSE reason category, never a measured value.
- Sub-scores: the six body_scan_quality sub-scores give the underlying detail: lighting, pose, clothing, bgClutter, cameraLevel, frameCoverage. Canonical quality headline (scan_quality_score, quality_issues) is on body_photo_sessions.
- Blocking vs advisory split: defined by aggregateQualityScores in src/lib/body-tracker/scan-quality.ts. Lighting, pose, clothing, cameraLevel, and frameCoverage are BLOCKING; bgClutter is ADVISORY only and never blocks capture.

## Section 4.1 taxonomy (the buckets to break the spike down by)

| Taxonomy bucket | quality_check_failed.error_code (coarse) | body_scan_quality sub-score | Blocking or advisory |
| --- | --- | --- | --- |
| Lighting out of range | lighting | lighting | Blocking |
| Pose deviation too high | pose | pose | Blocking |
| Clothing fit out of range | clothing | clothing | Blocking |
| Camera not level | framing (camera) | cameraLevel | Blocking |
| Body not fully in frame | framing (coverage) | frameCoverage | Blocking |
| High background clutter | clutter | bgClutter | Advisory (does NOT block; not part of the failure rate) |

There is NO depth-frame or sensor-failure bucket. Depth does not exist in Phase 1; if a depth or Tier 2 capture failure is suspected, that is DEFERRED (Phase 2, gate C; see docs/formavision/phase-2-dependency-gates.md), not a live cause.

## Typical causes

- A single category dominating: for example a lighting or framing spike, often environmental or a UX/guidance regression.
- A release that changed the scan-quality thresholds (src/lib/body-tracker/scan-constants.ts) or the capture UI, tightening a gate.
- A device or capture-mode specific issue (slice by device_model and capture_mode, both allowed metadata on capture_started).
- A MediaPipe Pose Lite landmark-quality issue feeding pose or frame-coverage scoring.

## Triage steps (reconciled to the real system)

1. Confirm the spike: quality_check_failed over capture_started above the threshold over the window.
2. Break down by error_code: identify the dominant failing category from the Section 4.1 table.
3. Pull the matching sub-score: for the dominant category, look at the body_scan_quality sub-score distribution and its pass-rate to confirm the underlying detail.
4. Exclude advisory clutter: bgClutter is advisory and never blocks; do not count it in the failure rate. A clutter-only rise is informational.
5. Slice by device and mode: check whether the spike is concentrated on a device_model or capture_mode.
6. Check for a release: if a deploy changed scan-constants.ts thresholds or the capture flow, that is the likely cause. Do NOT change a threshold without sign-off; thresholds are clinical/UX-governed.
7. If the dominant cause is a guidance gap (users repeatedly failing one gate), route to product as a capture-guidance improvement rather than an engineering rollback, unless a release regressed it.

## Escalation (Section 8.3)

- First responder: engineering on-call (role), with product looped in for a guidance-driven spike.
- Escalation point: Gary (per Section 8.3) if a threshold change is proposed (clinical/UX sign-off), or if the spike persists and blocks activation.
- Record the dominant error_code and timeline for the post-incident review.

## Post-incident review

File a post-incident review using the template in docs/operations/incidents/ (create that directory at launch if it does not exist yet). Capture the dominant failure category, the root cause (environmental, release, or device), and the fix or guidance change.
