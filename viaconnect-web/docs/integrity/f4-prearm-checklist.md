# F4 Pre-Arm Checklist: practitioner-waitlist-mailer (Prompt 210f Section 3.2)

Status of this document: BUILD portion complete, ARMING NOT PERFORMED.
Nothing in this task made any cron.schedule statement executable, deployed
any function, or applied any migration. Every arming step below is
post-merge and Gary-gated.

Subject: `supabase/functions/practitioner-waitlist-mailer/index.ts` plus the
pure decision module `supabase/functions/practitioner-waitlist-mailer/mailer-logic.ts`
(tested without Deno by `tests/schema/mailer-prearm-logic.test.ts`, 21 tests).

## Section 3.2 checklist

| Item | Status | Evidence |
| --- | --- | --- |
| Idempotency: send-then-mark can never double-send across restarts/retries | PROVEN-BY-TEST | Claim-before-send: an atomic compare-and-swap (`UPDATE practitioner_email_queue SET status='sending', attempts=attempts+1 WHERE id=X AND status='pending'` with `.select('id')` RETURNING) claims each row before any SMTP traffic; only the claim winner (exactly 1 returned row) sends, then marks sent. Tests in `tests/schema/mailer-prearm-logic.test.ts`: "claim-before-send: only a pending row is claimable; claimed, sent, failed, and skipped rows can never be claimed again (no double-send across restarts or retries)"; "claimConfirmed accepts exactly one returned row: zero means the compare-and-swap lost the race and the send must not proceed"; "crash between claim and send: the sending row is not re-claimable, and the stuck-claim cutoff surfaces it in the health report instead of silently resending or dropping it". Crash windows: claim-then-die leaves the row at 'sending' (never re-sent, surfaced as claimed_stuck); send-then-die-before-mark likewise leaves 'sending' (email out, row surfaced for manual reconciliation, never resent because the candidate query selects 'pending' only). |
| Per-run cap and daily cap | BUILT | Module constants in `mailer-logic.ts`: `PER_RUN_CAP = 25`, `DAILY_CAP = 200`. Enforced in `index.ts`: sent-today count (`status='sent' AND sent_at >= utcDayStart(now)`) is read BEFORE any send; `runBudget(sentToday)` computes the allowance; the candidate query `.limit(budget.allowed)`; at/over the daily cap the run stops with logged reason `daily_cap_reached`; an unreadable count fails closed (`daily_count_unavailable`, nothing sends). Cap math test-pinned (constants and boundary cases). |
| Kill switch: single instant disable | BUILT (fail-closed) | DB-backed flag row in the LIVE `public.features` table (text id primary key, columns `is_active`, `kill_switch_engaged`; confirmed in `docs/integrity/snapshot/live-types.ts`). Flag id: `practitioner_waitlist_mailer`. The run proceeds ONLY when the row exists with `is_active = true AND kill_switch_engaged = false` (`mailerEnabled` in mailer-logic.ts, test-pinned). Missing row, read error, or engaged switch all fail closed BEFORE the candidate query, so the function is inert even if deployed before arming. Instant disable: `UPDATE public.features SET kill_switch_engaged = true, kill_switch_engaged_at = now(), kill_switch_reason = '<why>' WHERE id = 'practitioner_waitlist_mailer';` |
| Scope control: new + uncontacted + consented only, no historical sweep | BUILT | Candidate query: `status = 'pending' AND step = 1 AND created_at >= FLOOR_TIMESTAMP AND scheduled_for <= now()`, ordered by scheduled_for, limited by the caps. `FLOOR_TIMESTAMP = '2026-07-08T00:00:00Z'` (the F3 apply date; the queue table was created that day, so the floor is also true by construction) with a pure per-row re-check (`isWithinCandidateWindow`, fail-closed on unparseable dates). Column note: the queue column is `step` (CHECK 1..6); `email_sequence_step` is the waitlist-side progress marker, not the queue column. Consent: the F3 `practitioner_waitlist` schema has NO dedicated consent column; the ONLY writer of step-1 queue rows is the F3 AFTER INSERT trigger `tg_practitioner_waitlist_enqueue_welcome`, which fires once per voluntary public application form submission (the consent event); ongoing consent is the `unsubscribed` flag, re-checked per lead at send time (unsubscribed leads are marked 'skipped', never sent). |
| Drift and resilience | BUILT | `reportSupabaseError` (from `../_shared/schema-drift.ts`) on every queue/waitlist/flag/heartbeat read-write error path (flag-read, stuck-scan, daily-count, due-count, candidate-query, claim, claim-release, waitlist-read, mark-missing, mark-skipped, mark-sent, waitlist-progress, mark-failed, agent-message, heartbeat sinks); contexts carry table names only, never lead emails. `withTimeout` bounds every DB read and write, pre-loop AND in-loop (F4-fix: claim, waitlist-read, claim-release, mark-missing, mark-skipped, mark-sent, mark-failed; 10s each), both heartbeat sinks (10s), and the SMTP send (15s, unchanged, still behind the smtp-email circuit breaker). An in-loop timeout takes that site's existing error path and never crashes the loop; in particular a mark-sent timeout leaves the row at 'sending' (nested catch, never back to pending after the email went out, so no double send). A run soft deadline (`RUN_SOFT_DEADLINE_MS = 120000`) stops the loop early and leaves remaining rows pending for the next tick. |
| Health registration | BUILT (registry row rides with arming) | Heartbeat per the Prompt 208 `agent_heartbeats` pattern (table exists live): upsert (`onConflict: 'agent'`) at run start and run end with counts only (due, fetched, claimed, claim_lost, sent, failed, skipped, capped, claimed_stuck, sent_today_before, deadline_stopped, duration_ms), status ok/degraded/error, no PII. Watch: `select * from agent_heartbeats where agent = 'practitioner-waitlist-mailer';` (service-role; internal health panel reads this table). Additionally a best-effort `ultrathink_agent_heartbeat` RPC feeds `ultrathink_agent_events`, which is exactly what the F4-arming registry row's `health_check_query` polls (20-minute window); without it the lifted registry row would false-alarm immediately after arming. |
| Test send end-to-end to internal addresses | TODO-AT-ARMING | Needs the function deployed and SMTP secrets present. Procedure in arming step 6 below. |
| Kelsey gate (compliance) | PARTIAL (unsubscribe DONE; postal address TODO-GARY; entity RESOLVED-LLC) | F4b status of the three formerly blocking facts: (1) Unsubscribe endpoint DONE: `GET /api/waitlist/unsubscribe` verifies an HMAC-SHA256 token (canonical pure module `src/lib/waitlist/unsubscribe-token.ts`, constant-time compare, red-first vitest tests in `src/lib/waitlist/__tests__/unsubscribe-token.test.ts` plus route shape tests in `src/app/api/waitlist/__tests__/unsubscribe-route-shape.test.ts`) and sets `practitioner_waitlist.unsubscribed = true`, the exact flag the mailer re-checks per lead at send time; every rendered email now carries the unsubscribe link slot, signed per lead from the waitlist row id (`token = <waitlistId>.<hex HMAC-SHA256>`; token carries no email address). Secrets at arming: Gary sets `UNSUBSCRIBE_TOKEN_SECRET` in the Vercel env AND the same value plus `BASE_URL` as Supabase function secrets; until then the route degrades to a graceful 503 page and the mailer renders a loud TODO literal in the link slot, never a silent blank. (2) Physical postal address TODO-GARY: `POSTAL_ADDRESS_LINE = 'TODO-GARY-AT-ARMING'` in index.ts is a visible placeholder; ARMING IS BLOCKED until Gary supplies the literal (CASL/CAN-SPAM require it). (3) Entity string RESOLVED-LLC (Gary decision 2026-07-08): customer-facing email and unsubscribe-page text reads `FarmCeutica Wellness LLC`; confirmed no Ltd anywhere in the mailer or the unsubscribe path (test-pinned in the route shape test). Remaining for this gate: Gary's postal address literal and security-advisor review of content and sender. |
| First armed run candidate set reported to Gary BEFORE arming | TODO-AT-ARMING | Run the read-only query in the section below and report the numbers (and, privately, the lead list) to Gary before any arming step executes. |
| Arming (deploy + cron registration) | DEFERRED (Gary-gated) | Ordered steps below. No cron.schedule is executable anywhere in the repo today: the source file `20260418000050_practitioner_mailer_cron.sql` predates the F3 tranche cut and is superseded by the commented F4 ARMING block at the end of `20260707170000_prompt_210f_certification_waitlist_additive.sql` (verbatim lift, every line prefixed "-- "; F3 report verified byte parity). |

