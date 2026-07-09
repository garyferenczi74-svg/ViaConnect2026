# Prompt 210d: Schema Drift Report

Date: 2026-07-07. Branch: feat/210d-schema-integrity. Read-only audit per Sections 4 and 5; no remediation applied.
Live truth: the STEP 0 snapshot of project nnhkcufyqjojdbvdrpky (docs/integrity/snapshot/, captured 2026-07-06). Full finding lists with file:line sites live in the snapshot JSONs cited per section; this report ranks and explains them.

## Executive summary

The platform carries two classes of phantom references, both silently swallowed by the fail-open pattern:

| Class | Findings | Critical | High | Medium | Low/dormant |
|---|---|---|---|---|---|
| A. Missing objects (table/rpc/bucket referenced, object absent live) | 125 | 59 | 30 | 16 | 20 |
| B. Missing columns (table exists live, column does not) | 120 verified pairs | 36 | 84 | 0 | 0 |

Class A Critical means a write path to a nonexistent object: the row is dropped. Class B Critical means an insert/update/upsert payload contains a nonexistent column: PostgREST rejects the ENTIRE row, so the whole write is dropped even though the table exists. Both look identical to success in production because every call fails open.

Verified user-facing consequences happening now (spot-confirmed against the live DB and code):
- Stripe: membership subscription records (subscriptions table absent) and one-time order rows (orders.items column absent) are lost after successful payment.
- Daily scores: the gauge writer upserts 8 columns that do not exist (live daily_scores has date, recovery/sleep/steps/strain/exercise/regimen scores); every persistence write is rejected. The dashboard shows values only because scores are recomputed client-side per session. The 208k journey reader reads the same nonexistent columns and fails open to its empty seed state.
- GENEX360 import: genetic_variants (table absent) upsert loses every parsed variant; the genetic_profiles summary upsert uses a variant-shaped payload the live one-row-summary table rejects. The adjacent audit row that DOES match live shape succeeds, masking the loss.
- ViaTokens economy: increment_token_balance rpc absent, fallback writes viatokens_balance (table absent), redemptions hard-fail before reward_redemptions insert (which itself uses two wrong columns).
- Audit trail: 7+ routes (stripe checkout/webhook, auth callback, genex upload, notifications, AI provider) insert a new-schema audit shape (resource_type/resource_id/metadata/ip_address) the live audit_logs rejects; those audit rows are silently lost.
- Profiles: saves carrying phone are rejected; timezone sync always rejected (app operates on UTC fallback).
- Compliance: both regulatory_kelsey_reviews insert sites use 5 wrong columns; compliance review rows are lost.

## Class A: missing objects (snapshot/phantom-severity.json, phantom-remediation-map.json)

112 tables, 13 rpcs, 3 buckets referenced in code and absent live (name-level scan over 3,458 files, 10-of-10 sample live-verified, false positives fake/table/pg_policies excluded).

- 59 CRITICAL: reachable write paths. Dominated by subsystem clusters whose repo migrations were never applied: white_label (17 objects), practitioner_referral (13), practitioner core (11), hannah ultrathink and avatar (8), ai_personalization (7), gamification (6), plus singles including subscriptions (stripe webhook), marketing_spend, unit_economics, archetypes, brand_compliance_reviews, customer_acquisition_attribution, supplement_product_cache, integration_sync_log, agent_activity_log, jeffery panel tables.
- 30 HIGH: reachable read paths failing open to empty surfaces (admin analytics pages, practitioner billing and certification, messages/conversations pages, settings integrations, saved meals).
- 16 MEDIUM: missing rpcs (increment_token_balance, invitation and referral rpcs, send_transactional_email, read_secret, lapse_due_channels) and buckets (genex-uploads, practitioner-statements, tax-documents).
- 20 LOW: sites only in modules with no imports (dormant: arnold-recommender, arnold-reconciler, early-era code with scratch names a/b/abc/hello/img, lab_orders, push_tokens, streaks etc.).

Remediation fork per Section 6: 96 of 125 have their creating migration ALREADY IN THE REPO (never applied); applying a tranche activates that subsystem (product decision per cluster). 29 have no repo definition anywhere: 5 CRITICAL among them (subscriptions, genetic_variants, messages, conversations, plugin_requests) need either a newly authored migration (feature wanted) or a code fix (rename drift or feature abandoned; genetic_variants is plausibly the live user_variants under a drifted name).

## Class B: missing columns on live tables (snapshot/column-misses-verified.json)

284 parser candidates were individually adjudicated: 120 REAL (36 CRITICAL writes, 84 HIGH reads), 30 false positives discarded, 0 near-miss reversals. Highlights beyond the executive summary: helix_transactions.transaction_type (live column is type) rejects both token-award inserts; practitioners.dispensary_slug rejects white-label publish; body_tracker_entries reconciliation flags (4 columns) reject the Arnold reconciler writes; body_tracker_recommendations.context_hash rejects the Arnold cross-reference persist.

