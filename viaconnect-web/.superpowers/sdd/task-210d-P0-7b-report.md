# Task P0-7b Report: GENEX360 import redirected to user_variants

Branch: feat/210d-schema-integrity (worktree C:\Users\garyf\ViaConnect2026-210d)
Commit: 65a8383a4fdcff7198a9f15a261a84a5f1c03277 (5 files changed, 358 insertions, 9 deletions)
Status: DONE

Executes the P0-7 investigation recommendation exactly (add risk_level + category to
user_variants, then redirect the genemetrics import into the consumer lane with the
comparison-table key renames and the live panel-scoped onConflict key).

## Files delivered (committed by explicit path only)

1. supabase/migrations/20260707160000_prompt_210d_user_variants_risk_category.sql (new; NOT applied)
2. src/lib/genetics/genemetricsImportPayload.ts (new; pure payload builder + onConflict constant)
3. src/lib/genetics/__tests__/genex-import-shape.test.ts (new; 8 Vitest cases, red-first)
4. src/app/api/genex/genemetrics/route.ts (edited; redirect + builder adoption + reportSupabaseError)
5. src/lib/api/genetic-import-service.ts (edited; dead-code drift-tag, fail-closed preserved)

Pre-existing dirt (supabase/.temp/cli-latest modified, untracked .superpowers/) untouched and
not staged. The temporary scoped tsconfig (tsconfig.210d-p07b.json) was deleted before the
commit; no scratch files committed.

## Step 1: Migration (NOT applied)

Exactly the statement the brief specifies, one line, plus a one-line comment citing Prompt 210d
P0-7 and Gary's 2026-07-07 decision and the P0-7 report path:

  alter table public.user_variants add column if not exists risk_level text, add column if not exists category text;

Stamp 20260707160000 appends after the latest existing migration (20260707150000 prompt_210f).
Append-only, both clauses idempotent (if not exists), no drop or rename. Awaits controller
sign-off from Gary before any apply via the Supabase MCP.

## Step 2: Typing choice (stated)

Chosen: extend the payload type locally with a narrow interface (NO any, NO cast).

src/lib/supabase/types.ts was regenerated in e4b4aca2 BEFORE this migration exists, so its
user_variants Insert type does not yet carry risk_level/category. The builder module defines
`GenemetricsVariantRow` as `Database['public']['Tables']['user_variants']['Insert']` extended
with the two pending columns (risk_level, category as string) and narrows the columns the
builder always sets (user_id, panel_key, gene, rsid, genotype, clinical_significance) to
non-null. Because GenemetricsVariantRow is a structural supertype of the generated Insert type,
`supabase.from('user_variants').upsert(allVariants, ...)` type-checks with ZERO cast and ZERO
any (verified by scoped tsc, exit 0). The local extension is documented as removable at the
next typegen regen per scripts/schema/regen-types.md. types.ts itself was NOT hand-edited.

The narrowing of gene/genotype to non-null also prevents a NEW tsc error: the summary write
maps high-risk genes into additional_genes (a Json field), and `(string | null | undefined)[]`
is not assignable to Json[]; with the builder guaranteeing string, `string[]` is valid Json.

## Step 3: Redirect (route.ts)

- The allVariants upsert now targets user_variants (was the non-existent genetic_variants).
- Key renames from the P0-7 comparison table, applied by the pure builder: panel -> panel_key,
  clinical_summary -> clinical_significance; risk_level and category keep their names (columns
  arrive via the migration); user_id, gene, rsid, genotype are exact maps. Values unchanged.
- onConflict is the live panel-scoped unique key 'user_id,rsid,panel_key' (via the exported
  constant GENEMETRICS_USER_VARIANTS_ONCONFLICT); the old stale 'user_id,rsid' is gone. This
  matches sibling live writes (dnaUploadStore.ts:111, seedSamplePanels.ts).
- The stale `(supabase as any)` cast and its "not in regenerated typegen - cast" comment are
  removed; the redirected upsert is fully typed.
- The inline row literal (route.ts:189-198) was extracted to the exported pure builder
  buildGenemetricsVariantRow so the shape test can import it. Placed in src/lib/genetics/ (a
  pure module) rather than as a route.ts export, because Next.js validates the export surface of
  route files (mirrors the P0-6 decision to keep the builder out of page.tsx).

Response-contract check: the frontend consumer genetics/upload/page.tsx types the import
response variants as `{ gene, rsid, genotype, risk_level, category }` (page.tsx:94) and reads
only those five keys, all unchanged by the renames. The `clinical_significance` render at
page.tsx:466 belongs to the separate PDF-preview block, not this response. So the echoed
`variants: allVariants.slice(0,50)` gaining panel_key/clinical_significance (instead of the old
panel/clinical_summary extra keys) breaks no consumer.

## Step 4: Dead-code drift-tag (genetic-import-service.ts)