## Kill-switch mechanism (operator card)

- Table: `public.features` (live). Row id: `practitioner_waitlist_mailer`.
- Enabled means: row exists AND `is_active = true` AND `kill_switch_engaged = false`.
- Anything else (no row, read error, switch engaged, inactive) means the run
  exits before the candidate query; queue rows stay pending; nothing sends.
- Disable instantly (takes effect on the next tick, max 5 minutes):

```sql
UPDATE public.features
   SET kill_switch_engaged = true,
       kill_switch_engaged_at = now(),
       kill_switch_reason = 'manual disable'
 WHERE id = 'practitioner_waitlist_mailer';
```

- Re-enable: set `kill_switch_engaged = false` on the same row.

## First-run candidate set query (run and report to Gary BEFORE arming)

Read-only. This is exactly the population the first armed tick may touch,
before caps shrink it to at most 25:

```sql
SELECT count(*)                        AS candidate_rows,
       min(q.created_at)               AS earliest,
       max(q.created_at)               AS latest
  FROM public.practitioner_email_queue q
  JOIN public.practitioner_waitlist w ON w.id = q.waitlist_id
 WHERE q.status = 'pending'
   AND q.step = 1
   AND q.created_at >= '2026-07-08T00:00:00Z'
   AND q.scheduled_for <= now()
   AND coalesce(w.unsubscribed, false) = false;
```

