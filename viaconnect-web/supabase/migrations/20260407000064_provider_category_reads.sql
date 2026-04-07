-- ============================================================
-- Prompt #54a follow-up: provider RPCs for the remaining categories
-- ============================================================
-- Migration 61 added provider_get_patient_supplements and
-- provider_get_patient_bio_score. This adds the remaining four:
-- genetics, CAQ, wellness analytics, peptide recommendations. Each
-- one runs through protocol_share_assert_access(patient_id, category)
-- before returning anything, which both enforces the share + category
-- check and writes a viewed_protocol audit row.
--
-- Lab results are skipped — no lab_results table exists in the schema
-- yet. The share boolean is in place for when one is added.

-- ── genetics ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION provider_get_patient_genetics(p_patient_id UUID)
RETURNS TABLE (
  cyp2d6_status     TEXT,
  mthfr_status      TEXT,
  comt_status       TEXT,
  additional_genes  JSONB,
  source_lab        TEXT,
  report_date       DATE,
  created_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM protocol_share_assert_access(p_patient_id, 'genetic_results');

  RETURN QUERY
  SELECT g.cyp2d6_status,
         g.mthfr_status,
         g.comt_status,
         g.additional_genes,
         g.source_lab,
         g.report_date,
         g.created_at
    FROM genetic_profiles g
   WHERE g.user_id = p_patient_id
   ORDER BY g.created_at DESC
   LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION provider_get_patient_genetics(UUID) TO authenticated;

-- ── CAQ (latest completed version) ────────────────────────────────────
CREATE OR REPLACE FUNCTION provider_get_patient_caq(p_patient_id UUID)
RETURNS TABLE (
  version_number       INTEGER,
  status               TEXT,
  demographics         JSONB,
  health_concerns      JSONB,
  physical_symptoms    JSONB,
  neuro_symptoms       JSONB,
  emotional_symptoms   JSONB,
  medications          JSONB,
  supplements          JSONB,
  allergies            JSONB,
  lifestyle            JSONB,
  completed_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM protocol_share_assert_access(p_patient_id, 'caq_data');

  RETURN QUERY
  SELECT c.version_number,
         c.status,
         c.demographics,
         c.health_concerns,
         c.physical_symptoms,
         c.neuro_symptoms,
         c.emotional_symptoms,
         c.medications,
         c.supplements,
         c.allergies,
         c.lifestyle,
         c.completed_at
    FROM caq_assessment_versions c
   WHERE c.user_id = p_patient_id
     AND c.completed_at IS NOT NULL
   ORDER BY c.completed_at DESC
   LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION provider_get_patient_caq(UUID) TO authenticated;

-- ── wellness analytics (latest snapshot) ──────────────────────────────
CREATE OR REPLACE FUNCTION provider_get_patient_wellness_analytics(p_patient_id UUID)
RETURNS TABLE (
  summary               TEXT,
  categories            JSONB,
  data_sources_used     TEXT[],
  genex360_included     BOOLEAN,
  calculated_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM protocol_share_assert_access(p_patient_id, 'wellness_analytics');

  RETURN QUERY
  SELECT w.summary,
         w.categories,
         w.data_sources_used,
         w.genex360_included,
         w.calculated_at
    FROM wellness_analytics w
   WHERE w.user_id = p_patient_id
   ORDER BY w.calculated_at DESC NULLS LAST
   LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION provider_get_patient_wellness_analytics(UUID) TO authenticated;

-- ── peptide recommendations ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION provider_get_patient_peptide_recommendations(p_patient_id UUID)
RETURNS TABLE (
  rank             INTEGER,
  priority         TEXT,
  peptide_name     TEXT,
  delivery_form    TEXT,
  dosage           TEXT,
  frequency        TEXT,
  cycle_on_weeks   INTEGER,
  cycle_off_weeks  INTEGER,
  rationale        TEXT,
  evidence_level   TEXT,
  requires_supervision BOOLEAN,
  is_accepted      BOOLEAN,
  created_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM protocol_share_assert_access(p_patient_id, 'peptide_recommendations');

  RETURN QUERY
  SELECT r.rank,
         r.priority,
         r.peptide_name,
         r.delivery_form,
         r.dosage,
         r.frequency,
         r.cycle_on_weeks,
         r.cycle_off_weeks,
         r.rationale,
         r.evidence_level,
         r.requires_supervision,
         r.is_accepted,
         r.created_at
    FROM peptide_stack_recommendations r
   WHERE r.user_id = p_patient_id
     AND r.is_dismissed IS NOT TRUE
   ORDER BY r.rank ASC NULLS LAST, r.created_at DESC
   LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION provider_get_patient_peptide_recommendations(UUID) TO authenticated;
