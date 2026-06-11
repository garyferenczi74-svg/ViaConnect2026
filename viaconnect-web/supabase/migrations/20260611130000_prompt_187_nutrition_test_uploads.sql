-- Prompt 187 (2026-06-11): third party nutrition test uploads analyzed by Hannah.
-- Append only. Owner only RLS on select, insert, update. NO delete policy:
-- upload history is retained. Status transitions are written by the
-- hannah-analyze-nutrition-test edge function via the service role.
-- Applied to live via MCP 2026-06-11.

create table if not exists public.nutrition_test_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  source_company text,
  status text not null default 'uploaded'
    check (status in ('uploaded','analyzing','analyzed','failed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  analyzed_at timestamptz
);

comment on table public.nutrition_test_uploads is
  'Prompt 187: user uploaded third party nutrition or nutrigenomic test files (PDF, image, CSV) stored in the private nutrition-test-uploads bucket and analyzed by the hannah-analyze-nutrition-test edge function.';

create index if not exists nutrition_test_uploads_user_created_idx
  on public.nutrition_test_uploads (user_id, created_at desc);

alter table public.nutrition_test_uploads enable row level security;

create policy "ntu_select_own" on public.nutrition_test_uploads
  for select to authenticated
  using (auth.uid() = user_id);

create policy "ntu_insert_own" on public.nutrition_test_uploads
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "ntu_update_own" on public.nutrition_test_uploads
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
