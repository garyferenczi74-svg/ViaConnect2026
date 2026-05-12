# pgTAP suite for bos_compute_seq UTC correctness (#161d-fix)

Paired with `supabase/migrations/20260512164309_bos_compute_seq_utc_correctness.sql`.

These tests gate the deploy of the UTC-pinning patch produced by #161d-fix.
They assert that the migration landed correctly by inspecting function
definitions and the column DEFAULT against `pg_proc` and
`information_schema.columns`. They do NOT reproduce the timezone bug at
runtime; behavior-reproduction tests are deferred per spec.

Reference: `docs/findings/161d-compute-seq-and-timezone-audit.md`

Gary's locked decisions (2026-05-12):
- Q2 (UTC-pin trigger for symmetry): YES
- Q3 (backfill 10 pre-SSOT rows): NO (audit-trail integrity)
- Q4 (production UTC session-tz forever?): NOT guaranteed, fix is load-bearing

## File layout

- `01_tz_boundary_reproduction.sql` (3 assertions) function-definition + column-default state assertions on the post-fix DB:
  - `compute_bio_optimization_score` body contains `now() AT TIME ZONE 'utc'`
  - `bio_optimization_history.date` DEFAULT is the UTC-pinned expression
  - `project_bio_optimization_score` body uses `(NEW.computed_at AT TIME ZONE 'utc')::date`

## Expected pre-migration state

All three assertions FAIL (RED). Pre-fix the function bodies contain
`CURRENT_DATE` (in the RPC) and `NEW.date` (in the trigger); the column
DEFAULT is `CURRENT_DATE`.

## Expected post-migration state

All three assertions PASS (GREEN).

## How to run

The orchestrator runs the file via `psql -f 01_tz_boundary_reproduction.sql`
against the Supabase branch DB after the migration applies. Output is TAP
format on stdout; `not ok` lines are failures.

## Roll-forward safety

The file is wrapped in `BEGIN; ... ROLLBACK;` so the assertion transaction
leaves no trace. No writes occur; the tests are pure introspection.
