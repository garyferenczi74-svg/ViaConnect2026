-- =============================================================================
-- Prompt #102 Jeffery audit remediation.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Two fixes:
--   1. read_vault_pii was rejecting the owning practitioner; spec §3.4
--      requires the owner OR admin OR compliance_officer. Add the
--      practitioner-ownership branch by checking whether the caller's
--      practitioner_id matches a tax_documents or payout_methods row
--      referencing the same vault_ref.
--   2. process_reconciliation_for_period sums ALL open violation holds
--      regardless of period; add a created_at filter so stale violations
--      don't re-hold money in every subsequent period.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.read_vault_pii(
  p_vault_ref TEXT,
  p_field     TEXT,
  p_purpose   TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_caller_uid     UUID := auth.uid();
  v_is_admin       BOOLEAN;
  v_is_compliance  BOOLEAN;
  v_is_owner       BOOLEAN;
  v_decrypted      TEXT;
  v_audit_id       UUID;
  v_access_reason  TEXT;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'VAULT_UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND role = 'admin') INTO v_is_admin;
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND role = 'compliance_officer') INTO v_is_compliance;

  -- Practitioner-owner check: the vault_ref belongs to one of the
  -- caller's own tax_documents or payout_methods rows.
  SELECT EXISTS (
    SELECT 1 FROM public.practitioner_tax_documents td
    JOIN public.practitioners pr ON pr.id = td.practitioner_id
    WHERE td.encrypted_pii_vault_ref = p_vault_ref AND pr.user_id = v_caller_uid
    UNION ALL
    SELECT 1 FROM public.practitioner_payout_methods pm
    JOIN public.practitioners pr ON pr.id = pm.practitioner_id
    WHERE pm.wire_instructions_vault_ref = p_vault_ref AND pr.user_id = v_caller_uid
  ) INTO v_is_owner;

  IF NOT (v_is_admin OR v_is_compliance OR v_is_owner) THEN
    RAISE EXCEPTION 'VAULT_FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  v_access_reason := CASE
    WHEN v_is_admin THEN 'admin'
    WHEN v_is_compliance THEN 'compliance_officer'
    WHEN v_is_owner THEN 'practitioner_self'
    ELSE 'unknown'
  END;

  -- Surface permission and missing-secret errors distinctly so
  -- operators can tell misconfiguration apart from a typo.
  BEGIN
    SELECT decrypted_secret INTO v_decrypted
    FROM vault.decrypted_secrets
    WHERE name = p_vault_ref
    LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'VAULT_PERMISSION_DENIED' USING ERRCODE = 'P0001';
  WHEN OTHERS THEN
    v_decrypted := NULL;
  END;

  IF v_decrypted IS NULL THEN
    RAISE EXCEPTION 'VAULT_SECRET_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.practitioner_operations_audit_log (
    actor_user_id, actor_role, action_category, action_verb,
    target_table, context_json
  ) VALUES (
    v_caller_uid, v_access_reason,
    'pii_access', 'pii_access.read',
    'vault.decrypted_secrets',
    jsonb_build_object('field', p_field, 'purpose', p_purpose, 'actor_kind', v_access_reason)
  )
  RETURNING audit_id INTO v_audit_id;

  RETURN jsonb_build_object('value', v_decrypted, 'audit_id', v_audit_id);
END;
$$;

-- Period-scoped hold filter: only violations created at or before
-- p_period_end contribute to the period's hold total. Prevents a
-- stale open violation from re-deducting forever.
CREATE OR REPLACE FUNCTION public.process_reconciliation_for_period(
  p_period_start DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::DATE,
  p_period_end   DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::DATE
) RETURNS TABLE(runs_written INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_runs_written INTEGER := 0;
  v_practitioner RECORD;
  v_run_id UUID;
  v_gross BIGINT;
  v_clawbacks BIGINT;
  v_holds BIGINT;
  v_net BIGINT;
BEGIN
  FOR v_practitioner IN
    SELECT DISTINCT ca.practitioner_id
    FROM public.commission_accruals ca
    WHERE ca.reconciled_at IS NULL
      AND ca.accrual_date BETWEEN p_period_start AND p_period_end
  LOOP
    SELECT COALESCE(SUM(ca.accrual_amount_cents), 0), 0::BIGINT, 0::BIGINT
    INTO v_gross, v_clawbacks, v_holds
    FROM public.commission_accruals ca
    WHERE ca.practitioner_id = v_practitioner.practitioner_id
      AND ca.reconciled_at IS NULL
      AND ca.accrual_date BETWEEN p_period_start AND p_period_end;

    SELECT COALESCE(SUM(LEAST(
      ca.accrual_amount_cents,
      FLOOR(ca.accrual_amount_cents *
        LEAST(1.0, COALESCE(o.refunded_amount_cents, 0)::NUMERIC / NULLIF(o.total_cents, 0)))
    )::BIGINT), 0) INTO v_clawbacks
    FROM public.commission_accruals ca
    LEFT JOIN public.orders o ON o.id = ca.source_order_id
    WHERE ca.practitioner_id = v_practitioner.practitioner_id
      AND ca.reconciled_at IS NULL
      AND ca.accrual_date BETWEEN p_period_start AND p_period_end
      AND o.total_cents IS NOT NULL AND COALESCE(o.refunded_amount_cents, 0) > 0;

    -- Hold = open violations created during or before the period.
    SELECT COALESCE(SUM(LEAST(
      mv.map_price_cents - mv.observed_price_cents,
      v_gross - v_clawbacks
    )::BIGINT), 0)
    INTO v_holds
    FROM public.map_violations mv
    WHERE mv.practitioner_id = v_practitioner.practitioner_id
      AND mv.severity IN ('red','black')
      AND mv.status IN ('active','notified','escalated')
      AND mv.created_at::DATE <= p_period_end;

    v_holds := LEAST(v_holds, GREATEST(0, v_gross - v_clawbacks));
    v_net := GREATEST(0, v_gross - v_clawbacks - v_holds);

    INSERT INTO public.commission_reconciliation_runs (
      practitioner_id, period_start, period_end,
      gross_accrued_cents, total_clawbacks_cents, total_holds_cents, net_payable_cents
    )
    VALUES (
      v_practitioner.practitioner_id, p_period_start, p_period_end,
      v_gross, v_clawbacks, v_holds, v_net
    )
    ON CONFLICT (practitioner_id, period_start, period_end) DO UPDATE SET
      gross_accrued_cents = EXCLUDED.gross_accrued_cents,
      total_clawbacks_cents = EXCLUDED.total_clawbacks_cents,
      total_holds_cents = EXCLUDED.total_holds_cents,
      net_payable_cents = EXCLUDED.net_payable_cents,
      run_at = NOW()
    RETURNING run_id INTO v_run_id;

    UPDATE public.commission_accruals
    SET reconciled_at = NOW(),
        reconciliation_run_id = v_run_id,
        status = 'reconciled'
    WHERE practitioner_id = v_practitioner.practitioner_id
      AND reconciled_at IS NULL
      AND accrual_date BETWEEN p_period_start AND p_period_end;

    v_runs_written := v_runs_written + 1;
  END LOOP;
  RETURN QUERY SELECT v_runs_written;
END;
$$;
