-- ============================================================
-- Prompt #54a follow-up: realtime for user_notifications
-- ============================================================
-- The notification bell now subscribes via Supabase Realtime to
-- INSERT/UPDATE on user_notifications, but the table wasn't part of
-- the supabase_realtime publication, so the channel never received
-- any rows. Add it idempotently.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime' AND tablename='user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
  END IF;
END $$;
