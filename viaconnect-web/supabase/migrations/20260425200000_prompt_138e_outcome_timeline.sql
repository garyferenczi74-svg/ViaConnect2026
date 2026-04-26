-- =============================================================================
-- Prompt #138e: Outcome Visualization & 30/60/90 Future-State, categorical phase
-- (APPEND-ONLY)
-- =============================================================================
-- Six tables backing the homepage outcome timeline:
--   outcome_timeline_variant_sets   one variant set active at a time
--   outcome_timeline_phases         3 phase cards per variant set
--   outcome_timeline_qualifier      one active per variant set
--   outcome_timeline_cta            one active per variant set
--   outcome_timeline_section_blocks section_title + intro_paragraph blocks
--   outcome_timeline_events         lifecycle audit log
--
-- Reuses the activation-gate CHECK pattern from #138a/#138c. Public-active
-- read policies admit anon so the homepage renders without auth.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.outcome_timeline_variant_sets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_set_code  text NOT NULL UNIQUE,
  variant_set_label text NOT NULL,
  active            boolean NOT NULL DEFAULT false,
  archived          boolean NOT NULL DEFAULT false,
  archived_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outcome_variant_sets_single_active
  ON public.outcome_timeline_variant_sets(active) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.outcome_timeline_phases (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_set_id                uuid NOT NULL REFERENCES public.outcome_timeline_variant_sets(id) ON DELETE CASCADE,
  phase_id                      text NOT NULL CHECK (phase_id IN ('phase_1_30','phase_31_60','phase_61_90','custom')),
  phase_title                   text NOT NULL,
  phase_subtitle                text NOT NULL,
  phase_body                    text NOT NULL,
  marshall_precheck_session_id  uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed      boolean NOT NULL DEFAULT false,
  steve_approval_at             timestamptz,
  steve_approval_by             uuid REFERENCES auth.users(id),
  steve_approval_note           text,
  active                        boolean NOT NULL DEFAULT false,
  archived                      boolean NOT NULL DEFAULT false,
  archived_at                   timestamptz,
  display_order                 int NOT NULL DEFAULT 0,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT phase_activation
    CHECK (active = false OR (marshall_precheck_passed = true AND steve_approval_at IS NOT NULL AND archived = false))
);

CREATE INDEX IF NOT EXISTS idx_outcome_phases_active
  ON public.outcome_timeline_phases(variant_set_id, active, display_order)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS public.outcome_timeline_qualifier (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_set_id                uuid NOT NULL REFERENCES public.outcome_timeline_variant_sets(id) ON DELETE CASCADE,
  qualifier_text                text NOT NULL,
  marshall_precheck_session_id  uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed      boolean NOT NULL DEFAULT false,
  steve_approval_at             timestamptz,
  steve_approval_by             uuid REFERENCES auth.users(id),
  active                        boolean NOT NULL DEFAULT false,
  archived                      boolean NOT NULL DEFAULT false,
  archived_at                   timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qualifier_activation
    CHECK (active = false OR (marshall_precheck_passed = true AND steve_approval_at IS NOT NULL AND archived = false))
);

CREATE INDEX IF NOT EXISTS idx_outcome_qualifier_active
  ON public.outcome_timeline_qualifier(variant_set_id, active) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.outcome_timeline_cta (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_set_id                uuid NOT NULL REFERENCES public.outcome_timeline_variant_sets(id) ON DELETE CASCADE,
  cta_lead_text                 text NOT NULL,
  cta_label                     text NOT NULL,
  cta_destination               text NOT NULL,
  marshall_precheck_session_id  uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed      boolean NOT NULL DEFAULT false,
  steve_approval_at             timestamptz,
  steve_approval_by             uuid REFERENCES auth.users(id),
  active                        boolean NOT NULL DEFAULT false,
  archived                      boolean NOT NULL DEFAULT false,
  archived_at                   timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cta_activation
    CHECK (active = false OR (marshall_precheck_passed = true AND steve_approval_at IS NOT NULL AND archived = false))
);

CREATE INDEX IF NOT EXISTS idx_outcome_cta_active
  ON public.outcome_timeline_cta(variant_set_id, active) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.outcome_timeline_section_blocks (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_set_id                uuid NOT NULL REFERENCES public.outcome_timeline_variant_sets(id) ON DELETE CASCADE,
  block_kind                    text NOT NULL CHECK (block_kind IN ('section_title','intro_paragraph')),
  block_text                    text NOT NULL,
  marshall_precheck_session_id  uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed      boolean NOT NULL DEFAULT false,
  steve_approval_at             timestamptz,
  steve_approval_by             uuid REFERENCES auth.users(id),
  active                        boolean NOT NULL DEFAULT false,
  archived                      boolean NOT NULL DEFAULT false,
  archived_at                   timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT section_block_activation
    CHECK (active = false OR (marshall_precheck_passed = true AND steve_approval_at IS NOT NULL AND archived = false))
);

