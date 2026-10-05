-- NOT APPLIED. DRAFT. Do not run. Do not move into supabase/migrations.
-- Do not pass this file to supabase db push or psql against production.
--
-- Purpose: append-only display log for the pre-launch lock on Tesofensine
-- and BPC-157 (aliases included). Display only. products.ingredients,
-- product_catalog.formulation_json, and master formulation rows are not updated.
--
-- Code enforces the lock without this table:
--   src/lib/shop/lockedIngredientDisplay.ts
--   default hidden until LOCKED_INGREDIENT_DISPLAY=show
-- This file is the who-confirmed record for when Gary applies it by hand.
--
-- Confirmation: Gary Soft GO 2026-10-05 via Jeffery. Elizabeth lock via Lex.
-- SKUs below are the rows the 2026-10-03 inventory and the repo master
-- formulations actually carry. No other ingredient was added.
--
-- Convention follows 20260926200100_shop_product_waitlist.sql:
-- additive, guarded, RLS forced, hand-applied later with:
--   psql -v ON_ERROR_STOP=1 --single-transaction -f <file>
-- No BEGIN/COMMIT in this file.

set local lock_timeout = '5s';

create table if not exists public.product_ingredient_display_log (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null,
  ingredient_key   text not null,
  ingredient_label text,
  hidden           boolean not null default false,
  confirmed_by     text,
  confirmed_at     timestamptz,
  note             text,
  created_at       timestamptz not null default now(),
  constraint display_hide_requires_confirmation check (
    hidden = false
    or (
      confirmed_by is not null and length(btrim(confirmed_by)) > 0
      and confirmed_at is not null
      and note is not null and length(btrim(note)) > 0
    )
  )
);

create index if not exists product_ingredient_display_log_lookup
  on public.product_ingredient_display_log (sku, ingredient_key, created_at desc);

alter table public.product_ingredient_display_log enable row level security;
alter table public.product_ingredient_display_log force row level security;
revoke all on table public.product_ingredient_display_log from public;
revoke all on table public.product_ingredient_display_log from anon;
revoke all on table public.product_ingredient_display_log from authenticated;
grant all on table public.product_ingredient_display_log to service_role;

-- Latest decision per sku + ingredient. No staff names.
-- security_invoker: callers need their own table grant. service_role has it.
-- anon and authenticated are not granted, so shop code does not read this view.
-- The app lock fails closed in code when this table is absent.
create or replace view public.product_ingredient_display_hidden
with (security_invoker = true) as
select sku, ingredient_key
from (
  select distinct on (sku, ingredient_key)
    sku, ingredient_key, hidden, confirmed_by, confirmed_at
  from public.product_ingredient_display_log
  order by sku, ingredient_key, created_at desc, id desc
) latest
where hidden and confirmed_by is not null and confirmed_at is not null;

revoke all on public.product_ingredient_display_hidden from public;
revoke all on public.product_ingredient_display_hidden from anon;
revoke all on public.product_ingredient_display_hidden from authenticated;
grant select on public.product_ingredient_display_hidden to service_role;

-- Confirmation rows. Insert once. Re-running does not update history.
insert into public.product_ingredient_display_log (
  sku, ingredient_key, ingredient_label, hidden, confirmed_by, confirmed_at, note
)
select
  v.sku,
  v.ingredient_key,
  v.ingredient_label,
  true,
  'Gary Ferenczi',
  timestamptz '2026-10-05 00:00:00+00',
  'Gary Soft GO 2026-10-05 via Jeffery. Elizabeth lock via Lex. Display-only until after launch. Ingredient data stays in the database. On-site Supplement Facts must match the final label before the code flag is set to show.'
from (
  values
    ('FC-HISTAMINE-001', 'bpc-157', 'Liposomal BPC-157 Peptide'),
    ('FC-THRIVE-001', 'bpc-157', 'BPC 157'),
    ('FC-BALANCE-001', 'bpc-157', 'Liposomal BPC-157'),
    ('FC-INFERNO-001', 'bpc-157', 'Liposomal Body-Protective Compound'),
    ('FC-GLP1-001', 'tesofensine', 'Tesofensine (botanical analog mimic)'),
    ('FC-CATALYST-001', 'tesofensine', 'Tesofensine'),
    ('FC-SHRED-001', 'tesofensine', 'Liposomal Tesofensine')
) as v(sku, ingredient_key, ingredient_label)
where not exists (
  select 1
  from public.product_ingredient_display_log existing
  where existing.sku = v.sku
    and existing.ingredient_key = v.ingredient_key
    and existing.hidden = true
    and existing.confirmed_by = 'Gary Ferenczi'
    and existing.confirmed_at = timestamptz '2026-10-05 00:00:00+00'
);
