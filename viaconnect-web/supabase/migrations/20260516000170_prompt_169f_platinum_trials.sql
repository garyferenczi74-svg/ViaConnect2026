-- =============================================================================
-- Prompt #169f: PLATINUM TRIALS (Option C self-initiated + Option D practitioner-granted)
-- Migration: 20260516000170_prompt_169f_platinum_trials.sql
-- Entity: Farmceutica Wellness Ltd
--
-- WHY THIS EXISTS (the 169f delta this closes):
--   169f defines two Platinum trial mechanics. This migration builds their SQL
--   foundation against the REAL codebase schema (NOT 169f's draft phantom
--   schema): a single SOURCE-OF-TRUTH table public.platinum_trials plus two
--   SECURITY DEFINER claim functions, and ONE new branch in the existing
--   fn_resolve_body_scan_tier_status resolver so the body-scan tier gate honors
--   an active trial.
--
--     * Option C (self_initiated): a GOLD member starts a one-time-per-LIFETIME
--       7-day Platinum trial (169f section 4.1: the self-trial is a Gold perk).
--     * Option D (practitioner_granted): an ACTIVE practitioner grants their
--       patient a 7, 14, or 30 day Platinum trial, one-time per
--       practitioner-patient pair.
--
-- SOURCE OF TRUTH (deliberate design): trial entitlement lives ONLY in
--   public.platinum_trials and is read-time correct via expires_at. We do NOT
--   manufacture fake 'trialing' memberships rows and we do NOT add any
--   user_profiles columns. The resolver reads platinum_trials directly.
--
-- PRECEDENCE (169f): a PAID entitlement always outranks a trial. The resolver's
--   existing holder / family-member / own-paid-platinum branches are checked
--   FIRST and are kept byte-identical to migration 20260516000150; only when none
--   of those grant access do we consult platinum_trials.
--
-- WRITE PATH (anti-griefing): all writes to platinum_trials go through the two
--   SECURITY DEFINER functions below, which act on auth.uid() (the caller),
--   NEVER a passed-in user id for the acting party. There is intentionally NO
--   client INSERT/UPDATE RLS policy, so the one-time and no-active-trial rules
--   cannot be bypassed by a direct client write. This mirrors the griefing-surface
--   discipline flagged on the retired fn_claim_free_body_scan_teaser.
--
-- MIGRATION NUMBERING:
--   This is 20260516000170. It sorts AFTER the #169f set (050..160) and is clear
--   of the live #170 range (20260516120010+). Append-only: this is a NEW file;
--   migration 20260516000150 (and every other existing migration) is never edited.
--
-- HARD RULES (per spec): SECURITY DEFINER + SET search_path = pg_catalog, public
--   on all three functions; schema-qualify objects; REVOKE ALL FROM public +
--   GRANT EXECUTE TO authenticated on the two claim functions (the resolver stays
--   REVOKEd from public like in 150); idempotent (CREATE TABLE IF NOT EXISTS,
--   guarded DROP POLICY IF EXISTS then CREATE, CREATE INDEX IF NOT EXISTS,
--   CREATE OR REPLACE FUNCTION). No em-dashes or en-dashes; ASCII only.
-- =============================================================================


-- =============================================================================
-- 1. TABLE public.platinum_trials
--    The single source of truth for Platinum trial entitlement. A trial is
--    ACTIVE when converted_at IS NULL AND cancelled_at IS NULL AND
--    expires_at > now(). converted_at / converted_to_tier record an upgrade to a
--    paid Platinum tier; cancelled_at records an early cancellation. Neither
--    started_at..expires_at window nor the lifecycle stamps are mutated by
--    clients (no client write policy); the claim functions own all inserts.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.platinum_trials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_source      text NOT NULL CHECK (trial_source IN ('self_initiated', 'practitioner_granted')),
  -- Set ONLY for practitioner_granted (the granting practitioner's auth user id);
  -- NULL for self_initiated.
  practitioner_id   uuid REFERENCES auth.users(id),
  duration_days     integer NOT NULL CHECK (duration_days IN (7, 14, 30)),
  started_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  converted_at      timestamptz,
  converted_to_tier text CHECK (converted_to_tier IN ('platinum', 'platinum_family')),
  cancelled_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platinum_trials IS
  'Source of truth for Platinum trial entitlement (169f Option C self_initiated + Option D practitioner_granted). Read-time correct via expires_at. All writes go through fn_claim_self_initiated_platinum_trial / fn_grant_practitioner_platinum_trial (SECURITY DEFINER); no client write policy.';

ALTER TABLE public.platinum_trials ENABLE ROW LEVEL SECURITY;

-- SELECT for the trial owner and, for practitioner-granted trials, the granting
-- practitioner. NO client INSERT/UPDATE/DELETE policy: writes are funneled
-- through the SECURITY DEFINER functions so the one-time / no-active-trial rules
-- cannot be bypassed by a direct client write.
DROP POLICY IF EXISTS platinum_trials_owner_select ON public.platinum_trials;
CREATE POLICY platinum_trials_owner_select
  ON public.platinum_trials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS platinum_trials_practitioner_select ON public.platinum_trials;
CREATE POLICY platinum_trials_practitioner_select
  ON public.platinum_trials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = practitioner_id);

