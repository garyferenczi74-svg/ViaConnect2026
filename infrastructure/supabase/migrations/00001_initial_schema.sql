-- ViaConnect GeneX360 Initial Schema Migration
-- Clinical-grade precision health platform

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CUSTOM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('patient', 'naturopath', 'practitioner', 'clinic_admin', 'super_admin');
CREATE TYPE consent_status AS ENUM ('pending', 'granted', 'revoked', 'expired');
CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'critical');
CREATE TYPE treatment_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE interaction_severity AS ENUM ('none', 'mild', 'moderate', 'severe', 'contraindicated');
CREATE TYPE token_transaction_type AS ENUM ('earn', 'spend', 'transfer', 'expire');
CREATE TYPE audit_event_type AS ENUM ('login', 'logout', 'data_access', 'data_modify', 'export', 'consent_change', 'security_alert');

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'patient'
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION auth_uid()
RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- SCHEMAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS genetic;
CREATE SCHEMA IF NOT EXISTS botanical;
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS tokens;

-- ============================================================
-- PUBLIC SCHEMA TABLES
-- ============================================================

-- Users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_metadata ON public.users USING GIN(metadata);

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Practitioners
CREATE TABLE public.practitioners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  license_number TEXT,
  specializations TEXT[] DEFAULT '{}',
  clinic_id UUID,
  bio TEXT,
  credentials JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_practitioners_user_id ON public.practitioners(user_id);
CREATE INDEX idx_practitioners_clinic_id ON public.practitioners(clinic_id);
CREATE INDEX idx_practitioners_specializations ON public.practitioners USING GIN(specializations);
CREATE INDEX idx_practitioners_credentials ON public.practitioners USING GIN(credentials);

CREATE TRIGGER tr_practitioners_updated_at BEFORE UPDATE ON public.practitioners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  sex TEXT CHECK (sex IN ('male', 'female', 'other', 'prefer_not_to_say')),
  practitioner_id UUID REFERENCES public.practitioners(id),
  health_summary JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_user_id ON public.patients(user_id);
CREATE INDEX idx_patients_practitioner_id ON public.patients(practitioner_id);
CREATE INDEX idx_patients_health_summary ON public.patients USING GIN(health_summary);

CREATE TRIGGER tr_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Consent Records
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  status consent_status NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  ip_address INET,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_patient_id ON public.consent_records(patient_id);
CREATE INDEX idx_consent_status ON public.consent_records(status);
CREATE INDEX idx_consent_type ON public.consent_records(consent_type);

CREATE TRIGGER tr_consent_updated_at BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- GENETIC SCHEMA
-- ============================================================

-- Genetic Profiles
CREATE TABLE genetic.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  raw_data_url TEXT,
  processed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_genetic_profiles_patient_id ON genetic.profiles(patient_id);

CREATE TRIGGER tr_genetic_profiles_updated_at BEFORE UPDATE ON genetic.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- SNP Data
CREATE TABLE genetic.snp_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES genetic.profiles(id) ON DELETE CASCADE,
  rsid TEXT NOT NULL,
  gene TEXT NOT NULL,
  genotype TEXT NOT NULL,
  chromosome TEXT NOT NULL,
  position BIGINT NOT NULL,
  clinical_significance TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snp_profile_id ON genetic.snp_data(profile_id);
CREATE INDEX idx_snp_rsid ON genetic.snp_data(rsid);
CREATE INDEX idx_snp_gene ON genetic.snp_data(gene);
CREATE INDEX idx_snp_metadata ON genetic.snp_data USING GIN(metadata);

-- Pathways
CREATE TABLE genetic.pathways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  related_snps TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pathways_category ON genetic.pathways(category);
CREATE INDEX idx_pathways_related_snps ON genetic.pathways USING GIN(related_snps);

