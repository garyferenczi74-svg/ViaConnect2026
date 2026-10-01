-- Additive only. Votes reuse public.shop_product_waitlist. Not applied by merge.
-- Gary applies this file first (M1), then 20260930230100 (M2).
--
-- Hand-apply is atomic only when the whole file runs in one transaction.
-- Primary path:
--   psql -v ON_ERROR_STOP=1 --single-transaction -f <this file>
-- Do not put BEGIN or COMMIT in this file.
--
-- Join the Revolution rows stay email sign-ups (voted_at null).
-- A vote is the same row with voted_at set, written only by shop_cast_launch_vote.
-- No backfill. Old rows are not votes.

set local lock_timeout = '5s';

alter table public.shop_product_waitlist
  add column if not exists voted_at         timestamptz,
  add column if not exists discount_code_id uuid,
  add column if not exists notified_at      timestamptz;

create index if not exists shop_product_waitlist_votes_idx
  on public.shop_product_waitlist (product_id, voted_at) where voted_at is not null;

-- Direct client inserts must not be able to forge vote time, code or notify state.
create or replace function public.shop_product_waitlist_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' or current_user = 'anon' then
    new.voted_at := null;
    new.discount_code_id := null;
    new.notified_at := null;
  end if;
  return new;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'shop_product_waitlist_guard_bi'
       and tgrelid = 'public.shop_product_waitlist'::regclass
  ) then
    create trigger shop_product_waitlist_guard_bi
      before insert on public.shop_product_waitlist
      for each row execute function public.shop_product_waitlist_guard();
  end if;
end
$$;

-- The only client write path for a vote. Idempotent, one row per user and product.
create or replace function public.shop_cast_launch_vote(p_product_id uuid, p_source text default 'pdp')
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_at timestamptz;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '28000';
  end if;
  if p_source not in ('plp', 'pdp') then
    p_source := 'pdp';
  end if;
  if not exists (
    select 1 from public.products
     where id = p_product_id and active = true
  ) then
    raise exception 'product not found' using errcode = 'P0002';
  end if;
  insert into public.shop_product_waitlist as w (user_id, product_id, source, voted_at)
  values (v_uid, p_product_id, p_source, pg_catalog.now())
  on conflict (user_id, product_id)
  do update set voted_at = coalesce(w.voted_at, excluded.voted_at)
  returning voted_at into v_at;
  return v_at;
end
$$;

revoke all on function public.shop_cast_launch_vote(uuid, text) from public, anon;
grant execute on function public.shop_cast_launch_vote(uuid, text) to authenticated;
