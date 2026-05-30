-- =============================================================================
-- Prompt #169b (Task 22): body_photo_sessions FINALIZE ENFORCEMENT
-- Migration: 20260516000080_body_scan_finalize_enforcement.sql
--
-- WHY THIS EXISTS (the real security gap this closes):
--   The PRIMARY scan path is src/lib/arnold/scanning/runScanAnalysis.ts. It runs
--   the whole pipeline CLIENT-SIDE and writes scan_status = 'complete' directly
--   to body_photo_sessions via the browser Supabase client. It NEVER calls the
--   body-scan-analyze edge function, so the age gate, the 24h frequency limit,
--   and the premium entitlement claim that live in that edge function (and in
--   entitlement.ts) NEVER run on this path. A consumer could therefore finalize
--   unlimited scans, as a minor, with no premium, simply by using the normal
--   "Run AI scan" button.
--
--   This migration moves the three gates to the DATABASE so they are
--   NON-BYPASSABLE regardless of which code path (direct client UPDATE, edge
--   function, or any future writer) sets scan_status = 'complete'. RLS already
--   guarantees a user can only write their OWN body_photo_sessions row
--   (auth.uid() = user_id), so the subject of enforcement is always NEW.user_id.
--
-- WHAT IT DOES:
--   A SECURITY DEFINER trigger function that fires ONLY on the transition of
--   scan_status TO 'complete' (BEFORE UPDATE guarded by a WHEN clause, plus
--   BEFORE INSERT when a row is created already-complete). On a blocked
--   condition it RAISEs an exception with a STABLE, DISTINGUISHABLE message
--   prefix the client maps to a user-facing message:
--       'age_restricted: ...'    (cannot confirm 18+, or proven minor)
--       'scan_rate_limited: ...'  (another completed scan within 24h)
--       'premium_required: ...'   (free teaser already used, no premium)
--   A BEFORE trigger RAISE aborts the write, so the existing AFTER trigger
--   trg_emit_helix_body_scan_event (20260516000010) never fires for a blocked
--   row, and no Helix event / no 'complete' state is persisted.
--
-- RELATIONSHIP TO THE EDGE PATH (double-claim reconciliation):
--   The edge path (body-scan-analyze) ALREADY runs the same three gates in
--   application code BEFORE it sets scan_status = 'complete', and it sets
--   premium_status_at_scan as part of the SAME update. We must NOT double-claim
--   the one-time free teaser when the edge path already claimed it. The
--   reconciliation: the ENTITLEMENT claim in this trigger is gated on
--       NEW.premium_status_at_scan IS NULL
--   which is true ONLY for the direct runScanAnalysis path (it never sets that
--   column). When premium_status_at_scan is already non-NULL, an upstream gate
--   (the edge function) has already resolved entitlement, so we TRUST it and do
--   NOT re-claim. AGE and FREQUENCY are always enforced regardless of path: they
--   have no side effect, so re-enforcing on the edge path is harmless (and the
--   edge path passed them moments earlier, so they will pass again here).
--
-- FAIL DIRECTION (intentional difference from the app-layer gates):
--   The age gate here fails CLOSED on a missing DOB (NULL date_of_birth ->
--   age_restricted), because at the DB layer this is the last line of defense
--   and "cannot confirm 18+" must not finalize a scan. NOTE this is STRICTER
--   than the app-layer gate (src/lib/body-tracker/age-frequency-gate.ts +
--   entitlement.ts), which treats an unknown DOB as NOT-a-proven-minor and lets
--   it through (so a transient profiles read miss never hard-blocks an adult).
--   The app layer steers a no-DOB user to complete their CAQ before a scan is
--   ever attempted, so by the time a finalize reaches this trigger the DOB
--   should be present; if it is genuinely absent, refusing to finalize is the
--   correct conservative outcome. The frequency limiter here ALSO fails closed
--   structurally (an EXISTS within-window check), but that simply mirrors the
--   spec: at most one completed scan per 24h.
--
-- 24h TIMESTAMP COLUMN (confirmed):
--   body_photo_sessions has NO dedicated scan-moment timestamptz. session_date
--   is DATE-only (no time component) and is therefore unusable for a time-of-day
--   24h window. The usable columns are created_at and updated_at (both
--   TIMESTAMPTZ NOT NULL DEFAULT now(), from 20260416000090). updated_at is
--   stamped to now() on EVERY update by trg_body_photo_sessions_updated_at, so a
--   row that transitions to 'complete' has updated_at ~= completion time; a row
--   inserted already-complete has created_at ~= completion time. The frequency
--   check therefore compares OTHER rows' COALESCE(updated_at, created_at) against
--   now(), which avoids any dependency on BEFORE-trigger firing order for the
--   subject's own NEW row.
--
-- PRACTITIONER OVERRIDE (supervised clinical context):
--   When NEW carries a non-blank clinical_override_reason AND a practitioner_id
--   that is in an ACTIVE practitioner_patients relationship with NEW.user_id, the
--   scan is a supervised clinical scan: stamp premium_status_at_scan =
--   'practitioner_managed' and SKIP age, frequency, and entitlement. This mirrors
--   the edge function's verifyPractitionerManaged + clinical_override_reason
--   semantics. A consumer cannot self-grant it: a self-scan has no active
--   practitioner_patients row, and RLS prevents writing another user's row.
--
-- APPEND-ONLY: no DROP, no ALTER on existing columns, no editing prior files.
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION + guarded DO $$ trigger creation.
-- search_path pinned to public, pg_temp (codebase convention, Section 16.1).
-- Sorts AFTER 20260516000070 and BELOW the live #170 range (20260516120010+).
-- =============================================================================


