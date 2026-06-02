# Sev 1: Biometric Deletion Failure (on-call playbook)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.

Status: RECONCILED PLAYBOOK, drafted 2026-06-01 (Prompt 171 Sections 8.2, 8.3). Reconciled to the real Body Scan data model per docs/operations/telemetry-architecture.md.

NOTE ON ALERTING: the alerting layer (PagerDuty or Opsgenie plus Sentry plus Better Uptime) is NOT deployed yet. The thresholds below are the SPEC to configure at launch; until then deletion-request status is watched manually via /admin/compliance and Vercel logs.

## Alert and threshold (Section 8.2)

- Trigger: a user (or practitioner-managed patient) biometric or account deletion request is not completing, so biometric-derived data is retained past the deletion SLA.
- Threshold (spec to configure): any deletion request exceeding the Section 8.2 deletion SLA, or a deletion job erroring. Configure the exact SLA and the alert when the pager is wired. Treat this as Sev 1 because it is a privacy and regulatory obligation, not a convenience.
- Severity: Sev 1.

## Real data model (what must be deleted)

Body Scan is biometric-adjacent but does NOT store raw photos. The ephemeral path (body-scan-analyze) streams the 4 photos to Vision and DISCARDS them; only derived estimates persist. The data that a deletion must cover:

- body_photo_sessions (the per-scan row; canonical scan_quality_score, quality_issues, finalize stamps, clinical_override_reason, model_versions).
- body_tracker_photo_scans (the ephemeral-path estimates row).
- The supplementary child tables keyed to body_photo_sessions.id: body_scan_quality (the six sub-scores), body_scan_composition, body_scan_tier_log, body_scan_measurements, body_scan_personal_baselines.
- biometric_consents (consent records).
- Any analytics_events rows are METADATA ONLY by construction (the scan-analytics.ts guard blocks every biometric and health value), so they carry no biometric payload; still include them per the deletion policy scope.

The disordered-eating response lives only on the user's own profile and is never copied elsewhere; deleting the profile data removes it.

## Typical causes

- A deletion job erroring on a child table (a foreign-key dependency or a row missed because the child tables key off body_photo_sessions.id).
- A partial delete: the session row removed but a child table (for example body_scan_quality) left behind.
- A practitioner-managed patient's scan not being included because it is stamped under the patient subject, not the caller.
- A deletion request stuck in the queue (job not running, or a permissions error under service_role).

## Triage steps (reconciled to the real system)

1. Locate the request in /admin/compliance and confirm its state and age against the SLA.
2. Identify the subject: a consumer self-scan keys on the user; a practitioner-managed scan is stamped on body_photo_sessions for the patient subject (premium_status_at_scan = practitioner_managed, practitioner_id set). Make sure the deletion targets the SUBJECT's rows.
3. Verify cascade coverage: confirm every table above is cleared for the subject. The child tables (body_scan_quality, body_scan_composition, body_scan_tier_log, body_scan_measurements, body_scan_personal_baselines) reference body_photo_sessions.id; a delete must cover them, not just the parent.
4. Read the logs: deletion paths log via safe-log structured logging to Vercel. Look for the erroring table or the failed row.
5. Confirm no raw biometric media exists to delete from storage for the ephemeral path (it never stored photos); if any stored-photo path is in scope, confirm the bucket objects are removed too.
6. Re-run or complete the deletion, then verify zero residual rows for the subject across the listed tables.

## Escalation (Section 8.3)

- First responder: engineering on-call (role), with the compliance owner (role) looped in immediately given the privacy obligation.
- Escalation point: Gary (per Section 8.3) for any deletion that cannot be completed within the SLA, any regulatory-notification question, and any customer communication.
- Record the subject, the tables verified, and the timeline for the post-incident review.

## Post-incident review

File a post-incident review using the template in docs/operations/incidents/ (create that directory at launch if it does not exist yet). Include the deletion-coverage verification (every table cleared), the root cause, and any process change to prevent partial deletes.
