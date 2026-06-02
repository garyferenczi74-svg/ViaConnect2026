# Sev 2: Body Scan Path Down (on-call playbook)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.

Status: RECONCILED PLAYBOOK, drafted 2026-06-01 (Prompt 171 Sections 8.2, 8.3). 171 calls this "FormaVision down"; FormaVision is the brand for the body-scan surface and is carried on the analytics event names (formavision_ prefix), but the service, routes, and tables are still named Body Scan in code. Reconciled to the REAL Body Scan path per docs/operations/telemetry-architecture.md.

NOTE ON ALERTING: the alerting layer (PagerDuty or Opsgenie plus Sentry plus Better Uptime) is NOT deployed yet. The thresholds below are the SPEC to configure at launch; until then this is watched manually via Vercel logs and the formavision_ events in analytics_events.

## What "Body Scan down" actually means (reconciled)

There is no FormaVision service and there are no formavision-process / finalize / compare / export functions. The real Body Scan path has two parts:

1. The PRIMARY path: the client-side runScanAnalysis pipeline. It runs MediaPipe Pose Lite landmarks plus Navy and CUN-BAE math in the browser, calls NO edge function, finalizes the scan via a direct client UPDATE to body_photo_sessions (scan_status to complete), and emits formavision_processing_started then formavision_processing_completed with latency_seconds (or formavision_processing_failed) itself.
2. The finalize trigger: the body_photo_sessions finalize trigger re-derives the age gate, the 24h frequency limit, and entitlement in-database whenever scan_status goes to complete, and the transition to complete fires the Helix DB trigger. This trigger covers EVERY writer, including the primary client path.
3. The ephemeral edge path: body-scan-analyze (the 4-photo Claude Vision analyzer, with a circuit breaker on the Vision call) and body-scan-export (the PDF). These exist; the primary client path does not depend on body-scan-analyze for the in-app scan.

So "Body Scan down" is one or more of: the client pipeline failing for users, the finalize trigger rejecting or erroring, or body-scan-analyze / Vision being unavailable.

## Alert and threshold (Section 8.2)

- Trigger: scans are failing to complete for a meaningful share of users.
- Threshold (spec to configure): formavision_processing_failed over formavision_processing_started breaches the Section 8.2 Body Scan failure threshold, or formavision_processing_completed drops sharply while formavision_capture_started holds. Configure the exact values when the pager is wired.
- Severity: Sev 2 (a core feature degraded; the rest of the app is up).

## Typical causes

- Vision dependency down: body-scan-analyze returns 503 (breaker open or ANTHROPIC_API_KEY missing), 504 (timeout), or 502 (anthropic error or a compliance-guardrail block). The claude-vision circuit breaker opens under sustained failure.
- The finalize trigger rejecting: a proven minor, the 24h frequency limit, or a non-entitled (non-Platinum) user is correctly rejected (these are NOT incidents). An incident is the trigger erroring for ENTITLED adult users.
- A client-side regression in runScanAnalysis (a bad release breaking the MediaPipe or math pipeline) so formavision_processing_failed climbs with a client error_code.
- A database write failure on the body_photo_sessions finalize UPDATE or the body_tracker_photo_scans insert.

## Triage steps (reconciled to the real system)

1. Confirm the failing stage from the events: is the drop at formavision_processing_started (capture works, processing does not) or earlier? Compare formavision_processing_completed vs formavision_processing_failed and read formavision_processing_failed.error_code.
2. Check the Vision dependency: read body-scan-analyze safe-log lines for breaker open, timeout, and failed, and the 502 / 503 / 504 mix. If the breaker is open or ANTHROPIC_API_KEY is missing, Vision is the cause. Note the BAA requirement on the Anthropic egress is a launch prerequisite (owner: Gary).
3. Distinguish correct rejections from failures: age-gate (403 age_restricted), frequency (429 scan_rate_limited), and entitlement (402 premium_required) rejections are BY DESIGN. Filter these out; an incident is failures for entitled adult users.
4. Check the finalize trigger path: look for session finalize failed lines and for body_photo_sessions UPDATE errors. The finalize is idempotent (it no-ops when already complete), so a replay is not the cause.
5. Check for a recent release: a client regression in runScanAnalysis shows as a spike in client-side formavision_processing_failed right after a deploy. Roll back the Vercel deployment if a release correlates.
6. Check the database: a body_tracker_photo_scans insert failure or a body_photo_sessions finalize failure points at the database, not Vision.
7. Confirm Tier is 1 everywhere: depth_sensor_type should be none and tier should resolve to 1. A non-1 tier or a non-none sensor would itself be anomalous (Phase 1 pins Tier to 1).

## Escalation (Section 8.3)

- First responder: engineering on-call (role).
- Escalation point: Gary (per Section 8.3) if the feature stays degraded, if the Vision BAA or key is implicated, or if a customer-facing message is needed.
- Record the failing stage and timeline for the post-incident review.

## Post-incident review

File a post-incident review using the template in docs/operations/incidents/ (create that directory at launch if it does not exist yet). Capture which stage failed (client pipeline, finalize trigger, or Vision), the root cause, and the fix or rollback.
