# Prompt 214a: Roster restructure and synchronism

**Date:** 2026-08-12  
**Commit target:** main  

## Eleven-agent registry

1. Jeffery (Main Manager)  
2. Hannah (AI Wellness Assistant)  
3. Gordon (My Nutrition Agent)  
4. Arnold (My Biology Agent)  
5. Michelangelo (Senior Developer)  
6. Hound Dog (Web Ingest)  
7. Sherlock (Social Media Analytics)  
8. Marshall (Compliance Officer)  
9. Lex (Appellate Litigator; absorbs former Kelsey legal duties)  
10. Security Advisor  
11. Performance Advisor  

Kelsey: retired live seat. Alias `kelsey` → `lex` in `resolveAgentId`. Historical logs remain interpretable via getDisplayName(`kelsey`) = "Kelsey".

## Kelsey duty reassignment (summary)

See `src/lib/agents/kelseyReassignment.ts` for full map.

| Owner | Duties |
| :---- | :---- |
| Marshall | Stage 1 detector, content gates, Hound Dog staging gate, Hannah ask content check |
| Lex | Stage 2 LLM review, regulatory_kelsey_reviews writes, SNP publish, labs decipher, legal escalation |

HTTP path `/api/compliance/kelsey/review` and table `regulatory_kelsey_reviews` retained for compatibility (Gary may rename later).

## Daily chain (Stages 1 to 7)

Cron: `15 6 * * *` → `/api/cron/synchronism-daily`  
Log table: `pipeline_runs` (migration `20260812020000_prompt_214a_pipeline_runs.sql`)  
Code: `src/lib/agents/synchronism/chain.ts`  
ACC UI: `PipelineChainView` on Agents tab  

## Security Advisor baseline (first run catalog)

| ID | Tier | Title |
| :---- | :---- | :---- |
| sec-function-search-path | auto | Set search_path on SECURITY DEFINER functions |
| sec-rls-audit-batch | report | Confirm RLS on all public tables |
| sec-auth-exposure | report | Review auth flow / permissive policies |

Auto-fix migrations for mechanical items are deferred until live advisor API credentials are available; report tier never auto-applies (tests lock this).

## Performance Advisor findings catalog

| ID | Tier | Title |
| :---- | :---- | :---- |
| perf-fk-index-scan | auto | Unindexed FK candidate batch |
| perf-slow-query-rewrite | report | Slow query needs app rewrite |

## Ambiguous for Gary

1. Rename `/api/compliance/kelsey/review` and table `regulatory_kelsey_reviews`?  
2. Marketing publish: Marshall-only vs add Lex Stage 2?  
3. Live Supabase advisor API token for auto-fix migrations?  
4. Hound Dog display orthography locked as "Hound Dog" (two words).  

## Screenshots

Auth-gated ACC; desktop and mobile use the same `PipelineChainView` grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`). Capture after first cron fire or manual GET with CRON_SECRET.
