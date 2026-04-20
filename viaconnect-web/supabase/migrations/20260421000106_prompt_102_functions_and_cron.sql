-- =============================================================================
-- Prompt #102 Phase 2 — reconciliation SQL function + Vault PII RPC + cron.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Three additions:
--   1. process_reconciliation_for_period() — SQL implementation of the
--      pure TS pipeline so pg_cron can invoke it without an HTTP hop.
--      Mirrors src/lib/reconciliation/pipeline.ts semantics.
--   2. read_vault_pii() — audited PII accessor RPC. Caller must be
--      the owning practitioner OR admin OR compliance_officer; every
--      call writes an audit log entry.
--   3. pg_cron schedules for the 3 recurring jobs.
-- =============================================================================

-- 1) Reconciliation SQL function
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
    SELECT
      COALESCE(SUM(ca.accrual_amount_cents), 0),
      0::BIGINT,
      0::BIGINT
    INTO v_gross, v_clawbacks, v_holds
    FROM public.commission_accruals ca
    WHERE ca.practitioner_id = v_practitioner.practitioner_id
      AND ca.reconciled_at IS NULL
      AND ca.accrual_date BETWEEN p_period_start AND p_period_end;

    -- Clawbacks from refunded orders.
    SELECT COALESCE(SUM(
      LEAST(
        ca.accrual_amount_cents,
        FLOOR(ca.accrual_amount_cents *
          LEAST(1.0, COALESCE(o.refunded_amount_cents, 0)::NUMERIC / NULLIF(o.total_cents, 0)))
      )::BIGINT
    ), 0) INTO v_clawbacks
    FROM public.commission_accruals ca
    LEFT JOIN public.orders o ON o.id = ca.source_order_id
    WHERE ca.practitioner_id = v_practitioner.practitioner_id
      AND ca.reconciled_at IS NULL
      AND ca.accrual_date BETWEEN p_period_start AND p_period_end
      AND o.total_cents IS NOT NULL
      AND COALESCE(o.refunded_amount_cents, 0) > 0;

    -- MAP violation holds (open red/black violations with no remediation).
    SELECT COALESCE(SUM(
      LEAST(
        mv.map_price_cents - mv.observed_price_cents,
        v_gross - v_clawbacks
      )::BIGINT
    ), 0) INTO v_holds
    FROM public.map_violations mv
    WHERE mv.practitioner_id = v_practitioner.practitioner_id
      AND mv.severity IN ('red','black')
      AND mv.status IN ('active','notified','escalated');

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

    -- Mark accruals as reconciled.
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
REVOKE ALL ON FUNCTION public.process_reconciliation_for_period(DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_reconciliation_for_period(DATE, DATE) FROM anon;
REVOKE ALL ON FUNCTION public.process_reconciliation_for_period(DATE, DATE) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_reconciliation_for_period(DATE, DATE) TO service_role;

-- 2) Vault PII accessor RPC — audited read of encrypted fields.
CREATE OR REPLACE FUNCTION public.read_vault_pii(
  p_vault_ref TEXT,
  p_field     TEXT,
  p_purpose   TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_caller_uid  UUID := auth.uid();
  v_is_admin    BOOLEAN;
  v_is_compliance BOOLEAN;
  v_decrypted   TEXT;
  v_audit_id    UUID;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'VAULT_UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND role = 'admin') INTO v_is_admin;
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND role = 'compliance_officer') INTO v_is_compliance;

  IF NOT (v_is_admin OR v_is_compliance) THEN
    RAISE EXCEPTION 'VAULT_FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  -- Decrypt via Supabase Vault. If the secret is missing, raise a
  -- specific error so the caller can surface a stable message.
  BEGIN
    SELECT decrypted_secret INTO v_decrypted
    FROM vault.decrypted_secrets
    WHERE name = p_vault_ref
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_decrypted := NULL;
  END;

  IF v_decrypted IS NULL THEN
    RAISE EXCEPTION 'VAULT_SECRET_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- Audit log — never put the plaintext or the vault_ref in the log
  -- body; only the field + purpose + actor.
  INSERT INTO public.practitioner_operations_audit_log (
    actor_user_id, actor_role, action_category, action_verb,
    target_table, context_json
  ) VALUES (
    v_caller_uid,
    CASE WHEN v_is_admin THEN 'admin' WHEN v_is_compliance THEN 'compliance_officer' ELSE 'other' END,
    'pii_access', 'pii_access.read',
    'vault.decrypted_secrets',
    jsonb_build_object('field', p_field, 'purpose', p_purpose)
  )
  RETURNING audit_id INTO v_audit_id;

  RETURN jsonb_build_object('value', v_decrypted, 'audit_id', v_audit_id);
END;
$$;
REVOKE ALL ON FUNCTION public.read_vault_pii(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_vault_pii(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.read_vault_pii(TEXT, TEXT, TEXT) TO authenticated;

-- 3) pg_cron schedules
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'commission_reconciliation_daily') THEN
    PERFORM cron.schedule(
      'commission_reconciliation_daily',
      '0 4 * * *',
      $cron$ SELECT public.process_reconciliation_for_period(
        (CURRENT_DATE - INTERVAL '1 day')::DATE,
        (CURRENT_DATE - INTERVAL '1 day')::DATE
      ); $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'channel_re_verify_daily') THEN
    PERFORM cron.schedule(
      'channel_re_verify_daily',
      '30 2 * * *',
      $cron$
        UPDATE public.practitioner_verified_channels
        SET state = 'verification_lapsed',
            updated_at = NOW()
        WHERE state = 'verified'
          AND re_verify_due_at IS NOT NULL
          AND re_verify_due_at < NOW();
      $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'channel_verification_attempt_expiry') THEN
    PERFORM cron.schedule(
      'channel_verification_attempt_expiry',
      '0 * * * *',
      $cron$
        UPDATE public.channel_verification_attempts
        SET attempt_status = 'expired', resolved_at = NOW()
        WHERE attempt_status = 'pending' AND expires_at < NOW();
      $cron$
    );
  END IF;
END $$;
