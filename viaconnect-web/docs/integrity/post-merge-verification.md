# Post-Merge Verification: 210d/210f (commit e2493e85)

Date: 2026-07-09 (UTC). Performed against Supabase project nnhkcufyqjojdbvdrpky and the
production site https://www.viaconnectapp.com after the 210d/210f merge was pushed to main
(Vercel auto-deploys production).

## Motion 1: Drift-adopted Edge Function redeploys

The five drift-adopted functions were redeployed from the merged repo code in
supabase/functions/, each bundled with every _shared module its entrypoint imports
(schema-drift.ts transitively requires safe-log.ts). The deployed bundle preserves the
repo-relative layout (entrypoint at FUNCTION_NAME/index.ts with _shared/ as a sibling)
so the ../_shared/ imports resolve. verify_jwt matches each function's prior deployment.

| Function | New version | verify_jwt | Bundled _shared files | Result |
|---|---|---|---|---|
| body-scan-analyze | 2 | true | with-timeout, safe-log, circuit-breaker, schema-drift | DEPLOYED (ACTIVE) |
| arnold-vision-analyze | 2 | true | with-timeout, safe-log, circuit-breaker, schema-drift | DEPLOYED (ACTIVE) |
| ingest-body-composition | 3 | true | schema-drift, safe-log | DEPLOYED (ACTIVE) |
| nutrition-insights-daily | 2 | false (pg_cron relay) | schema-drift, safe-log | DEPLOYED (ACTIVE) |
| nutrition-insights-weekly | 2 | false (pg_cron relay) | schema-drift, safe-log | DEPLOYED (ACTIVE) |

practitioner-waitlist-mailer was NOT deployed. Arming the mailer is Gary-gated and out of
scope for this pass.

## Motion 2: F3 live waitlist form verification (210f Section 3.1)

Test submission POSTed to https://www.viaconnectapp.com/api/waitlist/practitioner with a
schema-valid payload using obviously-internal test data
(email test-210f-verification@farmceuticawellness.com, name "Test Verification",
credentialType/primaryClinicalFocus/referralSource all "other").

- POST result: HTTP 201 {"success":true} on the FIRST attempt. No retries needed; the
  merged deploy was already live. The pre-merge 500 behavior is gone.
- practitioner_waitlist: 1 row for the test address, created_at 2026-07-09 05:55:49 UTC.
- practitioner_email_queue: 1 step-1 row enqueued by the AFTER INSERT trigger for that
  waitlist row, status "pending".
- Nothing sent: 0 rows with status "sent" and 0 with status "sending" across the entire
  practitioner_email_queue table. The mailer cron remains unarmed.

## Test-row neutralization

The test row was marked so it can never be mailed:

    update practitioner_waitlist set unsubscribed = true
    where email = 'test-210f-verification@farmceuticawellness.com';

Verified via RETURNING: exactly one row, unsubscribed = true. Its step-1 queue row remains
in "pending" status but is double-gated: the cron is unarmed and the waitlist row is
unsubscribed.

## Anomalies

None. All five deploys succeeded on the first attempt and the form verification passed on
the first request.