CREATE TRIGGER tr_pathways_updated_at BEFORE UPDATE ON genetic.pathways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Pathway Assessments
CREATE TABLE genetic.pathway_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES genetic.profiles(id) ON DELETE CASCADE,
  pathway_id UUID NOT NULL REFERENCES genetic.pathways(id),
  risk_level risk_level NOT NULL DEFAULT 'low',
  score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  recommendations JSONB DEFAULT '[]',
  ai_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pathway_assess_profile ON genetic.pathway_assessments(profile_id);
CREATE INDEX idx_pathway_assess_pathway ON genetic.pathway_assessments(pathway_id);
CREATE INDEX idx_pathway_assess_risk ON genetic.pathway_assessments(risk_level);

CREATE TRIGGER tr_pathway_assessments_updated_at BEFORE UPDATE ON genetic.pathway_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BOTANICAL SCHEMA
-- ============================================================

-- Herbs
CREATE TABLE botanical.herbs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  common_name TEXT NOT NULL,
  latin_name TEXT NOT NULL UNIQUE,
  family TEXT,
  parts_used TEXT[] DEFAULT '{}',
  actions TEXT[] DEFAULT '{}',
  indications TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  dosage_info JSONB DEFAULT '{}',
  safety_profile JSONB DEFAULT '{}',
  evidence_level TEXT CHECK (evidence_level IN ('traditional', 'preliminary', 'moderate', 'strong', 'clinical_trial')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_herbs_common_name ON botanical.herbs(common_name);
CREATE INDEX idx_herbs_family ON botanical.herbs(family);
CREATE INDEX idx_herbs_actions ON botanical.herbs USING GIN(actions);
CREATE INDEX idx_herbs_indications ON botanical.herbs USING GIN(indications);
CREATE INDEX idx_herbs_parts_used ON botanical.herbs USING GIN(parts_used);

CREATE TRIGGER tr_herbs_updated_at BEFORE UPDATE ON botanical.herbs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Interactions
CREATE TABLE botanical.interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  herb_id UUID NOT NULL REFERENCES botanical.herbs(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('herb', 'drug', 'supplement', 'gene')),
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  severity interaction_severity NOT NULL DEFAULT 'none',
  mechanism TEXT,
  description TEXT,
  evidence TEXT[] DEFAULT '{}',
  references JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_herb_id ON botanical.interactions(herb_id);
CREATE INDEX idx_interactions_target ON botanical.interactions(target_type, target_id);
CREATE INDEX idx_interactions_severity ON botanical.interactions(severity);
CREATE INDEX idx_interactions_evidence ON botanical.interactions USING GIN(evidence);

CREATE TRIGGER tr_interactions_updated_at BEFORE UPDATE ON botanical.interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Genetic Protocols
CREATE TABLE botanical.genetic_protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pathway_id UUID REFERENCES genetic.pathways(id),
  risk_level risk_level NOT NULL,
  herbs UUID[] DEFAULT '{}',
  dosage_adjustments JSONB DEFAULT '{}',
  contraindicated_herbs UUID[] DEFAULT '{}',
  rationale TEXT,
  evidence_level TEXT CHECK (evidence_level IN ('traditional', 'preliminary', 'moderate', 'strong', 'clinical_trial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_genetic_protocols_pathway ON botanical.genetic_protocols(pathway_id);
CREATE INDEX idx_genetic_protocols_risk ON botanical.genetic_protocols(risk_level);
CREATE INDEX idx_genetic_protocols_herbs ON botanical.genetic_protocols USING GIN(herbs);

CREATE TRIGGER tr_genetic_protocols_updated_at BEFORE UPDATE ON botanical.genetic_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CLINICAL SCHEMA
-- ============================================================

-- Treatment Plans
CREATE TABLE clinical.treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  title TEXT NOT NULL,
  status treatment_status NOT NULL DEFAULT 'draft',
  goals JSONB DEFAULT '[]',
  duration_weeks INTEGER,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_treatment_plans_patient ON clinical.treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_practitioner ON clinical.treatment_plans(practitioner_id);
CREATE INDEX idx_treatment_plans_status ON clinical.treatment_plans(status);

CREATE TRIGGER tr_treatment_plans_updated_at BEFORE UPDATE ON clinical.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Formulations
CREATE TABLE clinical.formulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_plan_id UUID NOT NULL REFERENCES clinical.treatment_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  herbs JSONB NOT NULL DEFAULT '[]',
  instructions TEXT,
  frequency TEXT,
  duration_days INTEGER,
  warnings TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_formulations_plan ON clinical.formulations(treatment_plan_id);

CREATE TRIGGER tr_formulations_updated_at BEFORE UPDATE ON clinical.formulations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Interventions
CREATE TABLE clinical.interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_plan_id UUID NOT NULL REFERENCES clinical.treatment_plans(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('supplement', 'lifestyle', 'dietary', 'botanical', 'referral', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  dosage TEXT,
  frequency TEXT,
  priority INTEGER DEFAULT 0,
  status treatment_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interventions_plan ON clinical.interventions(treatment_plan_id);
CREATE INDEX idx_interventions_type ON clinical.interventions(type);
CREATE INDEX idx_interventions_status ON clinical.interventions(status);

CREATE TRIGGER tr_interventions_updated_at BEFORE UPDATE ON clinical.interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Progress Entries
CREATE TABLE clinical.progress_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_plan_id UUID NOT NULL REFERENCES clinical.treatment_plans(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES public.practitioners(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('note', 'assessment', 'vitals', 'lab_result', 'patient_report')),
  content JSONB NOT NULL DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_progress_plan ON clinical.progress_entries(treatment_plan_id);
CREATE INDEX idx_progress_patient ON clinical.progress_entries(patient_id);
CREATE INDEX idx_progress_practitioner ON clinical.progress_entries(practitioner_id);
CREATE INDEX idx_progress_type ON clinical.progress_entries(entry_type);
CREATE INDEX idx_progress_content ON clinical.progress_entries USING GIN(content);

CREATE TRIGGER tr_progress_entries_updated_at BEFORE UPDATE ON clinical.progress_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUDIT SCHEMA
-- ============================================================

-- Access Logs
CREATE TABLE audit.access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  event_type audit_event_type NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user ON audit.access_logs(user_id);
CREATE INDEX idx_access_logs_event ON audit.access_logs(event_type);
CREATE INDEX idx_access_logs_resource ON audit.access_logs(resource_type, resource_id);
CREATE INDEX idx_access_logs_created ON audit.access_logs(created_at);

-- Data Changes
CREATE TABLE audit.data_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_changes_user ON audit.data_changes(user_id);
CREATE INDEX idx_data_changes_table ON audit.data_changes(table_name);
CREATE INDEX idx_data_changes_record ON audit.data_changes(record_id);
CREATE INDEX idx_data_changes_created ON audit.data_changes(created_at);

-- Security Events
CREATE TABLE audit.security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_events_user ON audit.security_events(user_id);
CREATE INDEX idx_security_events_severity ON audit.security_events(severity);
CREATE INDEX idx_security_events_resolved ON audit.security_events(resolved);
CREATE INDEX idx_security_events_created ON audit.security_events(created_at);

-- ============================================================
-- TOKENS SCHEMA
-- ============================================================

-- FarmaTokens Ledger
CREATE TABLE tokens.farma_tokens_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  amount NUMERIC(12, 2) NOT NULL,
  type token_transaction_type NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tokens_user ON tokens.farma_tokens_ledger(user_id);
CREATE INDEX idx_tokens_type ON tokens.farma_tokens_ledger(type);
CREATE INDEX idx_tokens_created ON tokens.farma_tokens_ledger(created_at);
CREATE INDEX idx_tokens_expires ON tokens.farma_tokens_ledger(expires_at);

-- FarmaTokens Balance (Materialized View)
CREATE MATERIALIZED VIEW tokens.farma_tokens_balance AS
SELECT
  user_id,
  SUM(CASE WHEN type = 'earn' THEN amount WHEN type IN ('spend', 'expire') THEN -amount WHEN type = 'transfer' THEN -amount ELSE 0 END) AS available,
  SUM(CASE WHEN type = 'earn' AND expires_at IS NOT NULL AND expires_at > NOW() THEN amount ELSE 0 END) AS pending_expiry,
  SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END) AS lifetime_earned
FROM tokens.farma_tokens_ledger
GROUP BY user_id;

CREATE UNIQUE INDEX idx_tokens_balance_user ON tokens.farma_tokens_balance(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE genetic.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE genetic.snp_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE genetic.pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE genetic.pathway_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE botanical.herbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE botanical.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE botanical.genetic_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.formulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.data_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens.farma_tokens_ledger ENABLE ROW LEVEL SECURITY;

-- PUBLIC.USERS policies
CREATE POLICY users_self_read ON public.users FOR SELECT
  USING (auth_id = auth_uid());

CREATE POLICY users_admin_all ON public.users FOR ALL
  USING (auth_role() IN ('super_admin', 'clinic_admin'));

-- PUBLIC.PRACTITIONERS policies
CREATE POLICY practitioners_self_read ON public.practitioners FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth_uid()));

CREATE POLICY practitioners_admin_all ON public.practitioners FOR ALL
  USING (auth_role() IN ('super_admin', 'clinic_admin'));

-- PUBLIC.PATIENTS policies
CREATE POLICY patients_self_read ON public.patients FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth_uid()));

CREATE POLICY patients_practitioner_read ON public.patients FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth_uid()
      )
    )
  );

