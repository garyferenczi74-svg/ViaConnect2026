-- ============================================================
-- Prompt #54a follow-up: extend user_notifications with link + metadata
-- ============================================================
-- The protocol_share_accept and protocol_share_revoke RPCs in
-- migration 20260407000060 insert into user_notifications.link and
-- user_notifications.metadata, but the original table from earlier in
-- the project doesn't have those columns. Without them, accepting or
-- revoking a share raises a "column does not exist" error inside the
-- SECURITY DEFINER body and the entire RPC is aborted.
--
-- Add the columns idempotently and backfill metadata to '{}' so the
-- existing share RPCs (and the upcoming notification bell) just work.

ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS link TEXT;

ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON user_notifications (user_id, is_read, created_at DESC)
  WHERE is_dismissed = false;
