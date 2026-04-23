-- =============================================================================
-- Prompt #113 Phase 1.3: Kelsey verdict cache/log + append-only audit log +
-- DSHEA disclaimer impression log. Also activates the fda_hc_regulatory_trigger
-- notification event stub seeded by Prompt #112 (default_enabled = TRUE).
-- Audit tables use the shared block_audit_mutation() trigger function.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- regulatory_kelsey_reviews: Kelsey verdicts. Also doubles as the 90-day
-- cache keyed by subject_text_hash + jurisdiction_id (one-pass dedupe).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_kelsey_reviews (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type         TEXT NOT NULL CHECK (subject_type IN ('protocol','social_post','claim','video_script','marketing_copy','alert','cache_probe')),
  subject_id           UUID NOT NULL,
  subject_text_hash    TEXT NOT NULL,
  subject_text_excerpt TEXT NOT NULL CHECK (length(subject_text_excerpt) <= 500),
  jurisdiction_id      UUID NOT NULL REFERENCES public.regulatory_jurisdictions(id),
  verdict              TEXT NOT NULL CHECK (verdict IN ('APPROVED','CONDITIONAL','BLOCKED','ESCALATE')),
  rationale            TEXT NOT NULL,
  rule_references      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_rewrite    TEXT,
  confidence           NUMERIC(4,3),
  stage_1_flags        JSONB NOT NULL DEFAULT '[]'::JSONB,
  stage_2_raw          JSONB,
  reviewed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewer_model       TEXT NOT NULL DEFAULT 'claude-sonnet-4-6'
);

CREATE INDEX IF NOT EXISTS idx_regkr_subject ON public.regulatory_kelsey_reviews (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_regkr_verdict ON public.regulatory_kelsey_reviews (verdict, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_regkr_hash    ON public.regulatory_kelsey_reviews (subject_text_hash, jurisdiction_id, reviewed_at DESC);

ALTER TABLE public.regulatory_kelsey_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_kelsey_reviews' AND policyname='regkr_read_admin') THEN
    CREATE POLICY "regkr_read_admin" ON public.regulatory_kelsey_reviews FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin','medical')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_kelsey_reviews' AND policyname='regkr_insert_admin') THEN
    CREATE POLICY "regkr_insert_admin" ON public.regulatory_kelsey_reviews FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- Kelsey verdicts are immutable once written; updating a verdict means a new row.
DROP TRIGGER IF EXISTS regkr_append_only_upd ON public.regulatory_kelsey_reviews;
CREATE TRIGGER regkr_append_only_upd BEFORE UPDATE ON public.regulatory_kelsey_reviews
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
DROP TRIGGER IF EXISTS regkr_append_only_del ON public.regulatory_kelsey_reviews;
CREATE TRIGGER regkr_append_only_del BEFORE DELETE ON public.regulatory_kelsey_reviews
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

-- ---------------------------------------------------------------------------
-- regulatory_audit_log: append-only cross-cutting audit trail.
-- bigserial primary key per spec §5.10.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  actor_id        UUID REFERENCES auth.users(id),
  actor_role      TEXT,
  action          TEXT NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       UUID,
  before_value    JSONB,
  after_value     JSONB,
  justification   TEXT,
  jurisdiction_id UUID REFERENCES public.regulatory_jurisdictions(id),
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regaudit_actor    ON public.regulatory_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regaudit_target   ON public.regulatory_audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_regaudit_action   ON public.regulatory_audit_log (action);

ALTER TABLE public.regulatory_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_audit_log' AND policyname='regaudit_read_admin') THEN
    CREATE POLICY "regaudit_read_admin" ON public.regulatory_audit_log FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_audit_log' AND policyname='regaudit_insert_admin') THEN
    CREATE POLICY "regaudit_insert_admin" ON public.regulatory_audit_log FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

DROP TRIGGER IF EXISTS regaudit_append_only_upd ON public.regulatory_audit_log;
CREATE TRIGGER regaudit_append_only_upd BEFORE UPDATE ON public.regulatory_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
DROP TRIGGER IF EXISTS regaudit_append_only_del ON public.regulatory_audit_log;
CREATE TRIGGER regaudit_append_only_del BEFORE DELETE ON public.regulatory_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

-- ---------------------------------------------------------------------------
-- regulatory_disclaimer_events: impression + suppression-attempt log for
-- DSHEA (US) disclaimer surfaces.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_disclaimer_events (
  id                   BIGSERIAL PRIMARY KEY,
  surface              TEXT NOT NULL,
  surface_id           TEXT,
  user_id              UUID REFERENCES auth.users(id),
  jurisdiction_id      UUID NOT NULL REFERENCES public.regulatory_jurisdictions(id),
  displayed            BOOLEAN NOT NULL,
  suppression_attempt  BOOLEAN NOT NULL DEFAULT FALSE,
  rendered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regdisc_user ON public.regulatory_disclaimer_events (user_id, rendered_at DESC);
CREATE INDEX IF NOT EXISTS idx_regdisc_surf ON public.regulatory_disclaimer_events (surface, rendered_at DESC);
CREATE INDEX IF NOT EXISTS idx_regdisc_supp ON public.regulatory_disclaimer_events (suppression_attempt) WHERE suppression_attempt = TRUE;

ALTER TABLE public.regulatory_disclaimer_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_disclaimer_events' AND policyname='regdisc_read_admin') THEN
    CREATE POLICY "regdisc_read_admin" ON public.regulatory_disclaimer_events FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_disclaimer_events' AND policyname='regdisc_insert_authenticated') THEN
    -- Any authenticated user can record their own impression; server-side
    -- route is the intended caller but RLS allows direct client fallback.
    CREATE POLICY "regdisc_insert_authenticated" ON public.regulatory_disclaimer_events FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;

DROP TRIGGER IF EXISTS regdisc_append_only_upd ON public.regulatory_disclaimer_events;
CREATE TRIGGER regdisc_append_only_upd BEFORE UPDATE ON public.regulatory_disclaimer_events
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
DROP TRIGGER IF EXISTS regdisc_append_only_del ON public.regulatory_disclaimer_events;
CREATE TRIGGER regdisc_append_only_del BEFORE DELETE ON public.regulatory_disclaimer_events
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

-- ---------------------------------------------------------------------------
-- Activate the Prompt #112 foreshadowed stub. When #113 ships, the
-- fda_hc_regulatory_trigger event goes live for dispatch.
-- ---------------------------------------------------------------------------
UPDATE public.notification_event_registry
   SET default_enabled = TRUE,
       emission_source = 'prompt_113_regulatory_alerts_feed',
       updated_at = NOW()
 WHERE event_code = 'fda_hc_regulatory_trigger';
