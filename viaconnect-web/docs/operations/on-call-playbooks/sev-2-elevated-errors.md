# Sev 2: Elevated Errors (on-call playbook)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.

Status: RECONCILED PLAYBOOK, drafted 2026-06-01 (Prompt 171 Sections 8.2, 8.3). Reconciled to the real logging and error-taxonomy surfaces per docs/operations/telemetry-architecture.md.

NOTE ON ALERTING: the alerting layer (PagerDuty or Opsgenie plus Sentry plus Better Uptime) is NOT deployed yet. The thresholds below are the SPEC to configure at launch; until then errors are watched manually via Vercel logs (safe-log) and /admin/alerts. Sentry, once adopted, adds exception grouping; until then there is no exception aggregator.

## Alert and threshold (Section 8.2)

- Trigger: the overall error rate (across app routes, the two scan edge functions, or a specific surface) rises above normal without a full outage.
- Threshold (spec to configure): error rate breaches the Section 8.2 elevated-error threshold over a rolling window. Configure the exact value when Sentry and the pager are wired.
- Severity: Sev 2 (degraded, not down).

## Real error surfaces

- Structured logging: src/lib/utils/safe-log.ts (debug, info, warn, error as one JSON line per event to Vercel), used by the API routes and the two scan edge functions (body-scan-analyze, body-scan-export) via supabase/functions/_shared/safe-log.ts.
- Error taxonomy: src/lib/errors/classify-ai.ts classifies AI-route errors; AI route auditing lives in src/lib/observability/ (audit-recorder to ai_route_audit).
- Scan error signal: formavision_processing_failed.error_code (coarse: no_photos, rate_limited, transient, and so on) in analytics_events (formavision_ catalog).
- Edge-function error signals: body-scan-analyze logs breaker open, timeout, failed, guardrail blocked, insert failed, session finalize failed; the HTTP status mix (402, 403, 429, 500, 502, 503, 504) is itself a signal.

## Typical causes

- A bad release introducing a regression on one route or component.
- A dependency degraded: Claude Vision (body-scan-analyze breaker open or timeouts), or another upstream API.
- Database pressure: slow queries, pool contention, or a migration-related error.
- A spike in correctly-rejected requests that LOOKS like errors but is by design (age-gate 403, frequency 429, entitlement 402). These must be filtered out before declaring an incident.
- A client error boundary firing on a specific surface.

## Triage steps (reconciled to the real system)

1. Scope it: is the elevation app-wide or one surface (a route, the scan path, the export)? Use the Vercel log volume by route and the safe-log error lines.
2. Group the errors: read the safe-log error and warn lines and, for AI routes, the classify-ai taxonomy and the ai_route_audit records. Identify the dominant error class.
3. Separate by-design rejections: exclude the entitlement (402), age-gate (403), and frequency (429) rejections; these are intended. The incident is the unintended 500 / 502 / 503 / 504 class and client errors.
4. Check dependencies: if scan errors dominate, read body-scan-analyze breaker open and timeout lines and the Vision status (see the Sev 2 Body Scan path playbook).
5. Correlate with deploys: if the elevation starts right after a release, roll back the Vercel deployment.
6. Check the database: slow-query or pool errors point at database pressure; correlate with the affected routes.
7. Decide severity: if it crosses into substantially-all-users, escalate to Sev 1 and switch to the service-outage playbook.

## Escalation (Section 8.3)

- First responder: engineering on-call (role).
- Escalation point: Gary (per Section 8.3) if the error rate keeps climbing, if it escalates to Sev 1, or if customer communication is needed.
- Record the dominant error class and timeline for the post-incident review.

## Post-incident review

File a post-incident review using the template in docs/operations/incidents/ (create that directory at launch if it does not exist yet). Capture the error class, the root cause, and the rollback or fix.
