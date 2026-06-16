-- Prompt 201: Hume Body Pod Plug-In and Connected Sources Build-Out.
-- Additive only. Creates the normalized body-composition readings store, the
-- per-source connection state table (absent from live), and the Apple Health
-- import staging table. No existing table or applied migration is edited.
--
-- All comments use hyphens only. No em-dashes or en-dashes.

-- ---------------------------------------------------------------------------
-- 1. body_composition_readings: one normalized row per source reading.
--    The single ingestion funnel writes here; Arnold reconciliation marks the
--    winner per (metric_key, time window) and retains the alternates for
--    provenance. value is null when the metric is UNKNOWN (never zero).
-- ---------------------------------------------------------------------------
create table if not exists public.body_composition_readings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source_id     text not null,                       -- registry id, e.g. apple_health
  device_origin text,                                -- hume_body_pod when attributed, else null
  metric_key    text not null,                       -- weight, body_fat_pct, lean_mass, bmi, extended keys
  value         numeric,                             -- null permitted (UNKNOWN)
  unit          text not null,                       -- canonical unit (kg, pct, etc.)
  measured_at   timestamptz not null,
  external_id   text,                                -- stable per source record, for idempotency
  is_estimated  boolean not null default false,
  confidence    text not null default 'unknown',     -- high, medium, low, unknown
  is_resolved   boolean not null default false,      -- reconciliation winner for its window
  superseded_by uuid references public.body_composition_readings(id) on delete set null,
  metadata      jsonb not null default '{}'::jsonb,  -- original unit, raw source values, audit
  created_at    timestamptz not null default now()
);

-- Idempotency: re-importing the same export file is a no-op. coalesce keeps the
-- dedup deterministic when external_id is null (manual entries stay distinct
-- because the funnel leaves their external_id null only when intended).
create unique index if not exists body_composition_readings_idem
  on public.body_composition_readings (user_id, source_id, metric_key, measured_at, coalesce(external_id, ''));

create index if not exists body_composition_readings_user_metric
  on public.body_composition_readings (user_id, metric_key, measured_at desc);

alter table public.body_composition_readings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'body_composition_readings'
      and policyname = 'Users manage own body composition readings'
  ) then
    create policy "Users manage own body composition readings"
      on public.body_composition_readings
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. body_tracker_connections: per-source connection state. Created defensively
--    with create-if-not-exists then add-column-if-not-exists so it converges to
--    the Prompt 201 shape whether or not a prior unapplied migration created it.
-- ---------------------------------------------------------------------------
create table if not exists public.body_tracker_connections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  source_id  text not null,
  created_at timestamptz not null default now()
);

alter table public.body_tracker_connections add column if not exists status text not null default 'disconnected';
alter table public.body_tracker_connections add column if not exists last_sync_at timestamptz;
alter table public.body_tracker_connections add column if not exists auth_method text;
alter table public.body_tracker_connections add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.body_tracker_connections add column if not exists updated_at timestamptz not null default now();

create unique index if not exists body_tracker_connections_user_source
  on public.body_tracker_connections (user_id, source_id);

alter table public.body_tracker_connections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'body_tracker_connections'
      and policyname = 'Users manage own body tracker connections'
  ) then
    create policy "Users manage own body tracker connections"
      on public.body_tracker_connections
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. apple_health_imports: staging row per uploaded Apple Health export so a
--    parse is re-runnable and auditable.
-- ---------------------------------------------------------------------------
create table if not exists public.apple_health_imports (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  file_name         text,
  status            text not null default 'pending',  -- pending, parsing, complete, error
  records_seen      integer not null default 0,
  records_ingested  integer not null default 0,
  records_deduped   integer not null default 0,
  records_attributed_hume integer not null default 0,
  date_range_start  timestamptz,
  date_range_end    timestamptz,
  error             text,
  created_at        timestamptz not null default now()
);

create index if not exists apple_health_imports_user
  on public.apple_health_imports (user_id, created_at desc);

alter table public.apple_health_imports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'apple_health_imports'
      and policyname = 'Users manage own apple health imports'
  ) then
    create policy "Users manage own apple health imports"
      on public.apple_health_imports
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
