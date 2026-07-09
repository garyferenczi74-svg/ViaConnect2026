# Prompt 210f Completion Report (Section 12)

Date: 2026-07-08. Branch: feat/210d-schema-integrity. Supabase project: ViaConnect2026 (nnhkcufyqjojdbvdrpky).
This report summarizes the 210d/210f schema-integrity wave. All cited artifacts live in docs/integrity/ and are
authoritative; this report cites them rather than duplicating their content.

## 1. The three P1 decisions executed

1. Decision 1, practitioner core split (P1 cluster 2): APPLIED as an additive-only split. 13 new tables, the
   8-column practitioners pack, RLS on every table, seeds verified; all checks PASS (f1-tranche-verification.md).
   The destructive half of the original migration did NOT ride: both _160 DROPs are deferred to the evidence pack
   (practitioner-core-drop-evidence.md), which carries per-object sign-off cells; no DROP applies until Gary signs
   each cell.
2. Decision 2, certification/waitlist (P1 cluster 4): APPLIED, including the invitations slice. The F3 tranche
   (5 tables, both practitioners FKs, seeds, anon-INSERT-only waitlist policy set) per f3-tranche-verification.md,
   plus the F3b practitioner_invitations slice with its lookup/accept RPCs, smoke-verified. The mailer cron is NOT
   armed: zero cron.job rows at apply (F3 check e). The arming procedure and the explicit Gary gates that remain
   are held in f4-prearm-checklist.md (state in section 4 below).
3. Decision 3, white label (P1 cluster 1): APPLIED with the review-conditioned view lockdown grant-verified.
   15 tables, 2 security-invoker views with anon holding zero grants on either view, 2 private buckets with
   6 storage policies, seeds (f5-tranche-verification.md checks a through h). Launch is gated on the F6 post-merge
   checklist, including the Gary Stripe walk.

## 2. Everything applied, with versions; the apply procedure now governs

Versions from remediation-log.md and docs/integrity/snapshot/applied-manifest.json. MCP applies stamp apply-time
versions; the filename stem is the durable join key.

| Unit | Migration (filename stem) | Applied version(s) |
|---|---|---|
| P0-2 audit_logs columns | 20260707081200_prompt_210d_audit_logs_new_shape_columns | 20260707225210 |
| P0-4 daily_scores columns + index | 20260707083321 + 20260707090000 | 20260707225426 + 20260707225436 |
| P0-6 profiles phone + timezone | 20260707101532_prompt_210d_profiles_phone_timezone | 20260707225228 |
| P0-3 orders.items | 20260707141023_prompt_210d_orders_items_column | 20260707225443 |
| P0-3 subscriptions (STORE decision) | 20260707141124_prompt_210d_subscriptions_table | 20260707225453 |
| P0-7/7b GENEX import columns | 20260707160000_prompt_210d_user_variants_risk_category | 20260708003037 (stamp correction at next snapshot regen) |
| F1 practitioner core additive | 20260707150000_prompt_210f_practitioner_core_additive | 20260708003638 + 20260708004716 (idempotent double apply) |
| F3 cert/waitlist additive | 20260707170000_prompt_210f_certification_waitlist_additive | 20260708011939 |
| F3b practitioner_invitations slice | 20260707172000_prompt_210f_practitioner_invitations_additive | 20260708032837 (stamp correction at next snapshot regen) |
| F5 white label additive | 20260708090000_prompt_210f_white_label_additive | 20260709012307 |

Code-fix-only units (P0-5, P0-9, P0-9b, the F3c route fix, the F4 mailer build, the P0-8 retirement) reach prod
through the main merge and deploy; their sign-off is the merge sign-off (remediation-log.md).

Governance: every apply above was controller-executed via the Supabase MCP under docs/integrity/apply-procedure.md,
which now governs all production applies: Gary sign-off recorded first, apply by filename stem, manifest entry
appended, remediation-log row with rollback reference, snapshot and types regenerated together, enforced by the CI
migration-parity gate.

## 3. Deferred-DROP evidence pack status

practitioner-core-drop-evidence.md is the standing pack; its per-object sign-off table is the gate. Nothing drops
until each cell carries Gary's signature.

