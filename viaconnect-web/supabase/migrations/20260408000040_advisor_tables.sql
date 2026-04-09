-- =============================================================================
-- Prompt #60b: Jeffery™ AI Advisor Portal Tables (APPEND-ONLY)
-- =============================================================================
-- Adapted to actual ViaConnect schema reality:
--   - No `practitioner_patients` table → uses public.protocol_shares (provider_id, patient_id, status)
--   - No `profiles.user_type`         → role detection happens in the API route (presence in naturopath_profiles or admin role)
--   - `profiles.role` only has values 'admin' and 'patient'
--
-- Six new tables:
--   1. ultrathink_advisor_prompts             — versioned per-role system prompts
--   2. ultrathink_jeffery_advisor_config      — Jeffery's behavioral nudges per role
--   3. ultrathink_advisor_conversations       — per-message log
--   4. ultrathink_advisor_ratings             — user thumbs up/down feedback
--   5. ultrathink_advisor_query_log           — Jeffery's analytical query log
--   6. ultrathink_advisor_evolution_reports   — weekly per-role evolution snapshots
--
-- Plus: 3 seeded system prompts (consumer, practitioner, naturopath).
--
-- RLS designed to satisfy the security advisor: every INSERT/UPDATE/DELETE
-- policy uses a real constraint (no WITH CHECK true).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ultrathink_advisor_prompts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role            text NOT NULL CHECK (role IN ('consumer','practitioner','naturopath')),
  system_prompt   text NOT NULL,
  version         integer NOT NULL DEFAULT 1,
  is_active       boolean NOT NULL DEFAULT false,
  created_by      text NOT NULL DEFAULT 'jeffery',
  created_at      timestamptz NOT NULL DEFAULT now(),
  deactivated_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_prompts_active_role
  ON public.ultrathink_advisor_prompts (role) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.ultrathink_jeffery_advisor_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role            text NOT NULL CHECK (role IN ('consumer','practitioner','naturopath')),
  instructions    text NOT NULL,
  reason          text,
  auto_applied    boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisor_config_role_active
  ON public.ultrathink_jeffery_advisor_config (role) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.ultrathink_advisor_conversations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advisor_role        text NOT NULL CHECK (advisor_role IN ('consumer','practitioner','naturopath')),
  patient_id          uuid REFERENCES auth.users(id),
  message_role        text NOT NULL CHECK (message_role IN ('user','assistant','system')),
  content             text NOT NULL,
  response_length     integer,
  confidence          numeric,
  escalated           boolean NOT NULL DEFAULT false,
  guardrail_triggered boolean NOT NULL DEFAULT false,
  guardrail_type      text,
  category            text,
  context_snapshot    jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisor_conv_user_role ON public.ultrathink_advisor_conversations (user_id, advisor_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisor_conv_patient   ON public.ultrathink_advisor_conversations (patient_id, advisor_role, created_at DESC) WHERE patient_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ultrathink_advisor_ratings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ultrathink_advisor_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating          integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisor_ratings_user ON public.ultrathink_advisor_ratings (user_id);

CREATE TABLE IF NOT EXISTS public.ultrathink_advisor_query_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advisor_role        text NOT NULL,
  patient_id          uuid,
  message             text NOT NULL,
  context_snapshot    jsonb,
  response_time_ms    integer,
  tokens_used         integer,
  model_used          text DEFAULT 'claude-sonnet-4-6',
  satisfaction_rating integer,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisor_query_log_role_time ON public.ultrathink_advisor_query_log (advisor_role, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ultrathink_advisor_evolution_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role                  text NOT NULL,
  week_of               date NOT NULL,
  metrics               jsonb NOT NULL,
  degradation_detected  boolean NOT NULL DEFAULT false,
  actions_taken         jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_evo_role_week ON public.ultrathink_advisor_evolution_reports (role, week_of);

ALTER TABLE public.ultrathink_advisor_prompts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ultrathink_jeffery_advisor_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ultrathink_advisor_conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ultrathink_advisor_ratings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ultrathink_advisor_query_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ultrathink_advisor_evolution_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY advisor_prompts_read         ON public.ultrathink_advisor_prompts          FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY advisor_config_read          ON public.ultrathink_jeffery_advisor_config   FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY advisor_query_log_read       ON public.ultrathink_advisor_query_log        FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY advisor_evo_read             ON public.ultrathink_advisor_evolution_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY advisor_conv_select_own      ON public.ultrathink_advisor_conversations FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY advisor_conv_insert_own      ON public.ultrathink_advisor_conversations FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND advisor_role IN ('consumer','practitioner','naturopath'));
CREATE POLICY advisor_conv_select_provider ON public.ultrathink_advisor_conversations FOR SELECT TO authenticated USING (patient_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.protocol_shares ps WHERE ps.provider_id = (SELECT auth.uid()) AND ps.patient_id = ultrathink_advisor_conversations.patient_id AND ps.status = 'active'));

CREATE POLICY advisor_ratings_select       ON public.ultrathink_advisor_ratings FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY advisor_ratings_insert       ON public.ultrathink_advisor_ratings FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND rating BETWEEN 1 AND 5 AND EXISTS (SELECT 1 FROM public.ultrathink_advisor_conversations c WHERE c.id = conversation_id AND c.user_id = (SELECT auth.uid())));

-- Seed prompts: see migration applied via mcp; prompts are inserted there with the
-- same content. This file is the disk record for git history / future restores.
