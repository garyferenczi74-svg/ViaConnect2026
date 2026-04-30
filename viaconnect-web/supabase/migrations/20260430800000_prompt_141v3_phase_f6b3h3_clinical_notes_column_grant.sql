-- Prompt #141 v3 Phase F6b.3h3: clinical_notes column-grant defense-in-depth.
--
-- Background: F6b.3a placed clinical_notes on prescription_tokens with
-- RLS that lets the patient row owner SELECT all columns (including
-- clinical_notes). F6b.3c serverListMyPrescriptions deliberately omits
-- clinical_notes from its SELECT projection per Hannah's HIPAA-aware
-- posture, but a determined patient with a custom Postgres client could
-- still query the column directly.
--
-- F6b.3h3 hardens the defense at the database layer:
--   1. REVOKE SELECT (clinical_notes) from authenticated and anon roles.
--      Any direct query from those roles that includes clinical_notes
--      now fails with "permission denied for column clinical_notes".
--   2. Add a SECURITY DEFINER RPC `get_my_issued_prescription_clinical_notes`
--      that practitioners call to read clinical_notes for tokens THEY
--      issued. SECURITY DEFINER runs as postgres and bypasses the column
--      grant, while the function body verifies the caller is the
--      issuing practitioner.
--
-- Existing app code: F6b.3b serverListMyIssuedPrescriptions's SELECT is
-- updated in the same phase to drop clinical_notes. F6b.3c
-- serverListMyPrescriptions never selected it, so no patient-side break.
-- INSERT writes via prescription_issue RPC (SECURITY DEFINER) bypass the
-- column grant entirely, so practitioner issuance flow is unaffected.
--
-- SELECT * concern: explicit-column queries are the codebase convention.
-- Any future SELECT * on prescription_tokens from authenticated/anon
-- will fail loudly, signaling that explicit projections are required.
-- Acceptable safety net.

REVOKE SELECT (clinical_notes) ON public.prescription_tokens FROM authenticated;
REVOKE SELECT (clinical_notes) ON public.prescription_tokens FROM anon;

CREATE OR REPLACE FUNCTION public.get_my_issued_prescription_clinical_notes(
    p_token_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid;
    v_practitioner_user_id uuid;
    v_clinical_notes text;
BEGIN
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT practitioner_user_id, clinical_notes
        INTO v_practitioner_user_id, v_clinical_notes
        FROM public.prescription_tokens
        WHERE id = p_token_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prescription token not found';
    END IF;

    IF v_practitioner_user_id <> v_caller_id THEN
        RAISE EXCEPTION 'Only the issuing practitioner can view clinical notes';
    END IF;

    RETURN v_clinical_notes;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_issued_prescription_clinical_notes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_issued_prescription_clinical_notes(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_my_issued_prescription_clinical_notes(uuid) IS
    'Practitioner-only on-demand fetch of clinical_notes for a prescription they issued. F6b.3h3 introduces this RPC alongside the column-level REVOKE on clinical_notes so authenticated callers cannot bypass the F6b.3c patient-actions SELECT projection by querying the column directly.';
