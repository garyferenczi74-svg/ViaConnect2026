-- =============================================================================
-- Prompt #97 Phase 1.4: Custom formulations.
-- =============================================================================
-- Per-practitioner custom formulation records. Each formulation is
-- exclusive to one practitioner (enforced by CHECK). Admin duplicate
-- detection (Phase 4) prevents the same formulation spec from being
-- approved for multiple practitioners.
--
-- product_catalog_id FK kept (product_catalog is live). FKs to
-- white_label_production_orders / unit_economics_snapshots deferred.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.custom_formulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.level_4_enrollments(id),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),

  internal_name TEXT NOT NULL,
  internal_description TEXT,

  delivery_form TEXT NOT NULL CHECK (delivery_form IN (
    'capsule','tablet','powder','liquid_sublingual','liquid_drops','chewable','gummy'
  )),
  capsule_size TEXT CHECK (capsule_size IN ('00','0','1','2','3','4')),
  servings_per_container INTEGER NOT NULL CHECK (servings_per_container > 0),
  units_per_serving INTEGER NOT NULL CHECK (units_per_serving > 0),
  flavor_if_applicable TEXT,

  intended_primary_indication TEXT NOT NULL,
  intended_adult_use BOOLEAN NOT NULL DEFAULT true,
  intended_pediatric_use BOOLEAN NOT NULL DEFAULT false,
  intended_pregnancy_use BOOLEAN NOT NULL DEFAULT false,

  proposed_structure_function_claims TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  passed_automated_validation BOOLEAN NOT NULL DEFAULT false,
  automated_validation_run_at TIMESTAMPTZ,
  automated_validation_issues JSONB NOT NULL DEFAULT '[]'::jsonb,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'ready_for_validation',
    'validation_failed',
    'ready_for_review',
    'under_medical_review',
    'under_regulatory_review',
    'revision_requested',
    'approved_pending_development_fee',
    'approved_production_ready',
    'archived',
    'rejected'
  )),

  exclusive_to_practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),

  development_fee_invoice_id UUID,
  development_fee_paid BOOLEAN NOT NULL DEFAULT false,
  development_fee_paid_at TIMESTAMPTZ,

  approved_at TIMESTAMPTZ,
  medical_review_id UUID,
  regulatory_review_id UUID,

  product_catalog_id UUID REFERENCES public.product_catalog(id),

  version_number INTEGER NOT NULL DEFAULT 1,
  parent_formulation_id UUID REFERENCES public.custom_formulations(id),
  is_current_version BOOLEAN NOT NULL DEFAULT true,

  estimated_cogs_per_unit_cents INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (exclusive_to_practitioner_id = practitioner_id)
);

COMMENT ON TABLE public.custom_formulations IS
  'Per-practitioner custom formulations. Each is exclusive to one practitioner; admin duplicate detection at review time prevents the same spec from being approved for two practitioners.';
COMMENT ON COLUMN public.custom_formulations.exclusive_to_practitioner_id IS
  'Redundant with practitioner_id; makes the exclusive-use property explicit in the schema.';

CREATE INDEX IF NOT EXISTS idx_custom_formulations_practitioner
  ON public.custom_formulations(practitioner_id, status);
CREATE INDEX IF NOT EXISTS idx_custom_formulations_status_review
  ON public.custom_formulations(status)
  WHERE status IN ('ready_for_review','under_medical_review','under_regulatory_review');
CREATE INDEX IF NOT EXISTS idx_custom_formulations_current
  ON public.custom_formulations(practitioner_id, internal_name)
  WHERE is_current_version = true;

ALTER TABLE public.custom_formulations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='custom_formulations' AND policyname='custom_formulations_self_rw') THEN
    CREATE POLICY "custom_formulations_self_rw"
      ON public.custom_formulations FOR ALL TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()))
      WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='custom_formulations' AND policyname='custom_formulations_admin_all') THEN
    CREATE POLICY "custom_formulations_admin_all"
      ON public.custom_formulations FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
