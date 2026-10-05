-- =============================================================================
-- PP-05d Phase A2 body-binds (B1-B9 only). DRAFT / NOT APPLIED.
-- Soft GO Jeffery 2026-10-05 (via Michelangelo): Stay DRAFT follow-up.
-- In-place revision of this unapplied file (still DRAFT, not applied):
--   * caq_compute_user_hash and helix_increment_balance KEEP authenticated
--     EXECUTE. REVOKE PUBLIC and anon only. Arnold Soft HOLD on #275.
--   * Role gate reads auth.role(), matching bos_compute_v2.
-- Sibling: Phase A stopgap A1-A3 is draft PR #274
--   (20261005160000_pp_05d_phase_a_stopgap_execute_revokes.sql).
-- This file sorts after that stamp. It does not repeat A1-A3.
-- Do not apply until Arnold branch smoke, a Jeffery Soft GO, and a
-- Gary Soft GO. Apply order is 20261005160000, then this file.
-- No --prod. This file is not an apply path. Not added to applied-manifest.
--
-- Project: nnhkcufyqjojdbvdrpky
-- Prerequisites: PP-05b + PP-05c already live. Prefer #274 applied on live
-- before this file, when a later Soft GO says to apply.
-- Out of scope: Phase A stopgap, Phase B / C / D, and the #263 / 140000
-- naturopath-guard migrations (those stay HOLD; this file does not edit them).
--
-- Bare statements, no BEGIN/COMMIT, matching sibling migrations. The
-- migration runner wraps the file in one transaction, so the anon EXECUTE
-- assertion at the bottom sees the REVOKEs above it.
-- Repo convention does not ship a GRANT-back-anon rollback script.
--
-- Signatures checked against in-repo CREATE FUNCTION history (one overload
-- each). Argument types are unchanged. Two fidelity fixes vs the attached
-- draft, both required by that history / the integrity snapshot:
--   * helix_create_redemption keeps p_order_id DEFAULT NULL
--     (20260418000050).
--   * helix_redeem_catalog_item keeps p_application_context
--     DEFAULT '{}'::jsonb (20260418000070).
--   * get_latest_completed_caq OUT column is assessment_id, not id.
--     docs/integrity/snapshot/db-functions.json, src/lib/supabase/types.ts,
--     and src/lib/caq/fetchPreviousCAQ.ts. Table column is caq_assessment_versions.id
--     (types.ts Row). SELECT aliases cav.id AS assessment_id. No other OUT
--     column was added or reordered.
--
--   public.helix_increment_balance(uuid, integer) returns void
--       20260418000050. REVOKE/GRANT only. No body change.
--       KEEP authenticated. finalizeShopOrder passes the cookie session
--       client. A later draft PR may move that call to the service client.
--   public.helix_create_redemption(uuid, integer, text, text, uuid) returns uuid
--       20260418000050. Body bind. Keep authenticated.
--   public.helix_redeem_catalog_item(uuid, text, jsonb) returns uuid
--       20260418000070. Body bind. Keep authenticated.
--   public.fn_claim_free_body_scan_teaser(uuid) returns boolean
--       No CREATE FUNCTION in migrations. Args and return match
--       db-functions.json and types.ts (p_user_id uuid -> boolean).
--       Body is the attached draft. Keep authenticated.
--   public.get_latest_completed_caq(uuid) returns the snapshot TABLE
--       No CREATE FUNCTION in migrations. Arg name target_user_id matches
--       db-functions.json, types.ts, and fetchPreviousCAQ. PHI bind.
--       Keep authenticated.
--   public.get_active_peptide_stack(uuid)
--   public.get_active_protocol(uuid)
--       Migrations 20260404_peptide_stack_tables.sql and
--       20260404_ultrathink_protocol_tables.sql name the RPCs and do not
--       contain CREATE FUNCTION or the SELECT body. OUT columns are in
--       db-functions.json (p_user_id uuid). This file does not invent a
--       body. REVOKE PUBLIC and anon only; authenticated stays, so an
--       authenticated caller can still pass another user id until a
--       later REPLACE copies pg_get_functiondef and inserts the gate.
--   public.reconcile_body_composition(uuid, date[]) returns integer
--       20260616000010. REVOKE/GRANT only. service_role only.
--       No RLS, view, trigger, or other function-body dependency.
--   public.increment_user_off_lookup(uuid, date, timestamptz) returns int
--       20260530143030. REVOKE/GRANT only. service_role only.
--       No RLS, view, trigger, or other function-body dependency.
--   public.caq_compute_user_hash(uuid) returns text
--       20260605010002. REVOKE/GRANT only. No body change.
--       KEEP authenticated. REVOKE PUBLIC and anon only.
--       20260609000010 and 20260621045202 call
--       caq_compute_user_hash(auth.uid()) from 28 RLS policies on 7
--       tables, and from user_hash defaults on hydration_log_sessions
--       and user_beverages. Policies and defaults run as the session
--       role and need EXECUTE. This file does not rewrite them.
--
-- Role gate in the CREATE OR REPLACE bodies uses auth.role(), the same
-- helper as 20260512020236_bos_compute_v2 (compute_bio_optimization_score
-- and claim_bos_compute_batch). auth.role() reads
-- request.jwt.claim.role, else request.jwt.claims ->> 'role'. PostgREST
-- sets those GUCs on every request, and SECURITY DEFINER's user-id
-- switch does not clear them. current_setting('role', true) is the
-- SET ROLE GUC. PostgreSQL documents its default as none when SET ROLE
-- has not run, and that GUC is not the JWT role. A service_role JWT has
-- no sub, so a missed role check raises caller_mismatch (42501) when
-- the caller passes another user's id (gordon-generate-targets, shop
-- webhook). Smoke must show service_role callers that pass a user id
-- still succeed, and authenticated callers that pass a different id fail
-- with caller_mismatch (42501).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- B1. helix_increment_balance - REVOKE PUBLIC and anon. KEEP authenticated
--     and service_role. No body change. No auth.uid() bind.
--
--     finalizeShopOrder (src/lib/shop/checkout-actions.ts) builds the
--     cookie session client from src/lib/supabase/server.ts (anon key +
--     user JWT, role authenticated) and passes that client to
--     finalizeOrderForSession. That helper calls this RPC for the Helix
--     burn, then creditEarning() calls it again for the earn, both on
--     the same client. Revoking authenticated EXECUTE returns 42501 on
--     that success-page path.
--     The Stripe webhook (src/app/api/shop/webhook/route.ts) and
--     reverseHelixForOrder use createAdminClient() (service_role).
--     Hydration quick-log creditEarning also uses the admin client.
--     trackReferralSignup / trackReferralPurchase take a caller-supplied
--     client and have no in-repo caller.
--     Moving the success-page call onto the service client is a later
--     draft PR. Until that lands, authenticated EXECUTE stays.
--     Not referenced by RLS policies, views, triggers, or other function
--     bodies in migrations or the integrity snapshot.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.helix_increment_balance(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.helix_increment_balance(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.helix_increment_balance(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helix_increment_balance(uuid, integer) TO service_role;

-- -----------------------------------------------------------------------------
-- B2. helix_create_redemption - bind auth.uid(); keep authenticated.
--     No live .rpc caller found. Body bind closes a spoofed p_user_id.
--     p_order_id DEFAULT NULL is the 20260418000050 signature.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.helix_create_redemption(
  p_user_id uuid,
  p_tokens_spent integer,
  p_reward_type text,
  p_reward_description text,
  p_order_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_redemption_id UUID;
  v_uid UUID := auth.uid();
  v_role TEXT := auth.role();
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'caller_mismatch' USING ERRCODE = '42501';
    END IF;
  ELSIF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.helix_balances
     SET current_balance = current_balance - p_tokens_spent,
         lifetime_redeemed = lifetime_redeemed + p_tokens_spent,
         updated_at = NOW()
   WHERE user_id = p_user_id AND current_balance >= p_tokens_spent;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient Helix balance'; END IF;

  INSERT INTO public.helix_redemptions (
    user_id, reward_type, reward_description, tokens_spent, order_id, status, created_at
  ) VALUES (
    p_user_id, p_reward_type, p_reward_description, p_tokens_spent, p_order_id, 'active', NOW()
  ) RETURNING id INTO v_redemption_id;

  INSERT INTO public.helix_transactions (
    user_id, type, amount, source, related_entity_id, balance_after, created_at
  )
  SELECT p_user_id, 'redemption', -p_tokens_spent, 'redemption', v_redemption_id, current_balance, NOW()
    FROM public.helix_balances WHERE user_id = p_user_id;

  RETURN v_redemption_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.helix_create_redemption(uuid, integer, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.helix_create_redemption(uuid, integer, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.helix_create_redemption(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helix_create_redemption(uuid, integer, text, text, uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- B3. helix_redeem_catalog_item - KEEP authenticated (api/helix/redeem
--     user session). Bind p_user_id to auth.uid() unless service_role.
--     p_application_context default is the 20260418000070 signature.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.helix_redeem_catalog_item(
  p_user_id uuid,
  p_catalog_item_id text,
  p_application_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_item public.helix_redemption_catalog;
  v_redemption_id UUID;
  v_redemption_count INTEGER;
  v_balance_after INTEGER;
  v_uid UUID := auth.uid();
  v_role TEXT := auth.role();
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'caller_mismatch' USING ERRCODE = '42501';
    END IF;
  ELSIF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_item FROM public.helix_redemption_catalog WHERE id = p_catalog_item_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Redemption item not available'; END IF;

  IF v_item.valid_from IS NOT NULL AND v_item.valid_from > NOW() THEN RAISE EXCEPTION 'Redemption not yet available'; END IF;
  IF v_item.valid_until IS NOT NULL AND v_item.valid_until < NOW() THEN RAISE EXCEPTION 'Redemption expired'; END IF;

  IF v_item.stock_limit IS NOT NULL AND (v_item.stock_remaining IS NULL OR v_item.stock_remaining <= 0) THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  IF v_item.redemption_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_redemption_count
      FROM public.helix_redemptions
      WHERE user_id = p_user_id AND catalog_item_id = p_catalog_item_id;
    IF v_redemption_count >= v_item.redemption_limit_per_user THEN
      RAISE EXCEPTION 'Redemption limit reached for this item';
    END IF;
  END IF;

  IF v_item.redemption_type = 'supplement_discount' AND COALESCE(v_item.discount_percent, 0) > 15 THEN
    RAISE EXCEPTION 'Supplement discount redemption exceeds 15 percent cap';
  END IF;

  UPDATE public.helix_balances
    SET current_balance = current_balance - v_item.points_cost,
        lifetime_redeemed = lifetime_redeemed + v_item.points_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id AND current_balance >= v_item.points_cost
    RETURNING current_balance INTO v_balance_after;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient Helix balance'; END IF;

  INSERT INTO public.helix_redemptions (
    user_id, reward_type, reward_description, tokens_spent, status,
    catalog_item_id, application_context, created_at
  ) VALUES (
    p_user_id, v_item.redemption_type, v_item.display_name, v_item.points_cost, 'active',
    v_item.id, p_application_context, NOW()
  ) RETURNING id INTO v_redemption_id;

  INSERT INTO public.helix_transactions (user_id, type, amount, source, description, balance_after, related_entity_id, created_at)
    VALUES (p_user_id, 'redemption', -v_item.points_cost, 'redemption', v_item.display_name, v_balance_after, v_redemption_id, NOW());

  IF v_item.stock_limit IS NOT NULL AND v_item.stock_remaining IS NOT NULL THEN
    UPDATE public.helix_redemption_catalog
      SET stock_remaining = stock_remaining - 1
      WHERE id = v_item.id AND stock_remaining > 0;
  END IF;

  RETURN v_redemption_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.helix_redeem_catalog_item(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.helix_redeem_catalog_item(uuid, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.helix_redeem_catalog_item(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helix_redeem_catalog_item(uuid, text, jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- B4. fn_claim_free_body_scan_teaser - bind auth.uid(). Keep authenticated.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_claim_free_body_scan_teaser(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_claimed boolean;
  v_uid UUID := auth.uid();
  v_role TEXT := auth.role();
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'caller_mismatch' USING ERRCODE = '42501';
    END IF;
  ELSIF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required' USING ERRCODE = '22023';
  END IF;

  UPDATE profiles
     SET free_body_scan_used    = true,
         free_body_scan_used_at = now()
   WHERE id = p_user_id
     AND free_body_scan_used = false
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_claim_free_body_scan_teaser(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_claim_free_body_scan_teaser(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_claim_free_body_scan_teaser(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_claim_free_body_scan_teaser(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- B5. get_latest_completed_caq - PHI bind. Keep authenticated.
--     OUT column assessment_id matches the snapshot signature. Callers:
--     browser fetchPreviousCAQ (target_user_id) and edge
--     gordon-generate-targets (service client, target_user_id).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_latest_completed_caq(target_user_id uuid)
RETURNS TABLE (
  assessment_id uuid,
  version_number integer,
  demographics jsonb,
  health_concerns jsonb,
  physical_symptoms jsonb,
  neuro_symptoms jsonb,
  emotional_symptoms jsonb,
  medications jsonb,
  supplements jsonb,
  allergies jsonb,
  lifestyle jsonb,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := auth.role();
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF target_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'caller_mismatch' USING ERRCODE = '42501';
    END IF;
  ELSIF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id required' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT cav.id AS assessment_id, cav.version_number, cav.demographics, cav.health_concerns,
    cav.physical_symptoms, cav.neuro_symptoms, cav.emotional_symptoms,
    cav.medications, cav.supplements, cav.allergies, cav.lifestyle, cav.completed_at
  FROM caq_assessment_versions cav
  WHERE cav.user_id = target_user_id AND cav.status = 'completed'
  ORDER BY cav.completed_at DESC LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_latest_completed_caq(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_latest_completed_caq(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_latest_completed_caq(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_completed_caq(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- B6. get_active_peptide_stack / get_active_protocol - clinical data.
--     REVOKE PUBLIC and anon. Keep authenticated and service_role.
--     Body bind is not in this file. The SELECT bodies are not in CREATE
--     FUNCTION history, and this migration does not invent them.
--     Authenticated spoof of p_user_id remains until a follow-up REPLACE
--     copies pg_get_functiondef and inserts this gate at the top.
--     Use auth.role(), not current_setting('role', true):
--       IF auth.role() IS DISTINCT FROM 'service_role' THEN
--         IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
--           RAISE EXCEPTION 'caller_mismatch' USING ERRCODE = '42501';
--         END IF;
--       END IF;
--     This file does not invent the SELECT bodies.
--     Snapshot OUT columns to preserve on that REPLACE (do not reorder):
--       get_active_peptide_stack(p_user_id uuid) returns TABLE(
--         protocol_id uuid, stack_narrative text, patterns_detected text[],
--         confidence_tier integer, confidence_pct integer,
--         total_peptides integer, generated_at timestamptz,
--         patterns jsonb, recommendations jsonb)
--       get_active_protocol(p_user_id uuid) returns TABLE(
--         protocol_id uuid, version integer, confidence_tier integer,
--         confidence_pct integer, data_sources_used text[],
--         total_recommendations integer, high_priority_count integer,
--         medium_priority_count integer, low_priority_count integer,
--         protocol_rationale text, bio_score_impact jsonb,
--         generated_at timestamptz, recommendations jsonb)
--     Caller that must keep authenticated: api/ultrathink/recommend
--     passes session user.id to get_active_protocol.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_active_peptide_stack(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_peptide_stack(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_active_peptide_stack(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_peptide_stack(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_active_protocol(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_protocol(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_active_protocol(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_protocol(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- B7. reconcile_body_composition - edge ingest uses admin. service_role only.
--     Signature (uuid, date[]) from 20260616000010. No body change.
--     No policy in policies.json, no view in views.json, and no migration
--     trigger or function body calls it. Sole caller:
--     supabase/functions/ingest-body-composition admin.rpc.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.reconcile_body_composition(uuid, date[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_body_composition(uuid, date[]) FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_body_composition(uuid, date[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_body_composition(uuid, date[]) TO service_role;

-- -----------------------------------------------------------------------------
-- B8. increment_user_off_lookup - createAdminClient only.
--     Signature (uuid, date, timestamptz) from 20260530143030. No body change.
--     No policy, view, trigger, or other function body calls it.
--     Sole caller: src/lib/nutrition/barcode/rate-limit.ts
--     (createAdminClient).
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.increment_user_off_lookup(uuid, date, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_user_off_lookup(uuid, date, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.increment_user_off_lookup(uuid, date, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_off_lookup(uuid, date, timestamptz) TO service_role;

-- -----------------------------------------------------------------------------
-- B9. caq_compute_user_hash - REVOKE PUBLIC and anon. KEEP authenticated
--     and service_role. Signature (uuid) returns text from 20260605010002.
--     No body change. Policies are not rewritten.
--
--     Live snapshot policies.json: 28 policies on hydration_log_sessions,
--     quick_log_sessions, user_beverages, user_meal_corpus,
--     voice_edit_operations_log, voice_edit_sessions, and
--     voice_native_sessions call caq_compute_user_hash(auth.uid()) in
--     USING / WITH CHECK. Those expressions run as the session role.
--     Column defaults on hydration_log_sessions (20260609000010) and
--     user_beverages (20260621045202) call it the same way on INSERT.
--     barcode-capture uses the admin client and keeps working via
--     service_role. REVOKE FROM authenticated would 42501 the signed-in
--     reads and the defaults. Arnold Soft HOLD on #275.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.caq_compute_user_hash(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caq_compute_user_hash(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.caq_compute_user_hash(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caq_compute_user_hash(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- B*-only assertions. Phase A stopgap functions are not in these lists.
-- 1. anon must not have EXECUTE on any function in this file.
-- 2. authenticated must keep EXECUTE on the session-role and body-bind
--    functions (including caq_compute_user_hash and helix_increment_balance).
-- 3. authenticated must not have EXECUTE on reconcile_body_composition
--    or increment_user_off_lookup (no RLS / view / trigger / invoker-function
--    dependency; callers are service_role).
-- has_function_privilege is true for PUBLIC as well as a direct grant, so
-- these checks run after the REVOKEs above, in the same transaction.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'helix_increment_balance',
      'helix_create_redemption',
      'helix_redeem_catalog_item',
      'fn_claim_free_body_scan_teaser',
      'get_latest_completed_caq',
      'get_active_peptide_stack',
      'get_active_protocol',
      'reconcile_body_composition',
      'increment_user_off_lookup',
      'caq_compute_user_hash'
    )
    AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'PP-05d Phase A2 assertion failed: anon still has EXECUTE on: %', bad;
  END IF;
END $$;

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO missing
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'helix_increment_balance',
      'helix_create_redemption',
      'helix_redeem_catalog_item',
      'fn_claim_free_body_scan_teaser',
      'get_latest_completed_caq',
      'get_active_peptide_stack',
      'get_active_protocol',
      'caq_compute_user_hash'
    )
    AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'PP-05d Phase A2 assertion failed: authenticated lost EXECUTE on: %', missing;
  END IF;
END $$;

DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'reconcile_body_composition',
      'increment_user_off_lookup'
    )
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'PP-05d Phase A2 assertion failed: authenticated still has EXECUTE on: %', bad;
  END IF;
END $$;
