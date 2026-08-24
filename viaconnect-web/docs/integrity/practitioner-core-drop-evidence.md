# Practitioner Core Deferred DROP Evidence Pack (Prompt 210f, Decision 1)

Date: 2026-07-07. Live SQL queried read-only against Supabase project nnhkcufyqjojdbvdrpky.
Sources: repo migrations, src/ and supabase/functions/ greps, docs/integrity/snapshot/ (210d), pg_catalog.

## Standing rule

NO DROP statement applies in 210f. Decision 1 split 20260418000160: the additive parts (ADD COLUMN pack,
indexes, RLS) apply in a separate task; both DROPs below, plus the two flagged non-additive statements,
are DEFERRED until Gary signs off each object individually in the table at the end of this document.

## Observation window definition

An object passes its window of N days (clock starts when the additive tranche lands) if BOTH hold:
1. Reason-tagged drift logs: the 210d fail-open tags on code paths naming the object record zero hits.
2. pg_stat_user_tables scan deltas: seq_scan and idx_scan for the object move only by amounts attributable
   to this audit. Baselines captured 2026-07-07 (stats never reset on this project, counters cumulative):
   practitioners seq_scan 74 / idx_scan 6; patient_practitioner_relationships seq_scan 1 / idx_scan 6;
   the three practitioner analytics MVs all 0 / 0 with 0 rows.

## 1. practitioners.status (DROP COLUMN, 20260418000160 line 129)

a) Code references (grep of src/ and supabase/functions/ for practitioners queries):
- src/lib/custom-formulations/admin-guard.ts:54 selects 'id, status' from practitioners; lines 57-58 gate
  row.status !== 'active'. This requirePractitioner() guard is imported by 10 live Level 4 API routes under
  src/app/api/practitioner/custom-formulations/ (enroll, eligibility, orders/quote, base list, [id] read,
  submit, validate, revise, ingredients, compare). The Prompt 97 tables these routes serve ARE applied live.
- NONE elsewhere. Every other practitioners consumer (12+ files, e.g. src/app/(app)/layout.tsx:64,
  src/lib/white-label/eligibility.ts:163, the engagement-score route) selects account_status, which does
  not exist live yet (verified in snapshot/column-misses-verified.json). supabase/functions/ practitioners
  queries (map_monitor_practitioner_website, map_notify_practitioner, payout_statement_generator) select
  only id, user_id, display_name: no status usage.

b) Live facts (2026-07-07):
- Column exists: status TEXT NOT NULL DEFAULT 'pending' with check constraint practitioners_status_check
  (pending, active, suspended, revoked). account_status does NOT exist live.
- Rows: practitioners has 0 rows total. Distinct status values: none (table empty). This is the values
  snapshot for rollback: no values exist to restore.
- Column-level dependents (pg_depend): only its own default and check constraint, both auto-dropped with
  the column. No live view, policy, or index references the column, so the plain DROP COLUMN cannot fail
  on dependencies and cascades to nothing.

c) What the original migration does with it: _160 first backfills account_status from status where
account_status is null (pending maps to pending_onboarding, active to active, suspended to suspended,
revoked to terminated, anything else to pending_onboarding), then drops status inside the same DO block.
With 0 rows the backfill is a no-op; the drop destroys no data.

d) Rollback if dropped: ALTER TABLE public.practitioners ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
plus the 4-value check constraint, then reverse-map from account_status (pending_onboarding and onboarding
to pending, active to active, suspended to suspended, terminated to revoked). Per the snapshot above there
are zero rows as of 2026-07-07, so restoration is DDL only.

e) RECOMMENDATION: drop-safe on data, NOT yet on code. Sequence: apply additive parts (account_status
arrives and is backfilled), repoint admin-guard.ts requirePractitioner to account_status in the same
release, run a 7-day observation window, then drop. Dropping before the guard fix makes the status select
error and all 10 Level 4 routes fail closed with 403 for every practitioner.

## 2. patient_practitioner_relationships (DROP TABLE CASCADE, 20260418000160 line 193)

a) Code references: NONE at runtime. Repo-wide grep finds only comments (the engagement-score route and
tests/helix-schema.test.ts describe the repoint to practitioner_patients) and the generated live-schema
artifact src/lib/supabase/types.ts. No src/ or supabase/functions/ code queries the table.

