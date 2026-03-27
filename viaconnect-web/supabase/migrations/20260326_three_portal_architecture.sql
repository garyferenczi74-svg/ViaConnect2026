-- ============================================================================
-- ViaConnect Three-Portal Architecture Migration
-- Created: 2026-03-26
-- Description: Cross-portal tables for consumer, practitioner, and naturopath portals
-- ============================================================================

-- ============================================================================
-- 1. ALTER TABLE profiles - Add practitioner/naturopath columns
-- ============================================================================
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN practice_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN license_number TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN specialty TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN practice_address JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN accepting_patients BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================================
-- 2. practitioner_patients
-- ============================================================================
CREATE TABLE IF NOT EXISTS practitioner_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  consent_granted_at TIMESTAMPTZ,
  consent_revoked_at TIMESTAMPTZ,
  can_view_genetics BOOLEAN DEFAULT false,
  can_view_labs BOOLEAN DEFAULT false,
  can_view_supplements BOOLEAN DEFAULT false,
  can_view_compliance BOOLEAN DEFAULT false,
  can_view_wearables BOOLEAN DEFAULT false,
  can_view_ai_conversations BOOLEAN DEFAULT false,
  can_prescribe_protocols BOOLEAN DEFAULT false,
  can_order_panels BOOLEAN DEFAULT false,
  can_view_medications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(practitioner_id, patient_id)
);

-- ============================================================================
-- 3. collaborative_care
-- ============================================================================
CREATE TABLE IF NOT EXISTS collaborative_care (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naturopath_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  practitioner_can_view_naturopath_notes BOOLEAN DEFAULT false,
  naturopath_can_view_practitioner_notes BOOLEAN DEFAULT false,
  practitioner_can_view_naturopath_protocols BOOLEAN DEFAULT false,
  naturopath_can_view_practitioner_protocols BOOLEAN DEFAULT false,
  patient_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. supplement_protocols
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplement_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescribed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescribed_by_role TEXT NOT NULL,
  protocol_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'active', 'completed', 'rejected')),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. supplement_protocol_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplement_protocol_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES supplement_protocols(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_id TEXT,
  dosage TEXT NOT NULL,
  timing TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER,
  rationale TEXT,
  genetic_context JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. clinical_notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL,
  note_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  referenced_snps JSONB,
  referenced_labs JSONB,
  referenced_protocol_id UUID REFERENCES supplement_protocols(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. panel_orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS panel_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordered_by_role TEXT NOT NULL,
  panel_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  batch_id TEXT,
  stripe_payment_id TEXT,
  kit_tracking_number TEXT,
  results_received_at TIMESTAMPTZ,
  results_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. portal_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  attached_protocol_id UUID REFERENCES supplement_protocols(id) ON DELETE SET NULL,
  attached_note_id UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. herbal_genomic_interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS herbal_genomic_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  herb_name TEXT NOT NULL,
  herb_latin_name TEXT,
  gene TEXT NOT NULL,
  variant TEXT,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('synergistic', 'antagonistic', 'modifying', 'caution')),
  description TEXT NOT NULL,
  mechanism TEXT,
  evidence_level TEXT NOT NULL CHECK (evidence_level IN ('strong', 'moderate', 'preliminary', 'traditional')),
  references JSONB,
  related_supplement TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. patient_intake_forms
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  form_data JSONB,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. consultations
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_sid TEXT,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naturopath_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes_id UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Enable RLS on ALL tables
-- ============================================================================
ALTER TABLE practitioner_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_care ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_protocol_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE herbal_genomic_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- practitioner_patients: users see own relationships
CREATE POLICY "Users see own practitioner_patients" ON practitioner_patients
  FOR SELECT USING (auth.uid() = practitioner_id OR auth.uid() = patient_id);

CREATE POLICY "Practitioners insert practitioner_patients" ON practitioner_patients
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Users update own practitioner_patients" ON practitioner_patients
  FOR UPDATE USING (auth.uid() = practitioner_id OR auth.uid() = patient_id);

-- collaborative_care: involved parties can view
CREATE POLICY "Users see own collaborative_care" ON collaborative_care
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = practitioner_id OR auth.uid() = naturopath_id);

-- supplement_protocols: patients see own, practitioners see via active relationship
CREATE POLICY "Patients see own protocols" ON supplement_protocols
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Prescribers see own protocols" ON supplement_protocols
  FOR SELECT USING (auth.uid() = prescribed_by);

CREATE POLICY "Practitioners see patient protocols" ON supplement_protocols
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practitioner_patients
      WHERE practitioner_patients.practitioner_id = auth.uid()
        AND practitioner_patients.patient_id = supplement_protocols.patient_id
        AND practitioner_patients.status = 'active'
        AND practitioner_patients.can_view_supplements = true
    )
  );

