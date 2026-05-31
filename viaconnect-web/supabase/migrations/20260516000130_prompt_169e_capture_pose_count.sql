-- =============================================================================
-- Prompt #169e Phase 1 (section 3.1): four-view capture pose count
-- Migration: 20260516000130_prompt_169e_capture_pose_count.sql
-- Parent table: body_photo_sessions (20260416000090)
-- Append-only, idempotent: ADD COLUMN IF NOT EXISTS only; no DROP, no data edits.
-- Timestamp sits AFTER the last #169 migration (20260516000120) and BELOW the
-- live #170 range (20260516120010), per the prompt's placement constraint.
-- =============================================================================
--
-- capture_pose_count records how many distinct poses a capture run used. The
-- standard flow captures four views (front, back, left, right) and persists 4.
-- The CHECK constrains the value to the allowed set so it can never drift; the
-- "IS NULL" arm is defensive only (the column is NOT NULL DEFAULT 4) and is kept
-- verbatim from the #169e spec.
--
-- SILHOUETTE URL COLUMNS: NOT added. The #169d/#169e drafts proposed
-- silhouette_back_url / silhouette_right_url / silhouette_left_url, but
-- body_photo_sessions already persists the four photos as
-- front/back/left/right_full_path (+ _thumb_path) plus a silhouette_data JSONB
-- summary (20260416000100). The capture flow uploads each pose's fused frame to
-- {pose}_full_path and does NOT produce separate per-pose silhouette image URLs
-- that need their own home, so adding those columns would be redundant, unused
-- schema. The existing full_path + silhouette_data model already covers all four
-- views; per the prompt, those columns are SKIPPED.
-- =============================================================================

ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS capture_pose_count INTEGER NOT NULL DEFAULT 4
    CHECK (capture_pose_count IS NULL OR capture_pose_count IN (2, 4));
