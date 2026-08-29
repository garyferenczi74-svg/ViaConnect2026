-- =============================================================================
-- Prompt 231b: role-independent G81 gate for pose landmarks.
-- =============================================================================
-- The finalize route writes frame rows through the ADMIN (service_role)
-- Supabase client. service_role bypasses RLS and column-privilege grants
-- entirely, so the column-level REVOKE in 20260829120000 and the table-level
-- REVOKE in 20260829150000 do not constrain it. If SCAN_PERSIST_LANDMARKS
-- were ever flipped on by accident, or the app-layer omission in
-- buildFrameRow (src/lib/scan/finalizeFrameRow.ts) were ever bypassed or
-- broken, no REVOKE or RLS policy would stop landmarks from being written.
-- A CHECK constraint is bypassed by no role, including service_role and the
-- table owner, so it is the only gate that holds regardless of who or what
-- writes the row.
--
-- body_photo_session_frames is a NEW table, created in 20260829120000.
-- Landmarks have never been persisted (SCAN_PERSIST_LANDMARKS has been OFF
-- since the table was created), so this constraint is expected to apply
-- against zero non-null landmarks rows. Gary confirms this with the count
-- query below before this migration is applied to any database:
--
--   select count(*) from body_photo_session_frames where landmarks is not null;
--
-- Append-only. Author + contract-test only; NOT applied to any live
-- database by this change (application is a separate Gary/Supabase step).
-- =============================================================================

alter table body_photo_session_frames
  add constraint landmarks_gated_by_g81 check (landmarks is null);

comment on constraint landmarks_gated_by_g81 on body_photo_session_frames is
  'G81: pose landmarks are not persisted until Lex rules on biometric classification. Dropped by the pending Lex-clear migration.';

-- =============================================================================
-- Done. No role, including service_role, can insert or update a non-null
-- landmarks value on body_photo_session_frames while this constraint stands.
-- Dropped only by the pending file in supabase/pending/, and only after
-- Lex clears G81.
-- =============================================================================
