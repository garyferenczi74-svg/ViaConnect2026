-- Additive only. Shop release waves as launch_phases rows plus a product link.
-- Not applied by merge. Gary applies this file by hand, then migration B.
--
-- Hand-apply is atomic only when the whole file runs in one transaction.
-- SET LOCAL is valid only inside a transaction. Outside one, it emits a
-- WARNING and has no effect. Plain psql -f also keeps going after a guard
-- raises. Primary path:
--   psql -v ON_ERROR_STOP=1 --single-transaction -f <this file>
-- Fallback: paste this whole file into the Supabase SQL editor and run it
-- once. Transaction behaviour of the SQL editor is not verified from the repo.
-- Do not put BEGIN or COMMIT in this file. --single-transaction already
-- opens the transaction, and an inner COMMIT would end it early.
--
-- Applying this file makes shop_release_phase_1 ACTIVE. That is the go-live
-- event for FC-NAD-001, FC-RISE-001, and FC-DESIRE-001 once the code PR ships.
-- Before that code ships, shop behavior stays as it is today.
--
-- Phase 2 target_activation_date stays null. Gary has not set a date.
-- The date is informational only; activation is still the manual Arm/Confirm.
-- actual_activation_date uses the America/Edmonton local date so an apply
-- after 18:00 Mountain Time does not store the next UTC date.
-- launch_phases descriptions are internal only (never rendered to shoppers).
-- FC-CUSTOM-VIT-001 is intentionally not linked.

set local lock_timeout = '5s';

-- Guard 1: abort before any write unless the 6 SKUs are 6 active rows.
do $$
declare
  row_count integer;
  distinct_count integer;
begin
  select count(*), count(distinct sku)
    into row_count, distinct_count
    from public.products
   where active = true
     and sku in ('FC-NAD-001','FC-RISE-001','FC-DESIRE-001',
                 'FC-CREATINE-001','FC-CATALYST-001','FC-MTHFR-001');
  if row_count <> 6 or distinct_count <> 6 then
    raise exception
      'shop_release_phases: expected 6 active seeded SKUs, found % rows and % distinct',
      row_count, distinct_count;
  end if;
end
$$;

insert into public.launch_phases
  (id, display_name, description, phase_type, activation_status,
   target_activation_date, actual_activation_date, sort_order, metadata)
values
  ('shop_release_phase_1', 'Shop Release Phase 1',
   'Internal: supplements purchasable in the shop (NAD+, RISE+, DESIRE+).',
   'custom_event', 'active', null, ((now() at time zone 'America/Edmonton')::date), 10,
   '{"scope":"shop_release"}'::jsonb),
  ('shop_release_phase_2', 'Shop Release Phase 2',
   'Internal: next shop wave (Creatine HCL+, CATALYST+, MTHFR+).',
   'custom_event', 'planned', null, null, 11, '{"scope":"shop_release"}'::jsonb)
on conflict (id) do nothing;

alter table public.products
  add column if not exists launch_phase_id text;

-- Re-runnable FK. ADD COLUMN IF NOT EXISTS skips the column and any inline
-- REFERENCES once the column exists, so the constraint is attached on its own.
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.products'::regclass
       and conname = 'products_launch_phase_id_fkey'
  ) then
    alter table public.products
      add constraint products_launch_phase_id_fkey
      foreign key (launch_phase_id)
      references public.launch_phases(id)
      on delete set null;
  end if;
end
$$;

create index if not exists products_launch_phase_id_idx on public.products (launch_phase_id);

comment on column public.products.launch_phase_id is
  'Optional link to public.launch_phases.id for a shop release wave. NULL means this product is not linked to a wave.';

update public.products set launch_phase_id = 'shop_release_phase_1'
 where active = true
   and sku in ('FC-NAD-001','FC-RISE-001','FC-DESIRE-001')
   and launch_phase_id is null;
update public.products set launch_phase_id = 'shop_release_phase_2'
 where active = true
   and sku in ('FC-CREATINE-001','FC-CATALYST-001','FC-MTHFR-001')
   and launch_phase_id is null;

-- Guard 2: the seed landed exactly (3 + 3 active rows). Safe on re-run.
do $$
declare
  p1 integer;
  p2 integer;
begin
  select count(*) into p1 from public.products
   where active = true
     and launch_phase_id = 'shop_release_phase_1'
     and sku in ('FC-NAD-001','FC-RISE-001','FC-DESIRE-001');
  select count(*) into p2 from public.products
   where active = true
     and launch_phase_id = 'shop_release_phase_2'
     and sku in ('FC-CREATINE-001','FC-CATALYST-001','FC-MTHFR-001');
  if p1 <> 3 or p2 <> 3 then
    raise exception 'shop_release_phases: seed mismatch (phase1=%, phase2=%)', p1, p2;
  end if;
end
$$;