-- =============================================================================
-- 1. Enforcement function. SECURITY DEFINER so the membership / profiles /
--    practitioner_patients reads and the teaser claim are not constrained by the
--    invoking user's RLS context. Subject of enforcement is NEW.user_id.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_enforce_body_scan_finalize()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_override   boolean := false;
  v_dob        date;
  v_age_years  integer;
  v_is_premium boolean := false;
  v_claimed    boolean;
BEGIN
  -- ===========================================================================
  -- 1. PRACTITIONER OVERRIDE (supervised clinical context).
  --    Valid only when a non-blank clinical_override_reason AND a practitioner_id
  --    are present on NEW and an ACTIVE practitioner_patients relationship exists
  --    between that practitioner and the scan subject (NEW.user_id). When valid,
  --    stamp 'practitioner_managed' and SKIP all three consumer gates.
  -- ===========================================================================
  v_override := (
    NEW.clinical_override_reason IS NOT NULL
    AND btrim(NEW.clinical_override_reason) <> ''
    AND NEW.practitioner_id IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM practitioner_patients pp
       WHERE pp.practitioner_id = NEW.practitioner_id
         AND pp.patient_id      = NEW.user_id
         AND pp.status          = 'active'
    )
  );

  IF v_override THEN
    NEW.premium_status_at_scan := 'practitioner_managed';
    RETURN NEW;  -- supervised clinical scan: bypass age, frequency, entitlement.
  END IF;

  -- ===========================================================================
  -- 2. AGE GATE (fail CLOSED). Read the subject's DOB from profiles. A NULL DOB
  --    means we cannot confirm 18+, which at the DB layer must NOT finalize.
  --    Whole-years via age()/EXTRACT avoids the client-side timezone off-by-one.
  -- ===========================================================================
  SELECT p.date_of_birth INTO v_dob
    FROM profiles p
   WHERE p.id = NEW.user_id;

  IF v_dob IS NULL THEN
    RAISE EXCEPTION 'age_restricted: date of birth is required to confirm Body Scan eligibility (18+).';
  END IF;

  v_age_years := EXTRACT(YEAR FROM age(v_dob))::int;
  IF v_age_years < 18 THEN
    RAISE EXCEPTION 'age_restricted: Body Scan is available to members who are 18 or older.';
  END IF;

  -- ===========================================================================
  -- 3. FREQUENCY (at most one completed scan per 24h per subject). Look for any
  --    OTHER completed row for this user whose completion timestamp
  --    (COALESCE(updated_at, created_at)) is within the last 24h. Comparing
  --    other already-committed rows against now() avoids any dependency on the
  --    firing order of this BEFORE trigger vs trg_body_photo_sessions_updated_at.
  -- ===========================================================================
  IF EXISTS (
    SELECT 1
      FROM body_photo_sessions s
     WHERE s.user_id     = NEW.user_id
       AND s.id          <> NEW.id
       AND s.scan_status = 'complete'
       AND COALESCE(s.updated_at, s.created_at) > (now() - interval '24 hours')
  ) THEN
    RAISE EXCEPTION 'scan_rate_limited: a Body Scan was already completed within the last 24 hours.';
  END IF;

  -- ===========================================================================
  -- 4. ENTITLEMENT (with double-claim reconciliation).
  --    Only the DIRECT runScanAnalysis path leaves premium_status_at_scan NULL.
  --    The edge path already resolved + stamped it, so when it is non-NULL we
  --    TRUST it and do NOT re-claim (prevents double-burning the free teaser).
  --
  --    When NULL (direct path):
  --      * active premium membership            -> stamp 'premium'
  --      * else claim the one-time free teaser   -> stamp 'free_teaser'
  --      * teaser already used                   -> RAISE 'premium_required'
  --
  --    Premium predicate replicates membership-manager.ts / entitlement.ts:
  --    an active membership (status in active/trialing/gift_active) whose
  --    effective tier (COALESCE(tier_id, tier, 'free')) is above 'free'.
  -- ===========================================================================
  IF NEW.premium_status_at_scan IS NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM memberships m
       WHERE m.user_id = NEW.user_id
         AND m.status IN ('active', 'trialing', 'gift_active')
         AND COALESCE(m.tier_id, m.tier, 'free') <> 'free'
    ) INTO v_is_premium;

    IF v_is_premium THEN
      NEW.premium_status_at_scan := 'premium';
    ELSE
      v_claimed := fn_claim_free_body_scan_teaser(NEW.user_id);
      IF v_claimed THEN
        NEW.premium_status_at_scan := 'free_teaser';
      ELSE
        RAISE EXCEPTION 'premium_required: your free Body Scan has already been used; a premium membership is required for additional scans.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Restrict execution surface (defensive; trigger functions are invoked by the
