-- =============================================================================
-- Prompt #91, Phase 2.5: Practitioner certifications
-- =============================================================================
-- Append-only. Tracks each practitioner's enrollment + progress through the
-- four-level certification program. LMS sync state lives here so the
-- practitioner-portal certification widget can render progress without
-- hitting the LMS on every render.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioner_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  certification_level_id TEXT NOT NULL REFERENCES public.certification_levels(id),

  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN (
    'enrolled', 'in_progress', 'completed', 'certified', 'expired', 'revoked'
  )),

  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- LMS integration
  lms_enrollment_id TEXT,
  lms_progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (lms_progress_percent BETWEEN 0 AND 100),
  lms_last_sync_at TIMESTAMPTZ,

  -- Certificate
  certificate_number TEXT UNIQUE,
  certificate_url TEXT,

  -- CE credits
  ce_credits_earned INTEGER NOT NULL DEFAULT 0 CHECK (ce_credits_earned >= 0),
  ce_credit_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    ce_credit_status IN ('pending', 'issued', 'not_eligible')
  ),

  -- Payment
  amount_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  stripe_payment_intent_id TEXT,

  -- Recertification chain
  is_recertification BOOLEAN NOT NULL DEFAULT false,
  parent_certification_id UUID REFERENCES public.practitioner_certifications(id),

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, certification_level_id, is_recertification, enrolled_at)
);

COMMENT ON TABLE public.practitioner_certifications IS
  'Practitioner certification enrollments and progress. lms_progress_percent updated by LMS webhooks.';

CREATE INDEX IF NOT EXISTS idx_prac_certs_practitioner
  ON public.practitioner_certifications(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_prac_certs_active
  ON public.practitioner_certifications(practitioner_id, status)
  WHERE status IN ('certified', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_prac_certs_expiring
  ON public.practitioner_certifications(expires_at)
  WHERE status = 'certified';

ALTER TABLE public.practitioner_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prac_certs_self_read ON public.practitioner_certifications;
CREATE POLICY prac_certs_self_read
  ON public.practitioner_certifications FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS prac_certs_admin_all ON public.practitioner_certifications;
CREATE POLICY prac_certs_admin_all
  ON public.practitioner_certifications FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
