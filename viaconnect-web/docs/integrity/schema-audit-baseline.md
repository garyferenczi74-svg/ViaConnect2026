# Prompt 210d STEP 0: Schema Audit Baseline

Date: 2026-07-06. Branch: feat/210d-schema-integrity (worktree, base 30d686bf).
Read-only discovery per Prompt 210d Section 3. No schema change and no code change was made.
Live source of truth: Supabase project nnhkcufyqjojdbvdrpky (us-east-2), introspected via the Supabase MCP (execute_sql, generate_typescript_types, list_edge_functions). The Supabase CLI 2.84.2 is installed but not authenticated; the MCP is the working introspection path.

## 1. Live schema snapshot (authoritative)

Captured to docs/integrity/snapshot/ (machine readable, schema metadata only, no user data):

| Object class | Live count | Snapshot file |
|---|---|---|
| Tables (public) | 576, all with RLS enabled | live-types.ts (33,843 lines, verbatim generated), rls-tables.json |
| Columns (public) | 7,504 | live-types.ts |
| Views | 5 (product_catalog_enriched, security_scan_summary, 3 practitioner summaries) | views.json |
| RLS policies | 941 | policies.json (9.3 MB, verified byte-complete in 8 pages) |
| DB functions | 166 | db-functions.json |
| Enum types | 65 | enums.json |
| Storage buckets | 28 | buckets.json |
| Applied migrations | 507 | applied-migrations.json (md5-verified against live) |
| Live edge functions | 54, all ACTIVE | edge-functions-live.json |

Additional derived artifacts: migration-parity.json, edge-function-parity.json, types-diff.json, code-refs-scan.json.

## 2. Migration parity (STEP 0 item 3): broken in both directions, and the version key is unusable

- Repo has 500 migration files; prod has 507 applied entries. Only 3 version strings match exactly in both. The apply pipeline (MCP apply_migration) stamps its own timestamp as the version and a free-form name, so repo filename versions and applied versions are nearly disjoint namespaces.
- With a version-or-name join: 175 repo files have no applied match, 180 applied entries have no repo file, and 3 migrations were applied twice under different versions (fix_recommendations_and_vitality, prompt_152i_rev2_catalyst revision, prompt_168_meals_and_nutrition_targets).
- The 175 unapplied repo files are not noise: direct live checks confirm their objects are absent (see Section 4). Entire migration tranches (practitioner waitlist/certifications/referrals, white label, unit economics, archetypes, marketing spend, hannah ultrathink, saved_meals, data_source_connections and more) were committed to the repo but never applied to prod.
- Consequence for the Section 8 CI parity guardrail: a naive version comparison cannot work. The check needs a canonical join (and the apply process should stamp the filename version going forward). Historical drift will need a reviewed baseline.

## 3. Typed-access posture (STEP 0 item 4): guardrail exists but is fully disarmed

- src/lib/supabase/types.ts (30,390 lines) is hand-maintained, not generated from live. Diff vs live-generated types: it is a strict subset. Zero ghost objects (nothing typed that does not exist live), but 61 live tables, 1 view, 6 functions and 6 enums are missing from it.
- Clients are correctly typed (createBrowserClient<Database>, createServerClient<Database>), so the type layer is wired; it is just stale and unenforced.
- Enforcement is off twice: next.config sets typescript.ignoreBuildErrors true, and the CI TypeScript step is explicitly advisory, documenting roughly 335 known errors, mostly Supabase never from untyped tables (introduced in 8f28bd6).
- Edge functions (supabase/functions) import no Database types at all: roughly 550 database call sites there are outside the type system entirely.

## 4. Preliminary phantom scan (name level, code literals vs live snapshot)

Scanned 3,458 TypeScript files (src plus supabase/functions) for string-literal .from(), .rpc() and storage.from() references and set-diffed against the live snapshot. This is a name-level sizing scan; the full severity-ranked drift report (Sections 4 and 5 of the prompt) is the next deliverable.

