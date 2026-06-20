-- Prompt 207a: private per-user custom beverages + custom-beverage link on the
-- hydration telemetry row. Additive only. Mirrors the hydration_log_sessions
-- four-policy own-row RLS pattern keyed on caq_compute_user_hash(auth.uid()).

create table if not exists public.user_beverages (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null default caq_compute_user_hash(auth.uid()),
  display_name text not null,
  category text not null,
  hydration_source_kind text not null,
  default_volume_ml integer not null default 240,
  hydration_coefficient numeric not null default 1.00,
  caffeine_mg_per_serving integer not null default 0,
  is_alcoholic boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_beverages_category_check
    check (category = any (array['water','coffee','tea','juice','pop','sports_energy','milk','functional','alcohol'])),
  constraint user_beverages_source_kind_check
    check (hydration_source_kind = any (array['pure_water','coffee_tea','juice_smoothie','dairy','soda','alcohol_low','alcohol_high','sports_drink','high_water_food'])),
  constraint user_beverages_volume_check check (default_volume_ml > 0 and default_volume_ml <= 5000)
);

create index if not exists idx_user_beverages_user_hash_active
  on public.user_beverages (user_hash, is_active) where is_active = true;

alter table public.user_beverages enable row level security;

create policy ub_select_own on public.user_beverages for select
  using (user_hash = caq_compute_user_hash(auth.uid()));
create policy ub_insert_own on public.user_beverages for insert
  with check (user_hash = caq_compute_user_hash(auth.uid()));
create policy ub_update_own on public.user_beverages for update
  using (user_hash = caq_compute_user_hash(auth.uid()))
  with check (user_hash = caq_compute_user_hash(auth.uid()));
create policy ub_delete_own on public.user_beverages for delete
  using (user_hash = caq_compute_user_hash(auth.uid()));

alter table public.hydration_log_sessions
  add column if not exists user_beverage_id uuid null
  references public.user_beverages(id) on delete set null;

create index if not exists idx_hls_user_beverage_id
  on public.hydration_log_sessions (user_beverage_id) where user_beverage_id is not null;
