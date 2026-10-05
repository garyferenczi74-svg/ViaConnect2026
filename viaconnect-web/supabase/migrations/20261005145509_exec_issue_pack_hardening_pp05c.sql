CREATE OR REPLACE FUNCTION public.exec_issue_pack(
  p_pack_id            uuid,
  p_ceo_user_id        uuid,
  p_typed_confirmation text,
  p_ip_address         inet DEFAULT NULL::inet,
  p_user_agent         text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_role         TEXT;
  v_pack               RECORD;
  v_member             RECORD;
  v_token              TEXT;
  v_distribution_id    UUID;
  v_distributions_json JSONB := '[]'::JSONB;
  v_excluded_json      JSONB := '[]'::JSONB;
  v_distributions_created INT := 0;
  v_excluded_count     INT := 0;
  v_now                TIMESTAMPTZ := NOW();
  v_uid                UUID := auth.uid();
  v_db_role            TEXT := current_setting('role', true);
  v_ceo_user_id        UUID;
BEGIN
  IF v_db_role = 'service_role' THEN
    IF p_ceo_user_id IS NULL THEN
      RAISE EXCEPTION 'MISSING_CEO_ROLE' USING ERRCODE = 'P0001', HINT = 'ceo_user_id_required';
    END IF;
    IF v_uid IS NOT NULL AND p_ceo_user_id <> v_uid THEN
      RAISE EXCEPTION 'MISSING_CEO_ROLE' USING ERRCODE = 'P0001', HINT = 'caller_mismatch';
    END IF;
    v_ceo_user_id := p_ceo_user_id;
  ELSE
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'MISSING_CEO_ROLE' USING ERRCODE = 'P0001', HINT = 'no_authenticated_caller';
    END IF;
    IF p_ceo_user_id IS NOT NULL AND p_ceo_user_id <> v_uid THEN
      RAISE EXCEPTION 'MISSING_CEO_ROLE' USING ERRCODE = 'P0001', HINT = 'caller_mismatch';
    END IF;
    v_ceo_user_id := v_uid;
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_ceo_user_id;
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'MISSING_CEO_ROLE' USING ERRCODE = 'P0001', HINT = 'no profile row';
  END IF;
  IF v_actor_role != 'ceo' THEN
    RAISE EXCEPTION 'MISSING_CEO_ROLE' USING ERRCODE = 'P0001', HINT = 'not_ceo';
  END IF;

  IF p_typed_confirmation IS NULL OR p_typed_confirmation != 'ISSUE PACK' THEN
    RAISE EXCEPTION 'CEO_CONFIRMATION_TEXT_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  SELECT pack_id, state, cfo_approved_at, period_type
    INTO v_pack
    FROM public.board_packs
   WHERE pack_id = p_pack_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PACK_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_pack.state != 'pending_ceo_approval'::public.pack_state THEN
    RAISE EXCEPTION 'PACK_NOT_IN_PENDING_CEO_APPROVAL'
      USING ERRCODE = 'P0001', HINT = 'state=' || v_pack.state;
  END IF;
  IF v_pack.cfo_approved_at IS NULL THEN
    RAISE EXCEPTION 'CFO_APPROVAL_MISSING' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.board_packs
     SET state = 'issued'::public.pack_state,
         ceo_issued_by = v_ceo_user_id,
         ceo_issued_at = v_now
   WHERE pack_id = p_pack_id;

  FOR v_member IN
    SELECT member_id, display_name, role, nda_status, departure_date,
           board_reporting_scope, access_revoked_at, auth_user_id
      FROM public.board_members
  LOOP
    IF v_member.access_revoked_at IS NOT NULL THEN
      v_excluded_json := v_excluded_json || jsonb_build_object(
        'member_id', v_member.member_id, 'reason', 'access_revoked'
      );
      v_excluded_count := v_excluded_count + 1;
      CONTINUE;
    END IF;
    IF v_member.departure_date IS NOT NULL AND v_member.departure_date <= CURRENT_DATE THEN
      v_excluded_json := v_excluded_json || jsonb_build_object(
        'member_id', v_member.member_id, 'reason', 'departed'
      );
      v_excluded_count := v_excluded_count + 1;
      CONTINUE;
    END IF;
    IF v_member.nda_status != 'on_file'::public.nda_status THEN
      v_excluded_json := v_excluded_json || jsonb_build_object(
        'member_id', v_member.member_id, 'reason', 'nda_not_on_file'
      );
      v_excluded_count := v_excluded_count + 1;
      CONTINUE;
    END IF;
    IF NOT (v_member.board_reporting_scope ? v_pack.period_type::TEXT) THEN
      v_excluded_json := v_excluded_json || jsonb_build_object(
        'member_id', v_member.member_id, 'reason', 'scope_mismatch'
      );
      v_excluded_count := v_excluded_count + 1;
      CONTINUE;
    END IF;

    v_token := public.exec_generate_watermark_token();
    BEGIN
      INSERT INTO public.board_pack_distributions (
        pack_id, member_id, watermark_token, distributed_at
      ) VALUES (
        p_pack_id, v_member.member_id, v_token, v_now
      ) RETURNING distribution_id INTO v_distribution_id;
    EXCEPTION WHEN unique_violation THEN
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

    INSERT INTO public.executive_reporting_audit_log (
      action_category, action_verb, target_table, target_id,
      pack_id, member_id, actor_user_id, actor_role, context_json,
      ip_address, user_agent
    ) VALUES (
      'distribution', 'distribution.granted', 'board_pack_distributions', v_distribution_id,
      p_pack_id, v_member.member_id, v_ceo_user_id, v_actor_role,
      jsonb_build_object('period_type', v_pack.period_type::TEXT),
      p_ip_address, p_user_agent
    );
  END LOOP;

  INSERT INTO public.executive_reporting_audit_log (
    action_category, action_verb, target_table, target_id,
    pack_id, actor_user_id, actor_role,
    before_state_json, after_state_json, context_json,
    ip_address, user_agent
  ) VALUES (
    'pack', 'pack.ceo_issued', 'board_packs', p_pack_id,
    p_pack_id, v_ceo_user_id, v_actor_role,
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
$function$;

COMMENT ON FUNCTION public.exec_issue_pack(uuid, uuid, text, inet, text) IS
  'CEO pack issue. SECURITY DEFINER, empty search_path. EXECUTE: service_role only. PP-05c.';

REVOKE ALL ON FUNCTION public.exec_issue_pack(uuid, uuid, text, inet, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_issue_pack(uuid, uuid, text, inet, text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_issue_pack(uuid, uuid, text, inet, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_issue_pack(uuid, uuid, text, inet, text) TO service_role;

DO $chk$
BEGIN
  IF has_function_privilege('anon', 'public.exec_issue_pack(uuid,uuid,text,inet,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.exec_issue_pack(uuid,uuid,text,inet,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PP-05c: anon/authenticated still have EXECUTE on exec_issue_pack';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.exec_issue_pack(uuid,uuid,text,inet,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PP-05c: service_role lost EXECUTE on exec_issue_pack';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p
                  WHERE p.oid = 'public.exec_issue_pack(uuid,uuid,text,inet,text)'::regprocedure
                    AND p.prosecdef
                    AND p.proconfig @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'PP-05c: exec_issue_pack is not SECURITY DEFINER with empty search_path';
  END IF;
END
$chk$;