CREATE INDEX IF NOT EXISTS idx_outcome_section_blocks_active
  ON public.outcome_timeline_section_blocks(variant_set_id, block_kind, active) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.outcome_timeline_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface         text NOT NULL CHECK (surface IN ('variant_set','phase','qualifier','cta','section_block')),
  row_id          uuid NOT NULL,
  event_kind      text NOT NULL CHECK (event_kind IN ('drafted','precheck_completed','steve_approved','steve_revoked','activated','deactivated','archived')),
  event_detail    jsonb,
  actor_user_id   uuid REFERENCES auth.users(id),
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outcome_events
  ON public.outcome_timeline_events(surface, row_id, occurred_at DESC);

ALTER TABLE public.outcome_timeline_variant_sets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_timeline_phases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_timeline_qualifier      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_timeline_cta            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_timeline_section_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_timeline_events         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outcome_variant_sets_admin ON public.outcome_timeline_variant_sets;
CREATE POLICY outcome_variant_sets_admin ON public.outcome_timeline_variant_sets
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS outcome_phases_admin ON public.outcome_timeline_phases;
CREATE POLICY outcome_phases_admin ON public.outcome_timeline_phases
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS outcome_qualifier_admin ON public.outcome_timeline_qualifier;
CREATE POLICY outcome_qualifier_admin ON public.outcome_timeline_qualifier
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS outcome_cta_admin ON public.outcome_timeline_cta;
CREATE POLICY outcome_cta_admin ON public.outcome_timeline_cta
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS outcome_section_blocks_admin ON public.outcome_timeline_section_blocks;
CREATE POLICY outcome_section_blocks_admin ON public.outcome_timeline_section_blocks
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS outcome_events_admin ON public.outcome_timeline_events;
CREATE POLICY outcome_events_admin ON public.outcome_timeline_events
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS outcome_variant_sets_public_read ON public.outcome_timeline_variant_sets;
CREATE POLICY outcome_variant_sets_public_read ON public.outcome_timeline_variant_sets
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS outcome_phases_public_read ON public.outcome_timeline_phases;
CREATE POLICY outcome_phases_public_read ON public.outcome_timeline_phases
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS outcome_qualifier_public_read ON public.outcome_timeline_qualifier;
CREATE POLICY outcome_qualifier_public_read ON public.outcome_timeline_qualifier
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS outcome_cta_public_read ON public.outcome_timeline_cta;
CREATE POLICY outcome_cta_public_read ON public.outcome_timeline_cta
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS outcome_section_blocks_public_read ON public.outcome_timeline_section_blocks;
CREATE POLICY outcome_section_blocks_public_read ON public.outcome_timeline_section_blocks
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE OR REPLACE FUNCTION public.outcome_timeline_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_outcome_phases_updated_at ON public.outcome_timeline_phases;
CREATE TRIGGER trg_outcome_phases_updated_at BEFORE UPDATE ON public.outcome_timeline_phases
  FOR EACH ROW EXECUTE FUNCTION public.outcome_timeline_updated_at();

DROP TRIGGER IF EXISTS trg_outcome_qualifier_updated_at ON public.outcome_timeline_qualifier;
CREATE TRIGGER trg_outcome_qualifier_updated_at BEFORE UPDATE ON public.outcome_timeline_qualifier
  FOR EACH ROW EXECUTE FUNCTION public.outcome_timeline_updated_at();

DROP TRIGGER IF EXISTS trg_outcome_cta_updated_at ON public.outcome_timeline_cta;
CREATE TRIGGER trg_outcome_cta_updated_at BEFORE UPDATE ON public.outcome_timeline_cta
  FOR EACH ROW EXECUTE FUNCTION public.outcome_timeline_updated_at();

DROP TRIGGER IF EXISTS trg_outcome_section_blocks_updated_at ON public.outcome_timeline_section_blocks;
CREATE TRIGGER trg_outcome_section_blocks_updated_at BEFORE UPDATE ON public.outcome_timeline_section_blocks
  FOR EACH ROW EXECUTE FUNCTION public.outcome_timeline_updated_at();
