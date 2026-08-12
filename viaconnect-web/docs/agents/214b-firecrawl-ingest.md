# Prompt 214b: Autonomous ingestion (Firecrawl + PubMed + IGSR + social)

**Date:** 2026-08-12  
**Commits:** on main with feature branch merge  

## Integration summary

| Item | Value |
| :---- | :---- |
| Firecrawl | REST `https://api.firecrawl.dev/v1` scrape + search (no SDK) |
| Secret | `FIRECRAWL_API_KEY` (env only) |
| Optional | `NCBI_API_KEY` for PubMed rate limits |
| Budget defaults | `FIRECRAWL_MAX_PAGES_PER_RUN=25`, `FIRECRAWL_MAX_CREDITS_PER_DAY=200` |
| Scrape timeout | 45s (logged; distinct from internal 3-5s) |

## Topic registry seed

nad-metabolism, mitochondria, sleep-circadian, mthfr-methylation, body-composition, omega-3, vitamin-d, comt-stress, hydration-performance, igsr-release-watch  

Admin: `/admin/jeffery` Agents tab → Ingest topic registry (approve/reject proposed).

## Migrations

- `20260812040000_prompt_214b_firecrawl_ingestion.sql`

## Pipeline wiring

- Stage 1: `runHoundDogDailyIngest` (PubMed E-utilities + Firecrawl full-text + social search + IGSR Mondays)
- Stage 2: existing Marshall/Lex `contentGate` / `processHoundDogGateQueue`
- Stage 3: `runSherlockCuration` → `sherlock_curation_items` with route_tags for hannah/arnold/gordon
- Hannah compile cron runs ingest + curate + user compile

## Gordon boundary

Gordon meal scoring modules untouched. Sherlock items tagged `gordon` feed **evidence digests only** (`getGordonEvidenceDigest`).

## Security Advisor note

Confirm `FIRECRAWL_API_KEY` present only in Vercel/Supabase secrets; never in client bundles or logs.

## Gary rulings / ops

1. Apply migration on nnhkcufyqjojdbvdrpky.  
2. Set `FIRECRAWL_API_KEY` (and optional `NCBI_API_KEY`).  
3. Tune budgets via env.  
4. Approve proposed topics in Admin Command Center.  
