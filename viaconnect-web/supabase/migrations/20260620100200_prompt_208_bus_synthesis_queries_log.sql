-- Prompt 208 v2, Phase 1 (Gate A): the bus, per-user synthesis, conversational
-- capture, and run log. Append-only. RLS: user-scoped tables are owner-read;
-- bus is authenticated-read (published events only); run log is service-role only.

-- ---------------------------------------------------------------------------
-- knowledge_bus (spec 6.3): append-only event log of published atoms/rules.
-- seq gives subscribers a monotonic cursor (polling fallback when realtime drops).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_bus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq bigint GENERATED ALWAYS AS IDENTITY,
  event_type text NOT NULL CHECK (event_type IN (
    'atom_published','rule_published','atom_retired','rule_retired')),
  ref_table text NOT NULL CHECK (ref_table IN ('knowledge_atoms','snp_protocol_rules')),
  ref_id uuid NOT NULL,
  domain text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_bus_seq_idx ON public.knowledge_bus (seq);
ALTER TABLE public.knowledge_bus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_bus_select_all ON public.knowledge_bus;
CREATE POLICY knowledge_bus_select_all
  ON public.knowledge_bus FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- user_protocol_synthesis (spec 6.4): per-user derived output. Owner-read only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_protocol_synthesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_vitamins_minerals jsonb NOT NULL DEFAULT '[]'::jsonb,
  supplement_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  nutrition_guidance jsonb NOT NULL DEFAULT '{}'::jsonb,
  arnold_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  disclaimers_version text,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_protocol_synthesis_user_idx
  ON public.user_protocol_synthesis (user_id, generated_at DESC);
ALTER TABLE public.user_protocol_synthesis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_protocol_synthesis_select_own ON public.user_protocol_synthesis;
CREATE POLICY user_protocol_synthesis_select_own
  ON public.user_protocol_synthesis FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- knowledge_queries (spec 6.5): conversational capture. Owner-read only;
-- question_text NEVER readable cross-user. domain is the six newcomer domains.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL CHECK (domain IN (
    'genomics','nutraceuticals','biohacking','athletics','weightloss','longevity')),
  question_text text NOT NULL,
  question_normalized text,
  answer_summary text,
  cited_atom_ids uuid[] NOT NULL DEFAULT '{}',
  evidence_tiers_used smallint[] NOT NULL DEFAULT '{}',
  coverage text NOT NULL CHECK (coverage IN ('well_covered','partial','gap')),
  gap_topic text,
  embedding extensions.vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_queries_user_idx
  ON public.knowledge_queries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_queries_coverage_idx
  ON public.knowledge_queries (coverage);
CREATE INDEX IF NOT EXISTS knowledge_queries_embedding_hnsw
  ON public.knowledge_queries USING hnsw (embedding extensions.vector_cosine_ops);
ALTER TABLE public.knowledge_queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_queries_select_own ON public.knowledge_queries;
CREATE POLICY knowledge_queries_select_own
  ON public.knowledge_queries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- research_run_log (spec 6.6): one row per autonomous pass. Service-role only
-- (no authenticated policy); the internal health panel reads it server-side.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text,
  sources_queried text[] NOT NULL DEFAULT '{}',
  atoms_created integer NOT NULL DEFAULT 0,
  atoms_rejected integer NOT NULL DEFAULT 0,
  gaps_recorded integer NOT NULL DEFAULT 0,
  duration_ms integer,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','partial','error')),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS research_run_log_domain_idx
  ON public.research_run_log (domain, created_at DESC);
ALTER TABLE public.research_run_log ENABLE ROW LEVEL SECURITY;
-- No authenticated policy: reads are service-role only.
