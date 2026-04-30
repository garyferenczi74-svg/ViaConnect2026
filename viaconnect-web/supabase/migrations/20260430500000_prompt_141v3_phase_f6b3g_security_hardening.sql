-- Prompt #141 v3 Phase F6b.3g: Security hardening for the prescription
-- token system.
--
-- Two changes:
--
--  1. Strip last_consumed_order_id + last_consumed_at from the metadata
--     supplied to prescription_issue. F6b.3d security verdict flagged a
--     theoretical idempotency-injection attack: a practitioner who can
--     guess a future order's gen_random_uuid (statistically infeasible
--     at 122 bits, but defense-in-depth) could pre-populate
--     metadata.last_consumed_order_id at issuance to short-circuit a
--     legitimate consume. The consume RPC's right-biased jsonb concat
--     overwrites the key on first consume, but the idempotency check at
--     the top of consume short-circuits BEFORE the overwrite. Stripping
--     these reserved keys at issuance removes the surface entirely.
--
--  2. Add prescription_consume_failures audit table so the
--     reconciler/admin dashboard can detect drift between paid orders
--     and consumed tokens without log scraping. F6b.3d hannah verdict
--     flagged this for F6b.3g; F6b.3g delivers.
--
-- Authenticated callers can INSERT failure rows for their own orders
-- only (RLS WITH CHECK gates to the calling user). service_role writes
-- via the Stripe webhook path. SELECT is service_role-only at launch;
-- a future admin UI surface can read via createAdminClient.
--
-- Out of scope (deferred):
--   - Admin override on prescription_revoke (F6b.3g2)
--   - Patient expiry notifications cron (F6b.3g2)
--   - clinical_notes column-grant or table-split defense (F6b.3h)
--   - get_my_issued_prescription_clinical_notes RPC (F6b.3h)

-- Change 1: prescription_issue strips reserved metadata keys.
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

    -- F6b.3g: strip reserved keys that the consume RPC writes. Prevents
    -- a practitioner-supplied metadata payload from pre-populating
    -- last_consumed_order_id and short-circuiting a legitimate consume
    -- via the idempotency check.
    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'last_consumed_order_id'
        - 'last_consumed_at';

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

-- Change 2: prescription_consume_failures audit table.
CREATE TABLE IF NOT EXISTS public.prescription_consume_failures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES public.prescription_tokens(id) ON DELETE SET NULL,
    order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
    order_number text,
    sku text,
    failure_message text,
    failed_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_prescription_consume_failures_failed_at
    ON public.prescription_consume_failures (failed_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescription_consume_failures_order
    ON public.prescription_consume_failures (order_id);

ALTER TABLE public.prescription_consume_failures ENABLE ROW LEVEL SECURITY;

-- INSERT policy: authenticated callers can log failures only for orders
-- they own. The webhook (service_role) bypasses RLS and can log any
-- failure regardless of the caller. anon cannot insert (no policy +
-- RLS-on equals deny).
CREATE POLICY "prescription_consume_failures_insert_own_order"
    ON public.prescription_consume_failures
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shop_orders
            WHERE id = order_id
              AND user_id = (SELECT auth.uid())
        )
    );

COMMENT ON TABLE public.prescription_consume_failures IS
    'Audit log of prescription_consume RPC failures during order finalize. Written best-effort by the F6b.3d checkout-helpers consume catch. Read by F6b.3g admin reconciler (service_role-only at launch; future admin UI via createAdminClient). F6b.3g.';

COMMENT ON FUNCTION public.prescription_issue(uuid, text, integer, timestamptz, text, text, jsonb) IS
    'Practitioner-only prescription issuance RPC. F6b.3g strips last_consumed_order_id and last_consumed_at from incoming metadata to prevent idempotency-injection. Called by F6b.3b serverIssuePrescription server action.';