For Gary's eyes (not for logs), the per-lead list adds `w.email, w.practice_name`
to the select. Report BEFORE arming; Gary decides whether the first armed run
may include any real leads already pending or must be internal-only.

## Arming steps (post-merge, Gary-gated; F4 arming session executes these in order)

1. Gates: every BUILT row above green on main; Kelsey gate cleared. Already
   resolved: entity string (FarmCeutica Wellness LLC, Gary 2026-07-08) and
   the unsubscribe path (route + signed link slot in every email). Still
   open: replace `POSTAL_ADDRESS_LINE = 'TODO-GARY-AT-ARMING'` in index.ts
   with Gary's physical postal address literal, and record the
   security-advisor sign-off on content and sender. ARMING IS BLOCKED while
   the postal literal is a placeholder.
2. Report the first-run candidate set to Gary (query above). STOP until Gary
   acknowledges the numbers.
3. Verify SMTP secrets on the project (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`). Set the F4b compliance env:
   `UNSUBSCRIBE_TOKEN_SECRET` and `BASE_URL` (public site origin) as
   Supabase function secrets, and the SAME `UNSUBSCRIBE_TOKEN_SECRET` value
   in the Vercel env so `GET /api/waitlist/unsubscribe` can verify what the
   mailer signs. Until both exist the route serves a graceful 503 page and
   the mailer renders a loud TODO literal in the link slot.
4. Deploy the function via MCP `deploy_edge_function`
   (slug `practitioner-waitlist-mailer`; files: `index.ts`, `mailer-logic.ts`,
   plus the four `_shared` modules it imports: `with-timeout.ts`,
   `safe-log.ts`, `circuit-breaker.ts`, `schema-drift.ts`). The function is
   INERT at this point: no flag row exists, so every invocation exits
   `disabled / flag_row_missing`.
5. Seed the kill-switch flag row (this is the enable action):

```sql
INSERT INTO public.features (id, display_name, category, minimum_tier_level,
                             requires_family_tier, requires_genex360,
                             gate_behavior, is_active)
VALUES ('practitioner_waitlist_mailer', 'Practitioner Waitlist Mailer',
        'operations', 0, false, false, 'hide', true)
ON CONFLICT (id) DO UPDATE SET is_active = true, kill_switch_engaged = false;
```

6. Test send end-to-end: with internal addresses submitted through the real
   waitlist form (their trigger-enqueued step-1 rows pending), invoke the
   function once manually (POST with service-role bearer). Confirm: internal
   inboxes received the welcome email, queue rows moved pending -> sending ->
   sent exactly once, re-invoking sends nothing again (idempotency observed
   live), heartbeat row updated with counts.
7. Apply the cron registration migration: lift the F4 ARMING block from the
   end of `supabase/migrations/20260707170000_prompt_210f_certification_waitlist_additive.sql`
   (strip the single leading "-- " per line; byte-identical to source
   `20260418000050_practitioner_mailer_cron.sql` per the F3 report) into a
   new `<stamp>_prompt_210f_f4_mailer_cron_arming.sql`, apply via the
   controller + MCP `apply_migration` protocol with a remediation-log row.
   This registers the `ultrathink_agent_registry` row (its health check is
   satisfied by the RPC heartbeat this build added) and schedules
   `practitioner_waitlist_mailer_cron` at minutes 3,8,...,58.
8. Observe two cron cycles; report numbers (sent, capped, claim_lost,
   claimed_stuck, heartbeat status) per the plan's F4 acceptance.
