-- Prompt 187 (2026-06-11): unified source agnostic nutrition findings. Both
-- NutrigenDX (Prompt 188) and uploaded test Hannah AI results write into this
-- one normalized table so the Recommendations tab has a single read path.
-- Append only. Rows are NEVER deleted: a newer analysis run for the same
-- source sets superseded_at on the prior run's rows. The client only reads
-- (owner only select). All writes come from edge functions via the service
-- role with explicit user_id stamping.
-- Applied to live via MCP 2026-06-11.

create table if not exists public.nutrition_genetic_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source text not null check (source in ('nutrigendx','uploaded_test')),
  source_ref_id uuid not null,
  category text not null check (category in ('food','vitamin','mineral','other')),
  item_name text not null,
  item_slug text not null,
  direction text not null check (direction in ('need','avoid','neutral','unknown')),
  strength text not null check (strength in ('strong','moderate','weak')),
  confidence text not null check (confidence in ('high','medium','low')),
  estimated boolean not null default true,
  rationale text,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);

comment on table public.nutrition_genetic_findings is
  'Prompt 187: normalized nutrition findings from NutrigenDX results or uploaded third party tests. Source precedence at read time: nutrigendx wins per item_slug, uploaded_test fills gaps. Supersede, never delete.';

create index if not exists ngf_user_active_idx
  on public.nutrition_genetic_findings (user_id, item_slug)
  where superseded_at is null;

create index if not exists ngf_user_source_idx
  on public.nutrition_genetic_findings (user_id, source, created_at desc);

create index if not exists ngf_source_ref_idx
  on public.nutrition_genetic_findings (source_ref_id);

alter table public.nutrition_genetic_findings enable row level security;

create policy "ngf_select_own" on public.nutrition_genetic_findings
  for select to authenticated
  using (auth.uid() = user_id);
