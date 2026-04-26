-- =============================================================================
-- Prompt #138c: Trust Band + Team Introduction (APPEND-ONLY)
-- =============================================================================
-- Six tables backing the homepage trust band:
--   trust_band_regulatory_paragraphs  single active paragraph; partial unique
--                                     index enforces singleton
--   trust_band_clinician_cards        named clinician + credential, gated by
--                                     written-consent FK
--   trust_band_chips                  icon + short text scannable trust signals
--   trust_band_testimonials           ships empty; FTC dual-approval gated
--   trust_band_scale_measurements     audit log for live scale-claim sources
--   trust_band_events                 lifecycle audit trail
--
-- Activation invariants per spec section 5.2 and 6 enforced at DB level via
-- CHECK constraints. Public-active read policies admit anon so the homepage
-- renders without auth.
--
-- Reuses #138a marketing-copy infrastructure: Surface enum value, the
-- MARSHALL.MARKETING.* rule namespace, and the lifecycle gate pattern.
-- =============================================================================

-- 1. trust_band_regulatory_paragraphs
CREATE TABLE IF NOT EXISTS public.trust_band_regulatory_paragraphs (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_text                  text NOT NULL,
  frameworks_named                text[] NOT NULL DEFAULT '{}',
  substantiation_refs             text[] NOT NULL DEFAULT '{}',
  marshall_precheck_session_id    uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed        boolean NOT NULL DEFAULT false,
  steve_approval_at               timestamptz,
  steve_approval_by               uuid REFERENCES auth.users(id),
  steve_approval_note             text,
  legal_counsel_review_at         timestamptz,
  legal_counsel_review_by         text,
  active                          boolean NOT NULL DEFAULT false,
  archived                        boolean NOT NULL DEFAULT false,
  archived_at                     timestamptz,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regulatory_activation
    CHECK (active = false
           OR (marshall_precheck_passed = true
               AND steve_approval_at IS NOT NULL
               AND archived = false))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_regulatory_single_active
  ON public.trust_band_regulatory_paragraphs(active)
  WHERE active = true;

-- 2. trust_band_clinician_cards
CREATE TABLE IF NOT EXISTS public.trust_band_clinician_cards (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_display_name          text NOT NULL,
  credential_line                 text NOT NULL,
  role_line                       text NOT NULL,
  descriptor_sentence             text NOT NULL,
  photo_storage_key               text,
  photo_license_storage_key       text,
  clinician_consent_storage_key   text,
  clinician_consent_received_at   timestamptz,
  clinician_consent_scope         text,
  marshall_precheck_session_id    uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed        boolean NOT NULL DEFAULT false,
  steve_approval_at               timestamptz,
  steve_approval_by               uuid REFERENCES auth.users(id),
  active                          boolean NOT NULL DEFAULT false,
  archived                        boolean NOT NULL DEFAULT false,
  archived_at                     timestamptz,
  display_order                   int NOT NULL DEFAULT 0,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinician_activation
    CHECK (active = false
           OR (marshall_precheck_passed = true
               AND steve_approval_at IS NOT NULL
               AND archived = false
               AND clinician_consent_storage_key IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_clinician_cards_active
  ON public.trust_band_clinician_cards(active, display_order)
  WHERE active = true;

-- 3. trust_band_chips
CREATE TABLE IF NOT EXISTS public.trust_band_chips (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_name                       text NOT NULL,
  chip_text                       text NOT NULL,
  category                        text NOT NULL CHECK (category IN (
                                    'credentials','compliance','scale','research','other')),
  substantiation_ref              text,
  live_data_source                text,
  current_measured_value          numeric,
  claimed_threshold               numeric,
  marshall_precheck_session_id    uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed        boolean NOT NULL DEFAULT false,
  steve_approval_at               timestamptz,
  steve_approval_by               uuid REFERENCES auth.users(id),
  active                          boolean NOT NULL DEFAULT false,
  archived                        boolean NOT NULL DEFAULT false,
  archived_at                     timestamptz,
  display_order                   int NOT NULL DEFAULT 0,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chip_activation
    CHECK (active = false
           OR (marshall_precheck_passed = true
               AND steve_approval_at IS NOT NULL
               AND archived = false)),
  CONSTRAINT chip_word_count
    CHECK (array_length(string_to_array(chip_text, ' '), 1) <= 6),
  CONSTRAINT scale_chip_has_source
    CHECK (category != 'scale' OR live_data_source IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_chips_active
  ON public.trust_band_chips(active, display_order)
  WHERE active = true;

-- 4. trust_band_testimonials (ships empty; pipeline ready)
CREATE TABLE IF NOT EXISTS public.trust_band_testimonials (
  id                                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_identity                   text NOT NULL,
  endorser_role                       text NOT NULL CHECK (endorser_role IN (
                                        'practitioner','consumer','clinician','other')),
  endorser_material_connection        text NOT NULL CHECK (endorser_material_connection IN (
                                        'none','payment_received','free_product','employment','affiliation','other_disclosed')),
  endorser_connection_disclosure_text text NOT NULL,
  endorser_written_consent_storage_key text NOT NULL,
  endorser_consent_received_at        timestamptz NOT NULL,
  endorser_consent_revoked_at         timestamptz,
  endorser_photo_storage_key          text,
  endorser_photo_consent_storage_key  text,
  testimonial_text                    text NOT NULL,
  testimonial_date_of_statement       date NOT NULL,
  claims_substantiation_refs          text[] NOT NULL DEFAULT '{}',
  typicality_status                   text NOT NULL CHECK (typicality_status IN (
                                        'typical','atypical_with_disclosure')),
  typicality_disclosure_text          text,
  marshall_precheck_session_id        uuid REFERENCES public.precheck_sessions(id) ON DELETE SET NULL,
  marshall_precheck_passed            boolean NOT NULL DEFAULT false,
  steve_approval_at                   timestamptz,
  steve_approval_by                   uuid REFERENCES auth.users(id),
  legal_counsel_review_at             timestamptz,
  legal_counsel_review_by             text,
  active                              boolean NOT NULL DEFAULT false,
  archived                            boolean NOT NULL DEFAULT false,
  archived_at                         timestamptz,
  display_order                       int NOT NULL DEFAULT 0,
  created_at                          timestamptz NOT NULL DEFAULT now(),
  updated_at                          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT testimonial_activation
    CHECK (active = false
           OR (marshall_precheck_passed = true
               AND steve_approval_at IS NOT NULL
               AND legal_counsel_review_at IS NOT NULL
               AND archived = false
               AND endorser_consent_revoked_at IS NULL)),
  CONSTRAINT atypicality_requires_disclosure
    CHECK (typicality_status = 'typical'
           OR typicality_disclosure_text IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_testimonials_active
  ON public.trust_band_testimonials(active, display_order)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_testimonials_revoked
  ON public.trust_band_testimonials(endorser_consent_revoked_at)
  WHERE endorser_consent_revoked_at IS NOT NULL;

-- 5. trust_band_scale_measurements (audit log for live scale-claim sources)
CREATE TABLE IF NOT EXISTS public.trust_band_scale_measurements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_id             uuid NOT NULL REFERENCES public.trust_band_chips(id) ON DELETE CASCADE,
  measured_at         timestamptz NOT NULL DEFAULT now(),
  measured_value      numeric NOT NULL,
  data_source_queried text NOT NULL,
  passed_threshold    boolean NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scale_measurements_chip
  ON public.trust_band_scale_measurements(chip_id, measured_at DESC);

-- 6. trust_band_events (lifecycle audit log)
CREATE TABLE IF NOT EXISTS public.trust_band_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface         text NOT NULL CHECK (surface IN (
                    'regulatory_paragraph','clinician_card','trust_chip','testimonial')),
  row_id          uuid NOT NULL,
  event_kind      text NOT NULL CHECK (event_kind IN (
                    'drafted','substantiation_linked','precheck_completed',
                    'steve_approved','steve_revoked','legal_reviewed','activated',
                    'deactivated','consent_revoked','archived','scale_below_threshold')),
  event_detail    jsonb,
  actor_user_id   uuid REFERENCES auth.users(id),
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_band_events
  ON public.trust_band_events(surface, row_id, occurred_at DESC);

-- RLS
ALTER TABLE public.trust_band_regulatory_paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_band_clinician_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_band_chips                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_band_testimonials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_band_scale_measurements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_band_events                ENABLE ROW LEVEL SECURITY;

-- Admin read/write
DROP POLICY IF EXISTS trust_regulatory_admin ON public.trust_band_regulatory_paragraphs;
CREATE POLICY trust_regulatory_admin ON public.trust_band_regulatory_paragraphs
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS trust_clinician_admin ON public.trust_band_clinician_cards;
CREATE POLICY trust_clinician_admin ON public.trust_band_clinician_cards
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS trust_chips_admin ON public.trust_band_chips;
CREATE POLICY trust_chips_admin ON public.trust_band_chips
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS trust_testimonials_admin ON public.trust_band_testimonials;
CREATE POLICY trust_testimonials_admin ON public.trust_band_testimonials
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS trust_scale_admin ON public.trust_band_scale_measurements;
CREATE POLICY trust_scale_admin ON public.trust_band_scale_measurements
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

DROP POLICY IF EXISTS trust_events_admin ON public.trust_band_events;
CREATE POLICY trust_events_admin ON public.trust_band_events
  FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('marketing_admin','admin','superadmin','compliance_admin'));

-- Public read for active rows so anon visitors render the band
DROP POLICY IF EXISTS trust_regulatory_public_read ON public.trust_band_regulatory_paragraphs;
CREATE POLICY trust_regulatory_public_read ON public.trust_band_regulatory_paragraphs
  FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS trust_clinician_public_read ON public.trust_band_clinician_cards;
CREATE POLICY trust_clinician_public_read ON public.trust_band_clinician_cards
  FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS trust_chips_public_read ON public.trust_band_chips;
CREATE POLICY trust_chips_public_read ON public.trust_band_chips
  FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS trust_testimonials_public_read ON public.trust_band_testimonials;
CREATE POLICY trust_testimonials_public_read ON public.trust_band_testimonials
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.trust_band_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_regulatory_updated_at ON public.trust_band_regulatory_paragraphs;
CREATE TRIGGER trg_trust_regulatory_updated_at
  BEFORE UPDATE ON public.trust_band_regulatory_paragraphs
  FOR EACH ROW EXECUTE FUNCTION public.trust_band_updated_at();

DROP TRIGGER IF EXISTS trg_trust_clinician_updated_at ON public.trust_band_clinician_cards;
CREATE TRIGGER trg_trust_clinician_updated_at
  BEFORE UPDATE ON public.trust_band_clinician_cards
  FOR EACH ROW EXECUTE FUNCTION public.trust_band_updated_at();

DROP TRIGGER IF EXISTS trg_trust_chips_updated_at ON public.trust_band_chips;
CREATE TRIGGER trg_trust_chips_updated_at
  BEFORE UPDATE ON public.trust_band_chips
  FOR EACH ROW EXECUTE FUNCTION public.trust_band_updated_at();

DROP TRIGGER IF EXISTS trg_trust_testimonials_updated_at ON public.trust_band_testimonials;
CREATE TRIGGER trg_trust_testimonials_updated_at
  BEFORE UPDATE ON public.trust_band_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.trust_band_updated_at();
