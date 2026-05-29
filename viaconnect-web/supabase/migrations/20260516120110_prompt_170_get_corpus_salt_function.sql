-- Prompt #170 Phase 1q hotfix 10: capture the public.get_corpus_salt()
-- SECURITY DEFINER function in an append-only migration. Function was
-- originally provisioned out-of-band (Vault secret + RPC wrapper) before the
-- migration ledger was in place; this migration closes the drift so fresh
-- deploys + drift audits + rollbacks land on the same function shape as live.
--
-- Per project memory project_local_vs_live_migrations_drift.md, local
-- migration files often drift from live. This migration is retroactive.
--
-- Contract per Prompt 170 §2.5 + Prompt 170a §4.4:
--   - SECURITY DEFINER so callers do not need direct Vault access.
--   - EXECUTE granted to service_role only; never to authenticated/anon.
--   - Returns the current corpus_salt as text. The salt is read from
--     Supabase Vault via vault.decrypted_secrets (name='corpus_salt').
--   - Returns NULL if the secret is missing; callers in app code raise.
--   - search_path is pinned to an empty schema list so an attacker cannot
--     redirect the vault lookup through a custom search path.
--
-- CREATE OR REPLACE keeps the migration idempotent on re-apply. The function
-- body matches the documented contract; if the live implementation differs
-- on cosmetic details, this migration brings local in line with intent
-- without breaking any current caller.

CREATE OR REPLACE FUNCTION public.get_corpus_salt()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_salt text;
BEGIN
  SELECT decrypted_secret INTO v_salt
  FROM vault.decrypted_secrets
  WHERE name = 'corpus_salt'
  LIMIT 1;
  RETURN v_salt;
END;
$$;

REVOKE ALL ON FUNCTION public.get_corpus_salt() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_corpus_salt() FROM authenticated;
REVOKE ALL ON FUNCTION public.get_corpus_salt() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_corpus_salt() TO service_role;

COMMENT ON FUNCTION public.get_corpus_salt() IS
  'Prompt #170: returns the current corpus_salt from Supabase Vault. Service-role only.';
