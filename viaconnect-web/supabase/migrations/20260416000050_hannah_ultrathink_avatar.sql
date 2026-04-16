-- Prompt #88: Hannah Ultrathink™ + Avatar Expansion
-- Six new tables for Ultrathink sessions, traces, evidence citations,
-- avatar sessions, avatar transcripts, and Jeffery routing log.
-- All additive. No changes to existing tables.

-- ── 4.1 hannah_ultrathink_sessions ───────��──────────────────────────────
create table public.hannah_ultrathink_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jeffery_trace_id uuid,
  tier text not null check (tier in ('fast','standard','ultrathink')),
  modality text not null check (modality in ('text','avatar')),
  query_hash text not null,
  input_tokens integer,
  output_tokens integer,
  thinking_tokens integer,
  latency_ms integer,
  confidence numeric(3,2),
  escalated_from_tier text,
  guardrails_triggered text[],
  error text,
  created_at timestamptz not null default now()
);

alter table public.hannah_ultrathink_sessions enable row level security;

create policy "users see own sessions"
  on public.hannah_ultrathink_sessions for select
  using (auth.uid() = user_id);

create policy "service role writes sessions"
  on public.hannah_ultrathink_sessions for insert
  with check (auth.uid() = user_id);

create index idx_hannah_ut_sessions_user
  on public.hannah_ultrathink_sessions(user_id, created_at desc);

create index idx_hannah_ut_sessions_tier
  on public.hannah_ultrathink_sessions(tier, created_at desc);


-- ── 4.2 hannah_ultrathink_traces ───────────────────���────────────────────
create table public.hannah_ultrathink_traces (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.hannah_ultrathink_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  thinking_summary text,
  reasoning_steps jsonb,
  retrieved_sources jsonb,
  critique_passed boolean,
  critique_notes text,
  created_at timestamptz not null default now()
);

alter table public.hannah_ultrathink_traces enable row level security;

create policy "users see own traces"
  on public.hannah_ultrathink_traces for select
  using (auth.uid() = user_id);

create policy "service role writes traces"
  on public.hannah_ultrathink_traces for insert
  with check (auth.uid() = user_id);

create index idx_hannah_ut_traces_session
  on public.hannah_ultrathink_traces(session_id);


-- ── 4.3 hannah_evidence_citations ───────────────��───────────────────────
create table public.hannah_evidence_citations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.hannah_ultrathink_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id text,
  source_title text,
  source_url text,
  relevance_score numeric(3,2),
  rank integer,
  created_at timestamptz not null default now()
);

alter table public.hannah_evidence_citations enable row level security;

create policy "users see own citations"
  on public.hannah_evidence_citations for select
  using (auth.uid() = user_id);

create policy "service role writes citations"
  on public.hannah_evidence_citations for insert
  with check (auth.uid() = user_id);

create index idx_hannah_ec_session
  on public.hannah_evidence_citations(session_id, rank);


-- ── 4.4 hannah_avatar_sessions ──────────────────────────────────────────
create table public.hannah_avatar_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tavus_conversation_id text not null unique,
  tavus_replica_id text not null,
  tavus_persona_id text not null,
  baa_confirmed boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  end_reason text,
  error text,
  created_at timestamptz not null default now()
);

alter table public.hannah_avatar_sessions enable row level security;

create policy "users see own avatar sessions"
  on public.hannah_avatar_sessions for select
  using (auth.uid() = user_id);

create policy "users create own avatar sessions"
  on public.hannah_avatar_sessions for insert
  with check (auth.uid() = user_id);

create policy "users update own avatar sessions"
  on public.hannah_avatar_sessions for update
  using (auth.uid() = user_id);

create index idx_hannah_avatar_user
  on public.hannah_avatar_sessions(user_id, started_at desc);


-- ── 4.5 hannah_avatar_transcripts ─────────────────────��─────────────────
create table public.hannah_avatar_transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.hannah_avatar_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_index integer not null,
  speaker text not null check (speaker in ('user','hannah')),
  text_redacted text not null,
  sentiment text,
  created_at timestamptz not null default now()
);

alter table public.hannah_avatar_transcripts enable row level security;

create policy "users see own transcripts"
  on public.hannah_avatar_transcripts for select
  using (auth.uid() = user_id);

create policy "service role writes transcripts"
  on public.hannah_avatar_transcripts for insert
  with check (auth.uid() = user_id);

create index idx_hannah_avatar_transcripts_session
  on public.hannah_avatar_transcripts(session_id, turn_index);


-- ── 4.6 jeffery_hannah_routing_log ─────────────────���────────────────────
create table public.jeffery_hannah_routing_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_hash text not null,
  chose_tier text not null check (chose_tier in ('fast','standard','ultrathink')),
  chose_modality text not null check (chose_modality in ('text','avatar')),
  reason text,
  auto_escalated boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.jeffery_hannah_routing_log enable row level security;

create policy "users see own routing"
  on public.jeffery_hannah_routing_log for select
  using (auth.uid() = user_id);

create policy "service role writes routing"
  on public.jeffery_hannah_routing_log for insert
  with check (auth.uid() = user_id);

create index idx_jhr_user
  on public.jeffery_hannah_routing_log(user_id, created_at desc);
