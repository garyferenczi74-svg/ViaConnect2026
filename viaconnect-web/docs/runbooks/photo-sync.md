# Photo Sync Runbook

Synchronizes `products.image_url` with files in the `supplement-photos` Supabase Storage bucket. Read-only audit, then dry-run, then human-reviewed apply.

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
- Any `still_missing` count above zero = follow-up upload work needed (handled in §4 below).

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

### 4. Triage still-missing SKUs

The admin surface at `/admin/catalog-health` lists every active product whose image is `NULL`, `STALE_SUPABASE`, or `PLACEHOLDER`. Each row deep-links to the bucket dashboard. Upload the missing image to `supplement-photos` with the matching SKU as the filename, then re-run §1 + §2 + §3.

### 5. Rollback (if needed)

```bash
npx tsx scripts/sync-supplement-photos.ts --rollback=<run_id>
```

Restores every `previous_image_url` exactly. Writes new `products_image_audit` rows tagged `ROLLBACK` for the audit trail.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `FATAL: SUPABASE_SERVICE_ROLE_KEY not set` | Missing env var | Add to `.env.local`. Never commit. |
| `bucket list failed: Bucket not found` | Bucket renamed or not provisioned | Re-create bucket via Supabase dashboard with id `supplement-photos`, public read RLS. |
| `RLS-blocked` on products UPDATE | Service role key not used | Confirm script is using service-role client (see `scripts/audit/_supabase-client.ts`). |
| `match-plan: ... NONE` count high | Filenames in bucket don't match SKU/slug pattern | Either rename bucket files (separate prompt) or upload SKU-named copies. |
| Image too large (>5MB) listed in REJECTED_UPLOAD | File above bucket size cap | Compress + re-upload. Lossy compression to 1MB target, WebP preferred. |

## Escalation

- Any image change that affects label-claim accuracy: **Steve Rica** (Compliance) before apply.
- Peptide visual representation questions (delivery-form artwork variants): **Dr. Fadi Dagher** (Medical Director).

## Deferred from initial implementation

- Playwright E2E breakpoint regression suite — depends on Playwright being installed in this dev env.
- Local-Supabase-CLI integration test (apply / rollback round-trip with seeded fixtures) — depends on the Supabase CLI being set up. Pure-helper tests (Vitest) cover the matching, normalization, and confidence logic independently.
- `package.json` npm scripts (`photos:audit`, `photos:sync`, `photos:report`) — direct `npx tsx` invocations are documented here instead. If preferred, ask Gary to approve the scripts block addition.
- `<ProductImage />` refactor across existing product cards — the component is shipped; consumer/practitioner/naturopath card surfaces still use their existing image renderers and can be migrated surgically per surface in follow-up PRs (avoiding a single sweeping diff).
