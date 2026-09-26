# 2026-09-26 policy flatten audit

Times are MT (America/Edmonton, UTC-6). The raw catalog files are not in this repository. This note records counts, the snapshot sha256, the merge HOLD list, and what the local shadow could and could not prove.

Needs Gary approval before applying.

## Snapshot

File used: the 2026-09-26 `pg_policies` capture (all schemas). sha256 `df94404d465a08e9c7115038923be79b2ee41fda5f215100234f8f995aabf321`. 9,144,121 expression characters are recorded in the file's own meta as the cross-check against the aggregate query. The local file is 9,441,008 bytes.

| schema | policies |
|---|---|
| public | 1,149 |
| storage | 37 |
| cron | 2 |
| total | 1,188 |

Public length stats from this snapshot:

| stat | value |
|---|---|
| policies with a clause over 2,000 characters | 458 |
| longest single expression | 46,502 (`protocol_share_activity` / `Share parties write activity`, WITH CHECK) |
| longest qual + with_check | 62,400 (`custom_formulation_ingredients_all_merged`, 31,200 + 31,200) |
| policies with an auth wrapper of depth 2 or more | 476 |
| maximum wrapper depth | 908 |

`auth.uid()` occurs 1,084 times. 179 of those are not followed by ` AS uid)` (154 public, 25 storage). The normalizer leaves those bare calls unchanged. An earlier note in the investigation said 77; that figure is not what this snapshot scan produced, so the migration uses the scan.

## Redaction

The scan of the snapshot and of the earliest `policy_rewrite_backup` rows found no UUIDs, email addresses, or numeric user identifiers, so nothing was redacted. The raw audit files were still kept out of this public repository on purpose and are held by the ViaConnect team.

## What this change does

Apply order, in a quiet window, after confirming production job 10 is still paused. A routine `supabase db push` runs only step 1. Steps 2–4 live in `supabase/manual/` and Gary applies them by hand. See `supabase/manual/README.md`.

1. `supabase/migrations/20260926190000_retire_performance_advisor_autoheal.sql` unschedules pg_cron job `performance_advisor_autoheal` only. This file does not unschedule `security_advisor_autoheal`. If `cron.job` or the job-10 name is absent, it does nothing. Running it twice is a no-op the second time. This is the only file from this change left on the auto-apply path.
2. `supabase/manual/optional_drop_performance_advisor_autoheal_function.sql` is optional. Skip it to keep the function body. It drops `extensions.performance_advisor_autoheal_run()` and `extensions.performance_advisor_autoheal()` only. It does not drop or alter `extensions.performance_advisor_autoheal_log` or `extensions.policy_rewrite_backup`.
3. `supabase/manual/optional_unschedule_security_advisor_autoheal.sql` is optional. Gary decides at apply time whether to apply it. It unschedules `security_advisor_autoheal` only. It does not drop or alter `extensions.security_advisor_autoheal` or `extensions.security_advisor_autoheal_run`. It does not drop or alter the backup table or the autoheal log. Running it twice is a no-op the second time.
4. `supabase/manual/flatten_auth_uid_policies.sql` is a generated template, not a migration. Regenerate it from a fresh `pg_policies` snapshot immediately before applying (the generator command is in the file header; the apply runbook is `supabase/manual/README.md`). It records snapshot id `df94404d465a08e9c7115038923be79b2ee41fda5f215100234f8f995aabf321` and capture time `2026-09-26 ~12:20-12:25 MT`. Each `ALTER POLICY` is preceded by a `DO` block that compares `md5(pg_get_expr(polqual, polrelid))` and `md5(pg_get_expr(polwithcheck, polrelid))` to the snapshot and `RAISE EXCEPTION` on a mismatch or a missing policy. The file is one transaction: a single `BEGIN`/`COMMIT` with `SET LOCAL lock_timeout = '3s'`, `SET LOCAL statement_timeout = '60s'`, and `SET LOCAL search_path TO "$user", public, extensions`. The capture meta did not store `SHOW search_path`. That value is the Supabase `postgres` role default, and the snapshot text matches it: public routines and enums are unqualified, while `auth.uid()`, `auth.jwt()`, `auth.role()`, and `storage.foldername()` are schema-qualified. A path that includes `auth` would not. Each altered table is `LOCK TABLE ... IN ACCESS EXCLUSIVE MODE` once, before its guards, and those locks are held until `COMMIT`. There is no per-table commit and no session-level `SET`. A run of two or more `( SELECT auth.uid() AS uid)` wrappers collapses to one. The same rule is applied to `auth.jwt()` and `auth.role()`. Depth-1 wrappers and bare calls are copied through.

No file drops or alters `extensions.policy_rewrite_backup` or `extensions.performance_advisor_autoheal_log`. For the 29 merges, `policy-rewrite-backup-earliest.json` is the source of truth. Migration history is compared as well and is listed below. The 361 dropped indexes stay report-only. None are recreated.

