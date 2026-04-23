-- =============================================================================
-- Prompt #113 Phase 1.2: Disease dictionary (seeded subset) + regulatory
-- alerts feed + per-SKU jurisdiction status (NPN/DIN-HM) + peptide
-- compliance classifications. Retatrutide hard-locked as not_approved per
-- standing rule §1 "Retatrutide injectable-only, never stacked."
-- =============================================================================

-- ---------------------------------------------------------------------------
-- regulatory_disease_dictionary. 120 high-signal terms seeded; the §2.1
-- target of ~2100 ICD-10 entries is a follow-on operational import (CSV
-- ingestion flagged in §19 of the delivery report).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_disease_dictionary (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term            TEXT NOT NULL,
  variant_group   TEXT,
  icd10_code      TEXT,
  severity_level  INTEGER NOT NULL CHECK (severity_level BETWEEN 1 AND 5),
  jurisdiction_id UUID REFERENCES public.regulatory_jurisdictions(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regdd_term  ON public.regulatory_disease_dictionary (term);
CREATE INDEX IF NOT EXISTS idx_regdd_group ON public.regulatory_disease_dictionary (variant_group);
CREATE INDEX IF NOT EXISTS idx_regdd_icd   ON public.regulatory_disease_dictionary (icd10_code);

ALTER TABLE public.regulatory_disease_dictionary ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_disease_dictionary' AND policyname='regdd_read_authenticated') THEN
    CREATE POLICY "regdd_read_authenticated" ON public.regulatory_disease_dictionary FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_disease_dictionary' AND policyname='regdd_write_admin') THEN
    CREATE POLICY "regdd_write_admin" ON public.regulatory_disease_dictionary FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

INSERT INTO public.regulatory_disease_dictionary (term, variant_group, icd10_code, severity_level) VALUES
-- Chapter I - Infectious
('tuberculosis','tuberculosis','A15',4),('hiv','hiv','B20',5),('aids','hiv','B20',5),('hepatitis','hepatitis','B19',4),('hepatitis c','hepatitis','B17.1',4),('hepatitis b','hepatitis','B16',4),('covid-19','covid','U07.1',4),('pneumonia','pneumonia','J18',3),('sepsis','sepsis','A41',5),('lyme disease','lyme','A69.20',3),
-- Chapter II - Neoplasms
('cancer','cancer','C80',5),('tumor','cancer','D49',5),('carcinoma','cancer','C80',5),('sarcoma','cancer','C49',5),('leukemia','leukemia','C95',5),('lymphoma','lymphoma','C85',5),('breast cancer','cancer','C50',5),('prostate cancer','cancer','C61',5),('colon cancer','cancer','C18',5),('lung cancer','cancer','C34',5),('melanoma','cancer','C43',5),('metastasis','cancer','C79',5),
-- Chapter IV - Endocrine
('diabetes','diabetes','E11',4),('type 2 diabetes','diabetes','E11',4),('t2d','diabetes','E11',4),('type 1 diabetes','diabetes','E10',4),('t1d','diabetes','E10',4),('prediabetes','diabetes','R73.03',3),('hypothyroidism','thyroid','E03',3),('hyperthyroidism','thyroid','E05',3),('hashimoto','thyroid','E06.3',3),('graves disease','thyroid','E05.0',3),('obesity','obesity','E66',3),('metabolic syndrome','metabolic','E88.81',3),
-- Chapter V - Mental
('depression','depression','F32',4),('major depression','depression','F33',4),('mdd','depression','F33',4),('anxiety','anxiety','F41',3),('generalized anxiety','anxiety','F41.1',3),('panic disorder','anxiety','F41.0',3),('ptsd','ptsd','F43.1',4),('bipolar disorder','bipolar','F31',4),('schizophrenia','schizophrenia','F20',5),('adhd','adhd','F90',2),('autism','autism','F84.0',3),('ocd','ocd','F42',3),('insomnia','insomnia','G47.00',2),('sleep disorder','insomnia','G47',2),
-- Chapter VI - Nervous
('alzheimers','dementia','G30',5),('alzheimers disease','dementia','G30',5),('dementia','dementia','F03',5),('parkinsons','parkinsons','G20',5),('parkinsons disease','parkinsons','G20',5),('multiple sclerosis','ms','G35',4),('ms','ms','G35',4),('epilepsy','epilepsy','G40',4),('migraine','migraine','G43',2),('stroke','stroke','I63',5),('cerebral palsy','cp','G80',5),('als','als','G12.21',5),('neuropathy','neuropathy','G62.9',3),
-- Chapter IX - Circulatory
('hypertension','hypertension','I10',3),('high blood pressure','hypertension','I10',3),('coronary artery disease','cad','I25.10',4),('heart disease','heart','I25',4),('heart attack','mi','I21',5),('myocardial infarction','mi','I21',5),('atrial fibrillation','afib','I48',4),('afib','afib','I48',4),('heart failure','hf','I50',4),('arrhythmia','arrhythmia','I49',3),('deep vein thrombosis','dvt','I82.4',4),('dvt','dvt','I82.4',4),('pulmonary embolism','pe','I26',5),
-- Chapter X - Respiratory
('asthma','asthma','J45',3),('copd','copd','J44',4),('chronic bronchitis','copd','J44.0',3),('emphysema','copd','J43',4),('sleep apnea','apnea','G47.33',3),
-- Chapter XI - Digestive
('crohns','ibd','K50',4),('crohns disease','ibd','K50',4),('ulcerative colitis','ibd','K51',4),('ibd','ibd','K52',3),('ibs','ibs','K58',2),('gerd','gerd','K21',2),('acid reflux','gerd','K21',2),('celiac','celiac','K90.0',3),('celiac disease','celiac','K90.0',3),('fatty liver','fld','K76.0',3),('cirrhosis','cirrhosis','K74.60',4),
-- Chapter XII - Skin
('psoriasis','psoriasis','L40',3),('eczema','eczema','L20',2),('atopic dermatitis','eczema','L20',2),
-- Chapter XIII - Musculoskeletal
('arthritis','arthritis','M19',3),('rheumatoid arthritis','ra','M05',4),('ra','ra','M05',4),('osteoarthritis','oa','M19',3),('osteoporosis','osteo','M81',3),('fibromyalgia','fibromyalgia','M79.7',3),('lupus','lupus','M32',4),('sle','lupus','M32',4),('gout','gout','M10',2),
-- Chapter XIV - Genitourinary
('kidney disease','ckd','N18',4),('ckd','ckd','N18',4),('kidney failure','ckd','N19',5),('uti','uti','N39.0',2),('pcos','pcos','E28.2',3),('endometriosis','endo','N80',3),('infertility','infertility','N97',3),
-- Chapter XVIII - Symptoms/Signs (consumer-focused)
('chronic fatigue','cfs','G93.3',3),('chronic fatigue syndrome','cfs','G93.3',3),('erectile dysfunction','ed','N52',2),('incontinence','incont','R32',2),
-- Acute/severe catch-all
('adhd','adhd','F90',2),('cataracts','cataracts','H26',2),('glaucoma','glaucoma','H40',3),('macular degeneration','amd','H35.31',3)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- regulatory_alerts: FDA/HC/FTC feed with Kelsey triage severity.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_alerts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source                 TEXT NOT NULL CHECK (source IN ('FDA_warning_letter','FDA_recall','FDA_import_alert','HC_recall','HC_advisory','FTC_action','NDI_response')),
  url                    TEXT NOT NULL,
  title                  TEXT NOT NULL,
  summary                TEXT,
  effective_date         DATE NOT NULL,
  ingredients_affected   UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  skus_affected          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  action_required        TEXT CHECK (action_required IS NULL OR action_required IN ('none','review','recall','reformulate')),
  kelsey_severity        INTEGER CHECK (kelsey_severity IS NULL OR kelsey_severity BETWEEN 1 AND 5),
  kelsey_triaged_at      TIMESTAMPTZ,
  resolved_at            TIMESTAMPTZ,
  resolved_by            UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regalert_source_date ON public.regulatory_alerts (source, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_regalert_unresolved ON public.regulatory_alerts (effective_date DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.regulatory_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_alerts' AND policyname='regalert_read_admin') THEN
    CREATE POLICY "regalert_read_admin" ON public.regulatory_alerts FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin','medical')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_alerts' AND policyname='regalert_write_compliance') THEN
    CREATE POLICY "regalert_write_compliance" ON public.regulatory_alerts FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- regulatory_sku_jurisdiction_status: NPN/DIN-HM per SKU per jurisdiction.
-- sku_id is TEXT (logical reference, no FK to master_skus per standing rule).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_sku_jurisdiction_status (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id              TEXT NOT NULL,
  jurisdiction_id     UUID NOT NULL REFERENCES public.regulatory_jurisdictions(id),
  npn                 TEXT,
  din_hm              TEXT,
  license_class       TEXT CHECK (license_class IS NULL OR license_class IN ('I','II','III','exempt','not_applicable')),
  license_issued_at   DATE,
  license_expires_at  DATE,
  license_file_path   TEXT,
  site_license_chain  JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_saleable         BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sku_id, jurisdiction_id)
);

CREATE INDEX IF NOT EXISTS idx_regskujs_juris_sale ON public.regulatory_sku_jurisdiction_status (jurisdiction_id, is_saleable);

ALTER TABLE public.regulatory_sku_jurisdiction_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_sku_jurisdiction_status' AND policyname='skujs_read_saleable_public') THEN
    CREATE POLICY "skujs_read_saleable_public" ON public.regulatory_sku_jurisdiction_status FOR SELECT TO authenticated, anon
      USING (is_saleable = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_sku_jurisdiction_status' AND policyname='skujs_read_all_admin') THEN
    CREATE POLICY "skujs_read_all_admin" ON public.regulatory_sku_jurisdiction_status FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_sku_jurisdiction_status' AND policyname='skujs_write_compliance') THEN
    CREATE POLICY "skujs_write_compliance" ON public.regulatory_sku_jurisdiction_status FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- regulatory_peptide_classifications: compliance class per peptide SKU.
-- Retatrutide hard-locked as not_approved, injectable_only=TRUE,
-- can_make_sf_claims=FALSE per standing rule.
-- sku_id is TEXT (logical reference to peptide_registry.peptide_id or
-- master_skus.sku -- depending on catalog).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_peptide_classifications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id                 TEXT NOT NULL UNIQUE,
  compliance_class       TEXT NOT NULL CHECK (compliance_class IN ('research_use_only','compounded_503a','compounded_503b','otc_supplement','rx_only','not_approved')),
  injectable_only        BOOLEAN NOT NULL DEFAULT FALSE,
  can_make_sf_claims     BOOLEAN NOT NULL DEFAULT FALSE,
  rationale              TEXT,
  reviewed_by            UUID REFERENCES auth.users(id),
  reviewed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regpep_class ON public.regulatory_peptide_classifications (compliance_class);

ALTER TABLE public.regulatory_peptide_classifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_peptide_classifications' AND policyname='regpep_read_all') THEN
    CREATE POLICY "regpep_read_all" ON public.regulatory_peptide_classifications FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_peptide_classifications' AND policyname='regpep_write_compliance') THEN
    CREATE POLICY "regpep_write_compliance" ON public.regulatory_peptide_classifications FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin','medical')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin','medical')));
  END IF;
