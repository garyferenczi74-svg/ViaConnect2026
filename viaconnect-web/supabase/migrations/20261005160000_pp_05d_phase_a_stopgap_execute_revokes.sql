-- =============================================================================
-- PP-05d Phase A stopgap (A1–A3 only). DRAFT / NOT APPLIED.
-- Soft GO Jeffery 2026-10-05 (via Michelangelo): Stay DRAFT.
-- Do not apply until Arnold branch smoke and a Jeffery Soft GO apply.
-- No --prod. This file is not an apply path.
--
-- Project: nnhkcufyqjojdbvdrpky
-- Prerequisites: PP-05b + PP-05c already live.
-- Out of scope: Phase B / C / D, body-bind CREATE OR REPLACE, and the
-- #263 / 140000 naturopath-guard migrations (those stay HOLD; this file
-- does not edit them).
--
-- Restores the EXECUTE intent of the original migrations. Default
-- privileges had already granted anon and authenticated directly, so
-- REVOKE FROM PUBLIC plus GRANT service_role left those direct grants
-- in place. REVOKE here is idempotent. No function bodies change.
--
-- Signatures checked against in-repo CREATE FUNCTION history (one
-- overload each; argument lists unchanged):
--   public.vault_read(text)                         20260424001200
--   public.store_scheduler_token(jsonb, text)       20260424010100
--   public.read_scheduler_token(text, text)         20260424010100
--   public.delete_scheduler_token(text)             20260424010100
--   public.invoke_ops_tick()                        20260816120000
--   public.invoke_viaconnect_bearer_cron(text)      20260821270000
--
-- Deliberately omitted (separate follow-up DRAFT, B* body-binds and
-- their REVOKEs): helix_increment_balance, helix_create_redemption,
-- helix_redeem_catalog_item, fn_claim_free_body_scan_teaser,
-- get_latest_completed_caq, get_active_peptide_stack, get_active_protocol,
-- reconcile_body_composition, increment_user_off_lookup,
-- caq_compute_user_hash.
--
-- Bare statements, no BEGIN/COMMIT, matching sibling migrations.
-- Repo convention does not ship a GRANT-back-anon rollback script.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A1. vault_read — 20260424001200 intended service_role only
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.vault_read(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vault_read(text) FROM anon;
REVOKE ALL ON FUNCTION public.vault_read(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vault_read(text) TO service_role;

-- -----------------------------------------------------------------------------
-- A2. scheduler token vault RPCs — 20260424010100 intended service_role only
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.store_scheduler_token(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_scheduler_token(jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.store_scheduler_token(jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.store_scheduler_token(jsonb, text) TO service_role;

REVOKE ALL ON FUNCTION public.read_scheduler_token(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_scheduler_token(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.read_scheduler_token(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.read_scheduler_token(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.delete_scheduler_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_scheduler_token(text) FROM anon;
REVOKE ALL ON FUNCTION public.delete_scheduler_token(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_scheduler_token(text) TO service_role;

-- -----------------------------------------------------------------------------
-- A3. invoke_* — intended postgres + service_role (pg_cron runs as postgres)
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.invoke_ops_tick() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_ops_tick() FROM anon;
REVOKE ALL ON FUNCTION public.invoke_ops_tick() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_ops_tick() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_ops_tick() TO service_role;

REVOKE ALL ON FUNCTION public.invoke_viaconnect_bearer_cron(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_viaconnect_bearer_cron(text) FROM anon;
REVOKE ALL ON FUNCTION public.invoke_viaconnect_bearer_cron(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_viaconnect_bearer_cron(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_viaconnect_bearer_cron(text) TO service_role;

-- -----------------------------------------------------------------------------
-- Post-apply check only. Commented so this migration does not execute it.
-- Expect anon_x = false and auth_x = false. postgres_x and svc_x true on
-- the two invoke_* functions; svc_x true and postgres_x irrelevant on the
-- vault and scheduler functions (those stay service_role only).
-- Do not select member or PHI rows.
--
-- SELECT p.proname,
--        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_x,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_x,
--        has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc_x,
--        has_function_privilege('postgres', p.oid, 'EXECUTE') AS postgres_x
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'vault_read',
--     'store_scheduler_token',
--     'read_scheduler_token',
--     'delete_scheduler_token',
--     'invoke_ops_tick',
--     'invoke_viaconnect_bearer_cron'
--   )
-- ORDER BY 1;
-- -----------------------------------------------------------------------------
