# BOS Telemetry Runbook

Admin read queries for `public.bos_write_telemetry` and verification queries for the `bos_telemetry_retention_sweep` pg_cron job. All queries are run by an admin in the Supabase SQL editor (service_role) or via the Supabase MCP. RLS on the underlying table blocks every non service_role caller, so these queries are admin only by construction.

The table was introduced in `supabase/migrations/20260512020236_bos_compute_v2.sql` §11. Sanitization, retention, and the cron job were added in `supabase/migrations/20260512074126_bos_telemetry_hardening.sql` (#161b).

## Query 1: Legacy writes 24h (RLS lockdown gate)

Counts authenticated INSERTs against any canonical BOS write path over the last 24 hours. The observability carve-out admits NON-canonical rows only, so this should report zero after the 7 day lockdown window closes.

```sql
select count(*) as legacy_writes_24h,
       count(*) filter (where is_canonical) as canonical_writes_24h
  from public.bos_write_telemetry
 where occurred_at >= now() - interval '24 hours';
```

## Query 2: Top error messages this week

Surfaces the most frequent persisted error_message values from the last seven days. Because the values are sanitized on write, UUIDs appear as `<uuid>` and every message is capped at 500 characters.

```sql
select error_message,
       count(*) as n
  from public.bos_write_telemetry
 where success = false
   and error_message is not null
   and occurred_at >= now() - interval '7 days'
 group by error_message
 order by n desc
 limit 25;
```

## Query 3: Per call site write breakdown

Breaks every write down by `caller_module` and `write_target` for the last 24 hours so an operator can see which app path is responsible for any spike. Useful when triaging a sudden change in telemetry volume.

```sql
select caller_module,
       write_target,
       is_canonical,
       count(*) as writes,
       count(*) filter (where success = false) as failures
  from public.bos_write_telemetry
 where occurred_at >= now() - interval '24 hours'
 group by caller_module, write_target, is_canonical
 order by writes desc;
```

## Query 4: Table size and oldest row

Reports the row count of the telemetry table and the timestamp of the oldest row still present. The oldest row timestamp should not lag more than 90 days behind `now()`; if it does, the retention sweep has not run.

```sql
select count(*) as total_rows,
       min(occurred_at) as oldest_occurred_at,
       now() - min(occurred_at) as oldest_age
  from public.bos_write_telemetry;
```

## Query 5: Sweep verification (cron.job_run_details)

Confirms the `bos_telemetry_retention_sweep` cron job is registered and reports its 20 most recent run results so an operator can see whether the daily 04:00 UTC pass is succeeding.

```sql
select j.jobname,
       j.schedule,
       j.active,
       r.start_time,
       r.end_time,
       r.status,
       r.return_message
  from cron.job j
  left join cron.job_run_details r on r.jobid = j.jobid
 where j.jobname = 'bos_telemetry_retention_sweep'
 order by r.start_time desc nulls last
 limit 20;
```

## Manual invocation

If a one-off sweep is needed outside the daily 04:00 UTC schedule (for example after a backfill load), call the function directly as service_role:

```sql
select * from public.bos_telemetry_retention_sweep();
```

The call returns two rows, one per table, with the per table deletion count. The operation is idempotent: running it twice in a row produces a second row with zero deletions on each table.
