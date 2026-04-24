-- =============================================================================
-- Prompt #125 P4: Scheduler OAuth token Vault RPCs
-- =============================================================================
-- Three SECURITY DEFINER functions that wrap Supabase Vault for scheduler
-- OAuth bundles. store_ returns a vault_ref the app stores in
-- scheduler_connections.token_vault_ref. read_ returns the decrypted
-- bundle and writes an audit row. delete_ removes the secret.
--
-- The functions are service-role-only: the grant is to service_role.
-- Everything user-facing on this surface already goes through server API
-- routes that use createAdminClient().
-- =============================================================================

CREATE OR REPLACE FUNCTION public.store_scheduler_token(
  p_bundle jsonb,
  p_purpose text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_secret_id uuid;
  v_name      text := 'scheduler_oauth_' || replace(gen_random_uuid()::text, '-', '');
BEGIN
  v_secret_id := vault.create_secret(
    p_bundle::text,
    v_name,
    concat('Prompt #125 scheduler OAuth bundle, purpose=', coalesce(p_purpose, 'unspecified'))
  );
  RETURN jsonb_build_object('vault_ref', v_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_scheduler_token(
  p_vault_ref text,
  p_purpose text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_plaintext text;
BEGIN
  SELECT decrypted_secret INTO v_plaintext
  FROM vault.decrypted_secrets
  WHERE name = p_vault_ref;

  IF v_plaintext IS NULL THEN
    RAISE EXCEPTION 'vault_secret_not_found';
  END IF;

  -- Audit every read. compliance_audit_log is append-only with
  -- hash-chaining handled by a trigger added in earlier migrations.
  INSERT INTO public.compliance_audit_log (event_type, actor_type, actor_id, payload)
  VALUES (
    'scheduler_token_read',
    'system',
    NULL,
    jsonb_build_object(
      'vault_ref_name_prefix', left(p_vault_ref, 24),
      'purpose', p_purpose
    )
  );

  RETURN v_plaintext::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_scheduler_token(
  p_vault_ref text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE name = p_vault_ref;
END;
$$;

REVOKE ALL ON FUNCTION public.store_scheduler_token(jsonb, text) FROM public;
REVOKE ALL ON FUNCTION public.read_scheduler_token(text, text)   FROM public;
REVOKE ALL ON FUNCTION public.delete_scheduler_token(text)       FROM public;
GRANT EXECUTE ON FUNCTION public.store_scheduler_token(jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_scheduler_token(text, text)   TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_scheduler_token(text)       TO service_role;

COMMENT ON FUNCTION public.store_scheduler_token(jsonb, text) IS
  'Prompt #125 P4: store a scheduler OAuth bundle in Vault. Returns { vault_ref }. service_role-only.';
COMMENT ON FUNCTION public.read_scheduler_token(text, text) IS
  'Prompt #125 P4: decrypt a scheduler OAuth bundle. Writes compliance_audit_log entry per read. service_role-only.';
COMMENT ON FUNCTION public.delete_scheduler_token(text) IS
  'Prompt #125 P4: delete a scheduler OAuth bundle from Vault. service_role-only.';
