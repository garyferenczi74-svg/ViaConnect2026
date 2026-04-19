-- =============================================================================
-- Prompt #94 Phase 7 patch: Snapshot tick expected_period_minutes fix
-- =============================================================================
-- Append-only. The Phase 7 cron migration (_390) registered
-- unit-economics-snapshot-tick with expected_period_minutes = 43200
-- (30 days). The cron schedule '0 6 1 * *' actually fires every 28 to 31
-- days; February (28 or 29 days) lands well inside the window but March
-- to January (30 to 31 days) trips the staleness check at ~30.5 days.
-- Bump to 44640 (31 days) so all months satisfy the SLA.
-- =============================================================================

UPDATE public.ultrathink_agent_registry
   SET expected_period_minutes = 44640,
       updated_at = now()
 WHERE agent_name = 'unit-economics-snapshot-tick';
