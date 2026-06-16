-- Prompt 201 review fix (Jeffery / performance-advisor must-fix 4): the reconcile
-- resolver filtered on a function of measured_at ((measured_at at time zone 'UTC')
-- ::date = any(p_days)), which is non-sargable and re-scanned the user's whole
-- readings history on every import. Add a sargable range bound on raw measured_at
-- (derived from the min and max of p_days, UTC) plus a supporting index, and keep
-- the exact day-set membership check for correctness when p_days is sparse.
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
        when 'native_bridge' then 0 when 'apple_health' then 1
        when 'fitbit' then 2 when 'garmin' then 3
        when 'manual_entry' then 4 else 5 end as prio,
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

create index if not exists body_composition_readings_user_measured
  on public.body_composition_readings (user_id, measured_at);
