-- =============================================================================
-- Encryption slice 1 (Gary 2026-10-03). NOT APPLIED by this change.
-- Apply only after Gary approves.
--
-- Apply order: AFTER 20261003130000_practitioner_naturopath_credential.sql.
--
-- Fixes the search_path gap in public.create_vip_sensitive_note.
-- The previous body (20260421000008_vip_sensitive_note_encryption.sql) is
-- SECURITY DEFINER with SET search_path = public, and calls digest() and
-- pgp_sym_encrypt() unqualified. pgcrypto in this project is installed in
-- schema extensions (gap assessment 2026-10-02; not re-queried today).
-- Unqualified calls with search_path = public are expected to fail with
-- "function does not exist". That failure was inferred, not executed.
--
-- This replacement schema-qualifies extensions.digest and
-- extensions.pgp_sym_encrypt and pins search_path to empty. The passphrase
-- still comes from the GUC app.vip_sensitive_note_key. No key is changed.
-- No row in map_vip_exemption_sensitive_notes is read, updated, or deleted.
-- The function signature is unchanged.
--
-- Store label: Gary-directed security hardening. Apple 5.1.1 / 5.1.3 and
-- Play User Data do not name a Postgres search_path.
--
-- Rollback (do not run as part of apply): re-create the function body from
-- 20260421000008_vip_sensitive_note_encryption.sql. That restores the
-- unqualified calls. Do not change stored ciphertext to roll back.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_vip_sensitive_note(
  p_vip_exemption_id UUID,
  p_plaintext        TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key          TEXT;
  v_caller_uid   UUID := auth.uid();
  v_owner_match  BOOLEAN;
  v_is_admin     BOOLEAN;
  v_note_id      UUID;
  v_hash         TEXT;
  v_encrypted    BYTEA;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'VIP_NOTE_UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  IF p_plaintext IS NULL OR length(trim(p_plaintext)) < 20 THEN
    RAISE EXCEPTION 'VIP_NOTE_CONTENT_TOO_SHORT' USING ERRCODE = 'P0001';
  END IF;
  IF length(p_plaintext) > 4000 THEN
    RAISE EXCEPTION 'VIP_NOTE_CONTENT_TOO_LONG' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_uid AND role IN ('admin')
  ) INTO v_is_admin;

  SELECT EXISTS (
    SELECT 1 FROM public.map_vip_exemptions ve
    JOIN public.practitioners pr ON pr.id = ve.practitioner_id
    WHERE ve.vip_exemption_id = p_vip_exemption_id
      AND pr.user_id = v_caller_uid
  ) INTO v_owner_match;

  IF NOT (v_is_admin OR v_owner_match) THEN
    RAISE EXCEPTION 'VIP_NOTE_FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  v_key := current_setting('app.vip_sensitive_note_key', true);
  IF v_key IS NULL OR length(v_key) < 16 THEN
    RAISE EXCEPTION 'VIP_NOTE_KEY_NOT_PROVISIONED' USING ERRCODE = 'P0001';
  END IF;

  v_hash := encode(extensions.digest(p_plaintext, 'sha256'), 'hex');
  v_encrypted := extensions.pgp_sym_encrypt(p_plaintext, v_key);

  INSERT INTO public.map_vip_exemption_sensitive_notes (
    vip_exemption_id, encrypted_content, content_hash, created_by
  ) VALUES (
    p_vip_exemption_id, v_encrypted, v_hash, v_caller_uid
  )
  RETURNING note_id INTO v_note_id;

  RETURN v_note_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_vip_sensitive_note(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_vip_sensitive_note(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_vip_sensitive_note(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_vip_sensitive_note IS
  'Writes a VIP exemption note. Encrypts with extensions.pgp_sym_encrypt using the GUC app.vip_sensitive_note_key. search_path is empty so pgcrypto is schema-qualified. Raises VIP_NOTE_KEY_NOT_PROVISIONED when the GUC is missing or shorter than 16 characters. Does not change existing ciphertext.';
