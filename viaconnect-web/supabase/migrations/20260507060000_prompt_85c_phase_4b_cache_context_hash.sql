-- =============================================================================
-- Prompt #85c Phase 4b: cache invalidation via context hash
-- =============================================================================
-- Adds a context_hash column to body_tracker_recommendations so the
-- arnold-cross-reference-recommend Edge Function can detect upstream data
-- changes (supplements, CAQ, genetics, chronic_risk, active_journey) and
-- invalidate cached recommendations even within the 6 hour window.
--
-- Backward compatible: existing rows have NULL context_hash and will fail
-- the hash-match cache check, forcing one-time regeneration on next request.
-- =============================================================================

ALTER TABLE body_tracker_recommendations
  ADD COLUMN IF NOT EXISTS context_hash TEXT;

-- Cache lookup index: matches the Edge Function query
--   WHERE user_id = $1 AND context_hash = $2 AND dismissed_at IS NULL
--   ORDER BY generated_at DESC LIMIT 1
-- Partial index keeps it small by excluding dismissed rows.
CREATE INDEX IF NOT EXISTS idx_bt_recs_user_hash_active
  ON body_tracker_recommendations (user_id, context_hash, generated_at DESC)
  WHERE dismissed_at IS NULL;

COMMENT ON COLUMN body_tracker_recommendations.context_hash IS
  'SHA-256 hex of the user data block at generation time. Cache hit requires hash match plus the existing window plus non-dismissed filters.';