The variant-shaped genetic_profiles upsert (line ~259) is DEAD CODE (processGeneticImport and
parseRawGeneticFile have zero importers) and fail-CLOSED (it throws). Per the brief it was NOT
deleted (removal needs its own approval). Added:
- A one-line dead-pending-decision comment citing the P0-7 report.
- reportSupabaseError('genex.legacyImport', error, { table: 'genetic_profiles' }) BEFORE the
  throw. Fail-closed is preserved: the path still throws (in strict mode reportSupabaseError
  rethrows the original error; otherwise the existing `throw new Error(...)` fires). Context
  carries the table name only, no variant data.

The client here is the untyped SupabaseClient (no Database generic), so the misdirected
GeneticProfileRecord[] upsert compiled before and still compiles; no shape change was made.

## Step 5: Shape test (TDD red-first)

src/lib/genetics/__tests__/genex-import-shape.test.ts (node env, node builtins only, zero any),
picked up by the vitest include `src/**/__tests__/**/*.test.ts`. Asserts:

(a) Migration file: found by suffix; parsed added columns are exactly [category, risk_level];
    the non-comment, whitespace-normalized, lowercased content EQUALS the single alter statement;
    plus explicit no-drop/no-rename append-only checks.
(b) Live user_variants Row keys parsed AT RUNTIME from docs/integrity/snapshot/live-types.ts
    (anchored `/^\s*user_variants: \{$/`, Row block collected until its closing brace), never
    hardcoded. Sanity: >= 10 unique keys including user_id, rsid, panel_key,
    clinical_significance. Deliberately does NOT assert absence of risk_level/category, so a
    future post-apply snapshot refresh keeps the suite green (the union only gains members).
(c) Subset invariant: every buildGenemetricsVariantRow key is in (live Row keys UNION migration
    columns). Fixture is synthetic and obviously fake (rsTEST0001, TESTGENE, user-TEST-0001) per
    the strict genetic-data privacy posture; no real rsids, genotypes, or variant data. Extra
    cases lock the renames + value passthrough and assert no stale genetic_variants keys
    (panel, clinical_summary).
(d) onConflict: GENEMETRICS_USER_VARIANTS_ONCONFLICT === 'user_id,rsid,panel_key'.

Red-first evidence: with the builder module absent, the run failed with
"Cannot find package '@/lib/genetics/genemetricsImportPayload'" (0 tests). After delivery: 8/8.

## Step 6: reportSupabaseError on the redirected upsert

route.ts, scope 'genex.import', context { table: 'user_variants' } only. The pre-210d code
swallowed the upsert result and continued (fail-open). Now the error is destructured and, if
present, reported. The strict-mode rethrow is CONTAINED in a try/catch so the route's response
contract is unchanged in every environment (production is always fail-open; dev/preview/test are
strict, and containment keeps the safeLog.error drift log while still returning 200 and running
the genetic_profiles summary write). Context carries the table name only, no variant data.

## Step 7: Verification (commands + outputs)

1. Wrote the test first, `npx vitest run ...genex-import-shape.test.ts` -> RED (module not
   found, 0 tests) as required.
2. Created migration, builder module, edited route + service.
3. `npx vitest run ...genex-import-shape.test.ts` -> GREEN, 8/8.
4. Scoped tsc: temporary tsconfig.210d-p07b.json at repo root (extends ./tsconfig.json,
   incremental false, types ["node"], include limited to next-env.d.ts + the four changed/new
   src/ files). `npx tsc -p tsconfig.210d-p07b.json` -> exit 0, no diagnostics. Temp tsconfig
   deleted afterwards.
5. ASCII audit (node script in the session scratchpad, not the repo): full-file scan (every
   codepoint <= U+007E) on the three new files, added-diff-lines scan on the two edited files ->
   PASS. Zero non-ASCII means zero em dashes, en dashes, or emojis in everything I wrote.
6. any scan on all five files: the only match is the PRE-EXISTING `(r: any)` at route.ts:114 in
   the untouched "check" action (external API JSON parse), left as-is per scope discipline (the
   P0-6 precedent for pre-existing casts). My changes ADDED zero any and REMOVED two
   (Array<any> and (supabase as any)).
7. Regression: combined `genex-import-shape.test.ts` + `schema-drift.test.ts` -> 34/34
   (8 new + 26 P0-1 reporter cases). `audit-log-shape.test.ts` (references the genemetrics
   route) -> 8/8, unaffected.
8. Re-verified branch feat/210d-schema-integrity, staged ONLY the five files by explicit path,
   committed -> 65a8383a with the exact brief message plus the repo's standard Co-Authored-By
   trailer.

## Concerns / notes

- Migration NOT applied. Controller must present it to Gary for sign-off; rollback run_id to be
  recorded in docs/integrity/remediation-log.md at apply time. Until applied, the redirected
  upsert will still drift (missing risk_level/category columns), but now it is drift-tagged and
  visible via reportSupabaseError('genex.import') instead of writing to a non-existent table.
- Post-apply follow-up: regenerate types.ts per scripts/schema/regen-types.md, then the local
  GenemetricsVariantRow extension in genemetricsImportPayload.ts becomes redundant and the
  narrow interface can be simplified to the plain generated Insert type.
