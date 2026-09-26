# Manual SQL

Gary applies every file in this directory by hand. A routine `supabase db push` does not run them.

`supabase/migrations/` from this change contains only `20260926190000_retire_performance_advisor_autoheal.sql`. That file unschedules pg_cron job `performance_advisor_autoheal`. It does not unschedule `security_advisor_autoheal`.

Apply order, after confirming production job 10 is still paused:

1. Let the migration runner apply `20260926190000_retire_performance_advisor_autoheal.sql`.
2. Optional. `optional_drop_performance_advisor_autoheal_function.sql` drops `extensions.performance_advisor_autoheal_run()` and `extensions.performance_advisor_autoheal()` only. Skip it to keep the function body. It does not drop or alter `extensions.performance_advisor_autoheal_log` or `extensions.policy_rewrite_backup`.
3. Optional. `optional_unschedule_security_advisor_autoheal.sql` unschedules pg_cron job `security_advisor_autoheal` only. Gary decides at apply time. It does not drop or alter that job's function.
4. `flatten_auth_uid_policies.sql` is a generated template, not a migration. Regenerate it from a fresh `pg_policies` snapshot immediately before applying. The file header has the generator command. Each `ALTER POLICY` is preceded by an md5 drift guard. The file is one transaction (`BEGIN` / `COMMIT`, `SET LOCAL lock_timeout`, `SET LOCAL statement_timeout`). Any guard failure rolls the whole template back.

Needs Gary approval before applying.

The 361 dropped indexes are report-only. Do not recreate them. Do not drop or alter `extensions.policy_rewrite_backup` or `extensions.performance_advisor_autoheal_log`.
