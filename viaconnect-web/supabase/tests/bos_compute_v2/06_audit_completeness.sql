-- pgTAP: backfill audit completeness
-- Verifies all 10 pre-existing rows are now fully populated with the
-- expected backfill values and the row count is still exactly 10
-- (no data loss).
BEGIN;
SELECT plan(5);

-- All rows have tier (NOT NULL enforces this; assert backfill value)
SELECT is(
  (SELECT COUNT(*)::int FROM public.bio_optimization_history WHERE tier = 1),
  (SELECT COUNT(*)::int FROM public.bio_optimization_history),
  'All bio_optimization_history rows have tier = 1 (legacy backfill)'
);

-- All rows have confidence = 0.720 (Tier 1 confidence per spec)
SELECT is(
  (SELECT COUNT(*)::int FROM public.bio_optimization_history WHERE confidence = 0.720),
  (SELECT COUNT(*)::int FROM public.bio_optimization_history),
  'All bio_optimization_history rows have confidence = 0.720'
);

-- All rows have compute_version = pre_ssot_unknown
SELECT is(
  (SELECT COUNT(*)::int FROM public.bio_optimization_history
    WHERE compute_version = 'pre_ssot_unknown'),
  (SELECT COUNT(*)::int FROM public.bio_optimization_history),
  'All bio_optimization_history rows have compute_version = pre_ssot_unknown'
);

-- All rows have breakdown containing _sentinel marker
SELECT is(
  (SELECT COUNT(*)::int FROM public.bio_optimization_history
    WHERE breakdown ? '_sentinel'),
  (SELECT COUNT(*)::int FROM public.bio_optimization_history),
  'All bio_optimization_history rows have _sentinel marker in breakdown'
);

-- Row count is still exactly 10 (no data loss from the migration)
SELECT is(
  (SELECT COUNT(*)::int FROM public.bio_optimization_history),
  10,
  'bio_optimization_history retains exactly 10 rows post-migration'
);

SELECT * FROM finish();
ROLLBACK;