- Out of P0-7b scope, left untouched and flagged: (a) the sibling genetic_variants upsert in
  src/app/api/genex/upload/route.ts:474-481 still targets the non-existent genetic_variants
  table with the stale onConflict 'user_id,rsid' and its own `(supabase as any)` cast; it is the
  same class of bug and a natural next redirect. (b) The genemetrics audit_logs insert
  (route.ts ~262) still records table_name: "genetic_variants" and uses the pre-P0-3 audit shape
  (table_name/record_id/new_data); both are separate writes not named in this brief.
- The genemetrics summary write to genetic_profiles (route.ts:243) is correctly shaped and was
  left untouched, per the P0-7 verdict.
- Not run here: the full test suite (deferred to final review) and any migration apply.

---

## P0-7c Fix: genex upload route redirected to user_variants

Branch: feat/210d-schema-integrity
Status: DONE

### What changed

Two files edited (committed by explicit path only):

1. src/app/api/genex/upload/route.ts (edited)
2. src/lib/genetics/__tests__/genex-import-shape.test.ts (edited)

### Route change (upload/route.ts)

Added import for buildGenemetricsVariantRow and GENEMETRICS_USER_VARIANTS_ONCONFLICT from
genemetricsImportPayload.ts (the same module used by the genemetrics route in P0-7b).

Replaced the variant upsert block (the stale four-line region at old lines 459-481):
  - Removed the inline row literal that wrote to "genetic_variants" with the stale onConflict
    'user_id,rsid' and two `(supabase as any)` casts.
  - Replaced with buildGenemetricsVariantRow mapping ScoredVariant (snake_case) to
    GenemetricsVariantInput (camelCase) per the field table:
      userId      <- user.id
      panel       <- v.panel        (builder renames -> panel_key)
      gene        <- v.gene
      rsid        <- v.rsid
      genotype    <- v.genotype
      riskLevel   <- v.risk_level   (builder renames -> risk_level in output)
      category    <- v.category
      clinicalSummary <- v.clinical_summary (builder renames -> clinical_significance)
  - Upsert now targets user_variants with onConflict GENEMETRICS_USER_VARIANTS_ONCONFLICT
    ('user_id,rsid,panel_key').
  - Error path: reportSupabaseError('genex.upload.variants', error, { table: 'user_variants' })
    in a contained try/catch (fail-open, same pattern as the genemetrics route). Context carries
    only the table name, no genetic data.

Builder reused: no extension to genemetricsImportPayload.ts was needed. The ScoredVariant shape
maps cleanly onto GenemetricsVariantInput via snake_case -> camelCase adapter at the call site.

any removed: the two `(supabase as any).from("genetic_variants")` casts are gone. Zero new any
introduced. The pre-existing `(supabase as any).from("audit_logs")` casts at lines 543 and 588
(audit log writes) are unrelated and were left untouched per scope discipline.

### Shape test extension (genex-import-shape.test.ts)

Added describe block 5 "upload route source-text contract (P0-7c)". Four assertions (beforeAll
reads the upload route source once):
  (a) source does NOT contain '"genetic_variants"' (the old stale table reference)
  (b) source contains '.from("user_variants")' (the live consumer lane)
  (c) source contains 'buildGenemetricsVariantRow' (shared builder)
  (d) source contains 'GENEMETRICS_USER_VARIANTS_ONCONFLICT' (correct onConflict)

Red-first verified: with the test block in place but BEFORE the route fix, 4 failed / 8 passed
(exactly the 4 new assertions, as expected). After the route fix: 12/12 passed.

### Verification

1. RED run: vitest run genex-import-shape.test.ts -> 12 tests, 4 FAIL (new assertions only).
2. Made route changes.
3. GREEN run: vitest run genex-import-shape.test.ts -> 12/12.
4. Scoped tsc: tsconfig.210d-p07c.json (extends ./tsconfig.json, incremental false, types
   ["node"], include upload/route.ts + genemetricsImportPayload.ts + the test file) ->
   exit 0, zero diagnostics. Temp tsconfig deleted afterwards.
5. ASCII audit (all codepoints <= U+007E) on both changed files -> PASS.
6. any scan on both changed files: two hits are the pre-existing audit_logs casts (untouched);
   zero new any; the replaced block's two genetic_variants casts are removed.
7. Regression: genex-import-shape.test.ts + schema-drift.test.ts + audit-log-shape.test.ts ->
   46/46 (12 + 26 + 8).
8. Committed two files by explicit path.

### Concerns / notes

- The migration (20260707160000_prompt_210d_user_variants_risk_category.sql) applied to prod
  today per the task brief. The redirected upsert now writes risk_level and category to live
  columns rather than drifting silently.
- The genemetrics audit_logs insert (genemetrics/route.ts line ~284) still records
  table_name: 'genetic_variants'. That is a metadata label in an audit record, not a write to
  the table; it is a separate cleanup outside P0-7c scope.
- PANEL_DEFINITIONS.clinical_summary values (the inline definitions inside the upload route) are
  static label strings used to populate clinical_significance via the builder. They are source
  comments on known SNP biology, not user genetic data. They were left untouched per scope.
