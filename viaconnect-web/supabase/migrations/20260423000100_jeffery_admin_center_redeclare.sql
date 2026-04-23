-- =============================================================================
-- Prompt #60c REDECLARE: Jeffery Admin Command Center (APPEND-ONLY, IDEMPOTENT)
-- =============================================================================
-- The original 20260408000050_jeffery_admin_center.sql is a 27-line stub; the
-- real DDL was applied live via mcp and never captured on disk. This migration
-- re-declares the same objects idempotently so any clean-room rebuild or
-- `supabase db reset` boots a working admin center instead of a dead one.
--
-- Safe to run on a live DB: every object uses CREATE ... IF NOT EXISTS,
-- CREATE OR REPLACE, or DROP POLICY IF EXISTS so existing rows and policies
-- are preserved.
--
-- Tables:
--   jeffery_messages           every Jeffery action/proposal
--   jeffery_message_comments   admin comments + inline directives
--   jeffery_directives         high-level steering from admin
--   jeffery_learning_log       lessons from admin feedback
--   jeffery_knowledge_entries  knowledge facts Jeffery has consumed
--
-- RPC: jeffery_emit_message(...) uniform emit + auto-apply gate
-- RLS: strict admin-only (profiles.role='admin'), author pinned on writes
-- Realtime: jeffery_messages, jeffery_message_comments on supabase_realtime
-- =============================================================================

-- ── 1. jeffery_messages ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jeffery_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category        text NOT NULL,
  severity        text NOT NULL DEFAULT 'info',
  title           text NOT NULL,
  summary         text NOT NULL,
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_agent    text,
  source_context  jsonb,
  status          text NOT NULL DEFAULT 'pending',
  proposed_action jsonb,
  applied_action  jsonb,
  applied_at      timestamptz,
  reviewed_at     timestamptz,
  reviewed_by     uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 2. jeffery_message_comments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jeffery_message_comments (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id                   uuid NOT NULL REFERENCES public.jeffery_messages(id) ON DELETE CASCADE,
  author_id                    uuid NOT NULL,
  content                      text NOT NULL,
  is_directive                 boolean NOT NULL DEFAULT false,
  directive_acknowledged       boolean DEFAULT false,
  directive_acknowledged_at    timestamptz,
  created_at                   timestamptz NOT NULL DEFAULT now()
);