CREATE POLICY "Prescribers insert protocols" ON supplement_protocols
  FOR INSERT WITH CHECK (auth.uid() = prescribed_by);

CREATE POLICY "Prescribers update own protocols" ON supplement_protocols
  FOR UPDATE USING (auth.uid() = prescribed_by OR auth.uid() = patient_id);

-- supplement_protocol_items: accessible via protocol access
CREATE POLICY "Users see protocol items via protocol" ON supplement_protocol_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM supplement_protocols
      WHERE supplement_protocols.id = supplement_protocol_items.protocol_id
        AND (supplement_protocols.patient_id = auth.uid() OR supplement_protocols.prescribed_by = auth.uid())
    )
  );

CREATE POLICY "Practitioners see protocol items" ON supplement_protocol_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM supplement_protocols
      JOIN practitioner_patients ON practitioner_patients.patient_id = supplement_protocols.patient_id
      WHERE supplement_protocols.id = supplement_protocol_items.protocol_id
        AND practitioner_patients.practitioner_id = auth.uid()
        AND practitioner_patients.status = 'active'
        AND practitioner_patients.can_view_supplements = true
    )
  );

CREATE POLICY "Prescribers manage protocol items" ON supplement_protocol_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplement_protocols
      WHERE supplement_protocols.id = supplement_protocol_items.protocol_id
        AND supplement_protocols.prescribed_by = auth.uid()
    )
  );

-- clinical_notes: authors see own, patients see non-private
CREATE POLICY "Authors see own notes" ON clinical_notes
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Patients see non-private notes" ON clinical_notes
  FOR SELECT USING (auth.uid() = patient_id AND is_private = false);

CREATE POLICY "Practitioners see patient notes" ON clinical_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practitioner_patients
      WHERE practitioner_patients.practitioner_id = auth.uid()
        AND practitioner_patients.patient_id = clinical_notes.patient_id
        AND practitioner_patients.status = 'active'
    )
    AND is_private = false
  );

CREATE POLICY "Authors insert notes" ON clinical_notes
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors update own notes" ON clinical_notes
  FOR UPDATE USING (auth.uid() = author_id);

-- panel_orders: patients see own, practitioners see via relationship
CREATE POLICY "Patients see own panel orders" ON panel_orders
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Orderers see own panel orders" ON panel_orders
  FOR SELECT USING (auth.uid() = ordered_by);

CREATE POLICY "Practitioners see patient panel orders" ON panel_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practitioner_patients
      WHERE practitioner_patients.practitioner_id = auth.uid()
        AND practitioner_patients.patient_id = panel_orders.patient_id
        AND practitioner_patients.status = 'active'
        AND practitioner_patients.can_view_labs = true
    )
  );

CREATE POLICY "Orderers insert panel orders" ON panel_orders
  FOR INSERT WITH CHECK (auth.uid() = ordered_by);

-- portal_messages: sender and recipient can view
CREATE POLICY "Users see own messages" ON portal_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users send messages" ON portal_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients update messages" ON portal_messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- herbal_genomic_interactions: readable by all authenticated users
CREATE POLICY "Authenticated users read herbal interactions" ON herbal_genomic_interactions
  FOR SELECT USING (auth.role() = 'authenticated');

-- patient_intake_forms: patient and practitioner can view
CREATE POLICY "Patients see own intake forms" ON patient_intake_forms
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Practitioners see assigned intake forms" ON patient_intake_forms
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners insert intake forms" ON patient_intake_forms
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Users update own intake forms" ON patient_intake_forms
  FOR UPDATE USING (auth.uid() = patient_id OR auth.uid() = practitioner_id);

-- consultations: involved parties can view
CREATE POLICY "Users see own consultations" ON consultations
  FOR SELECT USING (
    auth.uid() = practitioner_id OR auth.uid() = patient_id OR auth.uid() = naturopath_id
  );

CREATE POLICY "Practitioners insert consultations" ON consultations
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners update consultations" ON consultations
  FOR UPDATE USING (auth.uid() = practitioner_id);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_practitioner_patients_practitioner_status
  ON practitioner_patients(practitioner_id, status);

CREATE INDEX IF NOT EXISTS idx_practitioner_patients_patient
  ON practitioner_patients(patient_id);

CREATE INDEX IF NOT EXISTS idx_supplement_protocols_patient
  ON supplement_protocols(patient_id);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_created
  ON clinical_notes(patient_id, created_at);

CREATE INDEX IF NOT EXISTS idx_panel_orders_ordered_by
  ON panel_orders(ordered_by);

