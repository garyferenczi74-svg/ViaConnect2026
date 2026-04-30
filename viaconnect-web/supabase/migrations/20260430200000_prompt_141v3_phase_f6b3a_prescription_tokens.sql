-- Prompt #141 v3 Phase F6b.3a: Practitioner Prescription Token Issuance Foundation.
--
-- Background: Phase F4 shipped the L3/L4 prescription gate as a hard wall
-- in lib/shop/checkout-actions.ts validateCheckout: any cart line with
-- pricing_tier of L3 or L4 returns an error pointing the user at
-- /practitioners. There is no issuance system, no token consumption, no
-- audit trail. F6b.3 builds the full token lifecycle. This migration
-- (F6b.3a) is the foundation: table, RLS, 4 SECURITY DEFINER RPCs, and
-- hourly cron expiry.
--
-- Phases that depend on this foundation:
--   F6b.3b  practitioner server actions (serverIssuePrescription, listIssued, revoke)
--   F6b.3c  patient server actions (listMyPrescriptions, checkRxEligibility)
--   F6b.3d  checkout integration (validateCheckout + finalizeOrderForSession)
--   F6b.3e  practitioner UI for issuance and management
--   F6b.3f  patient UI for viewing prescriptions
--   F6b.3g  audit log + admin override + expiry notifications
--   F6b.3h  refills and extended lifecycle
--
-- Lifecycle state machine:
--   active   -> consumed (when quantity_consumed reaches quantity_authorized)
--   active   -> revoked  (practitioner action, F6b.3g extends to admin)
--   active   -> expired  (cron sweep when expires_at passes)
--   consumed, revoked, expired are terminal.
--
-- RLS strategy:
--   - Patients SELECT their own (filter by patient_user_id = auth.uid()).
--   - Practitioners SELECT tokens they issued (filter by practitioner_user_id).
--   - INSERT, UPDATE, DELETE blocked at the RLS layer; only the SECURITY
--     DEFINER RPCs below can write. Service-role admin client (used by
--     the Stripe webhook order finalizer in F6b.3d) bypasses RLS as
--     expected and calls prescription_consume.
--
-- Multiple active tokens for the same (patient, sku) are allowed by
-- design: a patient may have switched practitioners and accumulated
-- overlapping authorizations. The eligibility check returns the
-- earliest-expiring active token so the older grants are consumed first.

