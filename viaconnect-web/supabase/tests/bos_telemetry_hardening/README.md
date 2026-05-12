# pgTAP suite for bos_telemetry_hardening migration

Paired with `supabase/migrations/20260512074126_bos_telemetry_hardening.sql` (#161b).

Run by the orchestrator via the Supabase MCP after the migration applies. Local execution is not supported because the suite touches `public.bos_compute_queue`, `public.bos_write_telemetry`, and `cron.job` in the live branch DB.

## File layout

- `01_sanitize_function.sql` (15 assertions) parity suite for `bos_sanitize_error_message(text)`. Mirrors the TypeScript test cases in `src/lib/scoring/__tests__/sanitize-error.test.ts` so the two implementations stay in lockstep. Null, empty string, lowercase / uppercase / mixed case / multi UUID redaction, position varying UUID, almost-UUID negative case, truncation at 499 / 500 / 501 / 5000 chars, combined UUID redaction + truncation. Wrapped in `BEGIN ... ROLLBACK`.
- `02_retention_sweep.sql` (7 assertions) behavior suite for `bos_telemetry_retention_sweep()`. Inserts a 91 day old and a 89 day old telemetry row plus a 31 day old and a 29 day old processed queue row, calls the sweep, then asserts the 91 + 31 day rows are gone and the 89 + 29 day rows survive. Also asserts the sweep returns two rows with the expected `table_name` values and non-negative deletion counts. Wrapped in `BEGIN ... ROLLBACK`.
- `03_cron_registration.sql` (4 assertions) inspects `cron.job` to confirm the migration registered exactly one `bos_telemetry_retention_sweep` job with schedule `0 4 * * *` (daily 04:00 UTC) and a command that invokes the sweep function. NOT wrapped in `BEGIN ... ROLLBACK` because `cron.job` is global state and the test is read only.

## Expected post-migration state

Every assertion is expected to PASS after the orchestrator applies `20260512074126_bos_telemetry_hardening.sql` to the branch. If `auth.users` is empty in the branch, the fixture inserts in `02` short circuit with a NOTICE; the four existence + survival assertions then evaluate against the empty result sets and produce expected non hits. The orchestrator should seed one fixture user before running `02` or accept the NOTICE.

## How to run

Same convention as `supabase/tests/bos_compute_v2/`: orchestrator runs each file via `psql -f <file>.sql` against the branch DB. pgTAP output goes to stdout in TAP format; orchestrator parses `not ok` lines as failures.

## Roll-forward safety

`01` and `02` use `BEGIN ... ROLLBACK` so the fixture rows and call side effects do not persist. `03` is read only and inspects `cron.job` without mutation. Production data is read but never mutated outside the transactions in `01` and `02`.
