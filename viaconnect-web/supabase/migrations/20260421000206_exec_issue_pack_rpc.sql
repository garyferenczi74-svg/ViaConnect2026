-- =============================================================================
-- Prompt #105 Phase 2b.1 — atomic exec_issue_pack RPC.
-- =============================================================================
-- Replaces the multi-PG-connection sequence in exec-issue-pack edge function
-- with a single transactional unit. On any failure the whole issue aborts:
-- no half-issued pack, no partial distributions.
--
-- The RPC is SECURITY DEFINER so we can read profiles.role + write audit log
-- even from a service-role-wrapped edge-function call. All business rules
-- (CEO role, typed confirmation, state gate, CFO approval, NDA/scope
-- eligibility, watermark uniqueness) are enforced inside this one function.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.exec_generate_watermark_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  raw_b64 TEXT;
BEGIN
  -- 16 cryptographic bytes → base64 → URL-safe tweak → trim to 22 chars.
  -- Mirrors src/lib/executiveReporting/distribution/watermarker.ts.
  raw_b64 := encode(gen_random_bytes(16), 'base64');
  raw_b64 := translate(raw_b64, '+/', '-_');
  raw_b64 := replace(raw_b64, '=', '');
  RETURN substring(raw_b64 FROM 1 FOR 22);
END;
$$;
COMMENT ON FUNCTION public.exec_generate_watermark_token() IS
  'Crypto-strong 22-char URL-safe base64 watermark token. Mirrors the TS watermarker lib.';

