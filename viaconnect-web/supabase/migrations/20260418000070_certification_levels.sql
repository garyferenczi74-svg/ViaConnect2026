-- =============================================================================
-- Prompt #91, Phase 2.2: Practitioner certification levels
-- =============================================================================
-- Append-only. Three certification levels per spec:
--   foundation:           free, required, included with subscription
--   precision_designer:   $888 one-time, $388 annual recert
--   master_practitioner:  $1888 one-time, $388 annual recert
-- CE partnership status starts as 'pending' for all paid levels (Q1 2027
-- launch state); flipped to 'active' once the CE board partnership is
-- countersigned.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.certification_levels (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  level_number INTEGER NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  annual_recertification_price_cents INTEGER CHECK (
    annual_recertification_price_cents IS NULL OR annual_recertification_price_cents >= 0
  ),
  description TEXT,
  estimated_hours INTEGER CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  ce_credits_offered INTEGER CHECK (ce_credits_offered IS NULL OR ce_credits_offered >= 0),
  ce_partnership_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    ce_partnership_status IN ('pending', 'active', 'inactive')
  ),
  validity_months INTEGER CHECK (validity_months IS NULL OR validity_months > 0),
  is_required BOOLEAN NOT NULL DEFAULT false,
  unlocks_white_label BOOLEAN NOT NULL DEFAULT false,
  unlocks_custom_formulation BOOLEAN NOT NULL DEFAULT false,
  lms_course_id TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.certification_levels IS
  'Practitioner certification program levels: Foundation (free, required), Precision Protocol Designer ($888), Master Practitioner ($1,888). $388 annual recert for paid levels.';
COMMENT ON COLUMN public.certification_levels.ce_partnership_status IS
  'pending = partnership in progress (Q1 2027 launch state); active = CE credits issued; inactive = partnership lapsed.';

ALTER TABLE public.certification_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cert_levels_read_all ON public.certification_levels;
CREATE POLICY cert_levels_read_all
  ON public.certification_levels FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS cert_levels_admin_write ON public.certification_levels;
CREATE POLICY cert_levels_admin_write
  ON public.certification_levels FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.certification_levels (
  id, display_name, level_number, price_cents, annual_recertification_price_cents,
  description, estimated_hours, ce_credits_offered,
  validity_months, is_required, unlocks_white_label, unlocks_custom_formulation,
  sort_order
) VALUES
  ('foundation', 'Level 1: Foundation',
    1, 0, NULL,
    'Free foundation course required for all practitioner accounts. Covers ViaCura product line, basic genetic concepts, platform usage. Completion required before prescribing products.',
    5, 5, 24, true, false, false, 1),
  ('precision_designer', 'Level 2: Precision Protocol Designer',
    2, 88800, 38800,
    'Clinical training on methylation, genetic variant interpretation, protocol building with GeneX360 data. Case studies and applied learning. Required for practitioners working with GeneX360 data clinically.',
    18, 20, 24, false, false, false, 2),
  ('master_practitioner', 'Level 3: Master Practitioner',
    3, 188800, 38800,
    'Advanced clinical training, patient case review, practice integration, marketing to patients. Unlocks White-Label Platform tier pricing and Custom Formulation program access. Confers Preferred Practitioner status.',
    35, 35, 24, false, true, true, 3)
ON CONFLICT (id) DO UPDATE SET
  display_name                       = EXCLUDED.display_name,
  level_number                       = EXCLUDED.level_number,
  price_cents                        = EXCLUDED.price_cents,
  annual_recertification_price_cents = EXCLUDED.annual_recertification_price_cents,
  description                        = EXCLUDED.description,
  estimated_hours                    = EXCLUDED.estimated_hours,
  ce_credits_offered                 = EXCLUDED.ce_credits_offered,
  validity_months                    = EXCLUDED.validity_months,
  is_required                        = EXCLUDED.is_required,
  unlocks_white_label                = EXCLUDED.unlocks_white_label,
  unlocks_custom_formulation         = EXCLUDED.unlocks_custom_formulation,
  sort_order                         = EXCLUDED.sort_order,
  updated_at                         = NOW();
