-- Prompt 201: set-based reconciliation resolver. For the affected (metric_key,
-- UTC day) windows it marks one winner per window (highest source priority, then
-- most recent, among non-null readings) as is_resolved, and points every other
-- reading in that window at the winner via superseded_by for provenance. Pure
-- SQL so a large import resolves in one statement. Projection into
-- body_tracker_weight is handled by the ingest edge function.
--
-- Source priority, highest first: native_bridge, apple_health, fitbit, garmin,
-- manual_entry. Device readings beat manual for objectivity; alternates are
-- retained, never silently discarded.
--
-- All comments use hyphens only. No em-dashes or en-dashes.

create or replace function public.reconcile_body_composition(p_user_id uuid, p_days date[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with windows as (
    select
      id,
      metric_key,
      ((measured_at at time zone 'UTC')::date) as day,
      case source_id
        when 'native_bridge' then 0
        when 'apple_health' then 1
        when 'fitbit' then 2
        when 'garmin' then 3
        when 'manual_entry' then 4
        else 5
      end as prio,
      measured_at,
      value
    from body_composition_readings
    where user_id = p_user_id
      and ((measured_at at time zone 'UTC')::date) = any(p_days)
  ),
  winners as (
    select distinct on (metric_key, day) id as winner_id, metric_key, day
    from windows
    where value is not null
    order by metric_key, day, prio asc, measured_at desc
  )
  update body_composition_readings t
  set is_resolved = (w.winner_id is not null and t.id = w.winner_id),
      superseded_by = case when w.winner_id is null or t.id = w.winner_id then null else w.winner_id end
  from windows wn
  left join winners w on w.metric_key = wn.metric_key and w.day = wn.day
  where t.id = wn.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.reconcile_body_composition(uuid, date[]) to service_role;
