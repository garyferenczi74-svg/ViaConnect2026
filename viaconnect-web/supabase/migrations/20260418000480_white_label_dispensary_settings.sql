-- =============================================================================
-- Prompt #96 Phase 6: Per-label dispensary settings + practitioner slug
-- =============================================================================
-- Append-only. Two pieces:
--   1. white_label_dispensary_settings: per (practitioner, label_design)
--      retail price, published toggle, featured flag, patient-facing
--      description.
--   2. dispensary_slug column on practitioners: URL-safe identifier used
--      by the patient-facing /dispensary/[slug] route. Generated from
--      practice_name with id-as-fallback so practitioners with identical
--      practice names still get unique URLs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.white_label_dispensary_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  label_design_id UUID NOT NULL REFERENCES public.white_label_label_designs(id) ON DELETE CASCADE,

  retail_price_cents INTEGER NOT NULL CHECK (retail_price_cents >= 0),
  patient_facing_description TEXT,

  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, label_design_id)
);

COMMENT ON TABLE public.white_label_dispensary_settings IS
  'Per-product dispensary configuration. retail_price_cents is set entirely at the practitioners discretion (no MAP enforcement on white-label). is_published gates patient visibility; is_featured promotes to the top of the list.';

CREATE INDEX IF NOT EXISTS idx_wl_disp_published
  ON public.white_label_dispensary_settings(practitioner_id)
  WHERE is_published = true;

ALTER TABLE public.white_label_dispensary_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wl_disp_self_rw ON public.white_label_dispensary_settings;
CREATE POLICY wl_disp_self_rw
  ON public.white_label_dispensary_settings FOR ALL TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()))
  WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS wl_disp_admin_all ON public.white_label_dispensary_settings;
CREATE POLICY wl_disp_admin_all
  ON public.white_label_dispensary_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Public-style read for the patient-facing dispensary: any authenticated
-- patient may read published rows for any practitioner. Patient
-- identity is not validated at the row level here; the route layer
-- decides whether the patient is authorized to see this practitioner's
-- dispensary at all (typically requires an active practitioner_patients
-- relationship, but the spec leaves this open for direct-link access).
DROP POLICY IF EXISTS wl_disp_published_read ON public.white_label_dispensary_settings;
CREATE POLICY wl_disp_published_read
  ON public.white_label_dispensary_settings FOR SELECT TO authenticated
  USING (is_published = true);

-- ---------------------------------------------------------------------------
-- 2. Practitioner dispensary slug
-- ---------------------------------------------------------------------------
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS dispensary_slug TEXT UNIQUE;

COMMENT ON COLUMN public.practitioners.dispensary_slug IS
  'URL-safe identifier for /dispensary/[slug]. Generated from practice_name with falback to first segment of practitioner.id when practice_name collides. Null until first published dispensary item.';

CREATE INDEX IF NOT EXISTS idx_practitioners_dispensary_slug
  ON public.practitioners(dispensary_slug)
  WHERE dispensary_slug IS NOT NULL;
