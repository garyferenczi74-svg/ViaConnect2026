-- =============================================================================
-- Prompt #169f: TIER-MODEL body_photo_sessions FINALIZE ENFORCEMENT
-- Migration: 20260516000150_prompt_169f_tier_scan_enforcement.sql
-- Entity: Farmceutica Wellness Ltd
--
-- WHY THIS EXISTS (the 169f delta this closes):
--   The PRIMARY scan path (src/lib/arnold/scanning/runScanAnalysis.ts) finalizes
--   a scan with a DIRECT client UPDATE that writes scan_status = 'complete' and
--   never calls the body-scan-analyze edge function. The ONLY thing that actually
--   enforces gating on that path is the BEFORE INSERT/UPDATE finalize trigger on
--   public.body_photo_sessions defined in migration 20260516000080. That trigger
--   was authored under the OLD (pre-169f) model, in which a non-premium user
--   could claim ONE FREE BODY SCAN TEASER.
--
--   Under the four-tier Via Cura membership model (169f), the Free tier has NO
--   body-scan access at all. FormaVision is Platinum-and-above only. The free
--   teaser concept is therefore RETIRED: a non-entitled user is REJECTED at
--   finalize, not handed a teaser scan. This migration rewrites the entitlement
--   step of the finalize trigger to the tier model and removes the teaser
--   machinery. Every other security property of the 080 trigger is preserved
--   EXACTLY (same trigger objects, same fire condition on scan_status ->
--   'complete', SECURITY DEFINER, locked search_path, fail-closed age gate, 24h
--   frequency gate, practitioner-managed bypass).
--
-- WHAT THIS SUPERSEDES / WHAT STAYS DEFERRED:
--   (a) This migration SUPERSEDES the entitlement step of fn_enforce_body_scan_finalize
--       from 20260516000080 and RETIRES the free teaser per 169f. It CREATE OR
--       REPLACEs fn_enforce_body_scan_finalize in place; the two finalize triggers
--       from 080 (trg_enforce_body_scan_finalize_update / _insert) already point at
--       that function name, so replacing the body re-wires enforcement with no
--       trigger change required.
--   (b) Migration 20260516000100 (biometric consent enforcement) is still INERT
--       (apply-at-launch only) and its consent variant
--       fn_enforce_body_scan_finalize_with_consent STILL CARRIES THE OLD FREE-TEASER
--       ENTITLEMENT BLOCK. Because 150 sorts AFTER 100 in filename order, the
--       definition in THIS file is the authoritative final shape of
--       fn_enforce_body_scan_finalize. WHOEVER ACTIVATES CONSENT AT LAUNCH MUST
--       FIRST RE-RECONCILE fn_enforce_body_scan_finalize_with_consent to this tier
--       model (replace its free-teaser entitlement block with the
--       fn_resolve_body_scan_tier_status resolver below) BEFORE uncommenting the
--       100 apply block. This migration does NOT touch 100 (append-only).
--
-- MIGRATION NUMBERING:
--   This is 20260516000150. It sorts AFTER the #169 set (050..140) and is clear of
--   the live #170 range (20260516120010+). It is the last of the #169f data-layer
--   migrations in this lane.
--
-- HARD RULES (per spec): fail-closed always; SECURITY DEFINER functions pin
--   search_path to (pg_catalog, public); append-only (NEW file only; 050/070/080/
--   100 are never edited); idempotent where possible (CREATE OR REPLACE FUNCTION,
--   guarded constraint drop/add, IF EXISTS drops). No em-dashes or en-dashes.
-- =============================================================================


