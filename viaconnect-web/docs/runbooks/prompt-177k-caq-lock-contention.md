# Prompt 177k: CAQ generation hang + lock contention runbook

Filed 2026-06-07.

## Symptom

Authenticated requests stall app-wide during bursts. The most user-visible
surface is the CAQ post-submission "Generating your blueprint"
interstitial: the spinner animates, the four step labels fade in, but the
poll for `/api/bos/current` never sees a positive score and onboarding
never hands off.

## Root cause hypothesis

Postgres logs from the affected window:

- A transaction held `RowExclusiveLock` on `realtime.subscription` for
  about 14 seconds.
- Other statements queued for `AccessShareLock` and `RowExclusiveLock`
  on `auth.users`, `auth.refresh_tokens`, `realtime.subscription`, and
  `public.user_notifications`.
- The queued statements then failed with `canceling statement due to
  statement timeout` and `canceling statement due to user request`.

Because `auth.refresh_tokens` and `auth.users` were in the jam, a single
burst stalled every authenticated request. The CAQ generation is heavy,
authenticated, and multi-query, so the spinner is where the contention
surfaced as an infinite wait.

A live snapshot moments later showed all sessions idle with no blocker,
confirming the contention is intermittent and bursty.

## Live-capture queries

Run these during an active burst (CAQ spinning, multiple users
reporting slowness) to pin the blocker. They are read-only.

```sql
-- who is blocked and by whom
select bl.pid as blocked_pid, now()-bl.query_start as blocked_for,
       array_to_string(pg_blocking_pids(bl.pid), ',') as blocked_by,
       left(regexp_replace(coalesce(bl.query,''),'\s+',' ','g'),120) as blocked_query
from pg_stat_activity bl
where cardinality(pg_blocking_pids(bl.pid)) > 0
order by blocked_for desc;

-- what the blockers are holding and doing
select a.pid, a.state, a.application_name,
       now()-a.xact_start as xact_age,
       left(regexp_replace(coalesce(a.query,''),'\s+',' ','g'),160) as q,
       string_agg(distinct coalesce(c.relname,'')||':'||l.mode, ', ') as locks_held
from pg_stat_activity a
join pg_locks l on l.pid = a.pid and l.granted
left join pg_class c on c.oid = l.relation
where a.pid in (
  select unnest(pg_blocking_pids(p.pid))
  from pg_stat_activity p
  where cardinality(pg_blocking_pids(p.pid))>0
)
group by a.pid, a.state, a.application_name, a.xact_start, a.query;
```

Record three things for any blocker found:

1. The exact statement (truncated above; the queries cap at 120/160
   characters for legibility, expand the cap if needed).
2. `application_name` (so you know which client is the offender:
   PostgREST gateway, Realtime, a background worker, a dashboard
   session, etc).
3. Whether the blocker is `idle in transaction` (a held-open
   transaction is the worst case) or actively running something slow.

## Mitigations already shipped in 177k

1. **Role timeouts.** Migration `20260607010000_prompt_177k_role_timeouts.sql`
   sets `lock_timeout = '3s'` and `statement_timeout = '8s'` on the
   `authenticated` role, and `2s` / `5s` on `anon`. `service_role`
   stays unlimited because background workers may legitimately run
   longer than 8 seconds. Applied to live 2026-06-07.

2. **Client-side timeout + Retry.** The CAQ generation interstitial
   no longer spins indefinitely. Each downstream engine fetch (
   `/api/ai/calculate-bio-optimization`, `/api/ai/generate-symptom-profile`,
   `/api/ai/generate-wellness-analytics`, `/api/ai/check-interactions`,
   `/api/ultrathink/recommend`, `/api/recommendations/generate`) is
   wrapped in an `AbortController` with a 15-second timeout. The poll
   loop for `/api/bos/current` adds an 8-second per-attempt timeout
   and a max of 36 attempts. On exhaustion the interstitial swaps to a
   failure card with **Retry** and **Continue with baseline** actions.

3. **Fail-open onboarding.** A user who hits the failure card can
   continue forward with their baseline protocol. The AI enrichment
   backfills asynchronously through the existing BOS worker and the
   recommendation engine.

## Still to investigate

When a burst is actually observed:

- Run the capture queries above and document the exact blocker.
- If the blocker is `realtime.subscription` related and the
  `application_name` is `realtime`, audit Realtime channel churn:
  components subscribing on every render, missing `removeChannel`
  cleanup, or duplicate subscriptions to high-write tables.
- If the blocker is in `public.user_notifications`, audit whether any
  onboarding or generation path writes notifications inside the same
  transaction as auth or subscription work, and split if so.

## Emergency lever (manual only)

If a single backend PID is the documented blocker and the burst is
ongoing:

```sql
-- Identify the PID from the capture queries above first.
select pg_terminate_backend(<PID>);
```

This is a live operator action. Do not encode automatic backend
termination in the application.
