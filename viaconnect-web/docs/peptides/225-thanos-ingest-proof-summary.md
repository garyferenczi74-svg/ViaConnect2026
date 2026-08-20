# Prompt 225 Phase 9: Thanos live ingest proof

**Date:** 2026-08-20  
**Endpoint:** `POST /api/cron/prove-225-thanos-ingest?run=1`  
**Artifact:** `docs/peptides/225-thanos-live-ingest-proof.json`

## Verdict (2026-08-20 re-prove after Firecrawl reload)

| Gate | Result |
|------|--------|
| Live `pipeline_runs` dump | **PASS** (`ops-thanos-allowlist-5c852b2a-…`) |
| Live `firecrawl_run_ledger` dump | **PASS** (`source_class=thanos_peptide`) |
| Collection 14 ownership | **PASS** (`peptide_education` / thanos / live; kb_peptides=157) |
| Legacy education rows | **PASS** (`peptide_education_entries` count=6) |
| Firecrawl billing | **PASS** (`firecrawlBillingBlocked=false`) |
| Discoveries | **PASS** (`discovered=12`) |
| Staging rows landed | **PASS** (`staged=3`, `stagingCount=3`) |
| Full ingestHealthy | **PASS** |

Latest ingest sample: 2 pending + 1 escalated Thymosin Alpha-1 / Ta1 authority rows. Marshall still required before consumer promotion.

## Root causes found and fixed

1. **Thanos upsert wrote `status` instead of `gate_status`** so staging inserts could not land even when search worked. Fixed in `allowlistIngest.ts`.
2. **Firecrawl search response shape changed** to grouped `data.web[]` (flat `data[]` parser yielded discovered=0). Fixed in `firecrawl/client.ts`.
3. **Firecrawl HTTP 402** blocked discoveries until billing reloaded (Gary ops).
4. **Upsert conflict target was `content_hash`** against a table whose durable unique is `source_url` (competitive ingest already used `source_url`). Fixed: `onConflict: 'source_url'` + `stageErrors` capture.

## What this proves (Phase 0 1.7)

- Ops path for `thanos.allowlist` is live and writes `pipeline_runs` + `firecrawl_run_ledger`.
- Dump is evidence, not dashboard state.
- Allowlist ingest discovers and stages; Marshall gate still required before consumer promotion.