| Object | Recommendation | State |
|---|---|---|
| practitioners.status DROP COLUMN (_160 line 129) | Drop only after admin-guard.ts repoints to account_status, then a 7-day observation window | Awaiting sign-off |
| patient_practitioner_relationships DROP CASCADE (_160 line 193) | Bare CASCADE not sign-off-able (would destroy 3 analytics MVs and 2 policies, including consumers' only engagement-score read); requires the rewritten single-transaction script plus a 14-day window | Awaiting sign-off |
| practitioner_patients.patient_id DROP NOT NULL (_150) | Applied with F1 under Decision 1: tranche-new table, zero live exposure | Executed |
| wl_pending_reviews_with_sla drop/recreate (_500) | Rode with F5 as CREATE OR REPLACE VIEW; zero DROP carried | Closed by F5 |

Also tracked in the pack: the practitioners waitlist/cohort FK attachments (closed by F3, check c) and the
sum_practitioner_wholesale_volume RPC (deferred until the shop_orders extension applies; carried as an inert
comment block and pinned by a shape test).

## 4. Go-live states, honestly

- Waitlist lead-loss stop: HALF LIVE. The database half is live (F3). The deployed route still returns 500 on
  every submission because the pre-F3c code chains INSERT with RETURNING against a table anon cannot SELECT
  (f3d-dropped-leads-investigation.md section 0). The F3c code fix RIDES THE MERGE per Gary's decision. F3d found
  ZERO recoverable leads anywhere (no source holds contact data, by design) and ZERO observed submission attempts
  in the observable window (hard-verified 2026-06-30 through 2026-07-08, likely back to 2026-06-24). The prior
  roughly 10 weeks are UNKNOWABLE, not zero. One mercy: every failed submitter saw an explicit error box, never a
  fake success screen.
- Mailer cron arming (F4): BUILT AND REVIEWED, NOT ARMED. Idempotency proven by test (claim-before-send
  compare-and-swap), per-run and daily caps, fail-closed kill switch on public.features, floor-dated candidate
  scope, drift and timeout wrappers, heartbeats: all built with 21 logic tests (f4-prearm-checklist.md). Arming is
  blocked ONLY on: Gary's physical postal address literal (CASL/CAN-SPAM), secrets (SMTP set plus
  UNSUBSCRIBE_TOKEN_SECRET and BASE_URL in both Supabase and Vercel), content and sender clearance
  (security-advisor), the first-run candidate-set report with Gary's approval, and the end-to-end internal test
  send with the live signed unsubscribe link. Entity string and the unsubscribe path are already resolved and
  test-pinned.
- White label: SCHEMA LIVE, LAUNCH GATED ON F6. All objects live and verified; no sidebar links exist, so the
  surfaces are direct-URL-only until launch. F6 gates: the Gary Stripe walk (deposit and final payment intents,
  refund idempotency), ops readiness (reviewer roles, SLA inbox, bucket upload UX), and remaining content
  clearance (label template copy, claims review). The schema-wide anon default-privilege posture is flagged to F6
  as an observation, not a blocker (f5-tranche-verification.md check h).

## 5. P0 queue disposition and the P3 guardrail wave

- P0 queue: ALL UNITS EXECUTED under 210d. Applied: P0-2, both P0-3 units, P0-4, P0-6, P0-7/7b (versions in
  section 2). Built and riding the merge: P0-5 (P0-5b read-side follow-up queued), P0-9, P0-9b. P0-8 ViaTokens:
  Option B retirement EXECUTED with Gary's signature; the dead three-module chain is removed and Helix stands as
  the single token economy (p0-viatokens-decision.md).
- Re-verification obligations met per f7-sweep-verification.md: Section 1 PASS, helix consumer-only proven end to
  end (23 policies across 17 tables, zero practitioner or consent references at the RLS layer, zero
  practitioner-surface code reads, consent-flag firewall intact); Section 2 PASS, daily_scores canonical path
  holds (single writer, canonical readers, no parallel score source introduced by either wave).
