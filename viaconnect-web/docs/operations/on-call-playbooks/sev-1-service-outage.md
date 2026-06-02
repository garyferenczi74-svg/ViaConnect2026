# Sev 1: Service Outage (on-call playbook)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.

Status: RECONCILED PLAYBOOK, drafted 2026-06-01 (Prompt 171 Sections 8.2, 8.3). Reconciled to the real system per docs/operations/telemetry-architecture.md.

NOTE ON ALERTING: the alerting layer (PagerDuty or Opsgenie plus Sentry plus Better Uptime) is NOT deployed yet. The thresholds below are the SPEC to configure into that layer at launch; until then they are watched manually via the existing surfaces (Vercel logs, /admin/alerts, the Supabase dashboard).

## Alert and threshold (Section 8.2)

- Trigger: the app or its core dependency (Supabase, Vercel) is unreachable or returning errors for substantially all users.
- Threshold (spec to configure): availability drops below the Section 8.2 Sev 1 uptime floor, or the health check fails continuously past the Section 8.2 outage window. Configure these exact values into Better Uptime and the pager when adopted.
- Severity: Sev 1.

## Typical causes

- Vercel deployment or platform incident (bad release, build/runtime failure on the latest deploy).
- Supabase outage or connection exhaustion (database unreachable, connection pool saturated).
- An expired or rotated secret breaking auth or the database connection.
- A regional CDN or DNS issue.

## Triage steps (reconciled to the real system)

1. Confirm scope: is it all routes or one surface? Check the Vercel deployment status and the Supabase project status first.
2. Read the structured logs: src/lib/utils/safe-log.ts writes one JSON line per event to Vercel logs (info, warn, error). Filter for error lines and recent deploy correlation.
3. Check the last deploy: if a release immediately precedes the outage, roll back the Vercel deployment to the previous good build before deeper debugging.
4. Check Supabase health: connection errors, RLS or migration issues, pool saturation. The analytics_events table writes are non-blocking by design, so analytics outages do not take down the app; an app-wide outage points at auth, the database connection, or the platform.
5. Verify secrets: a rotated SUPABASE_SERVICE_ROLE_KEY, ANON_KEY, or ANTHROPIC_API_KEY can break core paths. body-scan-analyze returns 503 vision unavailable when ANTHROPIC_API_KEY is missing, which is a feature-level symptom, not an app outage; an app outage is broader.
6. If the outage is the platform (Vercel or Supabase), confirm via their status pages and move to communication while monitoring recovery.

## Escalation (Section 8.3)

- First responder: engineering on-call (role).
- Escalation point: Gary (per Section 8.3) for any Sev 1 that is not resolving within the playbook, any data-loss risk, or any customer-communication decision.
- Keep the incident channel updated at each step; record the timeline for the post-incident review.

## Post-incident review

File a post-incident review using the template in docs/operations/incidents/ (create that directory at launch if it does not exist yet). Capture the timeline, the root cause, the rollback or fix, and the follow-up actions.