-- =============================================================================
-- 1. fn_resolve_body_scan_tier_status(p_user_id uuid) RETURNS text
--    SECURITY DEFINER resolver. Returns the premium_status_at_scan stamp the user
--    is ENTITLED to, or NULL if NOT entitled (the finalize trigger REJECTS on a
--    NULL return). It only READS (memberships, membership_tiers, family_members);
--    it never writes and never escalates, so running it as definer is safe.
--
--    ENTITLEMENT = Platinum-level access (membership_tiers.tier_level >= 2)
--    through EITHER of two paths:
--      (a) the user's OWN active membership (status in active/trialing/gift_active,
--          and NOT past its current_period_end) whose membership_tiers.tier_level
--          >= 2, OR
--      (b) an ACTIVE, ACCEPTED family_members link (is_active AND accepted_at set)
--          to a HOLDER whose own active, non-lapsed membership is platinum_family
--          (tier_level 3).
--
--    Two hardenings applied here (169f review): the family-member branch requires
--    fm.accepted_at IS NOT NULL (family_members is holder-writable, so an
--    unaccepted holder-written row must NOT confer entitlement), and every
--    membership branch requires (current_period_end IS NULL OR current_period_end
--    > now()) so a lapsed-but-unreaped subscription is not counted (NULL period
--    end means non-expiring, e.g. complimentary/gift, and stays allowed).
--
--    FAMILY-MEMBER ENTITLEMENT REPRESENTATION (confirmed in the codebase):
--      public.family_members (migration 20260418000020_memberships_extension_and_family.sql)
--      links primary_user_id (the holder) to member_user_id (the member), with
--      is_active. A family member does NOT necessarily have their own memberships
--      row: family_members.member_user_id "is NULL if invitation not yet accepted
--      or child under 13", and the member-side RLS policy family_members_self_read
--      keys on member_user_id = auth.uid(). The holder's platinum_family entitlement
--      lives on the HOLDER's memberships row (tier_id = 'platinum_family',
--      tier_level 3); members inherit access via the family_members link, not via a
--      paid membership of their own. So a family member with no membership of their
--      own but a valid active link to a platinum_family holder IS entitled.
--      src/lib/pricing/user-pricing-context.ts reads family_members exactly this
--      way (primary_user_id = userId, is_active = true) to enumerate the holder's
--      family, which corroborates the link-based representation.
--
--    STAMP MAPPING (NEW 169f enum values only; never the old free_teaser/premium):
--      * user is the platinum_family holder                  -> 'platinum_plus_family_holder'
--      * user is an entitled platinum_family member          -> 'platinum_plus_family_member'
--      * user has own platinum (tier_level 2) active/trial   -> 'platinum'
--      A trialing platinum membership grants Platinum and maps to 'platinum'. The
--      finer 'trial_self_initiated' / 'trial_practitioner_granted' distinction is
--      DELIBERATELY DEFERRED to a later trials task that will EXTEND this resolver;
--      until then a trial resolves to 'platinum'. (The trial_* enum values exist in
--      the CHECK constraint below so that later task does not need a constraint
--      change.)
--
--    PRECEDENCE: holder beats member beats own-platinum. A user who is BOTH a
--    platinum_family holder AND (improbably) also a member under someone else is
--    stamped as the holder. A user with their OWN platinum_family membership is
--    treated as the holder of their family (tier_level 3 via path (a)).
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

  -- Not entitled: Free / Gold / no membership / lapsed. The caller REJECTS.
  RETURN NULL;
END;
$$;

-- Defensive: this resolver is a read-only helper invoked by the SECURITY DEFINER
-- finalize trigger function (definer = table owner), not called directly by
-- clients. Revoke the public execute surface; the trigger path does not need a
-- client grant.
REVOKE ALL ON FUNCTION fn_resolve_body_scan_tier_status(uuid) FROM public;


-- =============================================================================
-- 2. fn_enforce_body_scan_finalize() rewritten to the 169f TIER MODEL.
--
--    This CREATE OR REPLACE preserves EVERY security property of the 080 version:
--      * same function name (the 080 triggers already point at it; no trigger swap)
--      * SECURITY DEFINER, search_path locked
--      * practitioner_managed override (active practitioner_patients) -> bypass
--      * "trust the edge path" short-circuit: gating runs ONLY when
--        NEW.premium_status_at_scan IS NULL (the direct runScanAnalysis path)
--      * age gate FAILS CLOSED (NULL/missing DOB REJECTS)
--      * 24h frequency gate (identical source signals to 080)
--    The ONLY change is the ENTITLEMENT step: instead of premium-or-free-teaser,
--    it calls fn_resolve_body_scan_tier_status and REJECTS on NULL. No teaser
--    claim, no fallback scan for a non-entitled user.
--
--    search_path note: 080 used (public, pg_temp); 169f hard rule pins definer
--    functions to (pg_catalog, public). pg_catalog first is the safe, explicit
--    schema-resolution order and does not change any referenced object (all
--    referenced tables are schema-qualified as public.* below).
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_enforce_body_scan_finalize()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_override  boolean := false;
  v_dob       date;
  v_age_years integer;
  v_status    text;
