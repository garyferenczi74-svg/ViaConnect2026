# Photo Sync Runbook

Synchronizes `product_catalog.image_url` with files in the `supplement-photos` Supabase Storage bucket. Read-only audit, then dry-run, then human-reviewed apply. (Bucket-name history: #109 shipped with `supplement-photos`; #110 §1 wrongly renamed to `Products`; 2026-04-21 evening confirmed `supplement-photos` is the real bucket per the upload dashboard URL.)

## Prerequisites

- Env var `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local` (server-side only; never commit; never log).
- Read access to bucket `supplement-photos` in project `nnhkcufyqjojdbvdrpky`.
- Write access to `public.products` and `public.products_image_audit`.
- Output directory writable: defaults to `/tmp/viaconnect/`. Override with `PHOTO_SYNC_OUT_DIR=...`.

## Step-by-step

### 1. Audit current state

```bash
npx tsx scripts/audit/current-image-state.ts
npx tsx scripts/audit/list-bucket-objects.ts
npx tsx scripts/audit/match-products-to-files.ts
```

Each script writes a JSON artifact to `/tmp/viaconnect/` and prints a stdout summary. Review the summary:

- `total | already_valid | will_update | still_missing | external_skipped` should add up to total products.
- Any `still_missing` count above zero = follow-up upload work needed (handled in §5 below).

### 2. Dry-run the sync

```bash
npx tsx scripts/sync-supplement-photos.ts --dry-run
```

Prints every row that **would** update. No DB writes. Exits 0 unless the script itself errors. Review the proposed updates with someone (Gary or Steve Rica).

Optional: scope to one category for phased rollouts.

```bash
npx tsx scripts/sync-supplement-photos.ts --dry-run --category=base
```

### 3. Apply

```bash
npx tsx scripts/sync-supplement-photos.ts --apply
```

- Single transaction-equivalent flow: each `UPDATE` is followed by an `INSERT` into `products_image_audit` with the same `run_id`.
- Idempotent: re-running immediately produces zero writes (every UPDATE is gated by `image_url IS DISTINCT FROM new_url`).
- Writes a final report to `/tmp/viaconnect/sync-report-{ISO}.md` with per-SKU table + still-missing list.
- Prints the `run_id` to stdout. Save that value if you may need to roll back.

### 4. Reconcile

Re-run the current-state audit so the reconciliation diff has fresh data to compare against:

```bash
npx tsx scripts/audit/current-image-state.ts
npx tsx scripts/audit/generate-reconciliation-report.ts
```

- Writes `/tmp/viaconnect/reconciliation-report-{ISO}.md`: outcome counts, an errors section listing any HIGH-confidence row that failed to flip, and a per-SKU outcome table.
- Exits non-zero (code 3) if any row failed to flip or regressed. Block the merge on a non-zero exit and investigate each row flagged in the errors section.
- Attach this reconciliation markdown to the PR description along with `match-plan-*.json` and `sync-report-*.md` (spec §6 "Reports").

### 5. Triage still-missing SKUs

The admin surface at `/admin/catalog-health` lists every active product whose image is `NULL`, `STALE_SUPABASE`, or `PLACEHOLDER`. Each row deep-links to the bucket dashboard. Upload the missing image to `supplement-photos` with the matching SKU as the filename, then re-run §1 + §2 + §3.

### 6. Rollback (if needed)

```bash
npx tsx scripts/sync-supplement-photos.ts --rollback=<run_id>
```

Restores every `previous_image_url` exactly. Writes new `products_image_audit` rows tagged `ROLLBACK` for the audit trail.

## SNP targeted remediation (Prompt #110)

Scoped workflow for the 20 Methylation / GeneX360™ SNP SKUs + 6 GeneX360 service cards. Runs alongside the broad #109 sync; deterministic exact-filename matching only (no fuzzy Levenshtein fallback for this scope).

### 1. Reality check

```bash
npx tsx scripts/audit/snp-bucket-reality-check.ts
```

Classifies every target into one of four classes:

- **A**: asset in bucket, DB correct, frontend broken (escalate as frontend bug — should not happen after #109 fixes).
- **B**: asset in bucket, DB `image_url` wrong/NULL (remappable; feed into sync runner).
- **C**: asset missing, no candidate (generation required).
- **D**: asset present under a non-canonical filename (remap DB to the actual filename; file rename is a separate manual admin task).

Writes `/tmp/viaconnect/snp-reality-check-{ts}.json`.

### 2. Filename mapping

```bash
npx tsx scripts/audit/snp-filename-mapping.ts
```

Transforms the reality-check JSON into two artifacts: `snp-mapping-plan-{ts}.json` (human audit) and `snp-plan-{ts}.json` (MatchPlan-compatible, feedable into the sync runner).

### 3. Generation manifest (Class C targets)

```bash
npx tsx scripts/audit/snp-generation-manifest.ts
```

Emits `/tmp/viaconnect/snp-asset-generation-manifest.md` and `.csv`. Each SNP Class C target gets a spec card against template `VIACURA-SNP-Black-v1` (gold-on-black). Service Class C targets use `VIACURA-SERVICE-Navy-v1` (Deep Navy + Teal; compliance-gated by Steve Rica + Dr. Fadi Dagher).

### 4. Remap existing assets (Class B + D)

Scope addendum 2026-04-21 locked two in-scope categories. Run the sync once per category:

```bash
npx tsx scripts/sync-supplement-photos.ts \
  --plan-file=/tmp/viaconnect/snp-plan-{ts}.json \
  --category="Methylation / GeneX360" --apply

npx tsx scripts/sync-supplement-photos.ts \
  --plan-file=/tmp/viaconnect/snp-plan-{ts}.json \
  --category="Testing & Diagnostics" --apply
```

The `--plan-file` flag (added by #110) bypasses `pickLatest('match-plan-')` so the deterministic SNP mapping shadows the #109 fuzzy plan for this scope. The `--category` flag is case-insensitive substring matching, so the quoted display strings above match regardless of the exact DB casing. Transitional seed slugs (`snp_support`, `genex360_testing`) are also accepted by `isInScopeCategory()` for the mapping-stage guard.

### 5. Upload generated artwork

Once designer / pipeline delivers the Class C assets to `./incoming-snp-assets/`:

```bash
# preview
npx tsx scripts/upload-snp-assets.ts --source ./incoming-snp-assets --dry-run
# apply (uploads + auto-syncs the DB)
npx tsx scripts/upload-snp-assets.ts --source ./incoming-snp-assets --apply
```

Pre-flight validates filename regex (`^[a-z0-9]+(-[a-z0-9]+)*\.webp$`), size bounds (50 KB to 5 MB), and MIME. Subfolder structure is preserved (so `services/genex-m.webp` lands at `Products/services/genex-m.webp`). Default behavior auto-runs the reality-check → mapping → sync chain after a successful upload; pass `--no-auto-sync` to stop after upload.

**Write policy reminder:** The `supplement-photos` bucket's write policy must remain admin-only. `upload-snp-assets.ts` is the only script in #110 that writes to the bucket; all other scripts are read-only.

### 6. Reconcile

```bash
npx tsx scripts/audit/snp-bucket-reality-check.ts   # post-state
npx tsx scripts/audit/snp-reconciliation.ts
```

Writes `/tmp/viaconnect/snp-reconciliation-{ts}.md` with per-target status (RESOLVED / STILL_BROKEN), resolution source (EXISTING_REMAP / NEW_UPLOAD / STILL_MISSING), and the count of `products_image_audit` rows attributed to this run. Exits code 3 if any target is still broken, so CI can gate the PR merge on a clean reconciliation.

### 7. Playwright image-coverage E2E

Config: `playwright.config.ts` (5 viewport projects: 375/414/768/1024/1440 px).
Spec: `tests/e2e/snp-image-coverage.spec.ts`.

```bash
npx playwright install    # one-time; downloads browsers
npm run dev               # in another terminal
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

Asserts every SNP card + service card has `naturalWidth > 0` (i.e., the image actually loaded, not the fallback). Captures before/after screenshots at 375 px and 1440 px into `tests/e2e/__screenshots__/snp-coverage/`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `FATAL: SUPABASE_SERVICE_ROLE_KEY not set` | Missing env var | Add to `.env.local`. Never commit. |
| `bucket list failed: Bucket not found` | Bucket renamed or not provisioned | Confirm bucket id in Supabase dashboard is `supplement-photos` with public read RLS. Edit `PHOTO_BUCKET` in `src/lib/photoSync/types.ts` if the id changed. |
| `RLS-blocked` on products UPDATE | Service role key not used | Confirm script is using service-role client (see `scripts/audit/_supabase-client.ts`). |
| `match-plan: ... NONE` count high | Filenames in bucket don't match SKU/slug pattern | Either rename bucket files (separate prompt) or upload SKU-named copies. |
| Image too large (>5MB) listed in REJECTED_UPLOAD | File above bucket size cap | Compress + re-upload. Lossy compression to 1MB target, WebP preferred. |

## Escalation

- Any image change that affects label-claim accuracy: **Steve Rica** (Compliance) before apply.
- Peptide visual representation questions (delivery-form artwork variants): **Dr. Fadi Dagher** (Medical Director).

## Deferred from initial implementation

- Playwright config + SNP image-coverage spec shipped with #110 (`playwright.config.ts` + `tests/e2e/snp-image-coverage.spec.ts`). Running them requires one-time `npx playwright install` to download the browsers; the devDependency `@playwright/test` is already present.
- Local-Supabase-CLI integration test (apply / rollback round-trip with seeded fixtures) — depends on the Supabase CLI being set up. Pure-helper tests (Vitest) cover the matching, normalization, confidence, scope-filter, and outcome logic (41 cases) independently.
- `package.json` npm-script shortcuts registered 2026-04-21 (approved by Gary): `npm run photos:audit`, `npm run photos:sync -- --dry-run|--apply|--rollback=<run_id>`, `npm run photos:report`. Direct `npx tsx scripts/...` invocations still work and remain canonical in this runbook for clarity.
- `<ProductImage />` refactor across existing product cards — the component is shipped; consumer/practitioner/naturopath card surfaces still use their existing image renderers and can be migrated surgically per surface in follow-up PRs (avoiding a single sweeping diff).
- **Compliance review workflow** for service-card artwork (Steve Rica, Dr. Fadi Dagher) — §7 requires sign-off before upload. Procedural, not code; track in the PR description for each service-card batch.
