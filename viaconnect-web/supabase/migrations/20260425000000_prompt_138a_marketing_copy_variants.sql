-- =============================================================================
-- Prompt #138a: Homepage hero variants + A/B test infrastructure +
-- Marshall pre-check gating (APPEND-ONLY)
-- =============================================================================
-- Five tables backing the conversion-stack hero variant lifecycle:
--   marketing_copy_variants        — variant catalog with activation invariant
--   marketing_copy_impressions     — per-render visitor + variant + viewport
--   marketing_copy_conversions     — visitor-id-joined conversion events
--   marketing_copy_test_rounds     — pause / resume / archive test windows
--   marketing_copy_variant_events  — append-only lifecycle audit log
--
-- Activation invariant (§5.2 of Prompt #138a, enforced at DB level):
--   active_in_test = true REQUIRES word_count_validated = true
--                                AND marshall_precheck_passed = true
--                                AND steve_approval_at IS NOT NULL
--                                AND archived = false
--
-- The marshall_precheck_session_id FK is nullable (variants exist before
-- pre-check runs) and references precheck_sessions(id) from #121.
-- =============================================================================

-- ── 1. marketing_copy_variants ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketing_copy_variants (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                     text NOT NULL UNIQUE,
  surface                     text NOT NULL DEFAULT 'hero'
                                CHECK (surface IN ('hero')),
  variant_label               text NOT NULL,
  framing                     text NOT NULL CHECK (framing IN (
                                'process_narrative','outcome_first','proof_first','time_to_value','other')),
  headline_text               text NOT NULL,
  subheadline_text            text NOT NULL,
  cta_label                   text NOT NULL,
  cta_destination             text,
  word_count_validated        boolean NOT NULL DEFAULT false,
  marshall_precheck_passed    boolean NOT NULL DEFAULT false,
  marshall_precheck_session_id uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  steve_approval_at           timestamptz,
  steve_approval_by           uuid REFERENCES auth.users(id),
  steve_approval_note         text,
  active_in_test              boolean NOT NULL DEFAULT false,
  archived                    boolean NOT NULL DEFAULT false,
  archived_at                 timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT variant_can_only_activate_when_validated_and_approved
    CHECK (active_in_test = false
           OR (word_count_validated = true
               AND marshall_precheck_passed = true
               AND steve_approval_at IS NOT NULL
               AND archived = false))
);

CREATE INDEX IF NOT EXISTS idx_variants_active
  ON public.marketing_copy_variants(surface, active_in_test)
  WHERE active_in_test = true;
CREATE INDEX IF NOT EXISTS idx_variants_archived
  ON public.marketing_copy_variants(archived);

-- ── 2. marketing_copy_impressions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketing_copy_impressions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id            text NOT NULL,
  slot_id               text NOT NULL REFERENCES public.marketing_copy_variants(slot_id) ON DELETE RESTRICT,
  rendered_at           timestamptz NOT NULL DEFAULT now(),
  viewport              text CHECK (viewport IN ('desktop','tablet','mobile')),
  referrer_category     text CHECK (referrer_category IN (
                          'direct','organic_search','paid_search','social','email','referral','other')),
  is_returning_visitor  boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_impressions_visitor
  ON public.marketing_copy_impressions(visitor_id, rendered_at);
CREATE INDEX IF NOT EXISTS idx_impressions_slot
  ON public.marketing_copy_impressions(slot_id, rendered_at DESC);
CREATE INDEX IF NOT EXISTS idx_impressions_recent
  ON public.marketing_copy_impressions(rendered_at DESC);

-- ── 3. marketing_copy_conversions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketing_copy_conversions (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id                    text NOT NULL,
  conversion_kind               text NOT NULL CHECK (conversion_kind IN (
                                  'caq_start','signup_complete','bounce')),
  preceding_slot_id             text,
  occurred_at                   timestamptz NOT NULL DEFAULT now(),
  time_from_impression_seconds  int
);

CREATE INDEX IF NOT EXISTS idx_conversions_visitor
  ON public.marketing_copy_conversions(visitor_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_conversions_kind_slot
  ON public.marketing_copy_conversions(conversion_kind, preceding_slot_id);

-- ── 4. marketing_copy_test_rounds ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketing_copy_test_rounds (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id             text NOT NULL,
  surface             text NOT NULL,
  active_slot_ids     text[] NOT NULL,
  started_at          timestamptz NOT NULL DEFAULT now(),
  paused_at           timestamptz,
  resumed_at          timestamptz,
  ended_at            timestamptz,
  winner_slot_id      text REFERENCES public.marketing_copy_variants(slot_id),
  ended_reason        text CHECK (ended_reason IN (
                        'winner_promoted','no_winner_archived','manual_terminated','superseded'))
);

CREATE INDEX IF NOT EXISTS idx_test_rounds_test
  ON public.marketing_copy_test_rounds(test_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_rounds_active
  ON public.marketing_copy_test_rounds(surface)
  WHERE ended_at IS NULL;

-- ── 5. marketing_copy_variant_events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketing_copy_variant_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id      uuid NOT NULL REFERENCES public.marketing_copy_variants(id) ON DELETE CASCADE,
  event_kind      text NOT NULL CHECK (event_kind IN (
                    'created','word_count_validated','precheck_completed',
                    'steve_approved','steve_revoked','activated','deactivated',
                    'archived','restored')),
  event_detail    jsonb,
  actor_user_id   uuid REFERENCES auth.users(id),
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variant_events_variant
  ON public.marketing_copy_variant_events(variant_id, occurred_at DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.marketing_copy_variants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_copy_impressions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_copy_conversions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_copy_test_rounds     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_copy_variant_events  ENABLE ROW LEVEL SECURITY;

-- Variants: marketing_admin / admin / superadmin / compliance_admin read+write
DROP POLICY IF EXISTS variants_admin_rw ON public.marketing_copy_variants;
CREATE POLICY variants_admin_rw ON public.marketing_copy_variants
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

-- Active variants are publicly readable so the home page can render without
-- auth. Non-active rows stay admin-gated.
DROP POLICY IF EXISTS variants_public_active_read ON public.marketing_copy_variants;
CREATE POLICY variants_public_active_read ON public.marketing_copy_variants
  FOR SELECT TO anon, authenticated
  USING (active_in_test = true);

-- Impressions: insert allowed from any session (app-layer auth gates the
-- client cookie); admin-only read.
DROP POLICY IF EXISTS impressions_anon_insert ON public.marketing_copy_impressions;
CREATE POLICY impressions_anon_insert ON public.marketing_copy_impressions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS impressions_admin_read ON public.marketing_copy_impressions;
CREATE POLICY impressions_admin_read ON public.marketing_copy_impressions
  FOR SELECT TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin'));

DROP POLICY IF EXISTS conversions_anon_insert ON public.marketing_copy_conversions;
CREATE POLICY conversions_anon_insert ON public.marketing_copy_conversions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS conversions_admin_read ON public.marketing_copy_conversions;
CREATE POLICY conversions_admin_read ON public.marketing_copy_conversions
  FOR SELECT TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin'));

-- Test rounds + variant events: admin only
DROP POLICY IF EXISTS test_rounds_admin ON public.marketing_copy_test_rounds;
CREATE POLICY test_rounds_admin ON public.marketing_copy_test_rounds
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin'));

DROP POLICY IF EXISTS variant_events_admin_read ON public.marketing_copy_variant_events;
CREATE POLICY variant_events_admin_read ON public.marketing_copy_variant_events
  FOR SELECT TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin'));

DROP POLICY IF EXISTS variant_events_admin_insert ON public.marketing_copy_variant_events;
CREATE POLICY variant_events_admin_insert ON public.marketing_copy_variant_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin'));

-- ── updated_at trigger for variants ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.marketing_copy_variants_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_copy_variants_updated_at ON public.marketing_copy_variants;
CREATE TRIGGER trg_marketing_copy_variants_updated_at
  BEFORE UPDATE ON public.marketing_copy_variants
  FOR EACH ROW EXECUTE FUNCTION public.marketing_copy_variants_updated_at();