-- engine on the table owner's behalf, not called directly by clients).
REVOKE ALL ON FUNCTION fn_enforce_body_scan_finalize() FROM public;


-- =============================================================================
-- 2. Triggers. BEFORE the existing updated_at + AFTER helix triggers, so a RAISE
--    aborts the write before any 'complete' state or Helix event is persisted.
--
--    The WHEN clause guarantees the function runs ONLY on the transition TO
--    'complete' (UPDATE: OLD was NOT complete and NEW is; INSERT: NEW is). A
--    no-op update that keeps scan_status = 'complete' does NOT re-fire, keeping
--    the function idempotent and side-effect-safe (a second fire would otherwise
--    try to re-claim the teaser).
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_body_scan_finalize_update'
  ) THEN
    CREATE TRIGGER trg_enforce_body_scan_finalize_update
      BEFORE UPDATE ON body_photo_sessions
      FOR EACH ROW
      WHEN (
        OLD.scan_status IS DISTINCT FROM 'complete'
        AND NEW.scan_status = 'complete'
      )
      EXECUTE FUNCTION fn_enforce_body_scan_finalize();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_body_scan_finalize_insert'
  ) THEN
    CREATE TRIGGER trg_enforce_body_scan_finalize_insert
      BEFORE INSERT ON body_photo_sessions
      FOR EACH ROW
      WHEN (NEW.scan_status = 'complete')
      EXECUTE FUNCTION fn_enforce_body_scan_finalize();
  END IF;
END $$;
