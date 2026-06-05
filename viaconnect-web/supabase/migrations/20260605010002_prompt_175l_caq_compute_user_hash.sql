-- =============================================================================
-- Prompt 175l (2026-06-05): caq_compute_user_hash helper.
--
-- Wraps the existing get_corpus_salt() + sha256 into one SECURITY
-- DEFINER call so the barcode-capture route can produce a salted
-- user_hash without ever holding the salt in JS. The salt stays in
-- vault; this function reads it and returns only the digest.
--
-- APPEND-ONLY: new function, no existing object modified.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.caq_compute_user_hash(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'vault', 'extensions'
AS $$
  SELECT encode(
    extensions.digest(
      p_user_id::text || coalesce(public.get_corpus_salt(), 'corpus_salt_fallback_v1'),
      'sha256'
    ),
    'hex'
  );
$$;

REVOKE ALL ON FUNCTION public.caq_compute_user_hash(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caq_compute_user_hash(uuid) TO service_role;
