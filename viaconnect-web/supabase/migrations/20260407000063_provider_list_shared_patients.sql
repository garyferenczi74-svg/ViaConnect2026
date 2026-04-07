-- ============================================================
-- Prompt #54a follow-up: provider-side patient roster RPC
-- ============================================================
-- The /naturopath/patients and /practitioner/patients pages need to
-- list every patient who has an active protocol_share with the
-- signed-in provider, joined with the basic profile info the provider
-- needs to recognize the patient (name, constitutional type, bio
-- score) plus the email from auth.users (which providers can't query
-- directly). Wrap the join in a SECURITY DEFINER RPC that scopes by
-- provider_id = auth.uid() so providers only ever see their own
-- patients regardless of how the function is called.

CREATE OR REPLACE FUNCTION provider_list_shared_patients()
RETURNS TABLE (
  share_id              UUID,
  patient_id            UUID,
  full_name             TEXT,
  email                 TEXT,
  constitutional_type   TEXT,
  bio_optimization_score NUMERIC,
  accepted_at           TIMESTAMPTZ,
  share_supplements     BOOLEAN,
  share_bio_score       BOOLEAN,
  share_genetics        BOOLEAN,
  share_caq             BOOLEAN,
  share_wellness        BOOLEAN,
  share_peptides        BOOLEAN,
  share_labs            BOOLEAN,
  can_recommend         BOOLEAN,
  can_modify            BOOLEAN,
  can_order             BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'provider_list_shared_patients: not authenticated';
  END IF;

  RETURN QUERY
  SELECT s.id,
         s.patient_id,
         p.full_name,
         u.email::TEXT,
         p.constitutional_type,
         p.bio_optimization_score,
         s.accepted_at,
         s.share_supplements,
         s.share_bio_optimization_score,
         s.share_genetic_results,
         s.share_caq_data,
         s.share_wellness_analytics,
         s.share_peptide_recommendations,
         s.share_lab_results,
         s.can_recommend_products,
         s.can_modify_protocol,
         s.can_order_on_behalf
    FROM protocol_shares s
    LEFT JOIN profiles p ON p.id = s.patient_id
    LEFT JOIN auth.users u ON u.id = s.patient_id
   WHERE s.provider_id = v_user_id
     AND s.status      = 'active'
   ORDER BY s.accepted_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION provider_list_shared_patients() TO authenticated;
