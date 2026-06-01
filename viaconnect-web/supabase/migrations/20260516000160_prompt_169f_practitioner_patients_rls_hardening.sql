-- =============================================================================
-- Prompt #169f: HARDEN public.practitioner_patients RLS
-- Migration: 20260516000160_prompt_169f_practitioner_patients_rls_hardening.sql
-- Entity: Farmceutica Wellness Ltd
--
-- WHY THIS EXISTS (the forge surface this closes):
--   public.practitioner_patients (base table in 20260326_three_portal_architecture.sql)
--   shipped two RLS policies that, together, let ANY authenticated user
--   self-grant an ACTIVE practitioner relationship to themselves. That forged
--   "active" row is consumed elsewhere as a practitioner-managed bypass. The two
--   gaps:
--
--     1. INSERT policy "Practitioners insert practitioner_patients":
--          WITH CHECK (auth.uid() = practitioner_id)  -- ONLY this.
--        It did not constrain status and did not forbid a self-relationship, so a
--        client could INSERT (practitioner_id = self, patient_id = self,
--        status = 'active') and never go through the consent path.
--
--     2. UPDATE policy "Users update own practitioner_patients":
--          USING (auth.uid() = practitioner_id OR auth.uid() = patient_id)
--        with NO WITH CHECK, so a patient could directly flip a row's status to
--        'active', bypassing the consent RPC.
--
-- WHAT THE LEGITIMATE FLOW ACTUALLY DOES (verified, not assumed):
--   * INSERT path: src/app/api/practitioner/invite-patient/route.ts runs as the
--     AUTHENTICATED user (anon-key SSR client, NOT service role), so it IS
--     subject to the client INSERT RLS policy. It inserts a row with
--     practitioner_id = auth.uid(), patient_id = NULL (claimed later on accept),
--     status = 'invited' (NOT 'pending'), and only after loading the caller's
--     own practitioners row filtered to account_status = 'active'.
--
--   * ACTIVATION path: the ONLY way a row becomes 'active' is the SECURITY
--     DEFINER RPC public.accept_practitioner_invitation (migration
--     20260418000150). It runs as definer and therefore BYPASSES RLS entirely;
--     it sets patient_id = auth.uid() and status = 'active' under a
--     token + status='invited' precondition with ROW_COUNT double-claim
--     protection. No client-side direct UPDATE to status='active' exists in the
--     codebase (the accept page calls the RPC; the only other direct client
--     UPDATE, src/app/api/practitioner/patient-view-preference/route.ts, writes
--     patient_view_mode_override only and never touches status).
--
--   Because the real initial status is 'invited' and the real insert carries a
--   NULL patient_id, this migration DELIBERATELY DEVIATES from the prompt's
--   draft (which assumed 'pending' and a non-null patient_id). Pinning the
--   policy to 'pending' or to practitioner_id <> patient_id without a NULL
--   escape would have BROKEN the live invitation flow. See per-policy notes.
--
-- WHAT THIS DOES:
--   Drops the two offending policies BY NAME and recreates them tightened, and
--   adds a defense-in-depth guard trigger plus a consent-path signal:
--     * INSERT: only a real active practitioner may create a NON-active row that
--       names NO patient (patient_id IS NULL), and only in the legitimate
--       initial status 'invited'.
--     * UPDATE: keeps the existing actor gate (practitioner or patient on the
--       row) for legitimate non-activation edits (consent flag changes, view
--       mode, revoke), but ADDS a WITH CHECK that forbids a client from setting
--       status = 'active' (activation must go through the consent RPC) and
--       forbids turning a row into a self-relationship.
--     * GUARD TRIGGER (section 3): a SECURITY INVOKER BEFORE INSERT OR UPDATE
--       trigger that forbids a direct authenticated client from activating a
--       relationship (invited/other -> active) or from setting / changing
--       patient_id. It distinguishes the legitimate consent RPC from a direct
--       client by a transaction-local GUC (app.consent_path = 'on') that the RPC
--       sets on itself; a direct client cannot set that GUC, so it cannot reach
--       the activation / patient_id-write branch. service_role is also allowed.
--     * CONSENT RPC RE-CREATE (section 4): CREATE OR REPLACE of
--       public.accept_practitioner_invitation with its body copied VERBATIM from
--       20260418000150 plus one added first line that asserts the consent-path
--       GUC, so the legitimate invited -> active + patient_id write is permitted
--       by the guard while every direct-client forge is denied.
--
--   The SECURITY DEFINER consent RPC still bypasses RLS, so the policy
--   tightening alone does not touch the accept flow; the guard trigger is what
--   closes the residual UPDATE-activation path that RLS cannot see (RLS WITH
--   CHECK cannot compare OLD vs NEW). See sections 3 and 4 for the role/GUC
--   reasoning and why invite / accept / view-mode / revoke all still pass.
--
-- WHY THE GUC SIGNAL AND NOT current_user DETECTION:
--   A SECURITY INVOKER trigger could in principle detect the RPC by current_user
--   (a SECURITY DEFINER RPC runs as its OWNER, not 'authenticated'). That is only
--   safe if the RPC owner is provably NOT 'authenticated'. This migration set
--   declares no explicit owner for the RPC (no ALTER FUNCTION ... OWNER anywhere)
--   and the repo carries no deploy-role manifest proving the applying role, so
--   the owner could not be CONFIRMED here. Per the fail-safe rule we therefore do
--   NOT rely on current_user; we use a transaction-local GUC that the RPC sets on
--   ITSELF (set_config('app.consent_path','on', true)). This is owner-agnostic:
--   it works no matter which role owns or applies the function, and a direct
--   PostgREST client has no way to set that GUC on its own statement.
--
-- HARD RULES: append-only (NEW file; the 20260326 / 20260418* policy migrations
--   are untouched -- section 4 CREATE OR REPLACEs the RPC as a NEW definition in
--   THIS file and edits no prior file), idempotent (DROP POLICY / DROP TRIGGER
--   IF EXISTS before CREATE; CREATE OR REPLACE FUNCTION), ASCII only (no em/en
--   dashes), schema-qualified objects. SQL only. The guard trigger function is
--   SECURITY INVOKER (NOT definer); making it definer would set current_user to
--   the owner and is explicitly avoided.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. INSERT policy: only an active practitioner may create a pending-style
--    (status = 'invited') relationship to someone other than themselves.
--
--    Notes on each clause:
--      * auth.uid() = practitioner_id
--          Preserves the original ownership requirement: a client may only
--          insert a row where they are the practitioner.
--      * patient_id IS NULL
--          An invite may not name a patient AT ALL. The legitimate invite
--          always inserts patient_id = NULL (the patient is unknown until they
--          accept; src/app/api/practitioner/invite-patient/route.ts writes
--          patient_id: null explicitly). patient_id is populated ONLY later, by
--          the SECURITY DEFINER consent RPC accept_practitioner_invitation, when
--          the patient accepts. The prior form
--          "(patient_id IS NULL OR practitioner_id <> patient_id)" forbade only
--          a SELF relationship; it still let a practitioner INSERT a row naming
--          an ARBITRARY non-self victim patient_id, which (after a status flip)
--          fabricated a consented relationship to that victim. Requiring
--          patient_id IS NULL removes the ability to name any patient on insert,
--          closing the first half of that bypass. A self-forge is a strict
--          subset (patient_id = self is non-NULL) and is also blocked.
--      * status = 'invited'
--          The legitimate initial status the invite-patient route writes. This
--          is what blocks the forge: a client can no longer insert
--          status = 'active'. Activation is the consent RPC's job only.
--      * EXISTS (... practitioners pr ... account_status = 'active')
--          Only a real, active practitioner can create a relationship at all,
--          mirroring the route's own server-side check.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Practitioners insert practitioner_patients" ON public.practitioner_patients;

