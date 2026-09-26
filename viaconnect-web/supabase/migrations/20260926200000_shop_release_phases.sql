-- Additive only. Shop release waves as launch_phases rows plus a product link.
-- Not applied by merge. Gary applies this file by hand, then migration B.
--
-- Applying this file makes shop_release_phase_1 ACTIVE. That is the go-live
-- event for FC-NAD-001, FC-RISE-001, and FC-DESIRE-001 once the code PR ships.
-- Before that code ships, shop behavior stays as it is today.
--
-- Phase 2 target_activation_date stays null. Gary has not set a date.
-- The date is informational only; activation is still the manual Arm/Confirm.
-- launch_phases descriptions are internal only (never rendered to shoppers).
-- FC-CUSTOM-VIT-001 is intentionally not linked.

-- Guard 1: abort before any write unless all 6 seeded SKUs exist.
do $$
declare
  found_count integer;
begin
  select count(distinct sku) into found_count
    from public.products
   where sku in ('FC-NAD-001','FC-RISE-001','FC-DESIRE-001',
                 'FC-CREATINE-001','FC-CATALYST-001','FC-MTHFR-001');
  if found_count <> 6 then
    raise exception 'shop_release_phases: expected 6 seeded SKUs, found %', found_count;
  end if;
end
$$;

insert into public.launch_phases
  (id, display_name, description, phase_type, activation_status,
   target_activation_date, actual_activation_date, sort_order, metadata)
values
  ('shop_release_phase_1', 'Shop Release Phase 1',
   'Internal: supplements purchasable in the shop (NAD+, RISE+, DESIRE+).',
   'custom_event', 'active', null, current_date, 10, '{"scope":"shop_release"}'::jsonb),
  ('shop_release_phase_2', 'Shop Release Phase 2',
   'Internal: next shop wave (Creatine HCL+, CATALYST+, MTHFR+).',
   'custom_event', 'planned', null, null, 11, '{"scope":"shop_release"}'::jsonb)
on conflict (id) do nothing;

alter table public.products
  add column if not exists launch_phase_id text
  references public.launch_phases(id) on delete set null;

create index if not exists products_launch_phase_id_idx on public.products (launch_phase_id);

comment on column public.products.launch_phase_id is
  'Shop release wave for supplements. NULL or a non-active phase = Coming soon. Test kits (category and product_type = test_kit) are exempt.';

update public.products set launch_phase_id = 'shop_release_phase_1'
 where sku in ('FC-NAD-001','FC-RISE-001','FC-DESIRE-001') and launch_phase_id is null;
update public.products set launch_phase_id = 'shop_release_phase_2'
 where sku in ('FC-CREATINE-001','FC-CATALYST-001','FC-MTHFR-001') and launch_phase_id is null;

-- Guard 2: the seed landed exactly (3 + 3). Safe on re-run.
do $$
declare
  p1 integer;
  p2 integer;
begin
  select count(*) into p1 from public.products
   where launch_phase_id = 'shop_release_phase_1'
     and sku in ('FC-NAD-001','FC-RISE-001','FC-DESIRE-001');
  select count(*) into p2 from public.products
   where launch_phase_id = 'shop_release_phase_2'
     and sku in ('FC-CREATINE-001','FC-CATALYST-001','FC-MTHFR-001');
  if p1 <> 3 or p2 <> 3 then
    raise exception 'shop_release_phases: seed mismatch (phase1=%, phase2=%)', p1, p2;
  end if;
end
$$;