The flatten template alters 475 policies on 335 tables. The longest `ALTER POLICY` statement in that file is 1,328 characters, so every expression it writes is under 2,000 characters. It does not touch `public.engagement_score_snapshots` (see HOLD).

## Schema-cache reloads (T3)

Autoheal did not cause the PostgREST schema-cache reloads or the PGRST002 burst.

`pgrst_ddl_watch` and `pgrst_drop_watch` do not fire for `POLICY` or `INDEX` commands, and a failed job-10 transaction rolls back, so it never commits a `NOTIFY pgrst`. The reloads came from two other sources:

- An ops/agent-cadence bootstrap client re-running `CREATE TABLE IF NOT EXISTS public.agent_cadence_jobs`, `public.ops_internal_secrets`, and `CREATE OR REPLACE FUNCTION public.invoke_ops_tick()` as `postgres`, about every 15 to 120 minutes.
- Realtime tenant re-initialization creating `realtime.messages` partitions.

The 10:55:57-10:56:00 MT PGRST002 burst followed a Realtime-driven reload whose schema-cache query hit the 8 second `authenticator` `statement_timeout`. This pull request does not fix either source. Follow-ups for Gary: stop the ops bootstrap from re-applying that DDL on a timer, and treat Realtime partition creation as a separate reload source.

Job 10 did cause the lock and statement timeouts. Section 1 takes `ACCESS EXCLUSIVE` locks and holds them until the transaction ends. Since about 2026-04-29 every run has hit the 2 minute `statement_timeout` at plpgsql line 97 and rolled back. At 10:52 MT that produced 6 x `55P03` and HTTP 500s on `GET /profiles`. The last committed run was 2026-05-13 18:37 MT. The job was paused (`active=false`, last run 12:07 MT 2026-09-26).

## Dropped indexes

`extensions.performance_advisor_autoheal_log` records 361 `dropped_unused_index` actions, 361 distinct indexes, all in committed runs from 2026-04-19 22:52 MT through 2026-05-12 18:37 MT. None of those names exist now. No index has been dropped by this job since the last committed run. The names stay outside the repository. This pull request does not recreate any of them.

## Merge HOLD

29 merges were checked. For each one the normalized live policy was compared with the OR of the normalized earliest backup originals, and with the last `CREATE POLICY` of those original names in `supabase/migrations`. `( SELECT auth.uid() AS uid)` is treated as the same call as bare `auth.uid()` for that comparison. Migration text is also normalized for `pg_get_expr` differences: `public.` qualifiers, column qualification, a self-reference alias such as `family_members family_members_1`, and `'...'::text`. Parentheses are removed only when a parse shows they do not change the expression. Stripping every parenthesis made different expressions compare equal, for example `(a + b) * c` and `a + b * c`, and `auth.uid()` and `auth.uid`. After that fix the 29-merge result is unchanged: 6 match migration history, 22 are incomplete, 1 differs, 0 implicit WITH CHECK bugs. The backup-to-live comparison does not use that second normalization, because both sides are already deparsed.

No merge hit the known WITH CHECK bug. Every ALL or UPDATE original in the backup had an explicit WITH CHECK, so the autoheal did not drop an implicit USING-as-WITH-CHECK.

### Held: do not flatten this table

`public.engagement_score_snapshots` / `engagement_score_snapshots_select_merged` (SELECT, merged 2026-04-19 22:52:57 MT).

The normalized live USING matches the OR of the backup originals, and it does not match the last migration definitions. The backup (and the live policy) still use `patient_practitioner_relationships` joined to `practitioners`, which is the body in `20260418000050_helix_phase1_integration.sql`. The last `CREATE POLICY engagement_scores_practitioner_read_with_consent` is in `20260418000160_practitioners_schema_reconciliation.sql` and reads `practitioner_patients` instead. `20260707150000_prompt_210f_practitioner_core_additive.sql` says that merged policy stays untouched and adds a separate policy, `engagement_scores_practitioner_read_via_pp_210f`.

The flatten template emits no `ALTER` for this table. `engagement_score_snapshots_select_merged` stays at 31,175 characters and depth 907. The other policy on the table, `engagement_scores_practitioner_read_via_pp_210f`, is already depth 1 (251 characters) and is skipped with the table. Until this hold is cleared, the full catalog's longest expression is not under 2,000 characters.

### Checked, not held

These six merged policies match both the backup OR and the migration history (after the deparse normalization above). Their tables are flattened with everything else.

- `public.custom_formulation_ingredients` `custom_formulation_ingredients_all_merged`
- `public.custom_formulations` `custom_formulations_all_merged`
- `public.family_members` `family_members_select_merged`
- `public.soc2_auditor_access_log` `soc2_auditor_access_log_select_merged`
- `public.soc2_auditor_grants` `soc2_auditor_grants_select_merged`
- `public.prescription_tokens` `prescription_tokens_select_merged`