BEGIN
  -- ===========================================================================
  -- 0. TRUSTED-WRITER GATE for the pre-stamp (FIX 1, closes the client-supplied
  --    premium_status_at_scan bypass). The only RLS policy on body_photo_sessions
  --    is FOR ALL WITH CHECK (auth.uid() = user_id), so a direct authenticated
  --    client could finalize while setting premium_status_at_scan to a valid enum
  --    value (e.g. 'platinum') in the SAME write. That would make the column
  --    non-NULL, the IS NULL entitlement gate (step 4) would never call the
  --    resolver, and a NON-ENTITLED user would finalize a scan. Only the trusted
  --    backend (the body-scan-analyze edge function, which runs as the Postgres
  --    role service_role) may legitimately pre-stamp this column. So: if the
  --    caller is NOT service_role, DISCARD any caller-supplied value (force NULL)
  --    so the resolver in step 4 ALWAYS runs on the direct client path.
  --
  --    Role detection uses auth.role(), the same predicate this codebase already
  --    uses to gate service_role inside SECURITY DEFINER functions (see
  --    public.compute_bio_optimization_score in 20260512020236_bos_compute_v2.sql:
  --    "auth.role() <> 'service_role'"). auth.role() reads the request.jwt.claims
  --    session GUC, which persists into SECURITY DEFINER, so it is readable here.
  --
  --    No-op for the honest runScanAnalysis path (it already leaves the column
  --    NULL, so forcing NULL changes nothing). Does NOT disturb the practitioner
  --    override below (which re-checks practitioner_patients and stamps
  --    'practitioner_managed' itself AFTER this point) nor the trusted edge path
  --    (service_role keeps its pre-stamp).
  --
  --    IS DISTINCT FROM is used (not <>) so a NULL auth.role() also fails closed
  --    to NULLing the column (a bare <> would yield NULL, treated as false, and
  --    would LEAVE a caller value in place: the wrong direction).
  -- ===========================================================================
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.premium_status_at_scan := NULL;
  END IF;

  -- ===========================================================================
  -- 1. PRACTITIONER OVERRIDE (supervised clinical context). Hardened vs 080.
  --    Valid only when a non-blank clinical_override_reason AND a practitioner_id
  --    are present on NEW, an ACTIVE practitioner_patients relationship exists
  --    between that practitioner and the scan subject (NEW.user_id), AND
  --    NEW.practitioner_id is a GENUINELY CREDENTIALED practitioner (an active
  --    public.practitioners row). When valid, stamp 'practitioner_managed' and
  --    SKIP age, frequency, and entitlement.
  --
  --    169f forge-surface closure: practitioner_patients RLS
  --    ("Practitioners insert practitioner_patients" in
  --    20260326_three_portal_architecture.sql: FOR INSERT WITH CHECK
  --    (auth.uid() = practitioner_id)) currently lets ANY authenticated user
  --    self-insert an active row with practitioner_id = patient_id = self, and
  --    body_photo_sessions owner RLS lets that same user set
  --    clinical_override_reason + practitioner_id = self on their own scan. That
  --    forged pair would previously fire this override and bypass the age,
  --    frequency, and entitlement gates. The added real-practitioner EXISTS check
  --    closes that body-scan exposure: a non-practitioner consumer's self id is
  --    NOT in public.practitioners, so the override no longer fires and they fall
  --    through to the gates below (rejected if a minor or non-entitled). The
  --    broader practitioner_patients RLS tightening (so a non-practitioner cannot
  --    forge the relationship row at all) is tracked separately, not in this file.
  --
  --    practitioners identity signal (verified in the codebase): public.practitioners
  --    has UNIQUE user_id -> auth.users(id) (the same id space as
  --    body_photo_sessions.practitioner_id, which references auth.users directly),
  --    and after 20260418000160 reconciliation its live status column is
  --    account_status (the _050 stub's status column was dropped there), CHECK in
  --    (pending_onboarding, onboarding, active, suspended, terminated). RLS only
  --    lets a practitioner self-READ / self-UPDATE an existing row; INSERT is
  --    admin-only (practitioners_admin_all), so a consumer cannot self-mint one.
  --    account_status = 'active' is the authoritative "real, live practitioner"
  --    flag; a real practitioner finalizing a managed scan via the service_role
  --    edge path is active and still passes.
  -- ===========================================================================
  v_override := (
    NEW.clinical_override_reason IS NOT NULL
    AND btrim(NEW.clinical_override_reason) <> ''
    AND NEW.practitioner_id IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM public.practitioner_patients pp
       WHERE pp.practitioner_id = NEW.practitioner_id
         AND pp.patient_id      = NEW.user_id
         AND pp.status          = 'active'
    )
    AND EXISTS (
      SELECT 1
        FROM public.practitioners pr
       WHERE pr.user_id        = NEW.practitioner_id
         AND pr.account_status = 'active'
    )
  );

  IF v_override THEN
    NEW.premium_status_at_scan := 'practitioner_managed';
    RETURN NEW;  -- supervised clinical scan: bypass age, frequency, entitlement.
  END IF;

  -- ===========================================================================
  -- 2. AGE GATE (fail CLOSED). Identical to 080. Read the subject's DOB from
  --    profiles. A NULL DOB means we cannot confirm 18+, which at the DB layer
  --    must NOT finalize. Whole-years via age()/EXTRACT avoids the client-side
  --    timezone off-by-one.
  -- ===========================================================================
  SELECT p.date_of_birth INTO v_dob
    FROM public.profiles p
   WHERE p.id = NEW.user_id;

  IF v_dob IS NULL THEN
    RAISE EXCEPTION 'age_restricted: date of birth is required to confirm Body Scan eligibility (18+).';
  END IF;

  v_age_years := EXTRACT(YEAR FROM age(v_dob))::int;
  IF v_age_years < 18 THEN
    RAISE EXCEPTION 'age_restricted: Body Scan is available to members who are 18 or older.';
  END IF;

  -- ===========================================================================
  -- 3. FREQUENCY (at most one completed scan per 24h per subject). Identical to
  --    080. Look for any OTHER completed row for this user whose completion
  --    timestamp (COALESCE(updated_at, created_at)) is within the last 24h.
  --    Comparing other already-committed rows against now() avoids any dependency
  --    on the firing order of this BEFORE trigger vs the updated_at trigger.
  -- ===========================================================================
  IF EXISTS (
    SELECT 1
      FROM public.body_photo_sessions s
     WHERE s.user_id     = NEW.user_id
       AND s.id          <> NEW.id
       AND s.scan_status = 'complete'
       AND COALESCE(s.updated_at, s.created_at) > (now() - interval '24 hours')
  ) THEN
    RAISE EXCEPTION 'scan_rate_limited: a Body Scan was already completed within the last 24 hours.';
  END IF;

  -- ===========================================================================
  -- 4. ENTITLEMENT (169f TIER MODEL; replaces the 080 premium-or-free-teaser step).
  --    After step 0, premium_status_at_scan is non-NULL ONLY when the writer is
  --    service_role (the trusted edge path, which already resolved + stamped it);
  --    a direct authenticated client always arrives here with it forced to NULL.
  --    So when it is non-NULL we TRUST the service_role pre-stamp (no
  --    re-resolution); when NULL we resolve the tier stamp and a NULL resolution
  --    means NOT entitled -> REJECT. There is NO free teaser and NO fallback scan
  --    for a non-entitled user, and a client can no longer short-circuit the
  --    resolver by pre-setting this column.
  -- ===========================================================================
  IF NEW.premium_status_at_scan IS NULL THEN
    v_status := fn_resolve_body_scan_tier_status(NEW.user_id);

    IF v_status IS NULL THEN
      RAISE EXCEPTION 'premium_required: Body Scan requires a Platinum membership.';
    END IF;

    NEW.premium_status_at_scan := v_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Restrict execution surface (defensive; trigger functions are invoked by the
-- engine on the table owner's behalf, not called directly by clients). Mirrors 080.
REVOKE ALL ON FUNCTION fn_enforce_body_scan_finalize() FROM public;

-- NOTE: the two finalize triggers (trg_enforce_body_scan_finalize_update and
-- trg_enforce_body_scan_finalize_insert, created in 20260516000080) already
-- EXECUTE FUNCTION fn_enforce_body_scan_finalize(). Replacing the function body
-- above re-wires enforcement to the tier model with NO trigger change. The 080
-- guarded CREATE TRIGGER blocks remain valid and are intentionally NOT touched.


-- =============================================================================
-- 3. Remap any existing premium_status_at_scan rows to the NEW enum BEFORE the
--    CHECK constraint is swapped. These migrations are not yet deployed, so this
--    is expected to touch zero rows; it is written to be safe and idempotent
--    either way (re-running finds nothing left to remap).
--      free_teaser -> trial_self_initiated   (the retired teaser becomes a
--                                              self-initiated trial under 169f)
--      premium     -> platinum               (the single old paid stamp)
--      practitioner_managed                  -> already valid in both enums; left as-is.
-- =============================================================================
UPDATE public.body_photo_sessions
   SET premium_status_at_scan = 'trial_self_initiated'
 WHERE premium_status_at_scan = 'free_teaser';

UPDATE public.body_photo_sessions
   SET premium_status_at_scan = 'platinum'
 WHERE premium_status_at_scan = 'premium';


-- =============================================================================
-- 4. Swap the CHECK constraint on body_photo_sessions.premium_status_at_scan to
--    the NEW 169f enum. Drop the old constraint if it exists, then add the new
--    one. The constraint added by 20260516000050 is the table-level CHECK
--    inlined on ADD COLUMN; Postgres names such inline CHECKs
--    body_photo_sessions_premium_status_at_scan_check. Drop that by name if
--    present; the add is named explicitly so it is stable and idempotent.
-- =============================================================================
ALTER TABLE public.body_photo_sessions
  DROP CONSTRAINT IF EXISTS body_photo_sessions_premium_status_at_scan_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'body_photo_sessions_premium_status_at_scan_chk_169f'
       AND conrelid = 'public.body_photo_sessions'::regclass
  ) THEN
    ALTER TABLE public.body_photo_sessions
      ADD CONSTRAINT body_photo_sessions_premium_status_at_scan_chk_169f
      CHECK (
        premium_status_at_scan IS NULL
        OR premium_status_at_scan IN (
          'platinum',
          'platinum_plus_family_holder',
          'platinum_plus_family_member',
          'trial_self_initiated',
          'trial_practitioner_granted',
          'practitioner_managed'
        )
      );
  END IF;
