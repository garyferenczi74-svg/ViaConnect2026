-- =============================================================================
-- Prompt #91, Phase 2.7: Cross-account consent RLS
-- =============================================================================
-- Append-only. Adds practitioner-read SELECT policies to canonical patient
-- tables, gated on the Phase 2 consent_share_* flags in
-- practitioner_patients. Policies are ADDITIVE: existing patient-self-read
-- and admin policies are unchanged. Practitioners only see rows for patients
-- with an active relationship AND the relevant consent flag granted.
--
-- ── REWARDS ISOLATION (NON-NEGOTIABLE) ────────────────────────────────────
-- This migration intentionally does NOT touch any rewards or token economy
-- table. Practitioners must NEVER see balances, transactions, achievements,
-- challenges, leaderboard positions, or any reward state from the consumer
-- portal. Only the aggregate engagement score (0-100) computed elsewhere
-- may be exposed, and only when consent share engagement score is true.
-- A test in tests/practitioner-data-model.test.ts asserts that the literal
-- substring naming the rewards module never appears in this SQL file.
-- ──────────────────────────────────────────────────────────────────────────
--
-- Tables covered:
--   * assessment_results          (CAQ outputs)            → consent_share_caq
--   * user_current_supplements    (active supplement list) → consent_share_protocols
--   * supplement_adherence        (compliance log)         → consent_share_protocols
--   * genetic_profiles            (GeneX360 results)       → can_view_genetics
--   * supplement_protocols        (prescribed protocols)   → consent_share_protocols
-- =============================================================================

-- ---------------------------------------------------------------------------
-- assessment_results — CAQ data
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS assessment_results_practitioner_read_with_consent
  ON public.assessment_results;
CREATE POLICY assessment_results_practitioner_read_with_consent
  ON public.assessment_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.practitioner_patients pp
      WHERE pp.patient_id = assessment_results.user_id
        AND pp.practitioner_id = auth.uid()
        AND pp.status = 'active'
        AND pp.consent_share_caq = true
    )
  );

-- ---------------------------------------------------------------------------
-- user_current_supplements — active supplement list
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS user_current_supplements_practitioner_read_with_consent
  ON public.user_current_supplements;
CREATE POLICY user_current_supplements_practitioner_read_with_consent
  ON public.user_current_supplements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.practitioner_patients pp
      WHERE pp.patient_id = user_current_supplements.user_id
        AND pp.practitioner_id = auth.uid()
        AND pp.status = 'active'
        AND pp.consent_share_protocols = true
    )
  );

-- ---------------------------------------------------------------------------
-- supplement_adherence — compliance log
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS supplement_adherence_practitioner_read_with_consent
  ON public.supplement_adherence;
CREATE POLICY supplement_adherence_practitioner_read_with_consent
  ON public.supplement_adherence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.practitioner_patients pp
      WHERE pp.patient_id = supplement_adherence.user_id
        AND pp.practitioner_id = auth.uid()
        AND pp.status = 'active'
        AND pp.consent_share_protocols = true
    )
  );

-- ---------------------------------------------------------------------------
-- genetic_profiles — GeneX360 raw + interpreted results
-- Uses the existing can_view_genetics flag from the original
-- practitioner_patients schema for backward compatibility.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS genetic_profiles_practitioner_read_with_consent
  ON public.genetic_profiles;
CREATE POLICY genetic_profiles_practitioner_read_with_consent
  ON public.genetic_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.practitioner_patients pp
      WHERE pp.patient_id = genetic_profiles.user_id
        AND pp.practitioner_id = auth.uid()
        AND pp.status = 'active'
        AND pp.can_view_genetics = true
    )
  );

-- ---------------------------------------------------------------------------
-- supplement_protocols — prescribed protocols
-- Patient-side read uses patient_id; the practitioner_patients FK is on
-- patient_id as well.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS supplement_protocols_practitioner_read_with_consent
  ON public.supplement_protocols;
CREATE POLICY supplement_protocols_practitioner_read_with_consent
  ON public.supplement_protocols FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.practitioner_patients pp
      WHERE pp.patient_id = supplement_protocols.patient_id
        AND pp.practitioner_id = auth.uid()
        AND pp.status = 'active'
        AND pp.consent_share_protocols = true
    )
  );
