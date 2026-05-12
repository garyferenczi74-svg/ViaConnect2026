# pgTAP suite for bos_compute_v2 migration

Paired with `supabase/migrations/20260512020236_bos_compute_v2.sql`.

These tests are run by the orchestrator via the Supabase MCP after the
migration applies to a Supabase branch. They are designed to be read
once: each file is a `BEGIN; ... ROLLBACK;` block so no side effects
persist after a successful run.

## File layout

- `01_bos_history_shape.sql` (22 assertions) shape of bio_optimization_history after the migration: new columns and types, NOT NULL flags, CHECK constraints, UNIQUE (user_id, date, compute_seq), preserved idx_bio_history, dropped legacy (user_id, date) unique index.
- `02_rpc_contract.sql` (8 assertions) compute_bio_optimization_score signature, SECURITY DEFINER, valid insert, invalid tier/confidence/score raise 22023, anon raises 42501, same-day second call increments compute_seq.
- `03_trigger_projection.sql` (7 assertions) trigger exists; INSERT updates profiles.bio_optimization_score and upserts daily_scores with bio_optimization_score only (Q3 narrow); other daily_scores columns stay NULL; health_scores untouched (Q2); single daily_scores row per user-day.
- `04_queue_schema.sql` (11 assertions) bos_compute_queue exists with required columns, source CHECK constraint, idx_bos_queue_unprocessed partial index, RLS enabled.
- `05_telemetry_schema.sql` (10 assertions) bos_write_telemetry exists with required columns, write_target CHECK constraint, idx_bos_telemetry_dashboard, RLS enabled.
- `06_audit_completeness.sql` (5 assertions) all 10 pre-existing rows have tier=1, confidence=0.720, compute_version=pre_ssot_unknown, breakdown contains _sentinel; row count is still exactly 10.
- `07_idempotency.sql` (7 assertions) exactly one of each named object: trigger, two functions, RLS policy, unique index, two queue/telemetry tables.

## Expected post-migration state

Every assertion is expected to PASS after the orchestrator applies
`20260512020236_bos_compute_v2.sql` to the Supabase branch. If `auth.users`
is empty in the branch (no fixture users), assertions in 02 and 03 that
depend on a user_id will short-circuit with a NOTICE rather than fail.
In that case the orchestrator should seed one fixture user before
running the suite or accept the NOTICE.

## How to run

The orchestrator runs each file via `supabase db reset --use-migra` plus
`psql -f <file>.sql` against the branch DB. There is no harness script
in the project; pgTAP output goes to stdout in TAP format. Orchestrator
parses `not ok` lines as failures.

## Roll-forward safety

Each file uses `BEGIN; ... ROLLBACK;` so test data does not persist.
Production data is read but never mutated outside the transaction.
Service_role role-set inside `02` and `03` are scoped to the file's
transaction and revert on ROLLBACK.
