-- Additive only. Launch plan, early-voter codes, email bookkeeping. Not applied by merge.
-- Gary applies 20260930230000 first, then this file (M2).
--
-- Hand-apply:
--   psql -v ON_ERROR_STOP=1 --single-transaction -f <this file>
-- Do not put BEGIN or COMMIT in this file.
--
-- Codes exist only after Mark released. 25 percent, single use, user plus product,
-- standalone, expires 7 days after release. order_scope is first_order when the
-- voter has no shop_orders row with status paid, otherwise next_order.
-- Quantity covered by the code is 1 unit. Checkout redemption is not in this migration.

set local lock_timeout = '5s';

create table if not exists public.shop_product_launch_plan (
  product_id          uuid primary key references public.products(id) on delete cascade,
  release_date        date,
  notify_requested_at timestamptz,
  released_at         timestamptz,
  released_by         uuid references auth.users(id) on delete set null,
  updated_at          timestamptz not null default now()
);

create table if not exists public.shop_early_voter_codes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  code          text not null unique check (code = upper(code)),
  percent_off   integer not null default 25 check (percent_off = 25),
  standalone    boolean not null default true check (standalone = true),
  order_scope   text not null check (order_scope in ('first_order', 'next_order')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  redeemed_at   timestamptz,
  redeemed_order_id uuid,
  unique (user_id, product_id)
);

create table if not exists public.shop_launch_email_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('admin_weekly', 'voter_weekly', 'release_code', 'vote_confirm')),
  period_key text not null,
  sent_at    timestamptz not null default now(),
  unique (user_id, kind, period_key)
);

create unique index if not exists shop_launch_email_log_admin_period_idx
  on public.shop_launch_email_log (kind, period_key)
  where user_id is null;

create table if not exists public.shop_launch_email_optout (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  unsubscribed_at timestamptz not null default now()
);

alter table public.shop_product_launch_plan enable row level security;
alter table public.shop_product_launch_plan force row level security;
alter table public.shop_early_voter_codes enable row level security;
alter table public.shop_early_voter_codes force row level security;
alter table public.shop_launch_email_log enable row level security;
alter table public.shop_launch_email_log force row level security;
alter table public.shop_launch_email_optout enable row level security;
alter table public.shop_launch_email_optout force row level security;

revoke all on table public.shop_product_launch_plan from public, anon, authenticated;
grant all on table public.shop_product_launch_plan to service_role;

revoke all on table public.shop_early_voter_codes from public, anon, authenticated;
grant select on table public.shop_early_voter_codes to authenticated;
grant all on table public.shop_early_voter_codes to service_role;

revoke all on table public.shop_launch_email_log from public, anon, authenticated;
grant all on table public.shop_launch_email_log to service_role;

revoke all on table public.shop_launch_email_optout from public, anon, authenticated;
grant all on table public.shop_launch_email_optout to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'shop_early_voter_codes'
       and policyname = 'shop_early_voter_codes_select_own'
  ) then
    create policy shop_early_voter_codes_select_own
      on public.shop_early_voter_codes
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end
$$;

create or replace function public.shop_launch_vote_top3(p_min_votes integer default 1)
returns table (product_id uuid, rank integer, release_date date)
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select w.product_id, count(*) as votes, min(w.voted_at) as first_vote
      from public.shop_product_waitlist w
      join public.products p on p.id = w.product_id and p.active = true
     where w.voted_at is not null
     group by w.product_id
  ), unreleased as (
    select v.* from v
      join public.products p on p.id = v.product_id
     where p.launch_phase_id is null
        or not exists (
          select 1 from public.launch_phases lp
           where lp.id = p.launch_phase_id
             and lp.activation_status in ('active', 'completed')
        )
  )
  select u.product_id,
         (row_number() over (order by u.votes desc, u.first_vote asc, u.product_id asc))::int,
         lp.release_date
    from unreleased u
    left join public.shop_product_launch_plan lp on lp.product_id = u.product_id
   where u.votes >= p_min_votes
   order by 2
   limit 3;
$$;

revoke all on function public.shop_launch_vote_top3(integer) from public;
grant execute on function public.shop_launch_vote_top3(integer) to anon, authenticated;

-- Release plus code creation. service_role only. Does not touch other products.
create or replace function public.shop_admin_release_product(p_product_id uuid, p_actor uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sku text;
  v_category text;
  v_product_type text;
  v_active boolean;
  v_phase text;
  v_count integer := 0;
  v_row record;
  v_code text;
  v_code_id uuid;
  v_scope text;
begin
  select sku, category, product_type, active
    into v_sku, v_category, v_product_type, v_active
    from public.products
   where id = p_product_id;

  if v_sku is null or v_active is not true then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  if v_category = 'test_kit' and v_product_type = 'test_kit' then
    raise exception 'test kit refused' using errcode = 'P0001';
  end if;

  v_phase := 'shop_release_' || lower(v_sku);

  insert into public.launch_phases (
    id, display_name, description, phase_type, activation_status,
    target_activation_date, actual_activation_date, sort_order, metadata
  ) values (
    v_phase,
    'Shop release ' || v_sku,
    'Internal single product release. Not shopper copy.',
    'custom_event',
    'active',
    null,
    ((pg_catalog.now() at time zone 'America/Edmonton')::date),
    100,
    '{"scope":"shop_release_vote"}'::jsonb
  )
  on conflict (id) do nothing;

  update public.products p
     set launch_phase_id = v_phase
   where p.id = p_product_id
     and (
       p.launch_phase_id is null
       or not exists (
         select 1 from public.launch_phases lp
          where lp.id = p.launch_phase_id
            and lp.activation_status in ('active', 'completed')
       )
     );

  insert into public.shop_product_launch_plan as plan (product_id, released_at, released_by, updated_at)
  values (p_product_id, pg_catalog.now(), p_actor, pg_catalog.now())
  on conflict (product_id) do update
    set released_at = coalesce(plan.released_at, excluded.released_at),
        released_by = coalesce(plan.released_by, excluded.released_by),
        updated_at = pg_catalog.now();

  for v_row in
    select w.id as waitlist_id, w.user_id
      from public.shop_product_waitlist w
     where w.product_id = p_product_id
       and w.voted_at is not null
       and w.discount_code_id is null
  loop
    if exists (
      select 1 from public.shop_early_voter_codes c
       where c.user_id = v_row.user_id
         and c.product_id = p_product_id
    ) then
      continue;
    end if;

    if exists (
      select 1 from public.shop_orders o
       where o.user_id = v_row.user_id
         and o.status = 'paid'
    ) then
      v_scope := 'next_order';
    else
      v_scope := 'first_order';
    end if;

    v_code := 'EV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    insert into public.shop_early_voter_codes (
      user_id, product_id, code, percent_off, standalone, order_scope, expires_at
    ) values (
      v_row.user_id,
      p_product_id,
      v_code,
      25,
      true,
      v_scope,
      pg_catalog.now() + interval '7 days'
    )
    returning id into v_code_id;

    update public.shop_product_waitlist
       set discount_code_id = v_code_id
     where id = v_row.waitlist_id
       and discount_code_id is null;

    v_count := v_count + 1;
  end loop;

  return v_count;
end
$$;

revoke all on function public.shop_admin_release_product(uuid, uuid) from public, anon, authenticated;
grant execute on function public.shop_admin_release_product(uuid, uuid) to service_role;
