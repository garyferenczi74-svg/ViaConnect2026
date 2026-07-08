# F3d Dropped Leads Investigation (Prompt 210f Section 3.1)

Date: 2026-07-08 (UTC). Investigator: F3d, read-only everywhere; this file is the only write.
Question: are any practitioner waitlist leads dropped by the broken public form RECOVERABLE?
PII rule honored throughout: counts, timestamps, and sources only. No emails, no names, no payloads.
Per the Section 8 ban, nothing below is fabricated; every number was queried live on 2026-07-08.

## 0. What a submitter actually saw (verified from code, not assumed)

The premise "the route swallowed the error and returned success-ish responses" is NOT what the code shows.
Both route versions fail CLOSED on the insert error, and the form surfaces it:

- Deployed route (main checkout `C:\Users\garyf\ViaConnect2026\viaconnect-web\src\app\api\waitlist\practitioner\route.ts`,
  pre-F3c, Prompt #91 Phase 1.7): insert error that is not code 23505 hits
  `safeLog.error('api.waitlist.practitioner', 'insert failed', { error })` and returns
  HTTP 500 `{"error":"Internal server error"}`. Missing table produced exactly this path
  (PostgREST PGRST205 / Postgres 42P01).
- Form (`src/app/practitioners/PractitionerWaitlistForm.tsx`): success UI only on status 201;
  any other status renders a red inline error box with the server's `error` string. So a real
  submitter saw "Internal server error" in a red box, not a thank-you screen.
- The only genuinely swallowed fail-open piece is the post-insert `agent_messages` fan-out
  (try/catch around a result whose error is never checked). It runs ONLY after a successful
  insert, so it never executed even once.
- No lead field ever reaches logs. `safeLog` context on every error path carries only the error
  object (name/message/stack) and, in the F3c version, `{ table: 'practitioner_waitlist' }`.
  There is nothing PII-bearing to recover from logs even in principle.
- STILL BROKEN TODAY: the pre-F3c route chains `.insert({...}).select('id').single()`.
  That is INSERT...RETURNING; anon has no SELECT policy on `practitioner_waitlist` (by design,
  confirmed in `f3-tranche-verification.md` check g), so Postgres rejects with 42501 and rolls
  the insert back. Even with the table now live, every submission through the deployed route
  returns 500 until the F3c route fix (present only in this 210d working tree) deploys.

## 1. Vercel runtime logs

- Project: via-connect2026 (`prj_vX9pxOMD3np20WQILdNmdF9xdW8q`), team ViaConnect
  (`team_5RxMf7ArmgUgzcqXDUwTiTvJ`), production branch main.
- Observable window actually seen: line-level log data verified present back to at least
  2026-06-30 (probes at the 3-4 day and 7-8 day marks returned real traffic). Full-text
  aggregate queries completed over 7-day and 14-day windows. 30-day queries are rejected
  outright by the plan (ExceedsBillingLimitError); line queries near the 14-day edge time out.
  Net: the audit window is 2026-06-24 through 2026-07-08 at best, hard-verified from
  2026-06-30 forward. Everything older is permanently unobservable.
- Result: ZERO log lines containing "waitlist" anywhere in the window. That single full-text
  match covers the request path `/api/waitlist/practitioner` (GET or POST), the safeLog scopes
  `api.waitlist.practitioner` and `waitlist.practitioner.insert`, and any schema-drift tag.
  Grouped-by-path aggregates over 1d, 3d, 7d, and 14d filtered on "waitlist" all returned
  empty tables.
- The pipeline itself is alive and dense, so this zero is a true zero: `/api/bos/worker` logs
  288/day (864 in the 3-day aggregate, exactly 3 days worth), 663 distinct request paths in
  3 days, and the `/practitioners` marketing page itself took 10 hits in 3 days.
- Logged payload fragments: none exist. The route never logs submission fields (verified in
  section 0), so even a hit would have yielded a count and timestamp only.
- Recoverable from this source: 0 submissions observed. Count of submissions older than the
  retention window: unknowable from Vercel.

## 2. audit_logs table

- Code inspection first: the route (either version) writes no audit row, before or after the
  insert. Audit coverage on this platform is trigger-based, and a failed INSERT fires no
  trigger, so a dropped lead cannot have left an audit row by construction.
- Live query (SELECT-only, project nnhkcufyqjojdbvdrpky): rows where
  `table_name = 'practitioner_waitlist'` OR `resource_type ILIKE '%waitlist%'` OR
  `action ILIKE '%waitlist%'`: count 0, min/max created_at null.
- Recoverable from this source: 0.

## 3. agent_messages fan-out

- `pg_tables` on 2026-07-08: `agent_messages` does NOT exist. It is still phantom; its
  creating migrations (agent ecosystem cluster, P1 decision sheet) remain unapplied.
- Doubly dead as a source: the fan-out sits after the insert success path, which was never
  reached even once.
- Recoverable from this source: 0.

## 4. Client-side analytics

- `PractitionerWaitlistForm.tsx` contains no analytics or telemetry calls of any kind.
- `package.json` has no analytics dependency (no @vercel/analytics, posthog, plausible, gtag,
  mixpanel, segment, fathom, umami). The root layout mounts no Analytics/SpeedInsights
  component and no third-party script. Repo-wide grep found no analytics wired to this form
  or the `/practitioners` page.
- Recoverable from this source: 0. No client-side submission counter ever existed.

## 5. Corroborating database state (queried 2026-07-08 UTC)

- `practitioner_waitlist`: created 2026-07-08 01:19:39 UTC by the F3 apply (schema_migrations
  version 20260708011939). Row count 0. The original repo migration
  20260418000020_practitioner_waitlist (authored 2026-04-18) is absent from
  schema_migrations: it was never applied. Phantom window: 2026-04-18 authorship to
  2026-07-08 01:19 UTC apply, roughly 11 weeks.
- `practitioner_email_queue`: 0 rows. The AFTER INSERT welcome trigger never fired, consistent
  with zero successful inserts ever.
- `waitlist_signups` (the separate consumer waitlist table, real and applied since
  2026-04-07): also 0 rows. Offered as context only; it is a different form.

## Bottom line for Gary

1. Recoverable leads: ZERO records exist in any source, and there is zero contact data
   anywhere to recover, by design (the route never logged lead fields). If a practitioner
   did submit during the broken period, their name and email are gone and cannot be
   reconstructed. Do not expect a recovery list; there is nothing to import.
2. How many were actually dropped: in the window we can see (verified 2026-06-30 to
   2026-07-08, likely back to 2026-06-24), the count of submission attempts is exactly 0.
   For the prior roughly 10 weeks the form was live, the count is UNKNOWABLE, not zero;
   no telemetry from that period survives anywhere. The observable zero, plus 10 page hits
   per 3 days on `/practitioners` (bot-heavy traffic profile), suggests the true loss is
   most likely zero or very small, but that is inference, not evidence.
3. One partial mercy: every failed submitter SAW a red "Internal server error" box rather
   than a fake success screen, so anyone genuinely interested knew their application did
   not go through and may return.
4. THE LEAK IS STILL OPEN: the deployed route still 500s every submission (RETURNING vs
   anon RLS, section 0) even though the table now exists. Deploying the F3c route fix is
   the remaining half of the lead-loss stop, exactly as flagged in
   `f3-tranche-verification.md`. After it deploys, watch runtime logs for the scope
   `waitlist.practitioner.insert` and the table row count for first real leads.