CREATE TABLE IF NOT EXISTS public.prescription_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    practitioner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    sku text NOT NULL REFERENCES public.master_skus(sku) ON DELETE RESTRICT,
    quantity_authorized integer NOT NULL DEFAULT 1 CHECK (quantity_authorized > 0),
    quantity_consumed integer NOT NULL DEFAULT 0 CHECK (quantity_consumed >= 0),
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'consumed', 'revoked', 'expired')),
    issued_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    revoked_at timestamptz,
    revoked_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    dosage_instructions text,
    clinical_notes text,
    revocation_reason text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT prescription_tokens_consumption_within_authorized
        CHECK (quantity_consumed <= quantity_authorized),
    CONSTRAINT prescription_tokens_expires_after_issued
        CHECK (expires_at > issued_at),
    CONSTRAINT prescription_tokens_consumed_terminal_state
        CHECK (consumed_at IS NULL OR status IN ('consumed', 'expired', 'revoked')),
    CONSTRAINT prescription_tokens_revoked_terminal_state
        CHECK (revoked_at IS NULL OR status = 'revoked'),
    CONSTRAINT prescription_tokens_no_self_issue
        CHECK (patient_user_id <> practitioner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_prescription_tokens_patient_status
    ON public.prescription_tokens (patient_user_id, status);

CREATE INDEX IF NOT EXISTS idx_prescription_tokens_practitioner_issued
    ON public.prescription_tokens (practitioner_user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescription_tokens_eligibility_lookup
    ON public.prescription_tokens (patient_user_id, sku)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_prescription_tokens_expiry_sweep
    ON public.prescription_tokens (expires_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_prescription_tokens_revoked_by
    ON public.prescription_tokens (revoked_by_user_id)
    WHERE revoked_by_user_id IS NOT NULL;

ALTER TABLE public.prescription_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescription_tokens_select_patient"
    ON public.prescription_tokens
    FOR SELECT TO authenticated
    USING (patient_user_id = (SELECT auth.uid()));

CREATE POLICY "prescription_tokens_select_practitioner"
    ON public.prescription_tokens
    FOR SELECT TO authenticated
    USING (practitioner_user_id = (SELECT auth.uid()));

-- prescription_issue: practitioner-only RPC. Called by F6b.3b
-- serverIssuePrescription server action.
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
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_token_id;

    RETURN v_token_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prescription_issue(uuid, text, integer, timestamptz, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prescription_issue(uuid, text, integer, timestamptz, text, text, jsonb) TO authenticated;

-- prescription_check_my_eligibility: patient-facing eligibility check.
-- Returns one row per requested SKU indicating whether the calling user
-- has an active, non-expired, non-fully-consumed token for it.
-- Used by F6b.3d validateCheckout.
CREATE OR REPLACE FUNCTION public.prescription_check_my_eligibility(
    p_skus text[]
)
RETURNS TABLE (sku text, has_token boolean, token_id uuid, expires_at timestamptz)
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
        t.expires_at
    FROM input_skus i
    LEFT JOIN LATERAL (
        SELECT pt.id, pt.expires_at
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

-- prescription_consume: service-role only. Called by finalizeOrderForSession
-- in F6b.3d after the shop_orders insert succeeds. Increments quantity_consumed,
-- transitions to 'consumed' status when the cap is reached, records the
-- order id in metadata for audit.
--
-- Idempotency: NOT enforced inside this RPC. The outer order finalize
-- path is already idempotent via the shop_orders metadata.stripe_session_id
-- UNIQUE expression index (F5c.5), so the same order_id cannot reach
-- this RPC twice. Re-firing the webhook short-circuits at the order
-- existence check before reaching the consume call.
CREATE OR REPLACE FUNCTION public.prescription_consume(
    p_token_id uuid,
    p_order_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_token public.prescription_tokens%ROWTYPE;
    v_new_consumed integer;
BEGIN
    SELECT * INTO v_token
    FROM public.prescription_tokens
    WHERE id = p_token_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prescription token not found';
    END IF;

    IF v_token.status <> 'active' THEN
        RAISE EXCEPTION 'Prescription token is not active (status: %)', v_token.status;
    END IF;

    IF v_token.quantity_consumed >= v_token.quantity_authorized THEN
        RAISE EXCEPTION 'Prescription token already fully consumed';
    END IF;

    IF v_token.expires_at <= now() THEN
        RAISE EXCEPTION 'Prescription token expired';
    END IF;

    v_new_consumed := v_token.quantity_consumed + 1;

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
            'last_consumed_at', now()::text
        )
    WHERE id = p_token_id;

    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prescription_consume(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prescription_consume(uuid, uuid) TO service_role;

-- prescription_revoke: practitioner-who-issued only in F6b.3a.
-- F6b.3g extends this to allow admin override for cases where the
-- issuing practitioner has offboarded.
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
    v_token public.prescription_tokens%ROWTYPE;
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

    IF v_token.practitioner_user_id <> v_caller_id THEN
        RAISE EXCEPTION 'Only the issuing practitioner can revoke this prescription';
    END IF;

    IF v_token.status <> 'active' THEN
        RAISE EXCEPTION 'Cannot revoke a non-active prescription (status: %)', v_token.status;
    END IF;

    UPDATE public.prescription_tokens
    SET status = 'revoked',
        revoked_at = now(),
        revoked_by_user_id = v_caller_id,
        revocation_reason = p_reason
    WHERE id = p_token_id;

    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prescription_revoke(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prescription_revoke(uuid, text) TO authenticated;

-- prescription_expire_overdue: hourly cron sweep. Flips active rows past
-- expires_at to status='expired'. Mirrors the cadence pattern from
-- expire_grandfathered_bindings_cron (#95) so an L3/L4 token cannot
-- linger more than 60 minutes past its expiration without the eligibility
-- check excluding it (the WHERE expires_at > now() filter inside
-- prescription_check_my_eligibility already gates against expired tokens
-- regardless of status; this sweep keeps status accurate for dashboards).
CREATE OR REPLACE FUNCTION public.prescription_expire_overdue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.prescription_tokens
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at <= now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prescription_expire_overdue() FROM PUBLIC;

SELECT cron.schedule(
    'prescription-tokens-expire-overdue',
    '0 * * * *',
    $cron$ SELECT public.prescription_expire_overdue(); $cron$
);

COMMENT ON TABLE public.prescription_tokens IS
    'Practitioner-issued prescription tokens for L3/L4 SKU purchase. Lifecycle active -> consumed/revoked/expired. F6b.3a foundation; consumption flow lands in F6b.3d.';

COMMENT ON FUNCTION public.prescription_issue(uuid, text, integer, timestamptz, text, text, jsonb) IS
    'Practitioner-only prescription issuance RPC. Called by F6b.3b serverIssuePrescription server action.';

COMMENT ON FUNCTION public.prescription_check_my_eligibility(text[]) IS
    'Patient-facing eligibility check across requested SKUs. Returns one row per SKU. Used by F6b.3d validateCheckout for L3/L4 cart lines.';

COMMENT ON FUNCTION public.prescription_consume(uuid, uuid) IS
    'Service-role only token consumption. Called from finalizeOrderForSession in F6b.3d. Outer order finalize is idempotent on stripe_session_id so this RPC sees each order exactly once.';

COMMENT ON FUNCTION public.prescription_revoke(uuid, text) IS
    'Practitioner-who-issued revocation. F6b.3g extends to admin override for offboarded practitioners.';