b) Live facts (2026-07-07):
- Table exists live with 0 rows; seq_scan 1 / idx_scan 6 cumulative; no user triggers; NO foreign key in
  any table references it (pg_constraint on confrelid returns nothing).
- CASCADE would take EXACTLY these live objects (pg_depend, verified):
  1. Materialized view practitioner_engagement_summary_mv
  2. Materialized view practitioner_practice_health_mv
  3. Materialized view practitioner_protocol_effectiveness_mv
     All three were created by APPLIED migration 20260420073044 (practitioner_analytics_mvs_phase_2a) and
     are read by src/lib/practitioner-analytics/constants.ts:24-28 feeding the practitioner analytics pages
     (analytics hub, engagement, protocols, cohorts, revenue). MVs are empty with 0 scans today, but the
     surfaces are shipped; CASCADE silently deletes them and nothing recreates them.
  4. Policy "Practitioner manages notes for active patients" on body_scan_practitioner_notes. It is the
     only practitioner-side policy on that table; CASCADE leaves patients-read-own as the sole policy and
     practitioners lose all body scan note access (fails closed).
  5. Policy engagement_score_snapshots_select_merged on engagement_score_snapshots. WARNING: this is that
     table's ONLY select policy. A live autoheal (20260420045150) merged the consumer self-read arm and the
     practitioner-consent arm into this single policy. CASCADE drops it; _160 recreates only a practitioner
     policy anchored on practitioner_patients, so consumers would silently lose read access to their own
     engagement scores.
  Plus the table's own two policies and two partial indexes (no external impact).
- Side note: _160's DROP POLICY IF EXISTS engagement_scores_practitioner_read_with_consent targets a policy
  name that no longer exists live (it was merged); the migration predates the autoheal and does not know
  about the merged policy or the MVs (both created 2026-04-20, after _160 was authored).

c) What the original migration does: drops the table CASCADE as the Prompt 92 shim superseded by
practitioner_patients, then recreates the engagement consent policy on practitioner_patients (which does
not exist live yet; the additive tranche must create it first).

d) Rollback if dropped: full DDL for the table, its 2 policies, and 2 partial indexes lives in repo
migration 20260418000050 lines 84-122; re-run it, re-run 20260420000001 to recreate the three MVs, and
recreate the two victim policies from section b. Zero rows means no data restore is needed.

e) RECOMMENDATION: needs-observation-window AND a rewritten drop script; the bare CASCADE is not
sign-off-able as written. The replacement script must, in one transaction: (1) recreate or deliberately
retire the three analytics MVs repointed at practitioner_patients, (2) recreate the
body_scan_practitioner_notes practitioner policy anchored on practitioner_patients, (3) recreate the
engagement_score_snapshots select policy with BOTH self-read and practitioner-consent arms, then drop the
table. With those companions the drop itself is safe: 0 rows, no FKs, no direct code reads. Suggested
window: 14 days (analytics surfaces involved), using the criteria defined at the top.

## 3. 20260418000150: ALTER TABLE practitioner_patients ALTER COLUMN patient_id DROP NOT NULL

Statement relaxes a NOT NULL so invitation rows can exist without a patient until acceptance; the same file
ships the lookup and accept RPCs that depend on it. Non-additive by class (constraint relaxation is not
reversible without revalidating data). Live check 2026-07-07: practitioner_patients does NOT exist live;
the relax targets a table created earlier in the same tranche (20260326 three_portal, extended by _110), so
zero live data is exposed. Applied: the invitation flow works as designed. Deferred while the rest of the
tranche applies: patient invitations violate NOT NULL on insert and the acceptance RPCs never ship, leaving
the invite flow broken end to end. RECOMMENDATION: apply with the practitioner core tranche; additive in
effect because the target is tranche-created.

## 4. 20260418000500: DROP VIEW IF EXISTS wl_pending_reviews_with_sla then CREATE VIEW

Statement drops and recreates the white label reviewer inbox view to filter out assignments tied to demoted
label versions, and also replaces policy wl_disp_published_read on white_label_dispensary_settings with a
tighter patient-or-admin read. Non-additive by letter (named DROP VIEW and DROP POLICY). Live check
2026-07-07: neither the view nor white_label_dispensary_settings nor white_label_reviewer_assignments
exists live; every DROP target is created earlier in the same white label tranche (_430, _480), so no live
object is touched. Applied with its tranche: inbox correctness and RLS tightening land together. Deferred:
the tranche would go live with the looser _480 dispensary policy and a stale-assignment inbox.
RECOMMENDATION: this belongs to the white label tranche (Cluster 1 of the P1 decision sheet), not to
practitioner core; ride with that tranche as-is, covered by the Cluster 1 sign-off.

