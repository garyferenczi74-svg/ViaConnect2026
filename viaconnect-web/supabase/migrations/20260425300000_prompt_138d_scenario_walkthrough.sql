-- =============================================================================
-- Prompt #138d: Sample Protocol Walkthrough (Sarah Scenario), scope-reduced
-- (APPEND-ONLY)
-- =============================================================================
-- Five tables backing the homepage Sarah Scenario:
--   scenario_categories     widely-recognized functional-medicine categories
--   scenario_personas       composite personas (currently one: sarah)
--   scenario_copy_blocks    section title + intro + 3 phase cards + tier
--                           explainer + hand-off CTA
--   scenario_disclosures    opening + closing illustrative disclosures
--                           required by MARSHALL.MARKETING.COMPOSITE_DISCLOSURE
--   scenario_events         lifecycle audit log
--
-- Phase 1 marketing rules (COMPOSITE_DISCLOSURE, INTERVENTION_SPECIFICITY)
-- already shipped in commit 5ff9919. This migration is the DB layer only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.scenario_categories (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code                 text NOT NULL UNIQUE,
  category_display_name         text NOT NULL,
  category_description          text NOT NULL,
  marshall_precheck_session_id  uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed      boolean NOT NULL DEFAULT false,
  steve_approval_at             timestamptz,
  steve_approval_by             uuid REFERENCES auth.users(id),
  active                        boolean NOT NULL DEFAULT false,
  archived                      boolean NOT NULL DEFAULT false,
  archived_at                   timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_activation
    CHECK (active = false OR (marshall_precheck_passed = true AND steve_approval_at IS NOT NULL AND archived = false))
);

CREATE INDEX IF NOT EXISTS idx_scenario_categories_active
  ON public.scenario_categories(active) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.scenario_personas (
  id                                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_code                       text NOT NULL UNIQUE,
  persona_display_name               text NOT NULL,
  age_band                           text NOT NULL,
  lifestyle_descriptors              text[] NOT NULL,
  health_concerns_consumer_language  text[] NOT NULL,
  protocol_category_refs             uuid[] NOT NULL,
  tier_reached                       int NOT NULL CHECK (tier_reached IN (1,2,3)),
  tier_rationale                     text NOT NULL,
  dr_fadi_supplementary_consent_key  text,
  marshall_precheck_session_id       uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed           boolean NOT NULL DEFAULT false,
  steve_approval_at                  timestamptz,
  steve_approval_by                  uuid REFERENCES auth.users(id),
  steve_approval_note                text,
  active                             boolean NOT NULL DEFAULT false,
  archived                           boolean NOT NULL DEFAULT false,
  archived_at                        timestamptz,
  display_order                      int NOT NULL DEFAULT 0,
  created_at                         timestamptz NOT NULL DEFAULT now(),
  updated_at                         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT persona_activation
    CHECK (active = false OR (marshall_precheck_passed = true AND steve_approval_at IS NOT NULL AND archived = false))
);

CREATE INDEX IF NOT EXISTS idx_scenario_personas_active
  ON public.scenario_personas(active, display_order) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.scenario_copy_blocks (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                       text NOT NULL UNIQUE,
  surface                       text NOT NULL DEFAULT 'walkthrough',
  block_text                    text NOT NULL,
  persona_scoped_to             text REFERENCES public.scenario_personas(persona_code),
  marshall_precheck_session_id  uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed      boolean NOT NULL DEFAULT false,
  steve_approval_at             timestamptz,
  steve_approval_by             uuid REFERENCES auth.users(id),
  active                        boolean NOT NULL DEFAULT false,
  archived                      boolean NOT NULL DEFAULT false,
  archived_at                   timestamptz,
  display_order                 int NOT NULL DEFAULT 0,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT block_activation
    CHECK (active = false OR (marshall_precheck_passed = true AND steve_approval_at IS NOT NULL AND archived = false))
);

CREATE INDEX IF NOT EXISTS idx_scenario_copy_blocks_active
  ON public.scenario_copy_blocks(surface, active, display_order) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.scenario_disclosures (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_placement        text NOT NULL CHECK (disclosure_placement IN ('opening','closing','both')),
  disclosure_text             text NOT NULL,
  font_weight_matches_body    boolean NOT NULL DEFAULT true,
  renders_as_footnote         boolean NOT NULL DEFAULT false,
  active                      boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disclosure_not_footnote
    CHECK (renders_as_footnote = false OR active = false)
);

CREATE TABLE IF NOT EXISTS public.scenario_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface         text NOT NULL CHECK (surface IN ('persona','category','copy_block','disclosure')),
  row_id          uuid NOT NULL,
  event_kind      text NOT NULL CHECK (event_kind IN (
                    'drafted','precheck_completed','steve_approved','steve_revoked',
                    'activated','deactivated','archived','supplementary_consent_captured')),
  event_detail    jsonb,
  actor_user_id   uuid REFERENCES auth.users(id),
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scenario_events
  ON public.scenario_events(surface, row_id, occurred_at DESC);

ALTER TABLE public.scenario_personas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_copy_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_events      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scenario_personas_admin ON public.scenario_personas;
CREATE POLICY scenario_personas_admin ON public.scenario_personas
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS scenario_categories_admin ON public.scenario_categories;
CREATE POLICY scenario_categories_admin ON public.scenario_categories
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS scenario_copy_blocks_admin ON public.scenario_copy_blocks;
CREATE POLICY scenario_copy_blocks_admin ON public.scenario_copy_blocks
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS scenario_disclosures_admin ON public.scenario_disclosures;
CREATE POLICY scenario_disclosures_admin ON public.scenario_disclosures
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS scenario_events_admin ON public.scenario_events;
CREATE POLICY scenario_events_admin ON public.scenario_events
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS scenario_personas_public_read ON public.scenario_personas;
CREATE POLICY scenario_personas_public_read ON public.scenario_personas
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS scenario_categories_public_read ON public.scenario_categories;
CREATE POLICY scenario_categories_public_read ON public.scenario_categories
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS scenario_copy_blocks_public_read ON public.scenario_copy_blocks;
CREATE POLICY scenario_copy_blocks_public_read ON public.scenario_copy_blocks
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS scenario_disclosures_public_read ON public.scenario_disclosures;
CREATE POLICY scenario_disclosures_public_read ON public.scenario_disclosures
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE OR REPLACE FUNCTION public.scenario_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scenario_personas_updated_at ON public.scenario_personas;
CREATE TRIGGER trg_scenario_personas_updated_at BEFORE UPDATE ON public.scenario_personas
  FOR EACH ROW EXECUTE FUNCTION public.scenario_updated_at();

DROP TRIGGER IF EXISTS trg_scenario_categories_updated_at ON public.scenario_categories;
CREATE TRIGGER trg_scenario_categories_updated_at BEFORE UPDATE ON public.scenario_categories
  FOR EACH ROW EXECUTE FUNCTION public.scenario_updated_at();

DROP TRIGGER IF EXISTS trg_scenario_copy_blocks_updated_at ON public.scenario_copy_blocks;
CREATE TRIGGER trg_scenario_copy_blocks_updated_at BEFORE UPDATE ON public.scenario_copy_blocks
  FOR EACH ROW EXECUTE FUNCTION public.scenario_updated_at();
