-- =============================================================================
-- Prompt #169f Section 5.4: FAMILY MEMBER SHARING PREFERENCES
-- Migration: 20260516000190_prompt_169f_family_sharing_prefs.sql
-- Entity: Farmceutica Wellness Ltd
--
-- WHY THIS EXISTS (the 169f delta this closes):
--   169f Section 5.4 establishes member-controlled autonomy inside a
--   platinum_family pool: each family member's data is PRIVATE BY DEFAULT, and a
--   member may individually opt IN to share, with their family plan HOLDER, two
--   narrow things, and nothing more:
--     (a) their Body Tracker trend SUMMARY (not raw data), and
--     (b) their FormaVision scan COMPLETION notifications (not the scan data).
--   "Parental consent for the account does not grant parental access to the
--   account's health data." The control therefore belongs to the MEMBER. A holder
--   must never be able to flip a member's sharing on.
--
-- WHY A NEW TABLE (and NOT the family_members.permissions jsonb):
--   public.family_members (migration 20260418000020) already carries a permissions
--   jsonb, but that jsonb is HOLDER -> member (view_data / approve_protocols /
--   manage_members) and lives on a row that is HOLDER-writable
--   (RLS family_members_primary_full_access: primary_user_id = auth.uid()). A
--   holder-writable column cannot hold a member-owned preference without breaking
--   the autonomy guarantee. So the member's sharing prefs live in their OWN row in
--   a NEW table keyed by the member's auth user id, where only the member can
--   write and the holder is granted read-only visibility.
--
-- SCOPE (deliberate, per 169f): this migration builds the member's control surface
--   data model + the access model that enforces it (member-write, holder-read).
--   It does NOT build the holder-side family health dashboard that would aggregate
--   and render the shared summaries; that is a larger, separate feature 169f does
--   not fully spec.
--
-- MIGRATION NUMBERING:
--   This is 20260516000190. It sorts AFTER the entire #169f set (050..180) and is
--   clear of the live #170 range (20260516120010+). Append-only: this is a NEW
--   file; migration 20260418000020 (which owns family_members and the shared
--   updated_at trigger function) and every other existing migration is never
--   edited.
--
-- HARD RULES (per spec): ENABLE RLS with BOTH policies present; member-write only
--   via the self FOR ALL policy (USING + WITH CHECK both user_id = auth.uid());
--   holder is SELECT-only and can never write; idempotent (CREATE TABLE IF NOT
--   EXISTS, guarded DROP POLICY IF EXISTS then CREATE, pg_trigger existence guard
--   on the trigger); reuse the existing public.memberships_set_updated_at function
--   for updated_at. No em-dashes or en-dashes; ASCII only.
-- =============================================================================


-- =============================================================================
-- 1. TABLE public.family_member_sharing_prefs
--    One row per user, keyed by the user's own auth id. Both flags default FALSE
--    (private by default). A row is created lazily on the member's first write
--    (the hook upserts), so the ABSENCE of a row is equivalent to "shares nothing"
--    and the holder-read path treats a missing row as both-false.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.family_member_sharing_prefs (
  user_id                       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  share_body_tracker_summary    boolean NOT NULL DEFAULT false,
  share_formavision_completion  boolean NOT NULL DEFAULT false,
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.family_member_sharing_prefs IS
  '169f section 5.4 member-controlled sharing. Each row is owned by user_id (the family member). Member fully controls their own row (member-write via the self policy); the family plan holder gets SELECT-only visibility of an ACTIVE member''s row. Private by default: both flags default false and a missing row means shares nothing.';
COMMENT ON COLUMN public.family_member_sharing_prefs.share_body_tracker_summary IS
  'When true, the member shares their Body Tracker trend SUMMARY (not raw data) with their family plan holder. Default false.';
COMMENT ON COLUMN public.family_member_sharing_prefs.share_formavision_completion IS
  'When true, the member shares their FormaVision scan COMPLETION notifications (not the scan data) with their family plan holder. Default false.';

ALTER TABLE public.family_member_sharing_prefs ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 2. RLS POLICIES
--
--   POLICY A (member self, FOR ALL): the member fully controls their OWN row. The
--   USING clause scopes every command to the caller's own row, and the WITH CHECK
--   clause forbids inserting/updating any row whose user_id is not the caller. This
--   is the autonomy guarantee: a member writes only their own prefs.
--
--   POLICY B (holder read, FOR SELECT only): a platinum_family holder may READ the
--   prefs of each of their ACTIVE family members, but has NO write path here at
--   all. The row's user_id must be the member_user_id of an active family_members
--   link whose primary_user_id = auth.uid() (the holder). Because this policy is
--   FOR SELECT, it grants zero INSERT/UPDATE/DELETE.
--
--   WHY A HOLDER CANNOT WRITE A MEMBER'S PREFS (the security argument):
--     * Postgres RLS permits a write only if at least one policy that APPLIES to
--       that command (INSERT/UPDATE/DELETE) passes its WITH CHECK (and, for
--       UPDATE/DELETE, its USING).
--     * Policy B is FOR SELECT, so it does NOT apply to any write command and can
--       never authorize one. It also has no WITH CHECK by construction.
--     * Policy A is the ONLY policy that applies to writes, and its USING and WITH
--       CHECK both require user_id = auth.uid(). When the actor is the holder,
--       auth.uid() is the HOLDER's id, but the row's user_id is the MEMBER's id, so
--       user_id = auth.uid() is FALSE and the write is rejected.
--     * The holder's broad family_members_primary_full_access policy lives on the
--       OTHER table (public.family_members) and has no reach onto this table.
--     Therefore no policy can ever authorize a holder writing a member's row: the
--     holder is strictly SELECT-only here, and the member alone can write.
-- =============================================================================

-- POLICY A: member self, full control of their own row.
DROP POLICY IF EXISTS family_member_sharing_prefs_self_all ON public.family_member_sharing_prefs;
CREATE POLICY family_member_sharing_prefs_self_all
  ON public.family_member_sharing_prefs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- POLICY B: holder read-only visibility of an ACTIVE member's row.
DROP POLICY IF EXISTS family_member_sharing_prefs_holder_read ON public.family_member_sharing_prefs;
CREATE POLICY family_member_sharing_prefs_holder_read
  ON public.family_member_sharing_prefs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.family_members fm
       WHERE fm.member_user_id = public.family_member_sharing_prefs.user_id
         AND fm.primary_user_id = auth.uid()
         AND fm.is_active = true
    )
  );

-- Covering index for the holder-read EXISTS lookup (member_user_id side).
CREATE INDEX IF NOT EXISTS idx_family_members_member_active_holder
  ON public.family_members (member_user_id, primary_user_id)
  WHERE is_active = true AND member_user_id IS NOT NULL;


-- =============================================================================
-- 3. updated_at TRIGGER
--    Reuse the existing public.memberships_set_updated_at() function (defined in
--    migration 20260418000020), which sets NEW.updated_at := now() on the row. We
--    do NOT define a new function. The trigger is created only if it does not yet
--    exist, so re-running this migration is a no-op (pg_trigger existence guard).
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_family_member_sharing_prefs_updated_at'
  ) THEN
    CREATE TRIGGER trg_family_member_sharing_prefs_updated_at
      BEFORE UPDATE ON public.family_member_sharing_prefs
      FOR EACH ROW EXECUTE FUNCTION public.memberships_set_updated_at();
  END IF;
END $$;