CREATE OR REPLACE FUNCTION public.exec_issue_pack(
  p_pack_id              UUID,
  p_ceo_user_id          UUID,
  p_typed_confirmation   TEXT,
  p_ip_address           INET DEFAULT NULL,
  p_user_agent           TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role         TEXT;
  v_pack               RECORD;
  v_member             RECORD;
  v_token              TEXT;
  v_distribution_id    UUID;
  v_distributions_json JSONB := '[]'::JSONB;
  v_excluded_json      JSONB := '[]'::JSONB;
  v_distribution_errors JSONB := '[]'::JSONB;
  v_distributions_created INT := 0;
  v_excluded_count     INT := 0;
  v_now                TIMESTAMPTZ := NOW();
BEGIN
  -- Gate 2: CEO role. admin is NOT a substitute here — the bright line is
  -- the CEO. We resolve the role from profiles, not trusting any caller
  -- claim. MISSING_CEO_ROLE raised as application error (P0001) so the
  -- calling edge function can map it to a 403.
  SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_ceo_user_id;
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'MISSING_CEO_ROLE' USING ERRCODE = 'P0001', HINT = 'no profile row';
  END IF;
  IF v_actor_role != 'ceo' THEN
    RAISE EXCEPTION 'MISSING_CEO_ROLE' USING ERRCODE = 'P0001', HINT = 'role=' || v_actor_role;
  END IF;

  -- Gate 5: typed confirmation must be exactly 'ISSUE PACK'.
  IF p_typed_confirmation IS NULL OR p_typed_confirmation != 'ISSUE PACK' THEN
    RAISE EXCEPTION 'CEO_CONFIRMATION_TEXT_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  -- Gates 3 + 4: pack must be in pending_ceo_approval and have CFO approval.
  -- FOR UPDATE takes a row lock so concurrent issues serialize — the second
  -- caller finds state != pending_ceo_approval and raises.
  SELECT pack_id, state, cfo_approved_at, period_type
    INTO v_pack
    FROM public.board_packs
   WHERE pack_id = p_pack_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PACK_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_pack.state != 'pending_ceo_approval'::pack_state THEN
    RAISE EXCEPTION 'PACK_NOT_IN_PENDING_CEO_APPROVAL'
      USING ERRCODE = 'P0001', HINT = 'state=' || v_pack.state;
  END IF;
  IF v_pack.cfo_approved_at IS NULL THEN
    RAISE EXCEPTION 'CFO_APPROVAL_MISSING' USING ERRCODE = 'P0001';
  END IF;

  -- Gate 6: transition pack to issued.
  UPDATE public.board_packs
     SET state = 'issued'::pack_state,
         ceo_issued_by = p_ceo_user_id,
         ceo_issued_at = v_now
   WHERE pack_id = p_pack_id;

  -- Gate 7 + 8: resolve eligible board members, generate watermark tokens,
  -- insert distributions. The ENFORCE_DISTRIBUTION_NDA_GATE trigger on
  -- board_pack_distributions re-verifies NDA+departure on every INSERT —
  -- if a row slips past the query below, the trigger raises and the entire
  -- function transaction rolls back.
  FOR v_member IN
    SELECT member_id, display_name, role, nda_status, departure_date,
           board_reporting_scope, access_revoked_at, auth_user_id
      FROM public.board_members
  LOOP
    -- access_revoked_at exclusion
    IF v_member.access_revoked_at IS NOT NULL THEN
      v_excluded_json := v_excluded_json || jsonb_build_object(
        'member_id', v_member.member_id,
        'reason', 'access_revoked'
      );
      v_excluded_count := v_excluded_count + 1;
      CONTINUE;
    END IF;
    -- departure_date exclusion
    IF v_member.departure_date IS NOT NULL AND v_member.departure_date <= CURRENT_DATE THEN
      v_excluded_json := v_excluded_json || jsonb_build_object(
        'member_id', v_member.member_id,
        'reason', 'departed'
      );
      v_excluded_count := v_excluded_count + 1;
      CONTINUE;
    END IF;
    -- NDA exclusion
    IF v_member.nda_status != 'on_file'::nda_status THEN
      v_excluded_json := v_excluded_json || jsonb_build_object(
        'member_id', v_member.member_id,
        'reason', 'nda_not_on_file'
      );
      v_excluded_count := v_excluded_count + 1;
      CONTINUE;
    END IF;
    -- scope exclusion — board_reporting_scope is JSONB array of strings.
    IF NOT (v_member.board_reporting_scope ? v_pack.period_type::TEXT) THEN
      v_excluded_json := v_excluded_json || jsonb_build_object(
        'member_id', v_member.member_id,
        'reason', 'scope_mismatch'
      );
      v_excluded_count := v_excluded_count + 1;
      CONTINUE;
    END IF;

    -- Eligible: generate token (retry once on the vanishingly unlikely
    -- collision with an existing watermark_token UNIQUE constraint).
    v_token := public.exec_generate_watermark_token();
    BEGIN
      INSERT INTO public.board_pack_distributions (
        pack_id, member_id, watermark_token, distributed_at
      ) VALUES (
        p_pack_id, v_member.member_id, v_token, v_now
      ) RETURNING distribution_id INTO v_distribution_id;
    EXCEPTION WHEN unique_violation THEN
      -- Single retry with fresh token.
      v_token := public.exec_generate_watermark_token();
      INSERT INTO public.board_pack_distributions (
        pack_id, member_id, watermark_token, distributed_at
      ) VALUES (
        p_pack_id, v_member.member_id, v_token, v_now
      ) RETURNING distribution_id INTO v_distribution_id;
    END;

    v_distributions_json := v_distributions_json || jsonb_build_object(
      'distribution_id', v_distribution_id,
      'member_id', v_member.member_id,
      'watermark_token', v_token
    );
    v_distributions_created := v_distributions_created + 1;

    -- Per-distribution audit entry.
    INSERT INTO public.executive_reporting_audit_log (
      action_category, action_verb, target_table, target_id,
      pack_id, member_id, actor_user_id, actor_role, context_json,
      ip_address, user_agent
    ) VALUES (
      'distribution', 'distribution.granted', 'board_pack_distributions', v_distribution_id,
      p_pack_id, v_member.member_id, p_ceo_user_id, v_actor_role,
      jsonb_build_object('period_type', v_pack.period_type::TEXT),
      p_ip_address, p_user_agent
    );
  END LOOP;

  -- Top-level issue audit entry.
  INSERT INTO public.executive_reporting_audit_log (
    action_category, action_verb, target_table, target_id,
    pack_id, actor_user_id, actor_role,
    before_state_json, after_state_json, context_json,
    ip_address, user_agent
  ) VALUES (
    'pack', 'pack.ceo_issued', 'board_packs', p_pack_id,
    p_pack_id, p_ceo_user_id, v_actor_role,
    jsonb_build_object('state', 'pending_ceo_approval'),
    jsonb_build_object('state', 'issued', 'ceo_issued_at', v_now),
    jsonb_build_object(
      'distributions_created', v_distributions_created,
      'excluded_count', v_excluded_count
    ),
    p_ip_address, p_user_agent
  );

  RETURN jsonb_build_object(
    'pack_id', p_pack_id,
    'state', 'issued',
    'ceo_issued_at', v_now,
    'distributions', v_distributions_json,
    'excluded', v_excluded_json,
    'distributions_created', v_distributions_created,
    'excluded_count', v_excluded_count
  );
END;
$$;
COMMENT ON FUNCTION public.exec_issue_pack(UUID, UUID, TEXT, INET, TEXT) IS
  '§3.7 CEO bright-line pack issue. All-or-nothing transaction: pack transition, per-member distributions, audit log. Raises P0001 with mnemonic error codes (MISSING_CEO_ROLE, CEO_CONFIRMATION_TEXT_MISMATCH, PACK_NOT_FOUND, PACK_NOT_IN_PENDING_CEO_APPROVAL, CFO_APPROVAL_MISSING).';

-- Tighten grants. Only the service role (used by edge functions) should
-- be able to call these; board members and admins go through the edge
-- function which passes the caller identity as a parameter.
REVOKE ALL ON FUNCTION public.exec_generate_watermark_token() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_issue_pack(UUID, UUID, TEXT, INET, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_generate_watermark_token() TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_issue_pack(UUID, UUID, TEXT, INET, TEXT) TO service_role;
