-- =============================================================================
-- Prompt #85n: covering indexes for the heat-map change-data hooks.
-- =============================================================================
-- The new useFatChangeData and useMuscleChangeData hooks issue
--   SELECT ... FROM body_tracker_segmental_fat
--   WHERE user_id = $1
--   ORDER BY created_at DESC
--   LIMIT 2
-- on every Body Tracker page mount, with the matching shape against
-- body_tracker_segmental_muscle. Neither table currently has a covering
-- (user_id, created_at DESC) index, so the planner falls back to a heap
-- scan filtered by user_id (see prompt #85n perf-advisor audit).
--
-- These two append-only CREATE INDEX IF NOT EXISTS statements close the
-- gap. Both are referenced by an active query, so the autoheal index
-- sweeper (jeffery-perf-autoheal) keeps them pinned and will not strip
-- them on the nightly unused-index pass.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bt_seg_fat_user_created
  ON public.body_tracker_segmental_fat (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bt_seg_muscle_user_created
  ON public.body_tracker_segmental_muscle (user_id, created_at DESC);

COMMENT ON INDEX public.idx_bt_seg_fat_user_created IS
  'Prompt #85n: covers useFatChangeData (user_id eq + created_at DESC + limit 2).';

COMMENT ON INDEX public.idx_bt_seg_muscle_user_created IS
  'Prompt #85n: covers useMuscleChangeData (user_id eq + created_at DESC + limit 2).';
