-- Prompt 204 (2026-06-21): EpigenHQ member-result data source. EpigenHQ markers
-- are MEASURED epigenetic readouts (methylation age, indices, exposure
-- signatures), like lab biomarkers, so these tables mirror the lab_report_uploads
-- / lab_biomarkers pattern: a provenance upload row plus one results row per
-- marker, upserted on (user_id, marker_key, measured_on) so a re-upload on the
-- same date updates in place and different dates accumulate for a trend.
--
-- The direction (higher / lower / typical) is stored AS REPORTED by the test, not
-- computed from an invented reference cutoff. The surface uses it to pick the
-- authored higherSuggests / lowerSuggests interpretation. value_num holds a
-- numeric readout (epigenetic age, pace of aging, an age gap); value_text holds a
-- descriptive level where the readout is not numeric.

create table if not exists public.epigenetic_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_filename text,
  source_type text not null
    check (source_type in ('pdf_text', 'pdf_scanned', 'photo', 'csv', 'manual')),
  lab_name text,
  measured_on date not null,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.user_epigenetic_markers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  upload_id uuid not null references public.epigenetic_uploads(id) on delete cascade,
  -- Matches the EpigenHQ interpretation key (for example 'epigenetic-age').
  marker_key text not null,
  value_num numeric,
  value_text text,
  unit text,
  direction text check (direction in ('higher', 'lower', 'typical')),
  confidence text check (confidence in ('high', 'medium', 'low')),
  source_type text not null,
  measured_on date not null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_epigenetic_markers_user_marker_date_unique
  on public.user_epigenetic_markers (user_id, marker_key, measured_on);

create index if not exists user_epigenetic_markers_user_idx
  on public.user_epigenetic_markers (user_id, measured_on desc);

create index if not exists epigenetic_uploads_user_idx
  on public.epigenetic_uploads (user_id, created_at desc);

-- Owner-scoped RLS, identical posture to the genetics and lab tables.
alter table public.epigenetic_uploads enable row level security;
alter table public.user_epigenetic_markers enable row level security;

create policy "epigenetic_uploads_select_own" on public.epigenetic_uploads
  for select to authenticated using (auth.uid() = user_id);
create policy "epigenetic_uploads_insert_own" on public.epigenetic_uploads
  for insert to authenticated with check (auth.uid() = user_id);
create policy "epigenetic_uploads_update_own" on public.epigenetic_uploads
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "epigenetic_uploads_delete_own" on public.epigenetic_uploads
  for delete to authenticated using (auth.uid() = user_id);

create policy "user_epigenetic_markers_select_own" on public.user_epigenetic_markers
  for select to authenticated using (auth.uid() = user_id);
create policy "user_epigenetic_markers_insert_own" on public.user_epigenetic_markers
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_epigenetic_markers_update_own" on public.user_epigenetic_markers
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_epigenetic_markers_delete_own" on public.user_epigenetic_markers
  for delete to authenticated using (auth.uid() = user_id);