- Table references: 539 distinct names; 427 exist live; 112 DO NOT EXIST in production (code-refs-scan.json holds every name with file:line sites).
- RPC references: 67 distinct; 54 exist; 13 missing (including increment_token_balance called by the gamification engine, invitation and referral RPCs, send_transactional_email in an edge function).
- Bucket references: 11 distinct; 8 exist; 3 missing (genex-uploads used by the GENEX360 upload route, practitioner-statements, tax-documents).
- Dynamic or computed references that need manual review: 28 .from, 1 .rpc, 32 storage.from.
- Live spot check of 10 sampled phantom tables (practitioner_waitlist, white_label_production_orders, subscriptions, saved_meals, conversations, user_medications, agent_messages, practitioner_certifications, marketing_spend, data_source_connections): zero exist. The scan is validated.
- Known false positives in the raw list to triage out during the audit: test mocks (fake), a generic literal (table), and a pg catalog read (pg_policies).
- Severity preview per the prompt Section 5 model: the list includes write paths (Critical class), for example the Stripe webhook writing to subscriptions and the gamification token RPC. These have been silently failing open in production.

The phantom cluster corresponds closely to the 175 never-applied repo migrations: the dominant root cause is migrations committed but never applied, with code shipped against them.

## 5. Edge function parity (STEP 0 item 2 extension)

- 54 live vs 100 repo function dirs (5 shared underscore dirs excluded).
- 14 live functions have NO source in the repo, including the auth-critical send-verification-code, verify-email-code, auto-confirm-signup and send-otp, plus body-scan-export, bright-api, generate-recommendations, prompt-186-fdc-proxy, quick-endpoint and 5 shop one-shots. Live code outside version control.
- 60 repo functions are NOT deployed (map_monitor fleet, gordon and arnold functions, exec reporting, shop catalog tooling, payout and channel verification functions and more). Any caller that invokes one of these expecting it live is a phantom invocation; the audit cross-references callers.
- One live function (body-scan-analyze) has a nonstandard entrypoint path (source/body-scan-analyze/index.ts).

## 6. Structured logging shape (STEP 0 item 5)

safeLog (src/lib/utils/safe-log.ts) emits one JSON line: timestamp, level, scope, message, context. The Section 7 schema-drift reason tagging fits as context fields (for example reason, pgCode, relation) with no new logger. Edge functions have a Deno mirror in supabase/functions/_shared/safe-log.ts. PII review of the new fields goes to the security-advisor agent (a Kelsey agent is not registered in this workspace).

## 7. Incidental findings (informational, no action in 210d)

- 10 RLS policies carry pathologically bloated expressions (58 to 62 KB each, recursively nested SELECT wrappers around auth.uid()), the visible residue of an automated initplan repair loop applied to its own output. Semantically fine; a cleanup candidate for a separate prompt.
- 55 policies target service_role (inert, service_role bypasses RLS); 126 policies are USING true.
- 3 migrations were applied twice (names above).
- Both supplement-photos and Products buckets exist live, so the Prompt 110 bucket rename is not currently a phantom.

## 8. Tooling gate (Prompt 210d Section 11)

Nothing needs to be installed. package.json stays untouched.
- Introspection: Supabase MCP (already authorized) plus node for offline set analysis.
- AST pass: the repo's existing typescript ^5 dependency provides the compiler API; no ts-morph needed.
- Type generation: available via MCP generate_typescript_types (proven, produced live-types.ts). If Gary wants CI to regenerate types per build instead of using a committed snapshot, CI would need a SUPABASE_ACCESS_TOKEN secret for the already-installed CLI; that is a provisioning decision, not a dependency change.

## 9. STEP 0 compliance

- All access was read-only (SELECT queries, type generation, function listing). No lock-taking or load-heavy queries; catalogs were paginated.
- No migration applied, no code changed, no do-not-touch item (email templates, package.json, applied migrations) touched.
- This report and every snapshot file are PII-clean by construction: schema metadata only.
