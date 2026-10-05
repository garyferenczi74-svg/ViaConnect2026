# Manual SQL

Gary applies every file in this directory by hand. A routine `supabase db push` does not run them.

`supabase/pending/NOT_APPLIED_locked_ingredient_display.sql` is a draft display-lock log. It is not in this directory and it is not applied. Do not run it with this runbook.

`supabase/migrations/` from this change contains only `20260926190000_retire_performance_advisor_autoheal.sql`. That file unschedules pg_cron job `performance_advisor_autoheal`. It does not unschedule `security_advisor_autoheal`.

Apply order, after confirming production job 10 is still paused:

1. Let the migration runner apply `20260926190000_retire_performance_advisor_autoheal.sql`.
2. Optional. `optional_drop_performance_advisor_autoheal_function.sql` drops `extensions.performance_advisor_autoheal_run()` and `extensions.performance_advisor_autoheal()` only. Skip it to keep the function body. It does not drop or alter `extensions.performance_advisor_autoheal_log` or `extensions.policy_rewrite_backup`.
3. Optional. `optional_unschedule_security_advisor_autoheal.sql` unschedules pg_cron job `security_advisor_autoheal` only. Gary decides at apply time. It does not drop or alter that job's function.
4. `flatten_auth_uid_policies.sql` is a generated template, not a migration. Follow the runbook below. Do not apply the copy that is already in the repo without regenerating it.

Needs Gary approval before applying.

The 361 dropped indexes are report-only. Do not recreate them. Do not drop or alter `extensions.policy_rewrite_backup` or `extensions.performance_advisor_autoheal_log`.

## Flatten apply runbook

Run these from `viaconnect-web`, in one `psql` session pointed at the target database. Keep the dump files outside this repository. Do not commit them.

The single transaction takes `ACCESS EXCLUSIVE` on every altered table (335 in the 2026-09-26 template, including `public.profiles`) and holds those locks until `COMMIT`. Apply it in a quiet window, with job 10 still paused. `lock_timeout` is 3 seconds, so a busy table fails the transaction instead of waiting.

### a. Dump `pg_policies` first

This file is the rollback source. It is also the snapshot the generator reads.

```bash
psql -v ON_ERROR_STOP=1 -At <<'SQL' > "$HOME/pg_policies-before.json"
SELECT json_build_object(
  'meta', json_build_object(
    'source', 'pg_policies rollback dump',
    'captured_mt', to_char(clock_timestamp() AT TIME ZONE 'America/Edmonton', 'YYYY-MM-DD HH24:MI:SS'),
    'search_path', current_setting('search_path')
  ),
  'policies', COALESCE((
    SELECT json_agg(json_build_object(
      'schemaname', schemaname,
      'tablename', tablename,
      'policyname', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    ) ORDER BY schemaname, tablename, policyname)
    FROM pg_policies
  ), '[]'::json)
);
SQL
```

Copy `meta.search_path` from that file. Pass it unchanged to `--search-path` in the next step. `pg_get_expr` qualification depends on `search_path`. A different path makes the md5 guards raise on policies that have not changed.

The 2026-09-26 capture notes did not store `SHOW search_path`. The template in this directory was generated with `"$user", public, extensions`, the Supabase `postgres` role default (`ALTER ROLE postgres SET search_path TO "$user", public, extensions`). The snapshot text matches that path and does not match a path that includes `auth`: public routines and enums are unqualified, while `auth.uid()`, `auth.jwt()`, `auth.role()`, and `storage.foldername()` are schema-qualified. A fresh dump must use the path from its own session.

### b. Regenerate the template from that snapshot

```bash
node --experimental-strip-types scripts/audit/flatten-auth-policies.ts \
  --snapshot "$HOME/pg_policies-before.json" \
  --backup <policy-rewrite-backup-earliest.json> \
  --merges <autoheal-merges.json> \
  --migrations supabase/migrations \
  --search-path '<meta.search_path from the dump>' \
  --out supabase/manual/flatten_auth_uid_policies.sql \
  --summary-out "$HOME/flatten-summary.json"
```

Read the new header. The snapshot id, capture time, and `search_path` must be the dump you just took.

### c. Optional dry run

The template already contains `BEGIN` and a trailing `COMMIT`. This substitution runs the same statements and ends in `ROLLBACK`. It does not change the file on disk.

```bash
psql -v ON_ERROR_STOP=1 -f <(sed '$ s/^COMMIT;$/ROLLBACK;/' supabase/manual/flatten_auth_uid_policies.sql)
```

### d. Apply

```bash
psql -v ON_ERROR_STOP=1 -f supabase/manual/flatten_auth_uid_policies.sql
```

### e. Re-snapshot and compare

```bash
psql -v ON_ERROR_STOP=1 -At <<'SQL' > "$HOME/pg_policies-after.json"
SELECT json_build_object(
  'meta', json_build_object(
    'source', 'pg_policies after flatten',
    'captured_mt', to_char(clock_timestamp() AT TIME ZONE 'America/Edmonton', 'YYYY-MM-DD HH24:MI:SS'),
    'search_path', current_setting('search_path')
  ),
  'policies', COALESCE((
    SELECT json_agg(json_build_object(
      'schemaname', schemaname,
      'tablename', tablename,
      'policyname', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    ) ORDER BY schemaname, tablename, policyname)
    FROM pg_policies
  ), '[]'::json)
);
SQL
node --experimental-strip-types scripts/audit/diff-auth-policies.ts \
  --before "$HOME/pg_policies-before.json" \
  --after "$HOME/pg_policies-after.json" \
  --held public.engagement_score_snapshots
```

The compare prints counts and then `ok`. Any other difference exits 1.

### f. Lock window

`LOCK TABLE ... IN ACCESS EXCLUSIVE MODE` is emitted once per altered table, before that table's drift guards, inside the same `BEGIN`. It fits the single-transaction plan: there is still one `COMMIT`, and a guard failure rolls the locks back with the `ALTER POLICY` statements. The lock closes the gap between the md5 check and the `ALTER`. It does not shorten the lock window. The transaction holds exclusive locks on about 335 tables, including `profiles`, until `COMMIT`. Apply in a quiet window.