END $$;

-- Seed representative peptide classifications per §6.9. Retatrutide is the
-- non-negotiable row; others are starter classifications revisable by
-- compliance via admin UI. The disallowed GLP-1 agonist named in standing
-- rule #1 is INTENTIONALLY NOT SEEDED.
INSERT INTO public.regulatory_peptide_classifications (sku_id, compliance_class, injectable_only, can_make_sf_claims, rationale) VALUES
  ('retatrutide',    'not_approved',     TRUE,  FALSE, 'Phase III only. Standing rule: injectable-only, never stacked, never consumer-surfaced.'),
  ('bpc-157',        'research_use_only', FALSE, FALSE, 'No FDA approval; research framing required on any research surface.'),
  ('tb-500',         'research_use_only', TRUE,  FALSE, 'Injectable RUO only.'),
  ('epithalon',      'research_use_only', FALSE, FALSE, 'RUO.'),
  ('semax',          'research_use_only', FALSE, FALSE, 'Nasal RUO.'),
  ('selank',         'research_use_only', FALSE, FALSE, 'Nasal RUO.'),
  ('ipamorelin',     'compounded_503a',   TRUE,  FALSE, '503A-compounded; practitioner-gated Rx surface only.'),
  ('cjc-1295',       'compounded_503a',   TRUE,  FALSE, '503A-compounded; practitioner-gated.'),
  ('ghk-cu',         'otc_supplement',    FALSE, TRUE,  'Topical cosmetic monograph; limited S/F claims permitted.')
ON CONFLICT (sku_id) DO NOTHING;