CREATE INDEX IF NOT EXISTS idx_portal_messages_conversation_created
  ON portal_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_herbal_genomic_interactions_herb
  ON herbal_genomic_interactions(herb_name);

CREATE INDEX IF NOT EXISTS idx_herbal_genomic_interactions_gene
  ON herbal_genomic_interactions(gene);

-- ============================================================================
-- Seed: herbal_genomic_interactions
-- ============================================================================
INSERT INTO herbal_genomic_interactions (herb_name, herb_latin_name, gene, variant, interaction_type, description, mechanism, evidence_level, references, related_supplement)
VALUES
  (
    'St. John''s Wort',
    'Hypericum perforatum',
    'CYP2D6',
    '*1/*4',
    'caution',
    'St. John''s Wort induces CYP2D6 enzyme activity, potentially altering metabolism of medications processed by this pathway.',
    'Induces CYP2D6 expression via PXR activation, increasing metabolic clearance of CYP2D6 substrates.',
    'strong',
    '["PMID:12648025", "PMID:15089812"]',
    'Hypericum extract'
  ),
  (
    'Turmeric / Curcumin',
    'Curcuma longa',
    'COMT',
    'Val158Met',
    'synergistic',
    'Curcumin inhibits COMT enzyme activity, synergistically supporting catecholamine balance in slow COMT variants.',
    'Competitive inhibition of COMT enzyme; supports dopamine and estrogen metabolism modulation.',
    'moderate',
    '["PMID:19442862", "PMID:21428901"]',
    'Curcumin extract'
  ),
  (
    'Ashwagandha',
    'Withania somnifera',
    'GAD1',
    'rs3749034',
    'synergistic',
    'Ashwagandha supports GABAergic activity, synergistically beneficial for individuals with GAD1 variants affecting GABA synthesis.',
    'Withanolides support GABA-A receptor modulation and may upregulate GAD1 expression for GABA synthesis.',
    'moderate',
    '["PMID:23439798", "PMID:28471731"]',
    'Ashwagandha root extract (KSM-66)'
  ),
  (
    'Milk Thistle',
    'Silybum marianum',
    'CYP3A4',
    '*1/*22',
    'caution',
    'Silymarin inhibits CYP3A4 activity, potentially increasing drug concentrations for medications metabolized by this enzyme.',
    'Competitive and mechanism-based inhibition of CYP3A4 by silybin A and silybin B.',
    'moderate',
    '["PMID:16415089", "PMID:19505216"]',
    'Silymarin / Milk Thistle extract'
  ),
  (
    'Ginkgo Biloba',
    'Ginkgo biloba',
    'CYP2C19',
    '*2/*2',
    'caution',
    'Ginkgo inhibits CYP2C19, which may compound poor-metabolizer phenotype effects and alter drug clearance.',
    'Ginkgolides and bilobalide inhibit CYP2C19 enzymatic activity, reducing clearance of CYP2C19 substrates.',
    'moderate',
    '["PMID:12383232", "PMID:16618019"]',
    'Ginkgo leaf extract (EGb 761)'
  ),
  (
    'Valerian',
    'Valeriana officinalis',
    'GABA-A receptor',
    'GABRA1 rs2279020',
    'synergistic',
    'Valerian enhances GABAergic transmission at GABA-A receptors, synergistic for variants affecting receptor sensitivity.',
    'Valerenic acid and isovaleric acid modulate GABA-A receptor subunit activity, enhancing inhibitory neurotransmission.',
    'moderate',
    '["PMID:15895713", "PMID:20042323"]',
    'Valerian root extract'
  ),
  (
    'Echinacea',
    'Echinacea purpurea',
    'TNF-alpha',
    'rs1800629',
    'modifying',
    'Echinacea modulates TNF-alpha expression, potentially modifying inflammatory response in TNF-alpha promoter variants.',
    'Alkamides and polysaccharides modulate NF-kB pathway, altering TNF-alpha transcription and cytokine balance.',
    'preliminary',
    '["PMID:17221569", "PMID:19504465"]',
    'Echinacea purpurea extract'
  ),
  (
    'Green Tea / EGCG',
    'Camellia sinensis',
    'COMT',
    'Val158Met',
    'antagonistic',
    'EGCG is a potent COMT inhibitor; in slow COMT variants, this may further reduce catecholamine clearance, causing adverse effects.',
    'EGCG acts as a high-affinity COMT substrate/inhibitor, competing with endogenous catechol compounds for enzyme binding.',
    'strong',
    '["PMID:17522597", "PMID:20304568"]',
    'Green Tea Extract (standardized EGCG)'
  );
