-- Prompt #141 v3 Phase F6b.3h: Multi-quantity refills support.
--
-- F6b.3d shipped the L3/L4 checkout integration with a launch posture
-- that limited L3/L4 cart lines to quantity 1. Reason: prescription_consume
-- incremented quantity_consumed by exactly 1 per call, so a cart line of
-- quantity > 1 would either need N consume calls (partial-failure risk)
-- or a quantity-aware RPC. F6b.3h delivers the quantity-aware RPC and
-- relaxes the cap.
--
-- Three changes:
--
--  1. New RPC prescription_consume_quantity(p_token_id, p_order_id,
--     p_quantity DEFAULT 1). Same auth + ownership + idempotency contract
--     as F6b.3d prescription_consume but increments by p_quantity instead
--     of fixed 1. Validates that quantity_consumed + p_quantity does not
--     exceed quantity_authorized.
--
--  2. DROP + CREATE prescription_check_my_eligibility to add a
--     quantity_remaining column. The patient-side checkout flow
--     (validateCheckout) needs this to verify line.quantity <= remaining
--     before reaching consume. Drop + create within a single transaction
--     keeps any in-flight calls atomic.
--
--  3. Extend prescription_issue metadata strip to also remove
--     'last_consumed_quantity'. F6b.3h's consume RPC writes this key on
--     each consume; defense-in-depth prevents practitioner pre-population
--     at issuance from misleading the audit reconciler about prior
--     fill quantities.
--
-- Out of scope (F6b.3h2 and later):
--   - Cart pill capacity warnings (F6b.3h2 surfaces "X fills remaining,
--     reduce quantity" when line.quantity > quantityRemaining)
--   - clinical_notes column-grant defense-in-depth (F6b.3h3)
--   - "Revoked by support" badge UI when metadata.admin_revoke = true
--     (F6b.3h4)
--   - Patient expiry notifications cron (separate phase)

-- Change 1: new quantity-aware consume RPC.
CREATE OR REPLACE FUNCTION public.prescription_consume_quantity(
    p_token_id uuid,
    p_order_id uuid,
    p_quantity integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid;
    v_token public.prescription_tokens%ROWTYPE;
    v_order_user_id uuid;
    v_order_status text;
    v_new_consumed integer;
BEGIN
    v_caller_id := (SELECT auth.uid());

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    SELECT * INTO v_token
    FROM public.prescription_tokens
    WHERE id = p_token_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prescription token not found';
    END IF;

    IF v_caller_id IS NOT NULL THEN
        IF v_token.patient_user_id <> v_caller_id THEN
            RAISE EXCEPTION 'Caller does not own this prescription';
        END IF;

        SELECT user_id, status INTO v_order_user_id, v_order_status
        FROM public.shop_orders
        WHERE id = p_order_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Order not found';
        END IF;

        IF v_order_user_id <> v_caller_id THEN
            RAISE EXCEPTION 'Caller does not own this order';
        END IF;

        IF v_order_status NOT IN ('paid', 'shipped', 'delivered') THEN
            RAISE EXCEPTION 'Order is not in a paid state (status: %)', v_order_status;
        END IF;
    END IF;

    -- Per-order idempotency: matches F6b.3d prescription_consume contract.
    -- Once a (token, order) pair has been consumed, subsequent calls
    -- return true without modifying state.
    IF v_token.metadata->>'last_consumed_order_id' = p_order_id::text THEN
        RETURN true;
    END IF;

    IF v_token.status <> 'active' THEN
        RAISE EXCEPTION 'Prescription token is not active (status: %)', v_token.status;
    END IF;

    IF v_token.quantity_consumed + p_quantity > v_token.quantity_authorized THEN
        RAISE EXCEPTION 'Prescription token does not have % remaining (only % left)',
            p_quantity, (v_token.quantity_authorized - v_token.quantity_consumed);
    END IF;

    IF v_token.expires_at <= now() THEN
        RAISE EXCEPTION 'Prescription token expired';
    END IF;

    v_new_consumed := v_token.quantity_consumed + p_quantity;

    UPDATE public.prescription_tokens
    SET quantity_consumed = v_new_consumed,
        consumed_at = CASE
            WHEN v_new_consumed >= v_token.quantity_authorized THEN now()
            ELSE consumed_at
        END,
        status = CASE
            WHEN v_new_consumed >= v_token.quantity_authorized THEN 'consumed'
            ELSE status
        END,
        metadata = metadata || jsonb_build_object(
            'last_consumed_order_id', p_order_id::text,
            'last_consumed_at', now()::text,
            'last_consumed_quantity', p_quantity
        )
    WHERE id = p_token_id;

    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prescription_consume_quantity(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prescription_consume_quantity(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prescription_consume_quantity(uuid, uuid, integer) TO service_role;

COMMENT ON FUNCTION public.prescription_consume_quantity(uuid, uuid, integer) IS
    'Quantity-aware token consumption RPC. F6b.3h evolution of F6b.3d prescription_consume to support multi-quantity refills. Same auth + ownership + idempotency contract; increments quantity_consumed by p_quantity (default 1) instead of fixed 1. F6b.3d prescription_consume remains as a 1-quantity legacy alias for any callers not yet migrated.';

-- Change 2: drop + create eligibility RPC with quantity_remaining column.
DROP FUNCTION IF EXISTS public.prescription_check_my_eligibility(text[]);

CREATE FUNCTION public.prescription_check_my_eligibility(
    p_skus text[]
)
RETURNS TABLE (
    sku text,
    has_token boolean,
    token_id uuid,
    expires_at timestamptz,
    quantity_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid;
BEGIN
    v_caller_id := (SELECT auth.uid());
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    RETURN QUERY
    WITH input_skus AS (
        SELECT unnest(p_skus) AS requested_sku
    )
    SELECT
        i.requested_sku,
        (t.id IS NOT NULL),
        t.id,
        t.expires_at,
        COALESCE(t.quantity_authorized - t.quantity_consumed, 0)
    FROM input_skus i
    LEFT JOIN LATERAL (
        SELECT pt.id, pt.expires_at, pt.quantity_authorized, pt.quantity_consumed
        FROM public.prescription_tokens pt
        WHERE pt.patient_user_id = v_caller_id
          AND pt.sku = i.requested_sku
          AND pt.status = 'active'
          AND pt.expires_at > now()
          AND pt.quantity_consumed < pt.quantity_authorized
        ORDER BY pt.expires_at ASC
        LIMIT 1
    ) t ON true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prescription_check_my_eligibility(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prescription_check_my_eligibility(text[]) TO authenticated;

COMMENT ON FUNCTION public.prescription_check_my_eligibility(text[]) IS
    'Patient-facing eligibility check. F6b.3h adds quantity_remaining column for multi-quantity validation. Returns one row per requested SKU with hasToken + tokenId + expiresAt + quantityRemaining (0 when no token).';

-- Change 3: extend prescription_issue metadata strip to also remove
-- last_consumed_quantity (defense-in-depth, mirrors F6b.3g + F6b.3g2 strip
-- pattern for the new metadata key the F6b.3h consume RPC writes).
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

    -- Defense-in-depth metadata strip. Mirrors F6b.3g + F6b.3g2 pattern.
    -- F6b.3h adds last_consumed_quantity to the strip set.
    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'last_consumed_order_id'
        - 'last_consumed_at'
        - 'last_consumed_quantity'
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
    'Practitioner-only prescription issuance RPC. F6b.3h extends the F6b.3g + F6b.3g2 metadata strip to also remove last_consumed_quantity. Called by F6b.3b serverIssuePrescription server action.';