- P3 guardrail wave: all four gates landed and the CI gates are live. (1) Schema-drift code-reference gate with
  the shrinking 108-entry baseline (scan-code-refs.mjs, schema-drift job). (2) Migration-parity gate
  (check-migration-parity.mjs, migration-parity job; both in .github/workflows/schema-drift.yml). (3)
  Schema-scoped BLOCKING type gate with the frozen 4-entry allowlist (check-schema-type-errors.mjs, blocking step
  in ci.yml web-check). (4) Edge-adoption gate (verify-edge-adoption.mjs plus its vitest suite). Reason-tagged
  fail-open via the P0-1 classifier covers web and edge paths, SCHEMA_STRICT_MODE stays off in prod and throws
  pre-prod, and the 5 highest-write live edge functions adopted the Deno classifier (29 tagged sites).

## 6. Standing-rule compliance

- No destructive DDL applied anywhere in the wave. Every applied tranche is additive against live objects. The
  single signed non-additive statement is the NOT NULL relax on practitioner_patients.patient_id, a column on a
  table created by the same F1 tranche: zero live exposure, documented in f1-tranche-verification.md and item 3 of
  practitioner-core-drop-evidence.md, covered by Decision 1.
- Helix consumer-only: verified end to end at the RLS, code-surface, and consent-firewall layers
  (f7-sweep-verification.md section 1, PASS).
- PII-clean: confirmed by the F7b sweep; the wave's artifacts carry counts, timestamps, and object names only
  (the PII rule is stated and honored in, for example, f3d-dropped-leads-investigation.md).
- Entity naming: RESOLVED as FarmCeutica Wellness LLC per Gary 2026-07-08; no Ltd string anywhere in the mailer or
  unsubscribe path, test-pinned (f4-prearm-checklist.md), and carried into the F5 manufacturer line
  (f5-tranche-verification.md).
- Dash and emoji audits: clean at branch scale; every wave task ran an ASCII-only audit over its files before
  commit.

## 7. Open items: remaining Gary gates and post-merge motions

| # | Item | Gate holder | Reference |
|---|---|---|---|
| 1 | Merge sign-off for feat/210d-schema-integrity; carries every built code fix (P0-5, P0-9, P0-9b, F3c, F4 build, unsubscribe route, P0-8 retirement) to prod | Gary | remediation-log.md |
| 2 | Edge function redeploys post-merge: body-scan-analyze, arnold-vision-analyze, ingest-body-composition, nutrition-insights-daily, nutrition-insights-weekly run pre-adoption code until redeployed (mailer deploy is F4 step 4, separate) | Controller, post-merge | P3-5 adoption; f4-prearm-checklist.md |
| 3 | F3 live form test: after F3c deploys, submit through the public form; watch runtime logs scope waitlist.practitioner.insert and the practitioner_waitlist row count for first real leads | Controller + Gary, post-merge | f3d-dropped-leads-investigation.md |
| 4 | F4 arming steps 1 through 8: postal literal, candidate-set report and approval, secrets, function deploy, kill-switch flag row, internal test send, cron migration apply, two observed cycles | Gary-gated, post-merge | f4-prearm-checklist.md |
| 5 | F6 white label launch checklist, including the Gary Stripe walk, ops readiness, and remaining content clearance | Gary, post-merge | f5-tranche-verification.md |
| 6 | P1 residual: 11 of 14 cluster rows remain unsigned on the decision sheet (clusters 1, 2, 4 executed as Decisions 1 through 3; within the 11, cluster 7 is already executed as RETIRE CODE under P0-8 and awaits only its row formality; the other 10 need decisions) | Gary | p1-decision-sheet.md |
| 7 | Deferred DROPs: per-object sign-off cells for practitioners.status (guard repoint plus 7-day window) and patient_practitioner_relationships (rewritten script plus 14-day window) | Gary | practitioner-core-drop-evidence.md |
| 8 | Snapshot refresh at the next apply: regenerate live-types.ts, types.ts, and db-functions.json together (captures the F1/F3/F3b/F5-created functions), shrink drift-baseline.json, confirm the two pending-correction manifest stamps, and append the missing F5 manifest entry (version 20260709012307, absent from applied-manifest.json as of this report) | Controller | apply-procedure.md |

This report is the Section 12 deliverable. The wave closes with zero destructive DDL applied, every apply
versioned and procedure-governed, and every remaining motion Gary-gated and enumerated above.
