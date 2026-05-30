-- =============================================================================
-- APPLY AT LAUNCH ONLY, after the consent flow is live and counsel has approved
-- the consent copy; applying this before then blocks all scans.
-- =============================================================================
-- Prompt #169b (Task 16): Body Scan finalize CONSENT enforcement (DEFERRED).
-- Migration: 20260516000100_body_scan_consent_enforcement.sql
--
-- WHAT THIS WOULD DO (when applied):
--   Adds a fourth gate to the body_photo_sessions finalize enforcement (on top
--   of the age + frequency + entitlement gates in migration 20260516000080):
--   a scan may not transition to scan_status = 'complete' unless the scan
--   subject has a CURRENT biometric_consents record (a row whose consent_version
--   equals the consent version in force). This makes biometric consent
--   NON-BYPASSABLE at the database layer, exactly like the other three gates.
--
-- WHY IT IS INERT (NOT wired) RIGHT NOW:
--   The consent flow (BodyScanConsentScreen + useBiometricConsent) is not yet
--   live, and the consent COPY is counsel-gated and not finalized. EVERY
--   existing scan was finalized WITHOUT a consent row. If the consent gate were
--   added to the live finalize trigger today, it would immediately block ALL
--   scans (no user has a consent row yet), breaking the entire feature for
--   everyone. Therefore this migration defines the consent-aware function and
--   the SQL needed to swap the triggers onto it, but it does NOT create or
--   replace any trigger. Until a human uncovers the APPLY block at the bottom,
--   the live triggers continue to point at fn_enforce_body_scan_finalize
--   (the consent-free version from 20260516000080) and nothing changes.
--
-- HOW TO APPLY AT LAUNCH (human, gated):
--   1. Confirm the consent flow is live and writing biometric_consents rows.
--   2. Confirm counsel has approved the consent copy and CURRENT_CONSENT_VERSION
--      in src/lib/body-tracker/biometric-consent.ts matches the value below.
--   3. Backfill consent for any users who must keep scanning, OR accept that
--      they will be re-prompted to consent before their next scan.
--   4. Uncomment the "APPLY BLOCK" at the bottom and run it (it repoints the two
--      finalize triggers onto fn_enforce_body_scan_finalize_with_consent).
--
-- CONSENT VERSION (keep in sync with the app):
--   The version checked here MUST equal src/lib/body-tracker/biometric-consent.ts
--   CURRENT_CONSENT_VERSION. If you bump one, bump the other in the same change.
--   Current value at authoring: '2026-05-169b.1'.
--
-- APPEND-ONLY: no DROP, no ALTER on existing columns, no editing of prior files.
--   It does NOT modify fn_enforce_body_scan_finalize or its triggers.
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION only; the (commented) apply block is
--   itself guarded so re-running it is safe.
-- search_path pinned to public, pg_temp (codebase convention, Section 16.1).
-- Sorts AFTER 20260516000090 and BELOW the live #170 range (20260516120010+).
-- =============================================================================


-- =============================================================================
-- 1. The consent-aware finalize enforcement function (DEFINED, NOT WIRED).
--
--    This is a SUPERSET of fn_enforce_body_scan_finalize (20260516000080): it
--    reproduces the same practitioner-override + age + frequency + entitlement
--    logic EXACTLY, then adds a consent precondition. Defining it here is inert:
--    no trigger references it until the apply block below is run by a human.
--
--    The consent gate is placed AFTER the practitioner override (a supervised
--    clinical scan is exempt, mirroring how it bypasses the other gates) and
--    BEFORE the age gate, so a missing consent fails fast with a distinguishable
--    message the client maps to the consent screen:
--        'consent_required: ...'
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_enforce_body_scan_finalize_with_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_override         boolean := false;
  v_dob              date;
  v_age_years        integer;
  v_is_premium       boolean := false;
  v_claimed          boolean;
  v_has_consent      boolean := false;
  -- Keep in sync with CURRENT_CONSENT_VERSION in
  -- src/lib/body-tracker/biometric-consent.ts.
  v_consent_version  text := '2026-05-169b.1';
BEGIN
  -- 1. PRACTITIONER OVERRIDE (supervised clinical context): identical to
  --    20260516000080. A supervised clinical scan bypasses ALL consumer gates,
  --    including consent (the practitioner relationship governs it).
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
    RETURN NEW;
  END IF;

  -- 2. CONSENT GATE (NEW vs 20260516000080). The scan subject must have a
  --    CURRENT biometric_consents row (latest-or-any row for this version).
  --    Fails CLOSED: no current consent -> do not finalize.
  v_has_consent := EXISTS (
    SELECT 1
      FROM biometric_consents bc
     WHERE bc.user_id         = NEW.user_id
       AND bc.consent_version = v_consent_version
  );

  IF NOT v_has_consent THEN
    RAISE EXCEPTION 'consent_required: biometric consent is required before a Body Scan can be completed.';
  END IF;

  -- 3. AGE GATE (fail CLOSED): identical to 20260516000080.
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

  -- 4. FREQUENCY (at most one completed scan per 24h): identical to 20260516000080.
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

  -- 5. ENTITLEMENT (with double-claim reconciliation): identical to 20260516000080.
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

-- Restrict execution surface (defensive; same as the consent-free function).
REVOKE ALL ON FUNCTION fn_enforce_body_scan_finalize_with_consent() FROM public;

-- A covering index for the consent EXISTS probe (idempotent). Safe to create
-- now even though the function is not yet wired: it only speeds up the lookup.
CREATE INDEX IF NOT EXISTS idx_biometric_consents_user_version
  ON public.biometric_consents (user_id, consent_version);


-- =============================================================================
-- 2. APPLY BLOCK  (INTENTIONALLY LEFT COMMENTED OUT).
--
--    Uncomment and run ONLY at launch, after the steps in the header are done.
--    This repoints the two existing finalize triggers from the consent-free
--    function onto the consent-aware one. It is idempotent (drops-if-exists then
--    recreates). Until this is run, the live enforcement is UNCHANGED.
--
--    >>> DO NOT UNCOMMENT until counsel + the live consent flow are confirmed. <<<
-- =============================================================================
--
-- DO $$
-- BEGIN
--   DROP TRIGGER IF EXISTS trg_enforce_body_scan_finalize_update ON body_photo_sessions;
--   CREATE TRIGGER trg_enforce_body_scan_finalize_update
--     BEFORE UPDATE ON body_photo_sessions
--     FOR EACH ROW
--     WHEN (
--       OLD.scan_status IS DISTINCT FROM 'complete'
--       AND NEW.scan_status = 'complete'
--     )
--     EXECUTE FUNCTION fn_enforce_body_scan_finalize_with_consent();
--
--   DROP TRIGGER IF EXISTS trg_enforce_body_scan_finalize_insert ON body_photo_sessions;
--   CREATE TRIGGER trg_enforce_body_scan_finalize_insert
--     BEFORE INSERT ON body_photo_sessions
--     FOR EACH ROW
--     WHEN (NEW.scan_status = 'complete')
--     EXECUTE FUNCTION fn_enforce_body_scan_finalize_with_consent();
-- END $$;
