-- =============================================================================
-- Prompt #101 Jeffery audit remediation.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Blocker: the client was writing raw UTF-8 bytes to
-- map_vip_exemption_sensitive_notes.encrypted_content. The column
-- name claims encryption at rest but there was no pgp_sym_encrypt
-- step. PII justifications (financial hardship, chronic illness)
-- would sit in the DB unprotected.
--
-- Remediation:
--   1. Revoke direct INSERT on the sensitive-notes table from
--      anon + authenticated so the client path is closed.
--   2. SECURITY DEFINER RPC `create_vip_sensitive_note` that takes
--      plaintext, verifies ownership (RLS-equivalent check), reads
--      a per-DB encryption key, and writes ciphertext.
--   3. If the key is not provisioned (`app.vip_sensitive_note_key`
--      not set), the RPC raises VIP_NOTE_KEY_NOT_PROVISIONED so the
--      UI can surface a specific message instead of silently storing
--      plaintext.
-- =============================================================================

REVOKE INSERT ON public.map_vip_exemption_sensitive_notes FROM anon;
REVOKE INSERT ON public.map_vip_exemption_sensitive_notes FROM authenticated;
GRANT INSERT ON public.map_vip_exemption_sensitive_notes TO service_role;

-- RLS policy update: drop the self-insert policy so only the RPC
-- (running as SECURITY DEFINER / service_role) can write.
DROP POLICY IF EXISTS "map_vip_sensitive_notes_restricted_insert"
  ON public.map_vip_exemption_sensitive_notes;

CREATE OR REPLACE FUNCTION public.create_vip_sensitive_note(
  p_vip_exemption_id UUID,
  p_plaintext        TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Ownership: caller must be admin OR the practitioner on the exemption.
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

  -- Read encryption key. current_setting(..., true) returns NULL when
  -- the setting is absent, avoiding the default raise.
  v_key := current_setting('app.vip_sensitive_note_key', true);
  IF v_key IS NULL OR length(v_key) < 16 THEN
    RAISE EXCEPTION 'VIP_NOTE_KEY_NOT_PROVISIONED' USING ERRCODE = 'P0001';
  END IF;

  v_hash := encode(digest(p_plaintext, 'sha256'), 'hex');
  v_encrypted := pgp_sym_encrypt(p_plaintext, v_key);

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
  'Prompt #101 §3.3: only entry point for writing PII justifications. Encrypts plaintext with pgp_sym_encrypt using app.vip_sensitive_note_key; raises VIP_NOTE_KEY_NOT_PROVISIONED if the operator has not set the key.';
