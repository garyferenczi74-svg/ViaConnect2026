# Prompt 219g formal budget projection (post-227a)

**Generated:** 2026-08-22T07:23:59.022Z  
**Project:** `nnhkcufyqjojdbvdrpky`  
**Spreadsheet:** `docs/research-hub/219g-budget-projection-post-227a.xlsx`  
**Closes:** Prompt 227a Section 10 item 8 (Budget / Firecrawl reduction)

## Verdict

| Item | Result |
| --- | --- |
| Raise Firecrawl daily ceiling? | **NO** (keep 200) |
| 227a Research Hub Firecrawl spend | **0** credits |
| Approx credits avoided / day vs naive scrape | **~136** |
| Observed 14d avg shared-pool credits / day | **154.3** |
| Observed 14d max credits / day | **701** |
| Projected headroom | **~45** credits / day |

## Why 227a reduces Firecrawl

- Evidence lane: **17** journals on NCBI E-utilities + **1** live RSS. No Firecrawl for wired live evidence.
- Signal lane: **4** live RSS + **1** YouTube Data API. No Firecrawl.
- Counterfactual B (scrape each E-utilities journal every 6h at ~2 credits): **136** credits/day in the hub lane alone, which would crowd the shared 200 ceiling when stacked with Thanos / Elysium / Hound Dog.

## Policy unchanged (219g)

- `FIRECRAWL_MAX_CREDITS_PER_DAY=200`
- `FIRECRAWL_MAX_PAGES_PER_RUN=25`
- Per-agent soft cap 50% of shared pool
- Review trigger: 3 consecutive UTC days above 160 shared credits

## Sheets in the workbook

1. Executive Summary
2. Ceilings and Policy
3. 227a Transport Map
4. Counterfactual Savings
5. Ledger Actuals 14d
6. Steady State Projection
7. Recommendations


## Ledger semantics

Day-sum of `firecrawl_run_ledger.credits_used` can exceed 200 because many pipelines call `defaultBudget()` per run. Shared day-state in `budgets.ts` only applies to callers of `tryReserveFirecrawl`.

| Metric (14d) | Value |
| --- | --- |
| Max single-run credits | 17 |
| Avg single-run credits | 7.11 |
| P95 single-run credits | 11 |
| Highest ledger day-sum | 701 (89 runs on 2026-08-17) |

Optional hardening: route all Firecrawl spend through `tryReserveFirecrawl` so day-sum matches the enforced shared ceiling.