END $$;


-- =============================================================================
-- 5. RETIRE the free-teaser machinery. After step 4, nothing in the DB layer
--    references it:
--      * the ACTIVE finalize trigger function (this file, step 2) no longer
--        calls fn_claim_free_body_scan_teaser and no longer reads
--        profiles.free_body_scan_used;
--      * the only OTHER definition of the claim fn is the inert consent-variant
--        in 20260516000100 (fn_enforce_body_scan_finalize_with_consent), which is
--        NOT wired to any trigger and is apply-at-launch only. It still TEXTUALLY
--        calls fn_claim_free_body_scan_teaser, so the claim fn is dropped LAST and
--        the consent variant must be reconciled to the tier model before consent
--        is ever activated (see the header). Dropping the claim fn now does not
--        affect the live path (the consent variant is not installed on any trigger).
--      * migrations 20260516000090 and 20260516000110 mention
--        profiles.free_body_scan_used ONLY in header COMMENTS (descriptive prose),
--        not in executable SQL, so dropping the column does not break them.
--      * the remaining references are TypeScript application code
--        (src/lib/body-tracker/entitlement-check.ts, scan-gate.ts, and a test),
--        which is OUT OF SCOPE for this SQL-only task and is realigned in the
--        separate application-code task. They read profiles.free_body_scan_used at
--        runtime via the Supabase client; that is the app task's concern, not a DB
--        object dependency that blocks this drop.
--
--    Drop the claim function first, then the two profiles columns. All guarded
--    with IF EXISTS so the migration is idempotent.
-- =============================================================================
DROP FUNCTION IF EXISTS public.fn_claim_free_body_scan_teaser(uuid);

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS free_body_scan_used,
  DROP COLUMN IF EXISTS free_body_scan_used_at;