### Migration history incomplete, backup OR matches, not held

22 merges name an original that has no `CREATE POLICY` in `supabase/migrations`. The live merged expression matches the OR of the backup originals, so the table is not held. The missing names are `iso_admin_insert`, `iso_admin_select`, `iso_admin_update`, `frf_iso_admin_select`, and `frf_iso_admin_update`.

| table | command | merged policy | missing original |
|---|---|---|---|
| framework_registry_flags | SELECT | framework_registry_flags_select_merged | frf_iso_admin_select |
| framework_registry_flags | UPDATE | framework_registry_flags_update_merged | frf_iso_admin_update |
| iso_internal_audits | INSERT | iso_internal_audits_insert_merged | iso_admin_insert |
| iso_internal_audits | SELECT | iso_internal_audits_select_merged | iso_admin_select |
| iso_isms_scope_documents | INSERT | iso_isms_scope_documents_insert_merged | iso_admin_insert |
| iso_isms_scope_documents | SELECT | iso_isms_scope_documents_select_merged | iso_admin_select |
| iso_isms_scope_documents | UPDATE | iso_isms_scope_documents_update_merged | iso_admin_update |
| iso_management_reviews | INSERT | iso_management_reviews_insert_merged | iso_admin_insert |
| iso_management_reviews | SELECT | iso_management_reviews_select_merged | iso_admin_select |
| iso_management_reviews | UPDATE | iso_management_reviews_update_merged | iso_admin_update |
| iso_nonconformities | INSERT | iso_nonconformities_insert_merged | iso_admin_insert |
| iso_nonconformities | SELECT | iso_nonconformities_select_merged | iso_admin_select |
| iso_nonconformities | UPDATE | iso_nonconformities_update_merged | iso_admin_update |
| iso_risk_register | INSERT | iso_risk_register_insert_merged | iso_admin_insert |
| iso_risk_register | SELECT | iso_risk_register_select_merged | iso_admin_select |
| iso_risk_register | UPDATE | iso_risk_register_update_merged | iso_admin_update |
| iso_risk_treatments | INSERT | iso_risk_treatments_insert_merged | iso_admin_insert |
| iso_risk_treatments | SELECT | iso_risk_treatments_select_merged | iso_admin_select |
| iso_risk_treatments | UPDATE | iso_risk_treatments_update_merged | iso_admin_update |
| iso_statements_of_applicability | INSERT | iso_statements_of_applicability_insert_merged | iso_admin_insert |
| iso_statements_of_applicability | SELECT | iso_statements_of_applicability_select_merged | iso_admin_select |
| iso_statements_of_applicability | UPDATE | iso_statements_of_applicability_update_merged | iso_admin_update |

### Backup policies that no longer exist

These four rows are in the earliest backup, are absent from the live snapshot, and are not merge originals or merge results. This pull request does not recreate them. Later migrations already drop them:

- `bio_optimization_history` / `Users view own bio history` (backup 2026-04-19 22:52:57.575846 MT). Dropped in `20260512020236_bos_compute_v2.sql`.
- `map_vip_exemption_sensitive_notes` / `map_vip_sensitive_notes_restricted_insert` (backup 2026-04-20 09:52:00.036668 MT). Dropped in `20260421000008_vip_sensitive_note_encryption.sql`.
- `photo_share_permissions` / `Practitioner reads shares granted to them` (backup 2026-04-19 22:52:57.575846 MT). Dropped in `20260424000010_photo_share_permissions_policy_consolidation.sql`.
- `photo_share_permissions` / `User manages own shares` (backup 2026-04-19 22:52:57.575846 MT). Dropped in the same consolidation migration.

## Local shadow

PostgreSQL 16.15 with `postgresql-16-cron`. `auth.uid()`, `auth.role()`, and `auth.jwt()` were created from the official `supabase/auth` migrations `20220224000811_update_auth_functions.up.sql` and `20220531120530_add_auth_jwt_function.up.sql` (namespace `auth`). Inside one transaction, `set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"owner@example.test"}', true)` made `auth.uid()` return that sub, `auth.role()` return `authenticated`, and `auth.jwt()` return the email claim.

### Retire, proved locally

Two dummy jobs were scheduled with `cron.schedule`: `performance_advisor_autoheal` (`7,22,37,52 * * * *`, command `SELECT 1`) and `security_advisor_autoheal` (`*/15 * * * *`, command `SELECT 1`).

- After the retire migration once: only `security_advisor_autoheal` remained.
- After the retire migration a second time: still only `security_advisor_autoheal`.

