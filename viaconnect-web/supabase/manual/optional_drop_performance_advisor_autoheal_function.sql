-- OPTIONAL. Gary can skip this file to keep the function body (the unschedule-only option).
-- The previous migration only unschedules pg_cron job performance_advisor_autoheal.
-- This file drops the two functions. It does not drop
-- extensions.performance_advisor_autoheal_log or extensions.policy_rewrite_backup.
-- The backup table holds the only record of the pre-rewrite policy definitions.
--
-- Needs Gary approval before applying.

DROP FUNCTION IF EXISTS extensions.performance_advisor_autoheal_run();   -- RETURNS integer
DROP FUNCTION IF EXISTS extensions.performance_advisor_autoheal();       -- RETURNS TABLE(action text, target text, note text)
