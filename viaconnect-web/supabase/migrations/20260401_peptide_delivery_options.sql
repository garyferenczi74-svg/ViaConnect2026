-- Peptide Delivery Options — Per-Form SKU Tracking
-- 27 oral peptides x 4 forms = 108 + 1 (Retatrutide injectable only) = 109 SKUs

-- Drop and recreate if the simpler version from the earlier migration exists
DROP TABLE IF EXISTS peptide_delivery_options CASCADE;

CREATE TABLE peptide_delivery_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id TEXT NOT NULL,

  -- Delivery Form Identity
  delivery_form TEXT NOT NULL CHECK (delivery_form IN ('liposomal','micellar','injectable','nasal_spray')),
  sku_code TEXT,
  is_available BOOLEAN DEFAULT true,

  -- Form-Specific Dosing
  dose_amount NUMERIC(10,2),
  dose_unit TEXT,
  dose_frequency TEXT,
  dose_timing TEXT,

  -- Injectable-Specific
  vial_size TEXT,
  reconstitution TEXT,
  units_per_dose INTEGER,
  injection_site TEXT DEFAULT 'subcutaneous abdomen',

  -- Nasal Spray-Specific
  spray_dose_per_nostril TEXT,
  sprays_per_bottle INTEGER,

  -- Cycle Protocol (per form)
  cycle_protocol TEXT,
  cycle_duration_days INTEGER,
  cycle_off_days INTEGER,
  cycles_per_year INTEGER,

  -- Bioavailability (per form)
  bioavailability_estimate NUMERIC(4,2) NOT NULL,
  effective_dose_from_100mcg NUMERIC(5,1),

  -- Onset & Duration
  onset_timeline TEXT,
  duration_per_dose TEXT,

  -- Pricing (per form)
  pricing_tier INTEGER,
  price_range_low NUMERIC(10,2),
  price_range_high NUMERIC(10,2),

  -- Market Launch
  market_launch_month INTEGER,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(peptide_id, delivery_form)
);

CREATE INDEX IF NOT EXISTS idx_pdo_peptide ON peptide_delivery_options (peptide_id);
CREATE INDEX IF NOT EXISTS idx_pdo_form ON peptide_delivery_options (delivery_form);
CREATE INDEX IF NOT EXISTS idx_pdo_sku ON peptide_delivery_options (sku_code);

ALTER TABLE peptide_delivery_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read delivery options" ON peptide_delivery_options FOR SELECT USING (true);

-- Enhanced Peptide Interaction Matrix with form-specific checks
ALTER TABLE peptide_interaction_matrix
  ADD COLUMN IF NOT EXISTS delivery_form_specific BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS affected_delivery_forms TEXT[];

-- Enhanced User Peptide Prescriptions with delivery form link
ALTER TABLE user_peptide_prescriptions
  ADD COLUMN IF NOT EXISTS delivery_option_id UUID,
  ADD COLUMN IF NOT EXISTS delivery_form TEXT,
  ADD COLUMN IF NOT EXISTS protocol_tier INTEGER,
  ADD COLUMN IF NOT EXISTS recommendation_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS stacking_protocol TEXT,
  ADD COLUMN IF NOT EXISTS practitioner_notes TEXT,
  ADD COLUMN IF NOT EXISTS practitioner_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adherence_percentage NUMERIC(5,2);

-- Peptide Categories with SKU counts and preferred delivery form
ALTER TABLE peptide_categories
  ADD COLUMN IF NOT EXISTS sku_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS market_size_estimate TEXT,
  ADD COLUMN IF NOT EXISTS preferred_delivery_form TEXT;
