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
--   Drops the two offending policies BY NAME and recreates them tightened:
--     * INSERT: only a real active practitioner may create a NON-active,
--       NON-self (or patient_id-NULL) row, and only in the legitimate initial
--       status 'invited'.
--     * UPDATE: keeps the existing actor gate (practitioner or patient on the
--       row) for legitimate non-activation edits (consent flag changes, view
--       mode, revoke), but ADDS a WITH CHECK that forbids a client from setting
--       status = 'active' (activation must go through the consent RPC) and
--       forbids turning a row into a self-relationship.
--
--   The SECURITY DEFINER consent RPC is unaffected: it bypasses RLS, so
--   tightening these client policies does not touch the invitation/accept flow.
--
-- HARD RULES: append-only (NEW file; the 20260326 / 20260418* policy migrations
--   are untouched), idempotent (DROP POLICY IF EXISTS before CREATE POLICY),
--   ASCII only (no em/en dashes), schema-qualified objects. SQL only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. INSERT policy: only an active practitioner may create a pending-style
--    (status = 'invited') relationship to someone other than themselves.
--
--    Notes on each clause:
--      * auth.uid() = practitioner_id
--          Preserves the original ownership requirement: a client may only
--          insert a row where they are the practitioner.
--      * (patient_id IS NULL OR practitioner_id <> patient_id)
--          Forbids a self-relationship. The legitimate invite inserts
--          patient_id = NULL (the patient is unknown until they accept), and
--          practitioner_id <> NULL evaluates to NULL (not TRUE), so a bare
--          "practitioner_id <> patient_id" would REJECT the legitimate insert.
--          The NULL escape keeps the legitimate invite working while still
--          blocking the self-forge (practitioner_id = patient_id = self).
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
    AND (patient_id IS NULL OR practitioner_id <> patient_id)
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
--    RESIDUAL (documented, intentionally not over-reached here): an active
--    practitioner could direct-UPDATE an 'invited' row THEY OWN to 'active',
--    skipping the patient-consent RPC. This is far narrower than the holes being
--    closed: the row must already exist with that exact patient_id, and
--    patient_id is only ever populated by the consent RPC (the patient's own
--    action) or stays NULL for an unaccepted invite, so a practitioner cannot
--    fabricate an active relationship to an arbitrary patient this way. Fully
--    forbidding the practitioner active-transition too would require OLD/NEW
--    state (a trigger), which cannot be added without also blocking the RPC's
--    own invited -> active write; closing it belongs to a separate consent-path
--    refactor, not this client-policy tightening.
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