CREATE INDEX IF NOT EXISTS idx_platinum_trials_user
  ON public.platinum_trials (user_id);

-- Partial index for active-trial lookups. IMPORTANT: the predicate deliberately
-- does NOT include "expires_at > now()". now() is NOT immutable, so Postgres
-- rejects it in an index predicate (169f's draft index for this is invalid).
-- The expires_at > now() filter is applied at QUERY time (in the resolver and
-- the claim functions), not in this index predicate.
CREATE INDEX IF NOT EXISTS idx_platinum_trials_user_active
  ON public.platinum_trials (user_id)
  WHERE converted_at IS NULL AND cancelled_at IS NULL;


-- =============================================================================
-- 2a. fn_claim_self_initiated_platinum_trial() RETURNS uuid
--     Option C. The acting user is auth.uid() (NEVER a passed-in id), so a caller
--     can only ever start a trial for THEMSELVES. Eligibility, one-time-lifetime,
--     and no-active-trial rules are enforced here, not by client RLS.
--
--     Gold-eligibility read (unambiguous against the real schema): the caller must
--     hold an ACTIVE membership at membership_tiers.tier_level = 1 (gold). This
--     uses the exact membership shape the codebase already reads
--     (src/lib/pricing/membership-manager.ts and the resolver in 150):
--     public.memberships joined to public.membership_tiers on mt.id = m.tier_id,
--     status IN ('active','trialing','gift_active'), and a non-lapsed
--     current_period_end (NULL means non-expiring and is allowed). A Platinum or
--     above member does not need a trial and is rejected with a clear message.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_claim_self_initiated_platinum_trial()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_is_gold   boolean := false;
  v_new_id    uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required to start a Platinum trial';
  END IF;

  -- Eligibility: the caller must currently be a GOLD member (active membership at
  -- tier_level = 1). The self-initiated trial is a Gold perk (169f section 4.1).
  SELECT EXISTS (
    SELECT 1
      FROM public.memberships m
      JOIN public.membership_tiers mt ON mt.id = m.tier_id
     WHERE m.user_id = v_uid
       AND m.status IN ('active', 'trialing', 'gift_active')
       AND (m.current_period_end IS NULL OR m.current_period_end > now())
       AND mt.tier_level = 1
  ) INTO v_is_gold;

  IF NOT v_is_gold THEN
    -- Distinguish "already Platinum or above" (no trial needed) from "not Gold".
    IF EXISTS (
      SELECT 1
        FROM public.memberships m
        JOIN public.membership_tiers mt ON mt.id = m.tier_id
       WHERE m.user_id = v_uid
         AND m.status IN ('active', 'trialing', 'gift_active')
         AND (m.current_period_end IS NULL OR m.current_period_end > now())
         AND mt.tier_level >= 2
    ) THEN
      RAISE EXCEPTION 'a self-initiated Platinum trial is not available: you already have Platinum or above';
    END IF;
    RAISE EXCEPTION 'a self-initiated Platinum trial requires an active Gold membership';
  END IF;

  -- One-time per LIFETIME: any self_initiated row in any state disqualifies.
  IF EXISTS (
    SELECT 1
      FROM public.platinum_trials t
     WHERE t.user_id = v_uid
       AND t.trial_source = 'self_initiated'
  ) THEN
    RAISE EXCEPTION 'self-initiated Platinum trial already used';
  END IF;

  -- No active trial of EITHER kind (self or practitioner). expires_at > now() is
  -- filtered here at query time (not in the partial index predicate).
  IF EXISTS (
    SELECT 1
      FROM public.platinum_trials t
     WHERE t.user_id = v_uid
       AND t.converted_at IS NULL
       AND t.cancelled_at IS NULL
       AND t.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'an active trial already exists';
  END IF;

  INSERT INTO public.platinum_trials (user_id, trial_source, duration_days, expires_at)
  VALUES (v_uid, 'self_initiated', 7, now() + interval '7 days')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_self_initiated_platinum_trial() FROM public;
GRANT EXECUTE ON FUNCTION public.fn_claim_self_initiated_platinum_trial() TO authenticated;


-- =============================================================================
-- 2b. fn_grant_practitioner_platinum_trial(p_patient_user_id uuid,
--                                          p_duration_days integer) RETURNS uuid
--     Option D. The acting practitioner is auth.uid() (NEVER a passed-in id), so a
--     caller can only grant AS THEMSELVES; the only passed-in id is the PATIENT,
--     which is gated by an active practitioner-patient relationship. Real-active-
--     practitioner, active-relationship, one-time-per-pair, and no-active-trial
--     rules are enforced here, not by client RLS.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_grant_practitioner_platinum_trial(
  p_patient_user_id uuid,
  p_duration_days   integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_pid    uuid := auth.uid();
  v_new_id uuid;
BEGIN
  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'authentication required to grant a Platinum trial';
  END IF;

  IF p_duration_days IS NULL OR p_duration_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'duration_days must be 7, 14, or 30';
  END IF;

  -- The caller must be a real ACTIVE practitioner.
  IF NOT EXISTS (
    SELECT 1
      FROM public.practitioners pr
     WHERE pr.user_id = v_pid
       AND pr.account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'only an active practitioner may grant a Platinum trial';
  END IF;

  -- An ACTIVE practitioner-patient relationship must exist between the caller and
  -- the named patient.
  IF NOT EXISTS (
    SELECT 1
      FROM public.practitioner_patients pp
     WHERE pp.practitioner_id = v_pid
       AND pp.patient_id = p_patient_user_id
       AND pp.status = 'active'
  ) THEN
    RAISE EXCEPTION 'no active practitioner-patient relationship';
  END IF;

  -- One-time per practitioner-patient PAIR. Different practitioners may each grant
  -- their own trial to the same patient (the per-pair scope permits it); the
  -- no-active-trial check below still blocks overlap.
  IF EXISTS (
    SELECT 1
      FROM public.platinum_trials t
     WHERE t.user_id = p_patient_user_id
       AND t.practitioner_id = v_pid
  ) THEN
    RAISE EXCEPTION 'a trial was already granted to this patient by this practitioner';
  END IF;

  -- No active trial of EITHER kind for the patient. expires_at > now() is filtered
  -- here at query time (not in the partial index predicate).
  IF EXISTS (
    SELECT 1
      FROM public.platinum_trials t
     WHERE t.user_id = p_patient_user_id
       AND t.converted_at IS NULL
       AND t.cancelled_at IS NULL
       AND t.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'an active trial already exists for this patient';
  END IF;

  INSERT INTO public.platinum_trials
    (user_id, trial_source, practitioner_id, duration_days, expires_at)
  VALUES
    (p_patient_user_id, 'practitioner_granted', v_pid, p_duration_days,
     now() + make_interval(days => p_duration_days))
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_grant_practitioner_platinum_trial(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_grant_practitioner_platinum_trial(uuid, integer) TO authenticated;


-- =============================================================================
-- 3. EXTEND fn_resolve_body_scan_tier_status(p_user_id uuid) RETURNS text
--
--    This is migration 20260516000150's resolver, copied VERBATIM, with exactly
--    ONE new branch added: after the holder / family-member / own-paid-platinum
--    checks all fail (and BEFORE the final RETURN NULL), consult platinum_trials
--    for an ACTIVE trial (converted_at IS NULL AND cancelled_at IS NULL AND
--    expires_at > now()). If found and self_initiated, return
--    'trial_self_initiated'; if practitioner_granted, return
--    'trial_practitioner_granted'. Everything else is byte-identical to 150 (the
--    Fix 2/3 family accepted_at + period-end guards, and the holder / member /
--    own-platinum branches). A PAID entitlement therefore still outranks a trial.
--
--    The two trial enum values already exist in the body_photo_sessions
--    premium_status_at_scan CHECK constraint (added in 150), so no constraint
--    change is needed here.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_resolve_body_scan_tier_status(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_is_family_holder boolean := false;
  v_is_family_member boolean := false;
  v_has_platinum     boolean := false;
  v_trial_source     text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Path (a), tier_level 3: the user holds their OWN active platinum_family
  -- membership. Such a user is the holder of their family pool.
  SELECT EXISTS (
    SELECT 1
      FROM public.memberships m
      JOIN public.membership_tiers mt ON mt.id = m.tier_id
     WHERE m.user_id = p_user_id
       AND m.status IN ('active', 'trialing', 'gift_active')
       -- FIX 3: reject a lapsed membership whose status was not yet reaped. A
       -- NULL current_period_end means non-expiring (complimentary/gift) and
       -- stays allowed.
       AND (m.current_period_end IS NULL OR m.current_period_end > now())
       AND mt.tier_level >= 3
  ) INTO v_is_family_holder;

  IF v_is_family_holder THEN
    RETURN 'platinum_plus_family_holder';
  END IF;

  -- Path (b): the user is an entitled family MEMBER. There is an active, ACCEPTED
  -- family_members link to a holder whose OWN active, non-lapsed membership is
  -- platinum_family (tier_level 3). The member need not have any membership of
  -- their own.
  SELECT EXISTS (
    SELECT 1
      FROM public.family_members fm
      JOIN public.memberships m       ON m.user_id = fm.primary_user_id
      JOIN public.membership_tiers mt ON mt.id     = m.tier_id
     WHERE fm.member_user_id = p_user_id
       AND fm.is_active = true
       -- FIX 2: require an ACCEPTED link. family_members is holder-writable
       -- (RLS family_members_primary_full_access: primary_user_id = auth.uid()),
       -- so a holder can insert arbitrary member_user_id rows. Without this an
       -- account that never accepted the invite would inherit entitlement. Only
       -- an accepted member (accepted_at set) is entitled.
       AND fm.accepted_at IS NOT NULL
       AND m.status IN ('active', 'trialing', 'gift_active')
       -- FIX 3: the holder's membership must not be lapsed (period-end check is
       -- on the HOLDER's membership for the member-via-holder branch).
       AND (m.current_period_end IS NULL OR m.current_period_end > now())
       AND mt.tier_level >= 3
  ) INTO v_is_family_member;

  IF v_is_family_member THEN
    RETURN 'platinum_plus_family_member';
  END IF;

  -- Path (a), tier_level 2: the user holds their OWN active platinum (non-family)
  -- membership. A trialing platinum also lands here and maps to 'platinum'; the
  -- finer trial_* distinction is deferred to the later trials task (see header).
  SELECT EXISTS (
    SELECT 1
      FROM public.memberships m
      JOIN public.membership_tiers mt ON mt.id = m.tier_id
     WHERE m.user_id = p_user_id
       AND m.status IN ('active', 'trialing', 'gift_active')
       -- FIX 3: reject a lapsed membership whose status was not yet reaped. A
       -- NULL current_period_end means non-expiring (complimentary/gift) and
       -- stays allowed.
       AND (m.current_period_end IS NULL OR m.current_period_end > now())
       AND mt.tier_level >= 2
  ) INTO v_has_platinum;

  IF v_has_platinum THEN
    RETURN 'platinum';
  END IF;

  -- ===========================================================================
  -- 169f TRIAL BRANCH (new in 20260516000170; the ONLY addition vs 150).
  --   Reached ONLY when no paid Platinum-level entitlement above granted access,
  --   so a paid entitlement still outranks a trial. Consult platinum_trials for an
  --   ACTIVE trial (converted_at IS NULL AND cancelled_at IS NULL AND
  --   expires_at > now()); expires_at > now() is filtered at query time, not in
  --   the partial index predicate. Map the active trial's source to its stamp.
  -- ===========================================================================
  SELECT t.trial_source
    INTO v_trial_source
    FROM public.platinum_trials t
   WHERE t.user_id = p_user_id
     AND t.converted_at IS NULL
     AND t.cancelled_at IS NULL
     AND t.expires_at > now()
   ORDER BY t.expires_at DESC
   LIMIT 1;

  IF v_trial_source = 'self_initiated' THEN
    RETURN 'trial_self_initiated';
  ELSIF v_trial_source = 'practitioner_granted' THEN
    RETURN 'trial_practitioner_granted';
  END IF;

  -- Not entitled: Free / Gold / no membership / lapsed / no active trial. The
  -- caller REJECTS.
  RETURN NULL;
END;
$$;

-- Defensive: this resolver is a read-only helper invoked by the SECURITY DEFINER
-- finalize trigger function (definer = table owner), not called directly by
-- clients. Revoke the public execute surface; the trigger path does not need a
-- client grant. (Mirrors 150; the resolver stays REVOKEd from public.)
REVOKE ALL ON FUNCTION fn_resolve_body_scan_tier_status(uuid) FROM public;
