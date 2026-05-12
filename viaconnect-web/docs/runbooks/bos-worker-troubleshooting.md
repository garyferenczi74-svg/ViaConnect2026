# BOS Worker Troubleshooting

Operational runbook for the Bio Optimization Score compute worker. Use this when the dashboard is stale, when the queue is piling up, or when telemetry shows write failures.

## 1. Symptom catalog

The five most common failure modes are:

**Queue piling up.** Unprocessed rows in `bos_compute_queue` keep growing across cron cycles. Indicates the worker is not running or is erroring out on every drain. Check Vercel cron logs and `bos_write_telemetry` for the last 24 hours of error rows.

**Worker errors.** `bos_write_telemetry` shows rows with `success = false` and a populated `error_message` against `compute_bio_optimization_score_rpc`. Usually means the RPC's validation guards rejected an input (invalid tier, out of range confidence, missing compute_version). Read the `error_message` and trace back to the source gatherer that produced the bad value.

**Hannah API errors.** Worker logs show Anthropic SDK errors (rate limit, timeout, 500). The pipeline retries once on validation failure but does NOT retry on transport failure. The queue row stays open and the next cron cycle picks it up automatically.

**Validation failures.** Hannah returned output that did not match `HANNAH_TOOL_SCHEMA`. The pipeline retries exactly once. A second failure logs a console error and leaves the queue row open. Investigate via the worker log's serialized output dump.

**RLS rejections.** Telemetry inserts from browser callers may show `error_message` containing the substring `42501` or `new row violates row-level security policy`. The `bos_telemetry_insert_observability` policy permits only `is_canonical = false AND user_id = auth.uid()`; any other write is the wrong shape. Confirm the caller is logging a non canonical write for the authenticated user, not the canonical RPC path.

## 2. Diagnostic queries

Run these against the live Supabase project's SQL editor. Replace placeholders before executing.

Count unprocessed events grouped by source:

```sql
SELECT source, count(*) AS unprocessed
  FROM public.bos_compute_queue
 WHERE processed_at IS NULL
 GROUP BY source
 ORDER BY unprocessed DESC;
```

Last 50 telemetry errors:

```sql
SELECT occurred_at, caller_module, write_target, is_canonical, success, error_message, user_id
  FROM public.bos_write_telemetry
 WHERE success = false
 ORDER BY occurred_at DESC
 LIMIT 50;
```

Stuck rows older than 1 hour:

```sql
SELECT id, user_id, source, enqueued_at, retry_count, processing_error
  FROM public.bos_compute_queue
 WHERE processed_at IS NULL
   AND enqueued_at < now() - interval '1 hour'
 ORDER BY enqueued_at ASC
 LIMIT 100;
```

Latest compute per user (top 20):

```sql
SELECT DISTINCT ON (user_id) user_id, score, tier, confidence, compute_version, computed_at
  FROM public.bio_optimization_history
 ORDER BY user_id, date DESC, compute_seq DESC
 LIMIT 20;
```

