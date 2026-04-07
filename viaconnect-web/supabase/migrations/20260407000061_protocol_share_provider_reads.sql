-- ============================================================
-- Prompt #54a follow-up: server-side enforcement of share reads
-- ============================================================
-- The Phase 2 provider portal (SharedPatientProtocol) needs to read
-- patient supplements + bio optimization score, but RLS on profiles /
-- user_current_supplements only permits the patient themselves.
--
-- Rather than broaden row-level policies on PHI tables (which leak
-- columns providers should never see), expose a small set of
-- SECURITY DEFINER RPCs that internally re-check the active share +
-- the relevant per-category boolean before returning anything. The
-- check is the single source of truth — if no active share exists or
-- the category was not shared, the RPC raises and the provider sees
-- nothing. This mirrors the protocolShareAccess.ts contract on the
-- client.

-- ── helper: assert active share + data category ────────────────────────
CREATE OR REPLACE FUNCTION protocol_share_assert_access(
  p_patient_id UUID,
  p_category   TEXT
)
RETURNS protocol_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row     protocol_shares;
  v_granted BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'protocol_share_assert_access: not authenticated';
  END IF;

  SELECT * INTO v_row
    FROM protocol_shares
   WHERE provider_id = v_user_id
     AND patient_id  = p_patient_id
     AND status      = 'active'
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'protocol_share_assert_access: no active share for this patient';
  END IF;

  v_granted := CASE p_category
    WHEN 'supplements'              THEN v_row.share_supplements
    WHEN 'genetic_results'          THEN v_row.share_genetic_results
    WHEN 'caq_data'                 THEN v_row.share_caq_data
    WHEN 'bio_optimization_score'   THEN v_row.share_bio_optimization_score
    WHEN 'wellness_analytics'       THEN v_row.share_wellness_analytics
    WHEN 'peptide_recommendations'  THEN v_row.share_peptide_recommendations
    WHEN 'lab_results'              THEN v_row.share_lab_results
    ELSE false
  END;

  IF NOT v_granted THEN
    RAISE EXCEPTION 'protocol_share_assert_access: patient has not shared %', p_category;
  END IF;

  -- Audit-log the read so the patient can see who viewed what.
  INSERT INTO protocol_share_activity (share_id, actor_id, action, details)
  VALUES (v_row.id, v_user_id, 'viewed_protocol',
          jsonb_build_object('category', p_category));

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION protocol_share_assert_access(UUID, TEXT) TO authenticated;

-- ── RPC: provider reads patient supplements ────────────────────────────
CREATE OR REPLACE FUNCTION provider_get_patient_supplements(p_patient_id UUID)
RETURNS TABLE (
  supplement_name TEXT,
  brand           TEXT,
  product_name    TEXT,
  dosage          TEXT,
  dosage_form     TEXT,
  frequency       TEXT,
  category        TEXT,
  is_current      BOOLEAN,
  added_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM protocol_share_assert_access(p_patient_id, 'supplements');

  RETURN QUERY
  SELECT s.supplement_name,
         s.brand,
         s.product_name,
         s.dosage,
         s.dosage_form,
         s.frequency,
         s.category,
         s.is_current,
         s.added_at
    FROM user_current_supplements s
   WHERE s.user_id = p_patient_id
     AND s.is_current = true
   ORDER BY s.added_at DESC
   LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION provider_get_patient_supplements(UUID) TO authenticated;

-- ── RPC: provider reads patient bio optimization (aggregate only) ──────
-- Hard rule: providers see ONLY the aggregate score + tier + strengths +
-- opportunities. They never see Helix balance, streaks, gamification,
-- daily quests, or any per-event raw history. This RPC's RETURNS
-- signature is the entire surface area providers can access.
CREATE OR REPLACE FUNCTION provider_get_patient_bio_score(p_patient_id UUID)
RETURNS TABLE (
  bio_optimization_score          NUMERIC,
  bio_optimization_tier           TEXT,
  bio_optimization_strengths      TEXT[],
  bio_optimization_opportunities  TEXT[],
  caq_completed_at                TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM protocol_share_assert_access(p_patient_id, 'bio_optimization_score');

  RETURN QUERY
  SELECT (p.bio_optimization_score)::NUMERIC,
         p.bio_optimization_tier,
         p.bio_optimization_strengths,
         p.bio_optimization_opportunities,
         p.caq_completed_at
    FROM profiles p
   WHERE p.id = p_patient_id
   LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION provider_get_patient_bio_score(UUID) TO authenticated;