CREATE POLICY "Practitioners insert practitioner_patients"
  ON public.practitioner_patients
  FOR INSERT
  WITH CHECK (
    auth.uid() = practitioner_id
    AND patient_id IS NULL
    AND status = 'invited'
    AND EXISTS (
      SELECT 1
      FROM public.practitioners pr
      WHERE pr.user_id = auth.uid()
        AND pr.account_status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. UPDATE policy: keep the actor gate, but forbid the PATIENT from driving a
--    row into / keeping it at status = 'active' via a direct client UPDATE, and
--    forbid self-relationship creation via UPDATE.
--
--    Why this exact shape (an RLS policy WITH CHECK can only see the NEW row,
--    not the OLD row, so it cannot say "status did not change"; OLD/NEW
--    comparison would require a trigger, but a BEFORE UPDATE trigger ALSO fires
--    inside the SECURITY DEFINER consent RPC and would wrongly block the
--    legitimate invited -> active activation. Activation must therefore be
--    distinguished by RLS bypass, which only a policy gives us, so the guard
--    lives here in the policy):
--
--      * USING (auth.uid() = practitioner_id OR auth.uid() = patient_id)
--          Unchanged from the original: the row's practitioner or patient may
--          target it. Preserves legitimate non-activation edits (a practitioner
--          editing consent flags / tags / patient_view_mode_override, or either
--          party performing a revoke that sets status = 'revoked').
--      * WITH CHECK actor clause (same predicate)
--          Ensures the post-image still belongs to the same actor; prevents
--          reassigning the row to a different practitioner / patient.
--      * (status <> 'active' OR auth.uid() = practitioner_id)
--          Closes gap #2 (patient self-activate): when the actor is the PATIENT
--          (auth.uid() = patient_id and not the practitioner), the post-image
--          status MUST NOT be 'active'. A patient therefore cannot flip a row to
--          'active' directly; activation happens ONLY through the SECURITY
--          DEFINER consent RPC, which bypasses RLS and is unaffected by this
--          clause. This does not break any real flow: there is NO patient-side
--          direct client UPDATE to practitioner_patients anywhere in the app
--          (the patient activates via the RPC; the only direct client UPDATE is
--          the practitioner-side patient_view_mode_override write). The
--          practitioner branch is left permissive precisely so that legitimate
--          practitioner edit survives: that write keeps an already-active row's
--          status at 'active', which a flat "status <> 'active'" would have
--          rejected.
--      * (patient_id IS NULL OR practitioner_id <> patient_id)
--          Forbids turning a row into a self-relationship via UPDATE, matching
--          the INSERT invariant.
--
--    RESIDUAL STATUS (UPDATED): the practitioner direct-activation path that
--    this section's policy could not reach by itself IS NOW CLOSED by the
--    SECURITY INVOKER guard trigger in section 3. The earlier reasoning still
--    explains WHY the policy alone cannot do it: an RLS WITH CHECK sees only the
--    NEW row, so it cannot say "status did not change", and a flat
--    "status <> 'active'" on the practitioner branch would reject the legitimate
--    practitioner view-mode edit that keeps an already-active row at 'active'.
--    The guard trigger CAN compare OLD vs NEW, so it blocks the
--    not-active -> active transition (and any patient_id set/change) for a
--    DIRECT authenticated client, while allowing the consent RPC (which carries
--    the app.consent_path GUC) and service_role. The combined INSERT-patient_id-
--    NULL rule (section 1) plus this guard removes BOTH halves of the bypass: a
--    client can no longer (a) INSERT a row naming an arbitrary victim, nor
--    (b) UPDATE any row it owns to 'active' or set patient_id. The only
--    remaining residual is the inherent one for ANY app like this: a holder of
--    the service_role key, or a superuser/admin/migration role, can write
--    directly (by design those roles bypass RLS and are trusted). No
--    authenticated-client path to a forged active relationship remains.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users update own practitioner_patients" ON public.practitioner_patients;

CREATE POLICY "Users update own practitioner_patients"
  ON public.practitioner_patients
  FOR UPDATE
  USING (
    auth.uid() = practitioner_id
    OR auth.uid() = patient_id
  )
  WITH CHECK (
    (auth.uid() = practitioner_id OR auth.uid() = patient_id)
    AND (status <> 'active' OR auth.uid() = practitioner_id)
    AND (patient_id IS NULL OR practitioner_id <> patient_id)
  );

-- ---------------------------------------------------------------------------
-- 3. GUARD TRIGGER (the part RLS cannot do): forbid a DIRECT authenticated
--    client from activating a relationship or from setting / changing
--    patient_id. This is what finally closes the high-severity bypass where a
--    credentialed practitioner INSERTs an 'invited' row and then UPDATEs it to
--    'active' (RLS exempts the practitioner branch from the status guard, so the
--    policy alone cannot stop the transition; only an OLD-vs-NEW comparison can,
--    and that lives in a trigger).
--
--    SECURITY MODEL (CRITICAL):
--      * The function is SECURITY INVOKER (the default; we do NOT mark it
--        SECURITY DEFINER). If it were SECURITY DEFINER, current_user inside it
--        would become the FUNCTION OWNER for every caller, erasing the very
--        distinction we need.
--      * We distinguish the legitimate consent path from a direct client by a
--        TRANSACTION-LOCAL GUC: public.accept_practitioner_invitation (section 4)
--        runs set_config('app.consent_path','on', true) on itself before it does
--        the invited -> active + patient_id write. is_local = true scopes the
--        setting to the RPC's own transaction; it is reset when that transaction
--        ends and is never visible to a different client statement. A direct
--        PostgREST client cannot set this GUC on its own UPDATE/INSERT, so it can
--        never reach the activation / patient_id-write branch.
--      * We ALSO allow current_user = 'service_role' (the service key bypasses
--        RLS by design and legitimately performs admin/maintenance writes), and
--        any non-'authenticated' role (admin/superuser/migration). The guard
--        therefore restricts ONLY 'authenticated' (the role every direct
--        PostgREST end-user request runs as) that is NOT carrying the consent
--        GUC. Reason we key the restriction on current_user = 'authenticated'
--        (rather than current_user <> owner): it is the one role we can name with
--        certainty for an end-user client in this Supabase project, and failing
--        that test open for the consent GUC keeps the legitimate RPC working
--        regardless of who owns it.
--
--    FAIL DIRECTION: deny for the direct authenticated client; allow the RPC,
--    service_role, and admin. A blocked condition RAISEs, aborting the write.
--
--    WHY IT DOES NOT BREAK THE REAL FLOWS (each verified against the codebase):
--      (a) invite INSERT (invite-patient route, authenticated): status =
--          'invited' (not 'active') and patient_id IS NULL -> neither INSERT
--          branch fires -> RETURN NEW.
--      (b) practitioner view-mode UPDATE (patient-view-preference route,
--          authenticated): WHERE status = 'active', writes only
--          patient_view_mode_override; OLD.status = 'active' so the transition
--          test COALESCE(OLD.status,'') <> 'active' is FALSE -> not an
--          activation; patient_id is unchanged -> neither UPDATE branch fires.
--      (c) revoke (status -> 'revoked'): NEW.status <> 'active' -> activation
--          branch does not fire; patient_id unchanged -> passes.
--      (d) accept RPC (section 4): carries app.consent_path = 'on' -> the
--          'authenticated'-restriction block is skipped entirely -> its
--          invited -> active + patient_id write is allowed. (The RPC is SECURITY
--          DEFINER and already bypasses RLS; this trigger fires inside it, which
--          is exactly why the GUC exemption is required.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_guard_practitioner_patient_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Only constrain a DIRECT authenticated client that is NOT on the consent
  -- path. The consent RPC sets app.consent_path = 'on' on itself; service_role
  -- and admin/superuser/migration roles are not 'authenticated' and are allowed.
  IF current_user = 'authenticated'
     AND COALESCE(current_setting('app.consent_path', true), '') <> 'on'
  THEN
    IF TG_OP = 'UPDATE' THEN
      -- Activation must go through accept_practitioner_invitation.
      IF NEW.status = 'active' AND COALESCE(OLD.status, '') <> 'active' THEN
        RAISE EXCEPTION
          'consent_required: activation must go through accept_practitioner_invitation';
      END IF;
      -- patient_id is set only by the consent flow.
      IF NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN
        RAISE EXCEPTION
          'consent_required: patient_id is set only by the consent flow';
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      IF NEW.status = 'active' THEN
        RAISE EXCEPTION
          'consent_required: activation must go through accept_practitioner_invitation';
      END IF;
      IF NEW.patient_id IS NOT NULL THEN
        RAISE EXCEPTION
          'consent_required: patient_id is set only by the consent flow';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_guard_practitioner_patient_activation() FROM public;

DROP TRIGGER IF EXISTS trg_guard_practitioner_patient_activation
  ON public.practitioner_patients;

CREATE TRIGGER trg_guard_practitioner_patient_activation
  BEFORE INSERT OR UPDATE ON public.practitioner_patients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_practitioner_patient_activation();

-- ---------------------------------------------------------------------------
-- 4. CONSENT RPC RE-CREATE: assert the consent-path GUC.
--
--    This is a CREATE OR REPLACE of public.accept_practitioner_invitation whose
--    body is copied VERBATIM from 20260418000150 (the atomic token + status =
--    'invited' claim with ROW_COUNT double-claim protection), with EXACTLY ONE
--    line added at the top of the body:
--        PERFORM set_config('app.consent_path', 'on', true);
--    so that the legitimate invited -> active + patient_id write is recognized
--    by the section 3 guard. is_local = true scopes the flag to this function's
--    transaction; it does not persist past the RPC and is not visible to any
--    other client statement. The signature, RETURNS shape, SECURITY DEFINER,
--    search_path, and GRANTs are preserved identically; 20260418000150 is not
--    edited (append-only is satisfied because this is a new definition in THIS
--    migration that supersedes the prior one at apply time).
--
--    NOTE on ordering: because the guard trigger (section 3) now exists, the
--    accept RPC MUST carry the GUC or its own invited -> active write would be
--    blocked when called by an authenticated end user. That is precisely why the
--    RPC is re-created here in the SAME migration as the trigger.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_practitioner_invitation(
  p_token                          TEXT,
  p_consent_share_caq              BOOLEAN,
  p_consent_share_engagement_score BOOLEAN,
  p_consent_share_protocols        BOOLEAN,
  p_consent_share_nutrition        BOOLEAN,
  p_can_view_genetics              BOOLEAN
)
RETURNS TABLE (
  ok BOOLEAN,
  relationship_id UUID,
  practitioner_user_id UUID,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id   UUID;
  v_pract UUID;
  v_rows INTEGER;
BEGIN
  -- Mark this call as the legitimate consent path so the section 3 guard
  -- trigger allows the invited -> active + patient_id write below. Scoped to
  -- this transaction only (is_local = true); reset when the RPC returns.
  PERFORM set_config('app.consent_path', 'on', true);

  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'unauthenticated'::TEXT;
    RETURN;
  END IF;

  -- Atomic claim: only the row matching token AND status='invited' is
  -- updated. A racing second caller sees ROW_COUNT = 0 below and is told
  -- the invitation is no longer valid.
  UPDATE public.practitioner_patients
     SET patient_id              = v_user,
         status                  = 'active',
         consent_granted_at      = now(),
         invitation_accepted_at  = now(),
         invitation_token        = NULL,
         consent_share_caq              = p_consent_share_caq,
         consent_share_engagement_score = p_consent_share_engagement_score,
         consent_share_protocols        = p_consent_share_protocols,
         consent_share_nutrition        = p_consent_share_nutrition,
         can_view_genetics              = p_can_view_genetics,
         updated_at = now()
   WHERE invitation_token = p_token
     AND status = 'invited'
   RETURNING id, practitioner_id INTO v_id, v_pract;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'invalid_or_used'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_id, v_pract, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_practitioner_invitation(
  TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_practitioner_invitation(
  TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;
