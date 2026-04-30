-- Prompt #141 v3 Phase F6b.3d: prescription_consume authenticated-callable
-- and per-order idempotent.
--
-- F6b.3a shipped prescription_consume as service-role only with the
-- assumption that the outer order finalize path held the invariant.
-- F6b.3d wires consumption into the shop checkout finalize helper, which
-- runs from BOTH the Stripe webhook (service_role client via createAdminClient)
-- and the /shop/checkout/success server action (auth-scoped client via
-- createClient). The auth-scoped path needs to call this RPC too, so we
-- GRANT it to authenticated and add internal verification: an authenticated
-- caller must own the token (as patient) and the order they are consuming
-- against, and the order must be in a paid lifecycle state.
--
-- The service_role caller (webhook) is detected by `auth.uid() IS NULL` and
-- bypasses the ownership and order-status checks. Anonymous callers cannot
-- reach the function body at all because of REVOKE FROM PUBLIC; only
-- authenticated and service_role have EXECUTE.
--
-- Per-order idempotency: a (token, order) pair cannot be consumed twice.
-- If `metadata->>'last_consumed_order_id'` already equals `p_order_id::text`,
-- the function returns true without modifying state. This is belt-and-braces
-- on top of the F5c.5 stripe_session_id UNIQUE-index race protection that
-- already prevents both finalize paths from inserting the same order row;
-- if a future refactor splits consume into a separate retry path, the
-- safety net here ensures quantity_consumed cannot drift.

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
    v_caller_id uuid;
    v_token public.prescription_tokens%ROWTYPE;
    v_order_user_id uuid;
    v_order_status text;
    v_new_consumed integer;
BEGIN
    v_caller_id := (SELECT auth.uid());

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

    IF v_token.metadata->>'last_consumed_order_id' = p_order_id::text THEN
        RETURN true;
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
GRANT EXECUTE ON FUNCTION public.prescription_consume(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prescription_consume(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.prescription_consume(uuid, uuid) IS
    'Token consumption RPC. authenticated callers must own both the token and the paid order. service_role (webhook) bypasses ownership checks. Per-order idempotent on metadata.last_consumed_order_id. F6b.3d evolved from F6b.3a service-role-only baseline.';
