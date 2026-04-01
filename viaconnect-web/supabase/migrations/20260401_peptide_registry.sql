-- FarmCeutica Peptide Registry — 29 peptides, 113 SKUs, 8 categories

CREATE TABLE IF NOT EXISTS peptide_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_icon TEXT,
  category_color TEXT,
  type TEXT,
  mechanism TEXT,
  evidence_level TEXT CHECK (evidence_level IN ('strong','moderate','emerging')),
  how_it_works TEXT,
  key_highlights TEXT[],
  performance_profile JSONB DEFAULT '[]'::jsonb,
  cycle_protocol TEXT,
  onset_timeline TEXT,
  genex_synergy TEXT,
  target_variants TEXT[],
  genex_panel TEXT,
  price_range TEXT,
  market_launch TEXT,
  is_farmceutica BOOLEAN DEFAULT true,
  is_investigational BOOLEAN DEFAULT false,
  requires_prescription BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_category ON peptide_registry (category);
CREATE INDEX IF NOT EXISTS idx_pr_evidence ON peptide_registry (evidence_level);
CREATE INDEX IF NOT EXISTS idx_pr_panel ON peptide_registry (genex_panel);

ALTER TABLE peptide_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read peptides" ON peptide_registry FOR SELECT USING (true);

-- Delivery options (4 forms per peptide = 113 SKUs)
CREATE TABLE IF NOT EXISTS peptide_delivery_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id TEXT NOT NULL REFERENCES peptide_registry(peptide_id),
  delivery_form TEXT NOT NULL CHECK (delivery_form IN ('liposomal','micellar','injectable','nasal_spray')),
  protocol TEXT NOT NULL,
  bioavailability_estimate NUMERIC(3,2),
  pricing_tier TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(peptide_id, delivery_form)
);

ALTER TABLE peptide_delivery_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read delivery options" ON peptide_delivery_options FOR SELECT USING (true);

-- Peptide categories
CREATE TABLE IF NOT EXISTS peptide_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  product_count INTEGER DEFAULT 0,
  sku_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE peptide_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON peptide_categories FOR SELECT USING (true);

-- Interaction matrix (Layers 4-7)
CREATE TABLE IF NOT EXISTS peptide_interaction_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id TEXT NOT NULL,
  interacts_with TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('peptide_medication','peptide_supplement','peptide_peptide','peptide_variant')),
  severity TEXT NOT NULL CHECK (severity IN ('major','moderate','synergistic')),
  description TEXT NOT NULL,
  action TEXT NOT NULL,
  delivery_form_specific TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pim_peptide ON peptide_interaction_matrix (peptide_id);
CREATE INDEX IF NOT EXISTS idx_pim_severity ON peptide_interaction_matrix (severity);

ALTER TABLE peptide_interaction_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read interactions" ON peptide_interaction_matrix FOR SELECT USING (true);

-- User peptide prescriptions
CREATE TABLE IF NOT EXISTS user_peptide_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peptide_id TEXT NOT NULL REFERENCES peptide_registry(peptide_id),
  delivery_form TEXT NOT NULL,
  prescribed_by UUID REFERENCES auth.users(id),
  dosing_protocol TEXT,
  cycle_protocol TEXT,
  ai_reasoning TEXT,
  triggering_symptoms TEXT[],
  triggering_variants TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upp_user ON user_peptide_prescriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_upp_status ON user_peptide_prescriptions (status);

ALTER TABLE user_peptide_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prescriptions" ON user_peptide_prescriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Practitioners manage prescriptions" ON user_peptide_prescriptions FOR ALL USING (auth.uid() = prescribed_by OR auth.uid() = user_id);