Authenticated canonical INSERT attempts (should be zero before #161.5 lockdown):

```sql
SELECT count(*) AS suspicious_attempts
  FROM public.bos_write_telemetry
 WHERE is_canonical = true
   AND occurred_at >= now() - interval '7 days'
   AND caller_module NOT LIKE 'src/lib/scoring/bio-optimization-score%';
```

## 3. Cron not firing

The worker is scheduled by `vercel.json` at `*/5 * * * *`. If cron is not firing:

1. Confirm the project is on a Vercel plan tier that includes cron jobs (Hobby cron limit is 1 job; Pro is unlimited). The bundled #159 plus #161 PR adds the cron entry; if the deploy plan is Hobby and there are already crons, this addition pushes the project over the limit and cron does not run.
2. Check the Vercel dashboard's Cron tab for the last invocation timestamp. A failed deploy halts cron silently.
3. Fallback: schedule the worker invocation via `pg_cron` on the Supabase side. Example:

```sql
SELECT cron.schedule(
  'bos_worker_fallback',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://viaconnectapp.com/api/bos/worker',
    headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret'))
  )$$
);
```

Set `app.cron_secret` via the Supabase Dashboard or `ALTER SYSTEM` to a long random string. Update the `CRON_SECRET` environment variable in Vercel to match.

## 4. ANTHROPIC_API_KEY rotation

1. Generate a new key in the Anthropic console.
2. In Vercel project settings, update the `ANTHROPIC_API_KEY` environment variable for production + preview.
3. Trigger a fresh deploy (any push to main, or use `vercel --prod` from the CLI).
4. Wait 1 cron cycle (5 minutes). Run the worker diagnostic query above to confirm new compute rows are landing.
5. Revoke the old key in the Anthropic console only after step 4 succeeds.

## 5. CRON_SECRET rotation

1. Generate a new 32 byte hex secret (e.g. `openssl rand -hex 32`).
2. In Vercel, update `CRON_SECRET` for production + preview.
3. Deploy and confirm cron rows are landing.
4. If `pg_cron` fallback is in place (section 3), update the Supabase `app.cron_secret` setting and the cron's POST headers to the new value.

## 6. Rollback migration template

The non destructive rollback drops the new SSOT objects without touching the underlying data. Run inside a transaction; commit only after manual verification.

```sql
BEGIN;

-- Drop the projection trigger and function. Existing rows in profiles
-- and daily_scores keep their last projected score; no data is lost.
DROP TRIGGER IF EXISTS trg_bos_history_project ON public.bio_optimization_history;
DROP FUNCTION IF EXISTS public.project_bio_optimization_score();

-- Drop the SSOT RPC. The bio_optimization_history table itself is
-- preserved; reads continue working.
DROP FUNCTION IF EXISTS public.compute_bio_optimization_score(
  uuid, numeric, smallint, numeric, jsonb, text, text
);

-- Drop the queue and telemetry tables. Run this only after exporting
-- the rows for forensic review.
DROP TABLE IF EXISTS public.bos_compute_queue;
DROP TABLE IF EXISTS public.bos_write_telemetry;

-- Restore the original autoheal-style policies on bio_optimization_history.
DROP POLICY IF EXISTS "bos_history_select_own" ON public.bio_optimization_history;
DROP POLICY IF EXISTS "bos_history_no_direct_insert" ON public.bio_optimization_history;
DROP POLICY IF EXISTS "bos_history_no_update" ON public.bio_optimization_history;
DROP POLICY IF EXISTS "bos_history_no_delete" ON public.bio_optimization_history;

CREATE POLICY "Users manage own bio history"
  ON public.bio_optimization_history
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT INSERT, UPDATE, DELETE ON public.bio_optimization_history TO authenticated;

COMMIT;
```

The column additions (tier, confidence, compute_version, computed_at, compute_seq) and the breakdown sentinel are intentionally not rolled back. Removing them would invalidate existing rows; if a future migration needs to drop them, do it in a separate, audited prompt.

## 7. Telemetry monitoring for the #161.5 lockdown gate

Before lockdown can proceed, the team must confirm zero canonical INSERT attempts from authenticated callers for 7 consecutive days. The lockdown will remove the `bos_telemetry_insert_observability` policy and the `GRANT INSERT ... TO authenticated` line for `bos_write_telemetry`, plus revoke any residual direct table writes that telemetry has flagged.

Daily check:

```sql
SELECT
  date_trunc('day', occurred_at) AS day,
  count(*) FILTER (WHERE is_canonical = true) AS canonical_inserts,
  count(*) FILTER (WHERE is_canonical = false) AS observability_inserts,
  count(*) FILTER (WHERE success = false) AS errors
FROM public.bos_write_telemetry
WHERE occurred_at >= now() - interval '7 days'
GROUP BY 1
ORDER BY 1 DESC;
```

The `canonical_inserts` column must read 0 every day. A non zero day resets the 7 day counter and surfaces the offending caller in `caller_module`. Trace back to the source, file a Reroute prompt, ship the fix, and restart the 7 day window.

When all 7 days pass, file the #161.5 lockdown migration. The migration drops the observability policy, revokes the table level GRANT, and adds a final pgTAP assertion that no INSERT is possible from the authenticated role at all.