CREATE POLICY patients_admin_all ON public.patients FOR ALL
  USING (auth_role() IN ('super_admin', 'clinic_admin'));

-- PUBLIC.CONSENT_RECORDS policies
CREATE POLICY consent_patient_read ON public.consent_records FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY consent_patient_update ON public.consent_records FOR UPDATE
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY consent_admin_all ON public.consent_records FOR ALL
  USING (auth_role() IN ('super_admin'));

-- GENETIC policies
CREATE POLICY genetic_profiles_patient ON genetic.profiles FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY genetic_profiles_practitioner ON genetic.profiles FOR SELECT
  USING (
    auth_role() IN ('practitioner', 'naturopath', 'super_admin') AND
    patient_id IN (
      SELECT p.id FROM public.patients p WHERE p.practitioner_id IN (
        SELECT pr.id FROM public.practitioners pr
        JOIN public.users u ON pr.user_id = u.id
        WHERE u.auth_id = auth_uid()
      )
    )
  );

CREATE POLICY genetic_snp_patient ON genetic.snp_data FOR SELECT
  USING (
    profile_id IN (
      SELECT gp.id FROM genetic.profiles gp
      JOIN public.patients p ON gp.patient_id = p.id
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY genetic_snp_practitioner ON genetic.snp_data FOR SELECT
  USING (
    auth_role() IN ('practitioner', 'naturopath', 'super_admin')
  );

CREATE POLICY genetic_pathways_read ON genetic.pathways FOR SELECT
  USING (true);

CREATE POLICY genetic_pathways_admin ON genetic.pathways FOR ALL
  USING (auth_role() = 'super_admin');

CREATE POLICY genetic_assessments_patient ON genetic.pathway_assessments FOR SELECT
  USING (
    profile_id IN (
      SELECT gp.id FROM genetic.profiles gp
      JOIN public.patients p ON gp.patient_id = p.id
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY genetic_assessments_practitioner ON genetic.pathway_assessments FOR ALL
  USING (auth_role() IN ('practitioner', 'naturopath', 'super_admin'));

-- BOTANICAL policies (herbs and interactions are read-only for most users)
CREATE POLICY botanical_herbs_read ON botanical.herbs FOR SELECT
  USING (true);

CREATE POLICY botanical_herbs_admin ON botanical.herbs FOR ALL
  USING (auth_role() IN ('super_admin', 'naturopath'));

CREATE POLICY botanical_interactions_read ON botanical.interactions FOR SELECT
  USING (true);

CREATE POLICY botanical_interactions_admin ON botanical.interactions FOR ALL
  USING (auth_role() IN ('super_admin', 'naturopath'));

CREATE POLICY botanical_protocols_read ON botanical.genetic_protocols FOR SELECT
  USING (true);

CREATE POLICY botanical_protocols_admin ON botanical.genetic_protocols FOR ALL
  USING (auth_role() IN ('super_admin', 'naturopath'));

-- CLINICAL policies
CREATE POLICY clinical_plans_patient ON clinical.treatment_plans FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY clinical_plans_practitioner ON clinical.treatment_plans FOR ALL
  USING (
    auth_role() IN ('practitioner', 'naturopath', 'super_admin') AND
    practitioner_id IN (
      SELECT pr.id FROM public.practitioners pr
      JOIN public.users u ON pr.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY clinical_formulations_patient ON clinical.formulations FOR SELECT
  USING (
    treatment_plan_id IN (
      SELECT tp.id FROM clinical.treatment_plans tp
      JOIN public.patients p ON tp.patient_id = p.id
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY clinical_formulations_practitioner ON clinical.formulations FOR ALL
  USING (auth_role() IN ('practitioner', 'naturopath', 'super_admin'));

CREATE POLICY clinical_interventions_patient ON clinical.interventions FOR SELECT
  USING (
    treatment_plan_id IN (
      SELECT tp.id FROM clinical.treatment_plans tp
      JOIN public.patients p ON tp.patient_id = p.id
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY clinical_interventions_practitioner ON clinical.interventions FOR ALL
  USING (auth_role() IN ('practitioner', 'naturopath', 'super_admin'));

CREATE POLICY clinical_progress_patient ON clinical.progress_entries FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.users u ON p.user_id = u.id
      WHERE u.auth_id = auth_uid()
    )
  );

CREATE POLICY clinical_progress_practitioner ON clinical.progress_entries FOR ALL
  USING (auth_role() IN ('practitioner', 'naturopath', 'super_admin'));

-- AUDIT policies (only super_admin can read audit logs)
CREATE POLICY audit_access_admin ON audit.access_logs FOR SELECT
  USING (auth_role() = 'super_admin');

CREATE POLICY audit_access_insert ON audit.access_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY audit_changes_admin ON audit.data_changes FOR SELECT
  USING (auth_role() = 'super_admin');

CREATE POLICY audit_changes_insert ON audit.data_changes FOR INSERT
  WITH CHECK (true);

CREATE POLICY audit_security_admin ON audit.security_events FOR ALL
  USING (auth_role() = 'super_admin');

CREATE POLICY audit_security_insert ON audit.security_events FOR INSERT
  WITH CHECK (true);

-- TOKENS policies
CREATE POLICY tokens_self_read ON tokens.farma_tokens_ledger FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth_uid()));

CREATE POLICY tokens_admin_all ON tokens.farma_tokens_ledger FOR ALL
  USING (auth_role() = 'super_admin');

CREATE POLICY tokens_system_insert ON tokens.farma_tokens_ledger FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- GRANT SCHEMA ACCESS
-- ============================================================
GRANT USAGE ON SCHEMA genetic TO authenticated;
GRANT USAGE ON SCHEMA botanical TO authenticated;
GRANT USAGE ON SCHEMA clinical TO authenticated;
GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT USAGE ON SCHEMA tokens TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA genetic TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA botanical TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA clinical TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA audit TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA tokens TO authenticated;
GRANT SELECT ON tokens.farma_tokens_balance TO authenticated;