## Sign-off (per-object, required before any DROP applies)

| Object | Recommendation | Gary decision | Date |
|---|---|---|---|
| practitioners.status DROP COLUMN (_160 line 129) | Drop after admin-guard.ts repoint + 7-day window | | |
| patient_practitioner_relationships DROP CASCADE (_160 line 193) | Rewrite drop script (3 MVs + 2 policies) + 14-day window | | |
| practitioner_patients.patient_id DROP NOT NULL (_150) | Covered by 210f Decision 1: tranche-new table, zero live exposure. Gary 2026-07-07 | | |
| wl_pending_reviews_with_sla drop/recreate (_500) | Ride with white label tranche (Cluster 1) | | |

## Additional deferrals found during F1 extraction

Appended 2026-07-07 by Task F1 while assembling
supabase/migrations/20260707150000_prompt_210f_practitioner_core_additive.sql.

1. practitioners.waitlist_id / practitioners.cohort_id FOREIGN KEY constraints (20260418000160 lines
   37-38; the same inline clauses appear in 20260418000080 lines 16-17). Not destructive, but the FK
   targets practitioner_waitlist (20260418000020) and practitioner_cohorts (20260418000010) are Cluster 4
   objects that do not exist live, so carrying the inline REFERENCES would fail the F1 apply. The F1
   migration adds both columns as plain UUID and ships a conditional DO block that attaches
   practitioners_waitlist_id_fkey and practitioners_cohort_id_fkey only when the target tables exist. At
   F1 apply time the targets are absent, so BOTH CONSTRAINTS REMAIN UNATTACHED live after F1. Deferred
   action, to ride with or immediately after the F3 waitlist tranche:
   ALTER TABLE public.practitioners ADD CONSTRAINT practitioners_waitlist_id_fkey
     FOREIGN KEY (waitlist_id) REFERENCES public.practitioner_waitlist(id);
   ALTER TABLE public.practitioners ADD CONSTRAINT practitioners_cohort_id_fkey
     FOREIGN KEY (cohort_id) REFERENCES public.practitioner_cohorts(id);
   (Both columns hold zero rows today, so the attach cannot fail on data.)

## Additional deferrals found during F5 extraction

Appended 2026-07-08 by Task F5 while assembling
supabase/migrations/20260708090000_prompt_210f_white_label_additive.sql.

1. sum_practitioner_wholesale_volume RPC (20260418000430 lines 12-38). Not destructive, but a
   LIVE-VALIDITY STOP of the F3b incident class: the LANGUAGE sql body reads
   shop_orders.wholesale_total_cents, shop_orders.placed_by_practitioner_id, and
   shop_orders.order_type, none of which exist on live shop_orders (live has status and user_id,
   neither sufficient). Their adding migration, 20260418000130_shop_orders_practitioner_extension.sql,
   is outside the cluster 1 tranche and remains unapplied. LANGUAGE sql function bodies are validated
   at CREATE time, so carrying the create would fail the whole F5 apply, and rewriting the body against
   live columns would fabricate wholesale-eligibility data. The F5 migration carries the full source as
   an inert comment block (marker: F5 DEFERRED, DO NOT APPLY IN F5). Deferred action, to ride with or
   immediately after the shop_orders practitioner extension (20260418000130) applies:
   lift the commented CREATE OR REPLACE FUNCTION public.sum_practitioner_wholesale_volume block
   verbatim (restore AS $$ delimiters), plus its COMMENT and REVOKE/GRANT pair. Until then,
   white-label eligibility Path 3 (volume_threshold) callers keep today's fail-open behavior
   (function absent). The shape test src/lib/__tests__/white-label-migration-shape.test.ts pins the
   deferral and fails the moment live-types regains the three columns, prompting the lift.
   Also closed by F5: the P1 sheet row "wl_pending_reviews_with_sla drop/recreate (_500)" rides as
   CREATE OR REPLACE VIEW (identical column list, view absent live), zero DROP carried.
