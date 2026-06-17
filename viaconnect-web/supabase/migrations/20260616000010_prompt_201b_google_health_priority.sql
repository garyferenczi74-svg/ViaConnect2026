-- Prompt 201b: slot google_health into the body-composition reconciliation
-- priority. Google Health is a real-time server-to-server API, so it ranks just
-- under the native bridge and above the Apple Health file import. This replaces
-- the function body from 20260615000014 with one extra CASE branch; everything
-- else (sargable range, day-set membership, winner resolution, index) is
-- unchanged. Append-only: the prior migration is not edited.
--
-- New order: native_bridge 0, google_health 1, apple_health 2, fitbit 3,
-- garmin 4, manual_entry 5, unknown 6.
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
  v_min timestamptz;
  v_max timestamptz;
begin
  if p_days is null or array_length(p_days, 1) is null then
    return 0;
  end if;
  select timezone('UTC', (min(d))::timestamp), timezone('UTC', ((max(d) + 1))::timestamp)
    into v_min, v_max
  from unnest(p_days) d;

  with windows as (
    select
      id, metric_key, ((measured_at at time zone 'UTC')::date) as day,
      case source_id
        when 'native_bridge' then 0
        when 'google_health' then 1
        when 'apple_health' then 2
        when 'fitbit' then 3
        when 'garmin' then 4
        when 'manual_entry' then 5
        else 6 end as prio,
      measured_at, value
    from body_composition_readings
    where user_id = p_user_id
      and measured_at >= v_min and measured_at < v_max
      and ((measured_at at time zone 'UTC')::date = any(p_days))
  ),
  winners as (
    select distinct on (metric_key, day) id as winner_id, metric_key, day
    from windows where value is not null
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
