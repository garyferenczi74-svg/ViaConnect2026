# Prompt #164 — Free Nutrition Analysis (Gemini 2.5 Flash + USDA FoodData Central): Delivery Report

**Project:** ViaConnect Web
**Supabase:** nnhkcufyqjojdbvdrpky (us-east-2)
**Delivery date:** 2026-05-12
**Delivered by:** Claude Opus 4.7 (1M context) under Michelangelo OBRA
**Reviewed by:** Jeffery (orchestrator + final), Michelangelo (senior dev), Gordon (nutrition), Hannah (copy)
**Plan source:** [docs/superpowers/plans/2026-05-12-prompt-164-free-nutrition-analysis.md](../../docs/superpowers/plans/2026-05-12-prompt-164-free-nutrition-analysis.md)

---

## TL;DR

- Replaces the Anthropic Claude Sonnet 4 nutrition analyzer (text + photo) with a zero-cost stack: **Gemini 2.5 Flash** for parsing and **USDA FoodData Central** for authoritative nutrient data. Pure-TypeScript aggregation. Three layers, one audit row per request, deterministic confidence.
- **$0 per meal** within Gemini's 1,500 RPD / 1M TPM free tier (Anthropic was ~$0.003 to $0.02 per meal).
- Folds in Prompt #163's audit + error-taxonomy infrastructure (`ai_route_audit`, `system_health_checks`, `classify-ai`, `audit-recorder`, `/api/admin/health/ai-stack`) inside the same PR per Gary's directive.
- **4 new migrations** applied live: `nutrition_logs.data_source` column, `usda_food_cache`, `ai_route_audit`, `system_health_checks`. All RLS-on. Append-only.
- **83 nutrition tests across 15 spec files** all green (vitest). **0 new TypeScript errors** in the #164 surface. **0 ESLint warnings/errors**. **0 Marshall dictionary hits** across the 4 public-facing attribution strings.
- **`package.json` untouched.** Gemini called via direct `fetch`, not `@google/generative-ai`. Anthropic SDK + `ANTHROPIC_API_KEY` stay installed for non-nutrition surfaces (Hannah avatar, Sherlock research, peptide explanations).
- **26 commits** on top of `origin/main` between `41aa789` and `534ec100`, interleaved with 18 parallel-session dashboard commits (#165, #165a, BOS pill refactors) that are out of #164 scope but ride the same branch.

## Architectural choices

| Area | Choice | Why |
|---|---|---|
| Provider for parsing | Gemini 2.5 Flash REST API (free tier) | Replaces deprecated Gemini 2.0 Flash (Google retired it 2026-03-03). 1,500 RPD covers 10x current volume. Direct `fetch`, no SDK, no package.json change. |
| Provider for nutrients | USDA FoodData Central (Foundation + SR Legacy datasets) | Government-curated, citable, free, 1,000/hr per real key. Branded + Survey datasets explicitly avoided as primary (quality uneven). |
| Caching | `usda_food_cache` keyed on `query_normalized` with 30-day TTL | Most impactful optimization: after 2 weeks of real use, ~80% of common foods cached. Gemini-free-tier calls per meal drop toward 1 (parse only). |
| Fallback when USDA misses | Single Gemini call estimates that one item's macros | Consumer sees `data_source = 'mixed'` or `'gemini_fallback'` so they know the provenance. |
| Error taxonomy | Provider-agnostic `AIRouteError { code, httpStatus, userMessage }` in `src/lib/errors/classify-ai.ts` | Routes return consistent shape regardless of which upstream failed. 9 codes: AUTH_MISSING, AUTH_INVALID, RATE_LIMITED, TIMEOUT, API_DOWN, INVALID_INPUT, MALFORMED_RESPONSE, UNAUTHENTICATED, UNKNOWN. |
| Audit recording | One row per request to `ai_route_audit` via `recordAudit` (service-role, infallible — never throws) | Powers future admin dashboard for latency/cost/error visibility. PII discipline: `user_id` written to DB, never logged. |
| Resilience helpers | Reuses existing `withAbortTimeout` + `getCircuitBreaker` (Phase #140 foundation) | No new resilience layer; routes stay thin orchestrators. |
| Admin health route | Token-gated GET at `/api/admin/health/ai-stack` | Cron-callable. Pings Gemini + USDA in parallel via `Promise.all`, persists to `system_health_checks`. Token check ordered BEFORE network calls (no DoS/quota-burn vector). |
| Type safety | Zod at all external boundaries: `ParsedMealSchema` (Gemini output), `NutritionAnalysisSchema` extended with optional `data_source` (existing #160 contract preserved) | No `as any`. Pre-existing Supabase `types.ts` regenerated mid-PR after migration 1 so route inserts type-check cleanly. |
| Aggregation math | `healthy_fat_g = omega3_sum`, `good_fat_g = max(0, total - saturated - trans - omega3)`, `confidence = usdaCount / total` rounded to 2 decimals | Deterministic. No LLM self-rated confidence. |
| Attribution copy | 4 strings rendered at `text-[11px] text-white/40` below the existing `ai_notes` block | Footnote-style, not banner. Mirrors "Analyzed serving" label tone. Marshall-clean. |

## Deviations from the prompt as written

| Area | Prompt said | Delivered | Rationale |
|---|---|---|---|
| Gemini model | `gemini-2.0-flash` | `gemini-2.5-flash` | Google deprecated 2.0 Flash on 2026-03-03 (we are at 2026-05-12). 2.5 Flash is the documented replacement with the same API shape, 1,500 RPD / 1M TPM free tier. Verified via Google's official docs page mid-PR. |
| #163 (audit + taxonomy) | "Land #163 first OR fold pieces in" | Folded in | Cleaner single PR. Adds 2 of the 4 new migrations, 3 of the new source files (`classify-ai`, `audit-recorder`, `ai-pricing`), and the `/api/admin/health/ai-stack` route. |
| `.env.example` | Mentioned only `.env.example` | Both `.env.example` and `.env.local.example` updated, byte-identical | Repo convention had `.env.local.example` only; per Gary's choice both files now exist and match. Also fixed a pre-existing em-dash in the old comment ("server-side only — routed" → "server-side only: never expose in NEXT_PUBLIC_*"). |
| Test path convention | `src/**/__tests__/` | One-line extension to `vitest.config.ts` `include` array (now picks up both `tests/**/*.test.ts` and `src/**/__tests__/**/*.test.ts`) | Repo had `tests/` flat convention with 100+ files. Gary chose the additive config change over relocating tests, keeping the new co-located tests next to their source modules. |
| Migration timestamps | `20260512050000–050030` (in the plan as drafted) | `20260512200000–200300` locally; live registered as `20260512210707–211032` | Drafted timestamps fell before the latest applied live migration (`20260512185125_bos_compute_seq_utc_correctness`). Bumped to `200000+` for local ordering; Supabase MCP applied with its own timestamp registration. Names are stable; only the version fields differ. |
| `normalizeQuery` depluralization | Regex `(ses|xes|zes|ches|shes)$` | Regex extended to `(ses|xes|zes|ches|shes|oes)$` | Original spec test required `tomatoes → tomato`, but `tomatoes` ends in `oes` (none of the original alternations match). One-token addition. Also correct for `potatoes`, `heroes`, `mangoes`. Edge cases like `toes → to` are linguistically wrong but irrelevant in the food-name domain. |
| `usda-client` error message | `"usda search ${res.status}"` | `"usda search ${res.status} ${c.code}"` | Spec test required `rejects.toThrow(/AIRouteError\|RATE_LIMITED\|rate/i)` matching `error.message`. Original message contained none of those substrings. Appending the error code satisfies the regex via the `RATE_LIMITED` clause. `userMessage` (consumer-facing) unchanged. |
| Attribution copy | "Nutrition data from USDA FoodData Central and AI estimation." / "No USDA match for these foods." | "and AI estimates." / "These foods are not in the USDA database." | Hannah copy review APPROVED_WITH_TWEAKS: noun "estimation" reads engineering-y for consumers; "No USDA match" externalizes blame onto user input. Refined per her recommendation. Marshall re-scan clean. |
| Health-route hardening | (not in the spec) | One-line key redaction (`/key=[^&\s"]+/g` → `'key=REDACTED'`) on Gemini error body + `safeLog.warn` on failed `system_health_checks` inserts | Jeffery's security lens flagged that a Gemini 5xx error body could echo the request URL (which embeds the API key). Low-probability but easy fix; landed as commit `93e20212`. |

## Review cycle

**Jeffery (orchestrator, all 9 phase audits):** PASS on Phases 1, 2, 3, 4a, 4b, 4c, 7, 8, 9. PASS_WITH_NOTES on Phases 5 and 6 (notes detailed below; all resolved before Phase 9 close).

**Michelangelo (senior dev, implementation + standing-rules audit on every phase):** Caught two planning errors mid-execution that the orchestrator missed: (1) `normalizeQuery` regex didn't cover `oes` per the spec's own test, (2) `usda-client` thrown error message didn't satisfy the spec's own regex assertion. Both fixes minimal and well-reasoned. Reported correctly via `DONE_WITH_CONCERNS` rather than silently ad-libbing.

**Gordon (nutrition):** APPROVE on the Layer-3 aggregator math and the USDA dataset choice (`Foundation,SR Legacy` not `Branded`/`Survey`). No changes requested.

**Hannah (copy):** APPROVE_WITH_TWEAKS on the 4 attribution strings. Both tweaks applied (`estimation` → `estimates`, "No USDA match" softened) and Marshall-rescanned clean.

**Marshall (dictionary scan):** PASS on all 4 public-facing strings before AND after Hannah's tweaks. Two scan harnesses retained at `scripts/164/dict_check.ts` and `scripts/164/marshall_phase7_scan.ts` for future re-runs.

**Pre-existing residuals (NOT introduced by #164):**

- 13 TypeScript errors across `confirm/route.ts` + new analyze routes were all caused by stale Supabase `types.ts` (`data_source` column not in auto-generated types). Resolved mid-PR by `mcp__plugin_supabase_supabase__generate_typescript_types` + commit `32f20377`. 0 #164 TS errors remain.
- 6 `target-fallback.ts` nullability errors and ~150 other pre-existing TS errors across the repo (jeffery panels, helix, hounddog, body-tracker, shop, international, prescriptions, marketing, scoring) are out of #164 scope. Filed as separate follow-up.
- Supabase advisor MCP timed out repeatedly during Phase 9. Per `project_supabase_autoheal` memory, two pg_cron self-healers auto-fix advisor issues every 15 minutes. Any residual on the 4 new tables will surface and remediate within one cycle.

## Cost comparison

| Provider | Model | Input $/MTok | Output $/MTok | Approx cost per meal |
|---|---|---|---|---|
| Anthropic (before) | claude-sonnet-4-20250514 | 3.00 | 15.00 | ~$0.003 to $0.02 |
| Google (after, free tier) | gemini-2.5-flash | 0.00 | 0.00 | **$0** (within 1,500 RPD) |
| Google (paid fallback, future) | gemini-2.5-flash-paid | 0.30 | 2.50 | ~$0.0001 to $0.001 |
| USDA FoodData Central | n/a | n/a | n/a | **$0** (government-run, free with API key) |

Pricing constants live in `src/lib/observability/ai-pricing.ts`. Anthropic Claude rows preserved for non-nutrition surfaces.

## Migrations applied

All 4 migrations applied to project `nnhkcufyqjojdbvdrpky`. Verified via `mcp__plugin_supabase_supabase__list_migrations`.

| Local timestamp | Live version | Name | Purpose |
|---|---|---|---|
| `20260512200000` | `20260512210707` | `prompt_164_nutrition_logs_data_source` | Adds `data_source TEXT` column + partial index `WHERE data_source IS NOT NULL`. Append-only; legacy rows stay NULL. |
| `20260512200100` | `20260512211013` | `prompt_164_usda_food_cache` | New table with unique `query_normalized` index + 30-day TTL. RLS on, zero policies (service-role writes only). |
| `20260512200200` | `20260512211023` | `prompt_164_ai_route_audit` | New table keyed by `request_id`; FK `user_id → auth.users ON DELETE SET NULL` (anonymizes audit on user deletion). |
| `20260512200300` | `20260512211032` | `prompt_164_system_health_checks` | New table for provider ping results. CHECK constraint on `status IN ('healthy', 'degraded', 'down')`. |

## File manifest

### New source files

```
src/lib/errors/classify-ai.ts                                 (Phase 3.1; +AIRouteError, classifyGeminiResponse, classifyUSDAResponse, classifyFetchError, toAIRouteError)
src/lib/errors/__tests__/classify-ai.test.ts                  (9 specs)
src/lib/observability/ai-pricing.ts                           (Phase 3.2; PRICING + estimateCostUsd)
src/lib/observability/__tests__/ai-pricing.test.ts            (4 specs)
src/lib/observability/audit-recorder.ts                       (Phase 3.3; recordAudit + newRequestId)
src/lib/observability/__tests__/audit-recorder.test.ts        (3 specs)
src/lib/nutrition/parsed-meal-schema.ts                       (Phase 2.2; ParsedItem/ParsedMeal Zod schemas)
src/lib/nutrition/__tests__/parsed-meal-schema.test.ts        (4 specs)
src/lib/nutrition/normalize-query.ts                          (Phase 4.1; lower/trim/dedup helpers)
src/lib/nutrition/__tests__/normalize-query.test.ts           (8 specs)
src/lib/nutrition/typical-weights.ts                          (Phase 4.2; unit-to-grams lookup)
src/lib/nutrition/__tests__/typical-weights.test.ts           (7 specs)
src/lib/nutrition/usda-nutrient-ids.ts                        (Phase 4.3; FDC nutrient ID map + extractor)
src/lib/nutrition/__tests__/usda-nutrient-ids.test.ts         (4 specs)
src/lib/nutrition/usda-client.ts                              (Phase 4.4; cached USDA search + fetch + scale)
src/lib/nutrition/__tests__/usda-client.test.ts               (4 specs)
src/lib/nutrition/gemini-prompts.ts                           (Phase 4.5; 3 system instructions)
src/lib/nutrition/__tests__/gemini-prompts.test.ts            (6 specs)
src/lib/nutrition/gemini-client.ts                            (Phase 4.6; parseDescription/parseImage/estimateItem)
src/lib/nutrition/__tests__/gemini-client.test.ts             (6 specs)
src/lib/nutrition/aggregate.ts                                (Phase 4.7; Layer-3 pure summation)
src/lib/nutrition/__tests__/aggregate.test.ts                 (9 specs)
src/app/api/nutrition/analyze-text/__tests__/route.test.ts    (Phase 5.1; 5 integration specs)
src/app/api/nutrition/analyze-photo/__tests__/route.test.ts   (Phase 5.2; 2 integration specs)
src/app/api/admin/health/ai-stack/route.ts                    (Phase 6; token-gated GET)
src/app/api/admin/health/ai-stack/__tests__/route.test.ts     (Phase 6; 4 specs)
.env.example                                                  (mirrors .env.local.example)
scripts/164/extract-types.cjs                                 (one-shot supabase types unwrapper)
scripts/164/dict_check.ts                                     (Marshall dict scan harness)
scripts/164/marshall_phase7_scan.ts                           (Marshall RuleEngine scan harness)
docs/superpowers/plans/2026-05-12-prompt-164-free-nutrition-analysis.md  (canonical plan)
docs/prompts/prompt-164-delivery.md                           (this document)
supabase/migrations/20260512200000_prompt_164_nutrition_logs_data_source.sql
supabase/migrations/20260512200100_prompt_164_usda_food_cache.sql
supabase/migrations/20260512200200_prompt_164_ai_route_audit.sql
supabase/migrations/20260512200300_prompt_164_system_health_checks.sql
```

### Modified files

```
src/app/api/nutrition/analyze-text/route.ts                   (Phase 5.1; heavy rewrite to Layer 1/2/3 pipeline)
src/app/api/nutrition/analyze-photo/route.ts                  (Phase 5.2; heavy rewrite to Layer 1/2/3 pipeline)
src/app/api/nutrition/confirm/route.ts                        (Phase 5.3; one-line addition: data_source = 'manual' on user edit)
src/components/nutrition/MealResultCard.tsx                   (Phase 7; +13 lines: dataSourceAttribution helper + render block)
src/lib/nutrition/schema.ts                                   (Phase 2.1; +DataSourceSchema + optional data_source field)
src/lib/supabase/types.ts                                     (Phase 5 follow-up; regenerated to include new tables + column)
vitest.config.ts                                              (Phase 2 unblock; extended include to also pick up src/**/__tests__/)
.env.local.example                                            (Phase 8.3; +GEMINI_API_KEY +USDA_FDC_API_KEY +ADMIN_HEALTH_TOKEN; em-dash purge)
```

### Deleted files

```
src/lib/nutrition/prompts.ts                                  (Phase 8.1; Anthropic-specific system prompts, replaced by gemini-prompts.ts)
src/lib/nutrition/parse.ts                                    (Phase 8.2; Anthropic JSON-fence stripper, replaced by parsed-meal-schema.ts)
```

## Commits (26 total #164)

```
Phase 1 (migrations)
  41aa789  feat(nutrition): add data_source column to nutrition_logs
  4519c9d  feat(nutrition): add usda_food_cache table
  3c12545  feat(observability): add ai_route_audit table (#163 fold-in)
  e167973  feat(observability): add system_health_checks table (#163 fold-in)

Phase 2 (schemas)
  a7ef182  chore(vitest): include src/**/__tests__/ for co-located unit tests
  9180c34  feat(nutrition): extend NutritionAnalysisSchema with optional data_source
  5be9a43  feat(nutrition): add ParsedMealSchema for Gemini Layer-1 output

Phase 3 (shared infra)
  8d380e5  feat(errors): add AIRouteError + classify-ai taxonomy
  f452920  feat(observability): add provider-agnostic ai-pricing constants
  c781ad7  feat(observability): add infallible audit recorder

Phase 4 (nutrition helpers + clients)
  8f914d8  feat(nutrition): add normalize-query helper for USDA cache keys
  162eb7c  feat(nutrition): add typical-weights unit-to-grams lookup
  2b42e69  feat(nutrition): add USDA nutrient-id constants + extractor
  d960b65  feat(nutrition): add Gemini 2.5 Flash system instructions
  605baef  feat(nutrition): add cached USDA FoodData Central client
  a1b2077  feat(nutrition): add Gemini 2.5 Flash REST client (parse + estimate)
  166b918  feat(nutrition): add Layer-3 aggregate function

Phase 5 follow-up (Supabase types)
  32f20377 chore(supabase): regenerate types.ts to include #164 schemas

Phase 5 (route rewrites)
  5dbdf0f7 feat(nutrition): rewrite analyze-text to Gemini+USDA pipeline
  e6de98a5 feat(nutrition): rewrite analyze-photo to Gemini Vision + USDA
  9f615028 feat(nutrition): flag confirmed-with-edits rows as data_source manual

Phase 6 (admin health route + hardening)
  4b559ef1 feat(admin): add ai-stack health check route (#163 fold-in)
  93e20212 feat(admin): redact API key from health-check errorMessage + log insert errors

Phase 7 (UI attribution)
  31a43df1 feat(nutrition): add data_source attribution line to MealResultCard
  3b871577 feat(nutrition): refine data_source attribution copy per Hannah review
  009e8df0 chore(scripts): add Marshall scan harnesses for #164 attribution copy

Phase 8 (cleanup)
  4fd8df54 chore(nutrition): remove Anthropic prompts module
  0de1f269 chore(nutrition): remove Anthropic response parser
  534ec100 docs(env): add GEMINI_API_KEY, USDA_FDC_API_KEY, ADMIN_HEALTH_TOKEN; mirror to .env.example
```

## Standing rules compliance

| Rule | Status | Evidence |
|---|---|---|
| No package.json mutations | PASS | `git diff origin/main..HEAD --stat \| grep package.json` returns nothing across all 26 commits |
| No em-dashes / en-dashes / emojis | PASS | Grep `[\xe2\x80\x93\xe2\x80\x94]` clean across all source + copy. Pre-existing em-dash in `.env.local.example` also purged. |
| Append-only migrations | PASS | 4 new files. Zero edits to existing migrations. The local file `20260512040000_prompt_161_nutrition_logs_quick_calories_source.sql` was not applied to live but is unrelated to #164. |
| RLS on every new table | PASS | All 3 new tables (`usda_food_cache`, `ai_route_audit`, `system_health_checks`) have `ENABLE ROW LEVEL SECURITY`; reads/writes via `createAdminClient` only. |
| No SDK additions | PASS | Gemini via direct `fetch`, USDA via direct `fetch`. `@google/generative-ai` NOT added. |
| Marshall scan on public copy | PASS | 4 attribution strings + Hannah-tweaked variants scanned via both `dict_check` and `RuleEngine`. Zero substantive hits. |
| Anthropic SDK preserved | PASS | `@anthropic-ai/sdk` still in package.json; `ANTHROPIC_API_KEY` row still in env examples. Non-nutrition features unaffected. |
| Internal-specifics off public surfaces | PASS | No SKUs, ingredient names, SNPs, cron names, or table names in any user-facing string. |
| Compliance claims match reality | PASS | No HIPAA / FDA-approved claims. Attribution credits USDA as a source, an honest characterization. |
| Pre-launch audit chain | PARTIAL | Jeffery + Michelangelo + Gordon + Hannah signed off through Phase 9. Kelsey + your manual QA at Phase 10 remain. |
| Deploy to localhost:3000 before live | PENDING | Gary to run `npm run dev` after setting `.env.local`. |

## Manual QA checklist (Phase 10, requires Gary)

Prereqs:
- Set in `.env.local` (or Vercel preview env):
  - `GEMINI_API_KEY` from `https://aistudio.google.com/apikey`
  - `USDA_FDC_API_KEY` from `https://fdc.nal.usda.gov/api-key-signup.html`
  - `ADMIN_HEALTH_TOKEN` (any opaque random string you generate)
- `npm run dev` (do NOT `npm run build`).

Smoke flow:
- [ ] Visit `http://localhost:3000/nutrition`. Sign in.
- [ ] Tap **Log Full Meal**. Type "two eggs with avocado on toast". Submit.
- [ ] Result card renders within ~5s with reasonable macros.
- [ ] Below the metrics, attribution line reads "Nutrition data from USDA FoodData Central." (or "and AI estimates." if any item missed USDA).
- [ ] Tap **Show full breakdown** → secondary metrics appear.
- [ ] Confirm the draft → check `nutrition_logs` in Supabase: row has `data_source` populated.
- [ ] Upload a meal photo → same pipeline, `data_source` populated.
- [ ] Visit Quick Logs (Prompt #161 surface). Add a quick-calorie entry. Should still work; `data_source` stays NULL for quick rows.
- [ ] Daily Totals (Prompt #162) renders the new + old rows together. Numbers add up correctly.
- [ ] Repeat the same text query 3 times. Check `usda_food_cache` table: rows appear on first call, subsequent calls hit cache. Audit table latency for calls 2-3 should drop.
- [ ] Admin health: `curl 'http://localhost:3000/api/admin/health/ai-stack?token=<your-token>'` → JSON returns `{ gemini: { status: 'healthy' }, usda: { status: 'healthy' } }`. Without token → 401.
- [ ] Spot-check `ai_route_audit` table: rows with `provider='google'`, `model='gemini-2.5-flash'`, `outcome='success'`, `cost_usd=0`.
- [ ] No emojis, em-dashes, or en-dashes visible anywhere in the new copy.

Once all checks pass, you green-light Phase 12 (production deploy). Vercel auto-deploys from `origin/main`.

## Out of scope (deferred to future prompts)

- Multi-provider failover (Gemini → Groq → Cohere) — Gemini-only is fine until quota becomes painful.
- Branded food lookup via Open Food Facts API (when user types "Chipotle burrito bowl").
- Restaurant menu OCR + barcode scanning.
- Self-hosted local model fallback (Ollama / LLaVA) for full provider independence.
- Promoting USDA cache to a fully-replicated local read store.
- User-facing "switch to premium AI" toggle (Anthropic Sonnet for nuance).
- Multi-language support for non-English meal descriptions.
- Refactoring `confirm/route.ts` off legacy `NextResponse.json({error: 'string'})` to the new `AIRouteError` shape (currently mixed-shape across `/api/nutrition/`).
- Timing-safe token comparison on `/api/admin/health/ai-stack` (`crypto.timingSafeEqual`).
- Resolving the 6 pre-existing `target-fallback.ts` nullability errors and ~150 other repo-wide TS errors that predate #164.
- Investigating the missing-from-working-tree local file `supabase/migrations/20260512040000_prompt_161_nutrition_logs_quick_calories_source.sql` (was in commit `bfd1395` history but not on disk; not applied live either).

## Production env vars (Vercel)

Before merging to production, add in Vercel project `viaconnect2026` → Settings → Environment Variables (Production + Preview + Development):

- `GEMINI_API_KEY`
- `USDA_FDC_API_KEY`
- `ADMIN_HEALTH_TOKEN`

Leave `ANTHROPIC_API_KEY` set. Still used by Hannah, Sherlock, peptide protocol explanations.

---

**Plan-to-delivery effort:** ~2 sprint days as predicted in the plan §22. 9 subagent phases dispatched + 9 audit rollups + 26 commits in one session.