-- ── 3. jeffery_directives ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jeffery_directives (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id               uuid NOT NULL,
  title                   text NOT NULL,
  instruction             text NOT NULL,
  priority                text NOT NULL DEFAULT 'normal',
  scope                   text NOT NULL DEFAULT 'global',
  status                  text NOT NULL DEFAULT 'active',
  jeffery_acknowledgment  text,
  jeffery_progress        jsonb,
  acknowledged_at         timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── 4. jeffery_learning_log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jeffery_learning_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type         text NOT NULL,
  source_id           uuid,
  lesson              text NOT NULL,
  lesson_category     text,
  config_changes      jsonb,
  applied_to_agents   text[],
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 5. jeffery_knowledge_entries ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jeffery_knowledge_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid REFERENCES public.jeffery_messages(id) ON DELETE SET NULL,
  entry_type      text NOT NULL,
  entry_title     text NOT NULL,
  entry_summary   text,
  entry_data      jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url      text,
  source_name     text,
  confidence      numeric,
  admin_verified  boolean DEFAULT false,
  admin_notes     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes (performance advisor coverage) ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jeffery_messages_status_created
  ON public.jeffery_messages (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jeffery_messages_category_created
  ON public.jeffery_messages (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jeffery_messages_severity_created
  ON public.jeffery_messages (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jeffery_messages_source_agent
  ON public.jeffery_messages (source_agent, created_at DESC)
  WHERE source_agent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jeffery_msg_comments_msg
  ON public.jeffery_message_comments (message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jeffery_msg_comments_author
  ON public.jeffery_message_comments (author_id);

CREATE INDEX IF NOT EXISTS idx_jeffery_directives_status_created
  ON public.jeffery_directives (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jeffery_directives_author
  ON public.jeffery_directives (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jeffery_learning_source
  ON public.jeffery_learning_log (source_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jeffery_learning_source_id
  ON public.jeffery_learning_log (source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jeffery_knowledge_type_verified_created
  ON public.jeffery_knowledge_entries (entry_type, admin_verified, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jeffery_knowledge_msg
  ON public.jeffery_knowledge_entries (message_id)
  WHERE message_id IS NOT NULL;

-- Trigram index powers server-side ilike search from KnowledgeExplorer.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_jeffery_knowledge_title_trgm
  ON public.jeffery_knowledge_entries USING gin (entry_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jeffery_knowledge_summary_trgm
  ON public.jeffery_knowledge_entries USING gin (entry_summary gin_trgm_ops);

-- ── RLS: strict admin-only, author pinned on writes ──────────────────────────
ALTER TABLE public.jeffery_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jeffery_message_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jeffery_directives          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jeffery_learning_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jeffery_knowledge_entries   ENABLE ROW LEVEL SECURITY;

-- jeffery_messages: admin read + admin update (approvals).
DROP POLICY IF EXISTS jm_admin_select   ON public.jeffery_messages;
DROP POLICY IF EXISTS jm_admin_update   ON public.jeffery_messages;
CREATE POLICY jm_admin_select ON public.jeffery_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY jm_admin_update ON public.jeffery_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
-- INSERT is restricted to SECURITY DEFINER RPC jeffery_emit_message (no policy
-- for INSERT = authenticated users cannot insert directly). Service role
-- bypasses RLS, so the RPC (and the Next service client) can always emit.

-- jeffery_message_comments: admin read + admin insert with author pinned.
DROP POLICY IF EXISTS jmc_admin_select       ON public.jeffery_message_comments;
DROP POLICY IF EXISTS jmc_admin_insert_owned ON public.jeffery_message_comments;
DROP POLICY IF EXISTS jmc_admin_update_owned ON public.jeffery_message_comments;
CREATE POLICY jmc_admin_select ON public.jeffery_message_comments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY jmc_admin_insert_owned ON public.jeffery_message_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY jmc_admin_update_owned ON public.jeffery_message_comments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- jeffery_directives: admin read + admin insert with author pinned.
DROP POLICY IF EXISTS jd_admin_select       ON public.jeffery_directives;
DROP POLICY IF EXISTS jd_admin_insert_owned ON public.jeffery_directives;
DROP POLICY IF EXISTS jd_admin_update_owned ON public.jeffery_directives;
CREATE POLICY jd_admin_select ON public.jeffery_directives
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY jd_admin_insert_owned ON public.jeffery_directives
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY jd_admin_update_owned ON public.jeffery_directives
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- jeffery_learning_log: admin read only; writes via service role.
DROP POLICY IF EXISTS jll_admin_select ON public.jeffery_learning_log;
CREATE POLICY jll_admin_select ON public.jeffery_learning_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- jeffery_knowledge_entries: admin read + admin update (verify); writes via service role.
DROP POLICY IF EXISTS jke_admin_select ON public.jeffery_knowledge_entries;
DROP POLICY IF EXISTS jke_admin_update ON public.jeffery_knowledge_entries;
CREATE POLICY jke_admin_select ON public.jeffery_knowledge_entries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY jke_admin_update ON public.jeffery_knowledge_entries
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ── jeffery_emit_message RPC: uniform emit + auto-apply gate ─────────────────
-- severity info|advisory  → status='auto_applied'
-- severity review_required → status='pending'
-- severity critical         → status='pending' (admin UI banner via Realtime)
CREATE OR REPLACE FUNCTION public.jeffery_emit_message(
  p_category        text,
  p_severity        text,
  p_title           text,
  p_summary         text,
  p_detail          jsonb,
  p_source_agent    text,
  p_source_context  jsonb,
  p_proposed_action jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id      uuid;
  v_status  text;
BEGIN
  v_status := CASE
    WHEN p_severity IN ('info', 'advisory') THEN 'auto_applied'
    ELSE 'pending'
  END;

  INSERT INTO public.jeffery_messages (
    category, severity, title, summary, detail,
    source_agent, source_context, status, proposed_action,
    applied_action, applied_at
  ) VALUES (
    p_category, p_severity, p_title, p_summary, COALESCE(p_detail, '{}'::jsonb),
    p_source_agent, p_source_context, v_status, p_proposed_action,
    CASE WHEN v_status = 'auto_applied' THEN p_proposed_action ELSE NULL END,
    CASE WHEN v_status = 'auto_applied' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.jeffery_emit_message(text, text, text, text, jsonb, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jeffery_emit_message(text, text, text, text, jsonb, text, jsonb, jsonb) TO authenticated, service_role;

-- ── Realtime publication ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jeffery_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jeffery_messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jeffery_message_comments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jeffery_message_comments';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- supabase_realtime publication doesn't exist yet; ignore in non-hosted envs.
    NULL;
END $$;

-- ── Trigger: keep jeffery_directives.updated_at current ──────────────────────
CREATE OR REPLACE FUNCTION public.jeffery_directives_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jd_touch_updated_at ON public.jeffery_directives;
CREATE TRIGGER jd_touch_updated_at
  BEFORE UPDATE ON public.jeffery_directives
  FOR EACH ROW EXECUTE FUNCTION public.jeffery_directives_touch_updated_at();
