-- Prompt #141 v3 Phase F6b.3g2: Admin override on prescription_revoke.
--
-- F6b.3a shipped prescription_revoke as issuer-only (the practitioner who
-- issued the token is the only authorized revoker). F6b.3g2 evolves the
-- RPC to also accept callers with profiles.role = 'admin' so an
-- offboarded practitioner does not strand their patients with active
-- tokens that nobody can revoke.
--
-- The auth flow inside the function is short-circuited: if caller_id
-- matches the issuing practitioner, the role lookup is skipped (cheap
-- happy path for the most common case). Only when the caller is NOT the
-- issuer does the function read profiles.role to check the admin
-- override path. Anonymous remains blocked at the function ACL via
-- REVOKE FROM PUBLIC.
--
-- Audit shape preserved:
--   - revoked_by_user_id captures who revoked (issuing practitioner or admin)
--   - admin_revoke flag added to metadata so the audit reconciler and
--     practitioner dashboard can distinguish admin overrides from
--     practitioner self-revokes without joining to profiles
--
-- All other validation is unchanged: only active tokens can be revoked,
-- the reason is required, and the metadata write is jsonb-merged.
--
-- Out of scope (F6b.3h or later):
--   - Patient notification on admin-revoked tokens (the patient should
--     know if their authorization was withdrawn by ops rather than
--     their practitioner; F6b.3h notifications cron handles this)
--   - Practitioner UI surface for "tokens that were admin-revoked on
--     your behalf" (deferred polish)

CREATE OR REPLACE FUNCTION public.prescription_revoke(
    p_token_id uuid,
    p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid;
    v_caller_role text;
    v_token public.prescription_tokens%ROWTYPE;
    v_is_issuer boolean;
    v_is_admin boolean;
BEGIN
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_token
    FROM public.prescription_tokens
    WHERE id = p_token_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prescription token not found';
    END IF;

    v_is_issuer := (v_token.practitioner_user_id = v_caller_id);
    v_is_admin := false;

    IF NOT v_is_issuer THEN
        SELECT role INTO v_caller_role
            FROM public.profiles
            WHERE id = v_caller_id;
        v_is_admin := (v_caller_role = 'admin');
    END IF;

    IF NOT v_is_issuer AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only the issuing practitioner or an admin can revoke this prescription';
    END IF;

    IF v_token.status <> 'active' THEN
        RAISE EXCEPTION 'Cannot revoke a non-active prescription (status: %)', v_token.status;
    END IF;

    UPDATE public.prescription_tokens
    SET status = 'revoked',
        revoked_at = now(),
        revoked_by_user_id = v_caller_id,
        revocation_reason = p_reason,
        metadata = CASE
            WHEN v_is_admin THEN metadata || jsonb_build_object('admin_revoke', true)
            ELSE metadata
        END
    WHERE id = p_token_id;

    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prescription_revoke(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prescription_revoke(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.prescription_revoke(uuid, text) IS
    'Token revocation RPC. F6b.3g2 evolves the F6b.3a issuer-only baseline to also accept callers with profiles.role = admin for offboarded-practitioner overrides. admin revokes are flagged via metadata.admin_revoke = true and revoked_by_user_id always captures the actual caller.';

-- Defense-in-depth: extend the F6b.3g prescription_issue metadata strip to
-- also remove 'admin_revoke' from incoming p_metadata. F6b.3g2 introduces
-- the admin_revoke key as a flag the consume RPC writes on admin override;
-- without this strip, a malicious practitioner could pre-populate
-- metadata.admin_revoke = true at issuance to mislead the audit
-- reconciler into thinking ops revoked when they self-revoked.

CREATE OR REPLACE FUNCTION public.prescription_issue(
    p_patient_user_id uuid,
    p_sku text,
    p_quantity integer,
    p_expires_at timestamptz,
    p_dosage_instructions text DEFAULT NULL,
    p_clinical_notes text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid;
    v_caller_role text;
    v_token_id uuid;
    v_clean_metadata jsonb;
BEGIN
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT role INTO v_caller_role
        FROM public.profiles
        WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('practitioner', 'naturopath') THEN
        RAISE EXCEPTION 'Only practitioners and naturopaths can issue prescriptions';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    IF p_expires_at <= now() THEN
        RAISE EXCEPTION 'Expiration must be in the future';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.master_skus WHERE sku = p_sku) THEN
        RAISE EXCEPTION 'Unknown SKU: %', p_sku;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_patient_user_id) THEN
        RAISE EXCEPTION 'Unknown patient user';
    END IF;

    IF p_patient_user_id = v_caller_id THEN
        RAISE EXCEPTION 'Practitioner cannot issue a prescription to themselves';
    END IF;

    -- F6b.3g + F6b.3g2: strip reserved keys the consume + revoke RPCs write.
    -- Prevents a practitioner-supplied metadata payload from pre-populating
    -- last_consumed_order_id (idempotency-injection), last_consumed_at,
    -- or admin_revoke (audit-misleading).
    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'last_consumed_order_id'
        - 'last_consumed_at'
        - 'admin_revoke';

    INSERT INTO public.prescription_tokens (
        patient_user_id,
        practitioner_user_id,
        sku,
        quantity_authorized,
        expires_at,
        dosage_instructions,
        clinical_notes,
        metadata
    ) VALUES (
        p_patient_user_id,
        v_caller_id,
        p_sku,
        p_quantity,
        p_expires_at,
        p_dosage_instructions,
        p_clinical_notes,
        v_clean_metadata
    )
    RETURNING id INTO v_token_id;

    RETURN v_token_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prescription_issue(uuid, text, integer, timestamptz, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prescription_issue(uuid, text, integer, timestamptz, text, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.prescription_issue(uuid, text, integer, timestamptz, text, text, jsonb) IS
    'Practitioner-only prescription issuance RPC. F6b.3g2 strips last_consumed_order_id, last_consumed_at, and admin_revoke from incoming metadata to prevent idempotency-injection and audit-misleading. Called by F6b.3b serverIssuePrescription server action.';
