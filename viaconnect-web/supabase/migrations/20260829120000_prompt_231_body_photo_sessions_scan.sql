-- =============================================================================
-- Prompt 231 Task 12: converge migration (body_photo_sessions + frames child)
-- G84 = CONVERGE. Reuse body_photo_sessions and the existing private bucket
-- body-progress-photos. This migration deliberately creates no parallel
-- scan-specific table family and no new storage bucket; everything hangs off
-- the existing body_photo_sessions row plus its new frames child below.
--
-- Part A: append-only ADD COLUMN IF NOT EXISTS on body_photo_sessions for the
--   4-pose scan flow. protocol DEFAULT 'journal_v0' backfills every existing
--   row; the new capture flow writes protocol='4pose_v1'. Does not re-declare
--   any live column (session_date, per-pose paths, poses_completed,
--   is_complete, arnold_*, linked_entry_id, height_cm_at_scan,
--   height_cm_source, user_id, created_at all already exist).
--
-- Part B: new child table body_photo_session_frames, one row per pose per
--   session. UNIQUE(session_id, view) is the FK-covering index (condition
--   15); no bare session_id index is added. This table carries no per-row
--   image path column; per-pose image paths stay on the parent session's
--   wide {pose}_full_path / {pose}_thumb_path columns.
--
-- Part C: RLS on body_photo_session_frames. The child table has no user_id
--   column, so every policy resolves ownership through the parent session via
--   EXISTS (SELECT 1 FROM body_photo_sessions s WHERE s.id = session_id AND
--   s.user_id = (select auth.uid())). One policy per action (select, insert,
--   update, delete); no FOR ALL; no overlapping permissive SELECT policies;
--   (select auth.uid()) initplan form throughout, never raw auth.uid().
--
-- Index coverage (condition 17): the tile/history query is
--   WHERE user_id = ? AND protocol = '4pose_v1' ORDER BY session_date DESC
--   LIMIT 1 on body_photo_sessions. idx_photo_sessions_user_date
--   (user_id, session_date DESC), created in 20260416000090, already covers
--   this: protocol is a cheap residual predicate evaluated after the index
--   walk. No new or duplicate index is added on body_photo_sessions here; a
--   redundant index would be flagged by the performance advisor and dropped
--   by the autohealer.
--
-- Out of scope here (per the binding conditions doc): no parallel scan-table
-- family, no new storage bucket, no bucket-level mime/size change to
-- body-progress-photos (condition 14), no storage policy edits (the existing
-- owner + practitioner-share policies on body-progress-photos are untouched).
--
-- Author + contract-test only. NOT applied to any live database by this
-- change; application is a separate Gary/Supabase step.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Part A: body_photo_sessions new columns
-- -----------------------------------------------------------------------------
ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS protocol text NOT NULL DEFAULT 'journal_v0';

ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS capture_status text
    CHECK (capture_status IS NULL OR capture_status IN ('uploading','ready','partial','delete_pending','deleted'));

ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS consent_version text;

ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS device_info jsonb;

COMMENT ON COLUMN body_photo_sessions.protocol IS
  'Prompt 231: capture protocol that produced this session. journal_v0 is the pre-231 free-form flow (DEFAULT, backfills existing rows). 4pose_v1 is the new guided 4-pose scan flow.';

COMMENT ON COLUMN body_photo_sessions.capture_status IS
  'Prompt 231: lifecycle status of the capture within the session. NULL for pre-231 rows. Legacy readers must filter out delete_pending and deleted (condition 5).';

COMMENT ON COLUMN body_photo_sessions.consent_version IS
  'Prompt 231: version identifier of the consent copy the user acknowledged before this scan (condition 9). Server-checked, not localStorage-checked.';

COMMENT ON COLUMN body_photo_sessions.device_info IS
  'Prompt 231: coarse device metadata (UA family only, no raw UA string, no identifiers) captured with the session (condition 10).';

-- -----------------------------------------------------------------------------
-- Part B: body_photo_session_frames child table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS body_photo_session_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES body_photo_sessions(id) ON DELETE CASCADE,
  view text NOT NULL CHECK (view IN ('front','right','back','left')),
  qa jsonb NOT NULL,
  qa_mode text,
  captured_width int,
  captured_height int,
  skipped boolean NOT NULL DEFAULT false,
  retry_count int NOT NULL DEFAULT 0,
  landmarks jsonb,
  captured_at timestamptz,
  UNIQUE (session_id, view)
);

COMMENT ON TABLE body_photo_session_frames IS
  'Prompt 231: one row per pose captured within a body_photo_sessions row. UNIQUE(session_id, view) is the FK-covering index (condition 15); no separate session_id index. Carries no per-row image path column; per-pose image paths stay on the parent session wide columns.';

COMMENT ON COLUMN body_photo_session_frames.view IS
  'Which of the four guided poses this frame is: front, right, back, or left.';

COMMENT ON COLUMN body_photo_session_frames.qa IS
  'QA result payload for this frame capture (pose/quality checks), never image bytes or object URLs (condition 10).';

COMMENT ON COLUMN body_photo_session_frames.landmarks IS
  'Prompt 231 / G81: pose landmark data. Column exists dormant behind a server-only env flag default OFF. Never wired to UI. Submit route strips any client-supplied landmarks when the flag is OFF.';

ALTER TABLE body_photo_session_frames ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Part C: RLS on body_photo_session_frames, one policy per action, ownership
-- resolved through the parent session (the child has no user_id column).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'body_photo_session_frames'
      AND policyname = 'Users select own session frames'
  ) THEN
    CREATE POLICY "Users select own session frames"
      ON body_photo_session_frames FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM body_photo_sessions s
          WHERE s.id = session_id
            AND s.user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'body_photo_session_frames'
      AND policyname = 'Users insert own session frames'
  ) THEN
    CREATE POLICY "Users insert own session frames"
      ON body_photo_session_frames FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM body_photo_sessions s
          WHERE s.id = session_id
            AND s.user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'body_photo_session_frames'
      AND policyname = 'Users update own session frames'
  ) THEN
    CREATE POLICY "Users update own session frames"
      ON body_photo_session_frames FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM body_photo_sessions s
          WHERE s.id = session_id
            AND s.user_id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM body_photo_sessions s
          WHERE s.id = session_id
            AND s.user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'body_photo_session_frames'
      AND policyname = 'Users delete own session frames'
  ) THEN
    CREATE POLICY "Users delete own session frames"
      ON body_photo_session_frames FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM body_photo_sessions s
          WHERE s.id = session_id
            AND s.user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

-- =============================================================================
-- Done. body_photo_sessions gained protocol / capture_status / consent_version
-- / device_info (append-only, backfilled by DEFAULT). body_photo_session_frames
-- created with UNIQUE(session_id, view) as its only index and four per-action
-- RLS policies resolved through the parent session. No parallel scan-table
-- family, no new bucket, no bucket-level change, no new body_photo_sessions
-- index.
-- =============================================================================
