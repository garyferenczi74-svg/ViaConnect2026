# Prompt 225 Phase 9: Thanos live ingest proof

**Date:** 2026-08-20  
**Endpoint:** `POST /api/cron/prove-225-thanos-ingest?run=1`  
**Artifact:** `docs/peptides/225-thanos-live-ingest-proof.json`

## Verdict

| Gate | Result |
|------|--------|
| Live `pipeline_runs` dump | **PASS** (`ops-thanos-allowlist-*` rows present) |
| Live `firecrawl_run_ledger` dump | **PASS** (`source_class=thanos_peptide`) |
| Collection 14 ownership | **PASS** (`peptide_education` / thanos / live; kb_peptides=157) |
| Legacy education rows | **PASS** (`peptide_education_entries` count=6) |
| Staging rows landed | **FAIL this pass** (0) |
| Full ingestHealthy | **FAIL this pass** |

## Root causes found and fixed

1. **Thanos upsert wrote `status` instead of `gate_status`** so staging inserts could not land even when search worked. Fixed in `allowlistIngest.ts`.
2. **Firecrawl search response shape changed** to grouped `data.web[]` (flat `data[]` parser yielded discovered=0). Fixed in `firecrawl/client.ts`.
3. **Live Firecrawl calls return HTTP 402** (billing / payment required) on production key. After parser fix: `searchFailed=4`, reasons `http_402` x4. No discoveries until Firecrawl credits/billing restored.

## What this proves (Phase 0 1.7)

- Ops path for `thanos.allowlist` is live and writes `pipeline_runs` + `firecrawl_run_ledger`.
- Dump is evidence, not dashboard state.
- Marshall still required before any consumer promotion from staging.
- Staging volume cannot be claimed healthy while Firecrawl returns 402.

## Next action (ops, not code)

Restore Firecrawl billing / credits on the production `FIRECRAWL_API_KEY` (or `firecrawl_api_key`), then re-run:

```text
POST /api/cron/prove-225-thanos-ingest?run=1
```

Expect `discovered > 0`, `staged > 0`, `stagingHealthy=true`, `ingestHealthy=true`.