Systematic pattern, verified not noise: code was written against a RICHER schema generation than production. Live practitioners has 6 columns while 12+ files query account_status, practice_name, credential_type, six practice_* address fields and more (a layout comment attributes them to a P91/_180 migration that never reached live; 20260418000160_practitioners_schema_reconciliation.sql sits UNAPPLIED in the repo). Live profiles (33 cols) lacks all 18 flagged columns the code expects (first_name/last_name/email/phone/phone_number, sex/biological_sex/age, height_cm/weight_kg/body_weight_kg, timezone, feature flags). Some sites were already hand-fixed to the live shape (a 2026-06-12 interaction-engine comment documents exactly this class); the 120 pairs are the unfixed remainder.

Remediation fork: where an unapplied repo migration adds the expected columns (practitioner pack, possibly profile pack), the apply-vs-fix decision is the same subsystem decision as Class A. Where no migration exists (audit_logs shape, daily_scores shape, helix_transactions.transaction_type, orders.items, reward_redemptions naming), the code drifted from the live truth and the fix is a code correction to the live shape, or an explicit append-only column addition if Gary prefers the code's shape. Never both silently.

## Class C: migration parity (snapshot/migration-parity.json)

507 applied vs 500 repo files; only 3 version strings match. Version-or-name join: 175 repo files never applied, 180 applied entries with no repo file, 3 applied twice under different versions. Root cause is procedural: MCP apply_migration stamps its own timestamp and free-form name, so the version namespace cannot reconcile. The Section 8 parity guardrail needs a canonical key going forward (stamp the filename version at apply time) plus a reviewed baseline for the historical 175/180.

## Class D: edge function parity (snapshot/edge-function-parity.json)

54 live vs 100 repo dirs. 14 live functions have NO repo source (auth-critical send-verification-code, verify-email-code, auto-confirm-signup, send-otp; body-scan-export; bright-api; generate-recommendations; prompt-186-fdc-proxy; quick-endpoint; 5 shop one-shots): live code outside version control. 60 repo functions not deployed (map_monitor fleet, gordon and arnold functions, exec reporting, payout, channel verification): phantom invocations if anything calls them expecting live.

## Informational (no action in 210d without Gary decision)

- 155 live tables have zero code-literal references (snapshot/orphan-tables.json): fed by triggers, pg_cron, dashboards, or dead. Report only; never dropped here.
- RLS policies: zero qualified-reference drift (t.col checks all valid). Unqualified identifier refs were not checkable at precision; 10 policies carry 58 to 62 KB pathologically nested autoheal expressions (perf cleanup candidate, separate prompt).
- Dynamic references needing manual review at remediation: 28 .from, 1 .rpc, 32 storage.from sites (snapshot/code-refs-scan.json dynamic_unresolved).
- Enum VALUE usage in code vs the 65 live enums was not covered in this pass (name-level only); residual for the guardrail phase where generated types make enum drift a compile error.
- Index suggestions: none raised (informational class per Section 2 taxonomy).

## Proposed remediation order (each wave reviewed under OBRA, signed off by Gary, applied with rollback run_id archived)

- WAVE P0, stop active data loss on money and health paths (code fixes to live shape, no product activation): stripe subscriptions record (decide store-or-drop; if store, new append-only table migration), orders.items, audit_logs shape unification, daily_scores writer AND 208k reader to live columns, helix_transactions.type, profiles phone/timezone, genetic import pair (genetic_variants -> user_variants or new table decision + genetic_profiles payload fix), viatokens balance/rpc decision, reward_redemptions naming, regulatory_kelsey_reviews shape.
- WAVE P1, subsystem activation decisions per cluster (apply the unapplied migration tranche OR retire the code): white_label, practitioner core + referrals + certifications + waitlist, hannah ultrathink/avatar, ai_personalization, gamification engine tables, unit_economics + archetypes + marketing_spend, messages/conversations, plugin_requests, data_source_connections, saved_meals, integration_sync_log, agent panel tables. Each cluster gets its own decision line at sign-off.
- WAVE P2, mediums: missing rpcs and buckets per surviving decisions; dormant-code cleanup deferred to a future prompt (no deletions in 210d).
- WAVE P3, Sections 7 and 8: reason-tagged fail-open + strict mode + generated-types typecheck + CI drift and parity gates + edge-function coverage, so none of this can ship silently again.

## Method and coverage statement

Name-level object scan: regex over string literals with dynamic refs flagged for manual review (61 sites). Column pass: conservative window parser producing candidates, every distinct pair human-adjudicated against code and live types (30 false positives discarded; payload spreads mean the 36 write pairs are a floor, not a ceiling). Policy pass: qualified refs only. Live verification: 10 sampled tables plus daily_scores columns confirmed by direct SQL. All access read-only. No PII anywhere in report or snapshots.
