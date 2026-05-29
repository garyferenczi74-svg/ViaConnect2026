-- =============================================================================
-- Prompt #169a: Body Scan Premium Gating (spec sections 3 + 10) -- backend
-- Migration: 20260516000050_prompt_169a_body_scan_premium_gating.sql
-- Profile table: profiles (confirmed via src/lib/supabase/types.ts; PK id uuid)
-- Per-scan table: body_photo_sessions (20260416000090 + 20260416000100)
-- Append-only: no DROP, no ALTER on existing columns, no editing prior files.
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION + guarded
-- DO $$ ... $$ blocks consistent with 20260516000010.
-- Sorts AFTER 20260516000040 and BELOW the live #170 range (20260516120010+).
-- =============================================================================


-- =============================================================================
-- 1. profiles: one-time free body scan teaser tracking
--    free_body_scan_used flips to true the first (and only) time a non-premium
--    consumer claims the free teaser; free_body_scan_used_at records when.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_body_scan_used    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_body_scan_used_at TIMESTAMPTZ;


-- =============================================================================
-- 2. body_photo_sessions: premium status captured at scan finalize time
--    premium_status_at_scan records which of the three entitlement paths the
--    scan was finalized under; premium_subscription_id records the backing
--    Stripe subscription id when the scan was finalized as 'premium'.
-- =============================================================================

ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS premium_status_at_scan TEXT
    CHECK (premium_status_at_scan IN ('free_teaser', 'premium', 'practitioner_managed')),
  ADD COLUMN IF NOT EXISTS premium_subscription_id TEXT;


-- =============================================================================
-- 3. fn_claim_free_body_scan_teaser(p_user_id uuid) RETURNS boolean
--    Atomically claims the one-time free body scan teaser for a user. The
--    conditional UPDATE (... WHERE free_body_scan_used = false) guarantees that
--    exactly one concurrent caller can flip the flag: the first claim returns
--    true, every subsequent claim returns false. SECURITY DEFINER so it can
--    write profiles regardless of the caller's RLS context; search_path pinned
--    to public to avoid search_path injection.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_claim_free_body_scan_teaser(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed boolean;
BEGIN
  UPDATE profiles
     SET free_body_scan_used    = true,
         free_body_scan_used_at = now()
   WHERE id = p_user_id
     AND free_body_scan_used = false
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$$;

-- Lock down execution: not callable by anonymous; callable by authenticated.
REVOKE ALL ON FUNCTION fn_claim_free_body_scan_teaser(uuid) FROM public;
GRANT EXECUTE ON FUNCTION fn_claim_free_body_scan_teaser(uuid) TO authenticated;