The DROP migration then ran. Neither performance-advisor function existed on this database (the production bodies were not installed). Postgres reported `does not exist, skipping` for both `DROP FUNCTION IF EXISTS` statements. `security_advisor_autoheal` was still scheduled.

### Optional job-1 unschedule, proved locally

A dummy job named `security_advisor_autoheal` was present (`*/15 * * * *`, command `SELECT 1`). `supabase/manual/optional_unschedule_security_advisor_autoheal.sql` was applied twice.

- After the first apply: `security_advisor_autoheal` was gone. No other cron job remained.
- After the second apply: still no cron jobs. The second run did not error.
- `pg_proc` had no `security_advisor_autoheal` or `performance_advisor_autoheal` function. The file does not create or drop functions. The production function bodies were not installed on this database.

### Allow/deny matrix on stubbed tables

The historical migrations are still not a bootstrap of the live catalog. Applying them in filename order stops on `20260326_three_portal_architecture.sql` with `relation "profiles" does not exist`. This proof did not pretend otherwise. It created a local database `flatten_proof` with the Supabase `auth.uid()`, `auth.role()`, and `auth.jwt()` bodies (they read `request.jwt.claims`) and minimal stub tables for the columns the sample policies reference.

42 policies were loaded from the snapshot, on 30 tables, covering owner-only uid checks, admin checks through `profiles.role`, jwt role claims, jwt email claims, `auth.role()`, patient/practitioner linked rows, an `EXISTS` parent row, and a board-member `JOIN`. The before expressions were the nested snapshot text, including the md5 drift guards from `supabase/manual/flatten_auth_uid_policies.sql`.

Each cell is SELECT, INSERT, UPDATE, or DELETE as anon, owner, other, admin, or service (`service_role` is `BYPASSRLS`). That is 30 × 5 × 4 = 600 cells. The same matrix after the guarded template matched the before matrix: 600 cells compared, 0 mismatches. `pg_policies` after the apply was compared to the snapshot for all 42 policies (roles, cmd, permissive, qual, with check): 42 intended expression changes, 0 mismatches.

The runtime allow/deny matrix covered 42 of the 475 changed policies. 433 changed policies had no runtime test. Those 433 are covered by the expression transform tests in `tests/audit/flatten-auth-expr.test.ts`.

Representative before cells (the after file is identical):

- `profiles` SELECT: anon `rows=0`, owner `rows=1`, other `rows=0`, admin `rows=1` (admin sees only the admin profile row), service `rows=2`.
- `audit_logs` SELECT: admin `rows=1`, owner `rows=0`.
- `appeal_agreement_rollups` SELECT: admin `rows=1`, owner `rows=0`.
- `bundles` SELECT (`auth.role() = 'authenticated'`): owner `rows=1`, admin `rows=0`.
- `verification_codes` SELECT: owner `rows=1`, other `rows=0`.
- `advisor_peptide_shares` SELECT: owner `rows=1`, other (the practitioner) `rows=1`, anon `rows=0`.
- `board_packs` SELECT: owner `rows=1`, other `rows=0`.
- `email_otps` SELECT (`auth.role() = 'service_role'`): owner `rows=0`, service `rows=1`.

Full grids: `supabase/audit/2026-09-26-flatten-matrix-before.md` and `supabase/audit/2026-09-26-flatten-matrix-after.md`.

### Drift guard rolls back

Inside one transaction the proof inserted a row into `proof_sentinel` and replaced `Users can view own profile` with `USING (false)`, then ran that policy's guard and `ALTER` from the template. Postgres raised `policy drift`. After the failed script, `proof_sentinel` had 0 rows and the policy's `md5(pg_get_expr(polqual, polrelid))` was unchanged.

### Full catalog compare

`scripts/audit/diff-auth-policies.ts --snapshot <policies.json> --template supabase/manual/flatten_auth_uid_policies.sql --held public.engagement_score_snapshots` compared all 1,188 policies (roles, cmd, permissive, qual, with check):

- intended expression changes: 475
- unchanged: 713 (711 already flat, plus the two policies on held `public.engagement_score_snapshots`)
- mismatches: 0

That full catalog compare proves the template equals the generator output. It is not an independent semantic proof that the flattened expressions mean the same thing as the nested ones. The runtime meaning check is the 42-policy matrix above, plus the expression transform tests for the policies the matrix did not execute.

`--check` on the unflattened snapshot still exits 1:

- `476 policies are not flattened (max depth 908)`
- `458 policies have an expression of 2000 characters or more (max 46502)`

`npx vitest run tests/audit/flatten-auth-expr.test.ts tests/audit/diff-auth-policies.test.ts`: 2 files, 32 tests, all passed.

Because `engagement_score_snapshots_select_merged` is held, a full-catalog re-snapshot after this template would still fail the "longest expression under 2,000 characters" check on that one policy.
