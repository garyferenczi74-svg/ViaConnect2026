# Prompt 214: Full agent roster audit

**Date:** 2026-08-12  
**Production project:** nnhkcufyqjojdbvdrpky  
**Commit series:** roster registration + lexicon + integrity tests  

## Method

Phases 1 to 3: code inventory (registry, vercel.json, pg_cron migrations, API surfaces, compliance rules). Live 7-day structured log pull was **not** available from this agent session (no DB service-role read of `agent_heartbeats` / `ultrathink_agent_events` with a valid token). Autonomy evidence below is **code + schedule definition** evidence; ops must attach last-7-day timestamps on next walk.

## Audit matrix

| Agent | Duties (baseline) | Triggers (code) | Owned tables (primary) | Last exec (7d logs) | Freshness | Resilience | Violations | Fixes this prompt |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Jeffery | Orchestrator, ACC, MAP | pg_cron `ultrathink_orchestrator_cron`; admin APIs | ultrathink_*, jeffery_*, panel tasks | **Unknown (no log pull)** | Orchestrator tick | withTimeout on many admin paths | **Critical:** `jeffery_master` edge not scheduled in migrations; panel name vs `jeffery_master` | Alias `jeffery_master` → panel `jeffery` |
| Michelangelo | TDD/OBRA | Dev/CLI pipeline only | panel seed only | N/A autonomous | N/A | N/A | **No production cron** (by design as code agent) | Catalogued as `dev` trigger; not fabricated autonomy |
| Gordon | Sole nutrition compute | Request meal APIs; pg_cron nutrition insights (unbranded) | nutrition_targets, meals, nutrition_insights* | Unknown | Meal log → score path | Gordon meal APIs mostly resilient | **Was missing from AgentId**; parallel nutrition math outside Gordon (see findings) | Registered in fleet + GordonPanel |
| Arnold | Body / FormaVision | pg_cron arnold_tick; Vercel goals; scan request | body_tracker_*, photo sessions | Unknown | Scan persist + tick | Good on body APIs | None critical | Description updated |
| Hannah | Assistant + accelerators | Vercel hannah-research 3h; BOS worker 5m | knowledge_atoms, agent_heartbeats, hannah_* | Heartbeat writer exists | Research + BOS | Fail-open research | Dual heartbeat systems | Description; Prompt 213 live |
| Sherlock | Research | pg_cron sherlock 6h; /api/sherlock/run | research_hub_*, sherlock_* | Unknown | 6h ingest | Edge | **Name mismatch** `sherlock_research_hub` | Alias map |
| Kelsey | Compliance review | Request gates only | regulatory_kelsey_reviews | Unknown | On publish/free-text | Fail-closed SNP/Arnold; Hannah ask fail-open | **Was missing from fleet** | Registered + KelseyPanel |
| Marshall | Lexicon + compliance + customs | Request / webhooks | compliance_*, marshall_*, customs | Unknown | On precheck | Strong rule engine | **10-27x** in AI provider; getDisplayName gaps | Lexicon fixes; role label clarified |
| LEX | Legal / litigation | Admin request | legal case tables | Unknown | On admin actions | Fail-open admin | No autonomous tick | No code change (request-time by design) |

## Findings ranked by severity

### Critical

1. **Fleet was 7 of 9** — gordon and kelsey absent from `AgentId` / Admin Command Center.  
2. **Jeffery master cron not proven** — migrations schedule `ultrathink-orchestrator`, not `jeffery-master`.  
3. **Gordon exclusivity partial** — P0 parallel paths: `src/lib/nutrition/analyzeMeal.ts`, `/api/ai/meal-analysis` recompute macros outside Gordon.  
4. **Silent panel drop** — events for `sherlock_research_hub` / `jeffery_master` never mapped to UI (fixed with aliases).

### High

5. Marketing publish is **Marshall-only**, not Kelsey Stage 2 (document or gate).  
6. Michelangelo has **no machine autonomy** (dev-only).  
7. Marshall lexicon AI provider taught **10-27x** with en-dash (fixed).  
8. Dual heartbeat tables (`agent_heartbeats` vs ultrathink registry) fragment ops evidence.

### Medium

9. Hardcoded agent Title Case names evade GETDISPLAYNAME rule (RegionDetailPanel, AvatarLauncher fixed).  
10. Em/en-dash ban only on rebuttal surface.  
11. Recipe rollup and client portion re-agg outside Gordon package.

## Fixes applied (file paths)

| Fix | Path |
| :---- | :---- |
| Nine-agent `AgentId` + aliases | `src/lib/agents/types.ts` |
| Registry gordon + kelsey | `src/lib/agents/registry.ts` |
| Event/heartbeat alias resolve | `src/lib/agents/activity-tracker.ts` |
| GordonPanel / KelseyPanel | `src/components/admin/jeffery/agents/panels/*` |
| Panel map | `src/components/admin/jeffery/agents/panels/index.ts` |
| Bioavailability 10x to 28x | `src/app/api/ai/[provider]/route.ts` |
| getDisplayName Arnold | `src/components/body-tracker/body-graphic/RegionDetailPanel.tsx` |
| getDisplayName Hannah | `src/components/hannah/avatar/AvatarLauncher.tsx` |
| Roster integrity tests | `src/lib/agents/__tests__/rosterIntegrity.test.ts` |
| Freshness contracts | `src/lib/agents/__tests__/freshnessSmoke.test.ts` |
| Registry test update | `src/lib/agents/__tests__/registry.test.ts` |

## Migrations added

None in this pass (no schema change required for registry; registry is static TS). Prompt 213 unique-index migration remains separate and still needs live apply if not yet run.

## Tests

- `rosterIntegrity.test.ts`  
- `freshnessSmoke.test.ts`  
- Updated `registry.test.ts`  
- Existing `getDisplayName.test.ts`, Prompt 213 accelerator tests remain

## Open questions for Gary

1. Should **Hounddog** be a tenth panel seat or remain Marshall bridge only?  
2. Should **Michelangelo** stay dev-only, or get a CI heartbeat writer from GitHub Actions?  
3. Should **marketing variant publish** require Kelsey Stage 2, or stay Marshall-only by design?  
4. Should **Gordon exclusivity** force deletion of `/api/ai/meal-analysis` and recipe-log re-score through Gordon in a dedicated prompt?  
5. Should we schedule **`jeffery-master`** explicitly, or formally rename panel to ultrathink-orchestrator ownership?  
6. Confirm **Marshall** owns lexicon (as this audit assumes) while **Kelsey** owns claims disease-gate (split is correct in code).

## 7-day execution log summary

| Agent | Evidence available this session |
| :---- | :---- |
| All nine | **Not pulled** — Supabase management token unauthorized; no production log dump. |
| Hannah research | Code path writes `agent_heartbeats` agent=`hannah` on every cron tick when CRON_SECRET set. |
| Others | Require ops query of `agent_heartbeats` and `ultrathink_agent_events` for last 7 days. |

Recommended ops SQL (service role):

```sql
SELECT agent, status, last_beat_at FROM agent_heartbeats ORDER BY last_beat_at DESC;
SELECT agent_name, max(created_at) AS last_event
FROM ultrathink_agent_events
WHERE created_at > now() - interval '7 days'
GROUP BY agent_name ORDER BY last_event DESC;
```
