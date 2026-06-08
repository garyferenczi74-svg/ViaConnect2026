-- Prompt 177k (2026-06-07): role-scoped lock_timeout + statement_timeout.
--
-- Background. A 14 second RowExclusiveLock burst on realtime.subscription
-- stalled authenticated requests app-wide while statements queued for
-- AccessShareLock and RowExclusiveLock on auth.users, auth.refresh_tokens,
-- realtime.subscription, and public.user_notifications. Postgres' default
-- lock_timeout is 0 (wait forever); a contended statement therefore queues
-- until either the blocker releases or the route's own timeout fires.
--
-- Fail fast at the role level so a contended statement aborts in low
-- single-digit seconds. The application can then surface a structured
-- error (Part A of this prompt wires the CAQ generation interstitial to
-- handle that gracefully) instead of cascading. service_role and postgres
-- stay unlimited because background workers (BOS compute, Helix award
-- ledger, corpus writer) may legitimately run longer than 8 seconds.
--
-- Values picked to match the Supabase managed-project defaults that are
-- already in production for sibling projects and to align with the
-- serverless route budget on the consumer surface:
--
--   authenticated.lock_timeout       = 3s    Fail fast on contended writes
--   authenticated.statement_timeout  = 8s    Aligned with consumer routes
--   anon.lock_timeout                = 2s    Anonymous reads are cheap
--   anon.statement_timeout           = 5s    Anonymous reads are cheap
--
-- These settings only apply to NEW sessions; existing connections keep
-- their prior settings until the next reconnect. PgBouncer poolers refresh
-- their server connections under the session pool semantics within the
-- next idle cycle.
--
-- Reversal. The next migration can `ALTER ROLE ... RESET ...` to drop the
-- override back to the postgres defaults.

ALTER ROLE authenticated SET lock_timeout = '3s';
ALTER ROLE authenticated SET statement_timeout = '8s';

ALTER ROLE anon SET lock_timeout = '2s';
ALTER ROLE anon SET statement_timeout = '5s';

-- service_role intentionally NOT touched. Background workers and admin
-- maintenance run as service_role and must be free to take longer than
-- the consumer route budget.
