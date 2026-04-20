-- =============================================================================
-- Prompt #97 Phase 1.3: Level 4 enrollments.
-- =============================================================================
-- Level 4 enrollment is distinct from Level 3 (white_label_enrollments). A
-- practitioner must already have Level 3 with at least one delivered
-- production order to become eligible. Soft links (no FK) to
-- white_label_enrollments, white_label_production_orders, and
-- practitioner_certifications because those tables ship with
-- Prompts #91 revised and #96 — not yet applied to this DB. A follow-up
-- migration adds the FK constraints once the target tables exist.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.level_4_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE RESTRICT UNIQUE,

  -- Soft links; FKs deferred to follow-up migration after dependency prompts apply.
  level_3_enrollment_id UUID,
  level_3_delivered_order_id UUID,
  master_practitioner_cert_id UUID,

  status TEXT NOT NULL DEFAULT 'pending_eligibility' CHECK (status IN (
    'pending_eligibility',
    'eligibility_verified',
    'formulation_development',
    'active',
    'paused',
    'terminated'
  )),

  level_3_delivered_verified_at TIMESTAMPTZ,
  master_practitioner_verified_at TIMESTAMPTZ,

  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_formulation_approved_at TIMESTAMPTZ,
  first_formulation_production_delivered_at TIMESTAMPTZ,

  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  terminated_reason TEXT,
  terminated_at TIMESTAMPTZ,

  lifetime_formulations_developed INTEGER NOT NULL DEFAULT 0,
  lifetime_formulations_approved INTEGER NOT NULL DEFAULT 0,
  lifetime_production_orders INTEGER NOT NULL DEFAULT 0,
  lifetime_production_revenue_cents BIGINT NOT NULL DEFAULT 0,

  exclusive_use_agreement_signed BOOLEAN NOT NULL DEFAULT false,
  exclusive_use_agreement_signed_at TIMESTAMPTZ,
  exclusive_use_agreement_url TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.level_4_enrollments IS
  'Level 4 Custom Formulations enrollment. Requires existing Level 3 enrollment with delivered production order. FK to white_label_enrollments / white_label_production_orders / practitioner_certifications deferred until Prompts #91 revised + #96 apply.';
COMMENT ON COLUMN public.level_4_enrollments.exclusive_use_agreement_signed IS
  'Practitioner must sign exclusive-use agreement before first formulation development fee is charged. Grants exclusive-use rights to approved formulations from ViaCura; restricts practitioner from taking formulation to competing manufacturer.';

CREATE INDEX IF NOT EXISTS idx_l4_enroll_status
  ON public.level_4_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_l4_enroll_practitioner
  ON public.level_4_enrollments(practitioner_id);

ALTER TABLE public.level_4_enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='level_4_enrollments' AND policyname='l4_enroll_self_read') THEN
    CREATE POLICY "l4_enroll_self_read"
      ON public.level_4_enrollments FOR SELECT TO authenticated
      USING (practitioner_id IN (
        SELECT id FROM public.practitioners WHERE user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='level_4_enrollments' AND policyname='l4_enroll_admin_all') THEN
    CREATE POLICY "l4_enroll_admin_all"
      ON public.level_4_enrollments FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
