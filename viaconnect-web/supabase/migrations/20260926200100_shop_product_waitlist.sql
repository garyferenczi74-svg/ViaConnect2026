-- Additive only. Per-product "Join the Revolution" waiting list. Signed-in users only.
-- Not applied by merge. Gary applies migration A first, then this file.
-- Rows can be consumer health data (for example WA My Health My Data). Internal launch
-- planning only: no sharing, no ad or marketing audiences. Admin counts via service_role only.
-- No emails are sent. No auth email or template changes.

create table if not exists public.shop_product_waitlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  source      text not null default 'plp' check (source in ('plp','pdp')),
  created_at  timestamptz not null default now()
);

-- One row per user per product. Leading user_id also serves "my rows" lookups.
create unique index if not exists shop_product_waitlist_user_product_key
  on public.shop_product_waitlist (user_id, product_id);

alter table public.shop_product_waitlist enable row level security;
alter table public.shop_product_waitlist force row level security;

-- Supabase default privileges grant new tables to anon and authenticated; take them back.
revoke all on table public.shop_product_waitlist from public;
revoke all on table public.shop_product_waitlist from anon;
revoke all on table public.shop_product_waitlist from authenticated;
grant select, insert, delete on table public.shop_product_waitlist to authenticated;
grant all on table public.shop_product_waitlist to service_role;

create policy shop_product_waitlist_select_own on public.shop_product_waitlist
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy shop_product_waitlist_insert_own on public.shop_product_waitlist
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy shop_product_waitlist_delete_own on public.shop_product_waitlist
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- No UPDATE grant or policy for authenticated. No anon access. No admin policy:
-- admin counts use service_role (BYPASSRLS, so FORCE does not block it), in a
-- future admin view that is out of scope.

comment on table public.shop_product_waitlist is
  'Shop per-product waiting list. Consumer health data (WA MHMDA). Internal launch planning only. No sharing, no ad or marketing audiences. Admin reads via service_role only. Users can delete their own rows (leave the list).';
