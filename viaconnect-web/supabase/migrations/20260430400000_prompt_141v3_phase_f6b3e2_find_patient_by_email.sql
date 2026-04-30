-- Prompt #141 v3 Phase F6b.3e2: find_patient_user_id_by_email helper RPC.
--
-- F6b.3e shipped the practitioner prescriptions list page; F6b.3e2 adds
-- the new-prescription issue form which needs to resolve a patient email
-- to a user_id before calling prescription_issue. This RPC is the bridge:
-- a SECURITY DEFINER lookup that practitioners and naturopaths can call
-- to translate email to user_id, role-gated to practitioner/naturopath
-- callers and returning NULL when no match exists.
--
-- Privacy posture: returning user_id by email gives practitioners
-- enumeration capability over the full user base. This is acceptable for
-- launch given practitioners are trusted (role-gated) and the alternative
-- (require an explicit practitioner-patient relationship before lookup)
-- requires the F6b.3g consent infrastructure that is not yet in place.
-- F6b.3g audit phase will tighten this if the threat model warrants.

CREATE OR REPLACE FUNCTION public.find_patient_user_id_by_email(
    p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid;
    v_caller_role text;
    v_target_id uuid;
    v_normalized text;
BEGIN
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT role INTO v_caller_role
        FROM public.profiles
        WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('practitioner', 'naturopath') THEN
        RAISE EXCEPTION 'Only practitioners and naturopaths can look up patients';
    END IF;

    v_normalized := lower(trim(p_email));
    IF v_normalized = '' OR v_normalized NOT LIKE '%@%' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    SELECT id INTO v_target_id
        FROM auth.users
        WHERE lower(email) = v_normalized
        LIMIT 1;

    RETURN v_target_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_patient_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_patient_user_id_by_email(text) TO authenticated;

COMMENT ON FUNCTION public.find_patient_user_id_by_email(text) IS
    'Practitioner-only email-to-user-id lookup for prescription issuance forms. F6b.3e2.';
