# F3 Tranche Verification (Prompt 210f, certification/waitlist additive)

Applied to production project nnhkcufyqjojdbvdrpky on 2026-07-07 (UTC timestamps below are as recorded by Supabase).

- Migration file: `supabase/migrations/20260707170000_prompt_210f_certification_waitlist_additive.sql`
- Recorded in `supabase_migrations.schema_migrations` as version `20260708011939`, name `20260707170000_prompt_210f_certification_waitlist_additive`
- Apply result: success on first attempt (single MCP `apply_migration` call, no retry)

## Post-apply checks (all SELECT-only, run immediately after apply)

| Check | Query target | Expected | Observed | Result |
|-------|--------------|----------|----------|--------|
| a | `pg_tables` count for the 5 new tables | 5 | 5 | PASS |
| b | RLS enabled + policy count per table | rowsecurity true, count >= 1 | see table below | PASS |
| c | FK constraints on `public.practitioners` | both present | `practitioners_cohort_id_fkey`, `practitioners_waitlist_id_fkey` | PASS |
| d | `certification_levels` row count (seed) | seed count | 3 (foundation, precision_designer, master_practitioner) | PASS |
| e | `cron.job` rows matching waitlist mailer | 0 (nothing armed) | 0 | PASS |
| f | `practitioner_waitlist` row count | 0 (created empty) | 0 | PASS |
| g | `pg_policies` on `practitioner_waitlist` | anon INSERT present, zero anon SELECT | see list below | PASS |

### Check b detail (RLS + policy counts)

| Table | rowsecurity | policies |
|-------|-------------|----------|
| certification_levels | true | 2 |
| practitioner_certifications | true | 2 |
| practitioner_cohorts | true | 2 |
| practitioner_email_queue | true | 1 (admin-only by design; Edge Function uses service role) |
| practitioner_waitlist | true | 3 |

### Check g detail (practitioner_waitlist policies)

| Policy | Roles | Command |
|--------|-------|---------|
| waitlist_admin_all | {authenticated} | ALL |
| waitlist_public_insert | {anon,authenticated} | INSERT |
| waitlist_self_read | {authenticated} | SELECT |

No SELECT policy includes anon: anon can insert but never read the waitlist. Check f (0 rows) is the F4 candidate-set baseline: any row present before F4 arms predates the mailer and must be evaluated against the F4 candidate-set query before any send.

## Standing note

The database side of the lead-loss stop is now live: public waitlist submissions have a table to land in, the AFTER INSERT trigger enqueues step 1 into `practitioner_email_queue`, and rows sit pending because nothing is armed (check e). The lead-loss stop COMPLETES only when the F3c route fix for `src/app/api/waitlist/practitioner/route.ts` deploys; until that deploy, the route remains the outstanding half of the stop.

F1 deferral closure: section 6 of the migration attached `practitioners_waitlist_id_fkey` and `practitioners_cohort_id_fkey` (check c), closing "Additional deferrals" item 1 in `docs/integrity/practitioner-core-drop-evidence.md`.

F4 remains unarmed by design. The mailer cron and agent registry activation ride only with Task F4 (see the F4 ARMING comment block at the end of the migration file, inert here).

## Rollback reference

If this tranche must be reverted, drop the two FK constraints first, then the five tables (reverse dependency order). All were empty at apply time except the 3-row `certification_levels` seed and the 1-row `practitioner_cohorts` seed.

1. `ALTER TABLE public.practitioners DROP CONSTRAINT practitioners_waitlist_id_fkey;`
2. `ALTER TABLE public.practitioners DROP CONSTRAINT practitioners_cohort_id_fkey;`
3. `DROP TABLE public.practitioner_certifications;`
4. `DROP TABLE public.certification_levels;`
5. `DROP TABLE public.practitioner_email_queue;` (also drop functions `enqueue_practitioner_welcome_email`, `tg_practitioner_waitlist_enqueue_welcome` if fully reverting)
6. `DROP TABLE public.practitioner_waitlist;`
7. `DROP TABLE public.practitioner_cohorts;`

Rollback loses any waitlist leads captured after apply; export `practitioner_waitlist` before dropping if nonzero.
