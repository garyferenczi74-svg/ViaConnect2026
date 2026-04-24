-- =============================================================================
-- Prompt #126: Jeffery Command Center — Agent Panel Tasks + Metrics
-- (APPEND-ONLY, IDEMPOTENT)
-- =============================================================================
-- Scope correction: we reuse `ultrathink_agent_registry` and
-- `ultrathink_agent_events` (already seeded + realtime-published) as the
-- source of truth for agent identity and activity. We only add the two
-- concepts that don't already exist:
--
--   jeffery_agent_panel_tasks   per-agent in-flight task queue with progress
--   jeffery_agent_panel_metrics 15-minute rollups (tasks_done, tasks_failed,
--                               avg_duration_ms, tokens, api_calls)
--
-- Name prefix `jeffery_agent_panel_` isolates from the prior `agent_*` and
-- `ultrathink_agent_*` namespaces so there is zero collision with
-- 20260412000020_agent_activity_log.sql (a user-scoped AI call logger) or
-- the ultrathink fleet registry.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. jeffery_agent_panel_tasks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jeffery_agent_panel_tasks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              text NOT NULL,
  task_title            text NOT NULL,
  task_description      text,
  task_status           text NOT NULL DEFAULT 'queued'
                          CHECK (task_status IN ('queued','running','blocked','completed','failed','cancelled')),
  progress_percent      int NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  priority              text NOT NULL DEFAULT 'normal'
                          CHECK (priority IN ('low','normal','high','critical')),
  assigned_by_agent_id  text,
  correlation_id        uuid,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_japt_agent_status ON public.jeffery_agent_panel_tasks (agent_id, task_status);
CREATE INDEX IF NOT EXISTS idx_japt_active
  ON public.jeffery_agent_panel_tasks (agent_id, updated_at DESC)
  WHERE task_status IN ('queued','running','blocked');
CREATE INDEX IF NOT EXISTS idx_japt_correlation ON public.jeffery_agent_panel_tasks (correlation_id) WHERE correlation_id IS NOT NULL;

-- ── 2. jeffery_agent_panel_metrics ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jeffery_agent_panel_metrics (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              text NOT NULL,
  snapshot_at           timestamptz NOT NULL DEFAULT now(),
  tasks_completed       int NOT NULL DEFAULT 0,
  tasks_failed          int NOT NULL DEFAULT 0,
  avg_task_duration_ms  int,
  tokens_consumed       bigint NOT NULL DEFAULT 0,
  api_calls             bigint NOT NULL DEFAULT 0,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_japm_agent_time ON public.jeffery_agent_panel_metrics (agent_id, snapshot_at DESC);

-- ── updated_at trigger reused from compliance migrations ────────────────────
DROP TRIGGER IF EXISTS japt_touch ON public.jeffery_agent_panel_tasks;
CREATE TRIGGER japt_touch BEFORE UPDATE ON public.jeffery_agent_panel_tasks
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.jeffery_agent_panel_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jeffery_agent_panel_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only reads via profile.role gate. Reuses is_compliance_reader() for
-- superadmin/admin/compliance_admin parity across the Marshall + Jeffery admin
-- surfaces.
DROP POLICY IF EXISTS japt_admin_read ON public.jeffery_agent_panel_tasks;
CREATE POLICY japt_admin_read ON public.jeffery_agent_panel_tasks
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Admin + service_role UPDATE (pause action, status transitions). Service
-- role bypasses RLS, so policy only needs to gate authenticated writers.
DROP POLICY IF EXISTS japt_admin_write ON public.jeffery_agent_panel_tasks;
CREATE POLICY japt_admin_write ON public.jeffery_agent_panel_tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS japm_admin_read ON public.jeffery_agent_panel_metrics;
CREATE POLICY japm_admin_read ON public.jeffery_agent_panel_metrics
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- ── Realtime publication ────────────────────────────────────────────────────
DO $pub$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.jeffery_agent_panel_tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $pub$;

-- ── Seed a handful of sample rows so the UI renders before first live tick ──
-- Conservative: one queued row per featured agent. These show as sample
-- entries on first admin load; live data overwrites as agents emit.
INSERT INTO public.jeffery_agent_panel_tasks (agent_id, task_title, task_status, priority)
SELECT v.agent_id, v.task_title, 'queued', 'normal'
FROM (VALUES
  ('jeffery',      'Awaiting next orchestration tick'),
  ('hannah',       'Idle: no active tutorial session'),
  ('michelangelo', 'Idle: no OBRA review in flight'),
  ('sherlock',     'Idle: research queue empty'),
  ('arnold',       'Idle: reconciliation queue empty')
) AS v(agent_id, task_title)
WHERE NOT EXISTS (
  SELECT 1 FROM public.jeffery_agent_panel_tasks t WHERE t.agent_id = v.agent_id
);