-- =============================================================================
-- 6. RECONCILIATION NOTICE (consent variant, 20260516000100).
--
--    (a) This migration SUPERSEDES the entitlement step of the 080 finalize
--        trigger and RETIRES the free teaser per the 169f four-tier model:
--        the Free tier has NO body-scan access; FormaVision is Platinum-and-above
--        only; a non-entitled user is REJECTED at finalize, never given a teaser.
--
--    (b) Migration 20260516000100 (biometric consent enforcement) remains INERT
--        and apply-at-launch only. Its function
--        fn_enforce_body_scan_finalize_with_consent STILL CONTAINS THE OLD
--        FREE-TEASER ENTITLEMENT BLOCK and references fn_claim_free_body_scan_teaser
--        (which step 5 drops). Because 150 sorts AFTER 100 in filename order,
--        the fn_enforce_body_scan_finalize definition in THIS file is the
--        authoritative final one. Before consent is activated at launch, whoever
--        uncomments the 100 apply block MUST FIRST re-reconcile
--        fn_enforce_body_scan_finalize_with_consent to this tier model: replace
--        its premium-or-free-teaser block with a call to
--        fn_resolve_body_scan_tier_status (REJECT on NULL), and remove its
--        reference to the dropped fn_claim_free_body_scan_teaser. This migration
--        does NOT modify 100 (append-only).
--
--    MIGRATION NUMBERING: this is 20260516000150, sorting after the #169 set
--    (050..140) and clear of the #170 lane (20260516120010+).
-- =============================================================================
