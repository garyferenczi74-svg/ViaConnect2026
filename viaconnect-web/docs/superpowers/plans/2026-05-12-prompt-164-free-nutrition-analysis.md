# Prompt #164: Free Nutrition Analysis (Gemini 2.5 Flash + USDA FoodData Central) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Orchestrator: Jeffery.** Each phase below is dispatched to the named subagent. Two-stage review (Michelangelo audit + Jeffery sign-off) between phases.

**Goal:** Replace the Anthropic dependency in the consumer-portal nutrition analyzer with a zero-cost stack (Gemini 2.5 Flash for parsing, USDA FoodData Central for nutrient lookups, pure TypeScript for aggregation), while folding in the audit + error-taxonomy + health-check infrastructure that Prompt #163 was going to provide.

**Architecture:** Three layers per request. Layer 1: Gemini 2.5 Flash parses a meal description or photo into structured `{ name, quantity, unit }` items. Layer 2: USDA FoodData Central is searched + fetched per item, with a `usda_food_cache` table cutting subsequent calls to ~zero. Layer 3: pure TypeScript sums macros and computes derived fields (`good_fat_g`, `healthy_fat_g`, `confidence`, `data_source`). When USDA has no match, a single Gemini-estimation call replaces that one item and the response is flagged `data_source = 'mixed'` or `'gemini_fallback'`. Same Layer 1/2/3 pipeline serves text and photo; photo only differs in how Layer 1 is invoked.

**Tech Stack:**
- Next.js 14 App Router (`src/app/api/nutrition/...`)
- Gemini 2.5 Flash REST API (free tier, **no SDK** — direct `fetch`; preserves Gary's package.json lock)
- USDA FoodData Central API v1 (`https://api.nal.usda.gov/fdc/v1`)
- Supabase Postgres (migrations append-only) + `nutrition_logs`, new `usda_food_cache`, new `ai_route_audit`, new `system_health_checks`
- Zod validation, Vitest unit/integration, Playwright E2E
- Existing helpers: `withAbortTimeout`, `getCircuitBreaker`, `safeLog`, `createClient`/`createAdminClient`

**Standing rules enforced:**
- No package.json mutations. Gemini via `fetch`, not `@google/generative-ai`.
- No `npm run build` locally (Gary's poisons-`.next` rule). Use `npx tsc --noEmit` for type check.
- No em-dashes, no en-dashes, no emojis in any source or copy.
- Anthropic SDK + `ANTHROPIC_API_KEY` stay installed/set — still used by Hannah, Sherlock, etc.
- Marshall dictionary scan on the new attribution copy before merge.
- Deploy to `localhost:3000` for Gary's manual QA BEFORE any live push.
- Audit chain: Jeffery → Michelangelo + Gordon + Hannah (+ Kelsey for attribution copy) before launch.

**Cost note for PR description:**
- Old: Anthropic Sonnet 4 (`claude-sonnet-4-20250514`) at ~$3/MTok in, ~$15/MTok out → ~$0.003–$0.02 per meal.
- New: Gemini 2.5 Flash free tier (1,500 RPD / 1M TPM) for parse + USDA (free, government) for nutrient data → **$0 per meal** within quota.

---

## File Structure

### NEW migrations (append-only, four files)
| Path | Purpose |
|---|---|
| `supabase/migrations/20260512200000_prompt_164_nutrition_logs_data_source.sql` | Adds `data_source TEXT` column to `nutrition_logs`. No backfill. |
| `supabase/migrations/20260512200100_prompt_164_usda_food_cache.sql` | New `usda_food_cache` table with normalized-query unique index, 30-day TTL. RLS on, service-role only. |
| `supabase/migrations/20260512200200_prompt_164_ai_route_audit.sql` | New `ai_route_audit` table (#163 fold-in). Per-request audit row keyed by `request_id`. |
| `supabase/migrations/20260512200300_prompt_164_system_health_checks.sql` | New `system_health_checks` table (#163 fold-in). Recent ping results per `check_name`. |

**Live-vs-local drift note (2026-05-12 discovery):** Live latest migration is `20260512185125_bos_compute_seq_utc_correctness`. Local file `20260512040000_prompt_161_nutrition_logs_quick_calories_source.sql` exists but has NOT been applied to live (per `mcp__plugin_supabase_supabase__list_migrations`). The four new #164 migrations use timestamps AFTER the live latest. The pre-existing #161 file is left untouched per Gary's append-only + protected-migrations rule.

### NEW source files
| Path | Purpose |
|---|---|
| `src/lib/errors/classify-ai.ts` | Provider-agnostic AI error taxonomy: `AUTH_MISSING`, `AUTH_INVALID`, `RATE_LIMITED`, `TIMEOUT`, `API_DOWN`, `INVALID_INPUT`, `MALFORMED_RESPONSE`, `UNKNOWN`. Maps Gemini, USDA, and (future) other-provider responses to codes. Exports `AIRouteError` class with `httpStatus` + `userMessage`. |
| `src/lib/observability/ai-pricing.ts` | Per-model price-per-MTok lookup. Gemini 2.5 Flash entries = $0 (free tier). Anthropic Sonnet 4 entries preserved for non-nutrition surfaces. |
| `src/lib/observability/audit-recorder.ts` | `recordAudit(...)` writes one row to `ai_route_audit`. Infallible: never throws, never blocks the route. |
| `src/lib/nutrition/gemini-prompts.ts` | Text + photo + fallback-estimation system instructions. Snapshot-tested. |
| `src/lib/nutrition/gemini-client.ts` | Three exports: `parseDescriptionWithGemini(text)`, `parseImageWithGemini(buffer, mime, note)`, `estimateItemWithGemini(name, quantity, unit)`. All `fetch` to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`. Wrapped in `withAbortTimeout` + `getCircuitBreaker('gemini-api')`. |
| `src/lib/nutrition/parsed-meal-schema.ts` | Zod for Gemini's parse output: `{ items: [{ name, quantity, unit, preparation? }], confidence, notes }`. |
| `src/lib/nutrition/normalize-query.ts` | `normalizeQuery(s)`: lower, trim, collapse whitespace, strip trailing 's'/'es' for naive depluralization, strip punctuation. Pure. |
| `src/lib/nutrition/typical-weights.ts` | Lookup table mapping `(unit, foodHint)` → grams for common units. Source-cited in comments. |
| `src/lib/nutrition/usda-nutrient-ids.ts` | Constants for USDA `nutrient.id`s (energy 1008, protein 1003, carbs 1005, total fat 1004, saturated 1258, trans 1257, sugar 2000, fiber 1079, omega-3 ALA 1404 / EPA 1278 / DHA 1272 / DPA 1280). |
| `src/lib/nutrition/usda-client.ts` | `lookupFood(name, quantity, unit)` → cached `searchAndFetchUSDA` → returns nutrients per serving, or `null` if no USDA match. Wraps `withAbortTimeout` + `getCircuitBreaker('usda-api')`. Cache reads/writes go through `createAdminClient` since `usda_food_cache` is service-role only. |
| `src/lib/nutrition/aggregate.ts` | `aggregate(items)` → final `NutritionAnalysisV2` (extends existing schema with `data_source`). Pure. |
| `src/app/api/admin/health/ai-stack/route.ts` | `GET`/`POST` admin route: pings Gemini + USDA, writes both results to `system_health_checks`, returns JSON summary. |
| `.env.example` | Mirror of `.env.local.example` (both updated per Gary's choice). |

### MODIFIED files
| Path | Change |
|---|---|
| `src/app/api/nutrition/analyze-text/route.ts` | Heavy rewrite per §9.1 of #164. Calls Layer 1 → Layer 2 → Layer 3 → insert with `data_source`. Audit row written on every outcome. |
| `src/app/api/nutrition/analyze-photo/route.ts` | Heavy rewrite per §9.2. Layer 1 via `parseImageWithGemini`. |
| `src/app/api/nutrition/confirm/route.ts` | Tiny edit: when user edits, set `data_source = 'manual'`. |
| `src/components/nutrition/MealResultCard.tsx` | Adds attribution line below the metric grid (per §13). |
| `src/lib/nutrition/schema.ts` | Extend `NutritionAnalysisSchema` with optional `data_source: z.enum(['usda','gemini_fallback','mixed','manual']).optional()`. Add `DataSourceSchema` export. |
| `.env.local.example` | Add `GEMINI_API_KEY=` and `USDA_FDC_API_KEY=` rows below the existing AI Providers block. |

### DELETED files (justified by §16 file manifest)
| Path | Reason |
|---|---|
| `src/lib/nutrition/prompts.ts` | Anthropic-specific prompts; replaced by `gemini-prompts.ts`. |
| `src/lib/nutrition/parse.ts` | Anthropic-response JSON unfencing; new `parsed-meal-schema.ts` handles Gemini output via Zod. |

---

## Phase 1: Database Foundation (4 migrations)

**Owner:** Michelangelo  
**Coordination:** Gordon reviews data-shape; performance-advisor reviews indexes.

### Task 1.1: Migration — `nutrition_logs.data_source` column

**Files:**
- Create: `supabase/migrations/20260512200000_prompt_164_nutrition_logs_data_source.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Prompt #164: append `data_source` to nutrition_logs so the consumer can see
-- whether macros came from USDA (high confidence, citable), Gemini estimation
-- (fallback when USDA had no match), or were edited manually.
--
-- Append-only. No backfill: legacy rows from #160/#161 stay NULL and continue
-- rendering with the existing UI (no attribution line shown).
--
-- Allowed values (documented, not check-constrained to keep future-providers cheap):
--   'usda'             = all items matched against USDA FoodData Central
--   'gemini_fallback'  = AI estimated macros (USDA had no match)
--   'mixed'            = some items USDA, some AI fallback
--   'manual'           = user-edited values via /api/nutrition/confirm
--   NULL               = legacy row from before Prompt #164

ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS data_source TEXT;

CREATE INDEX IF NOT EXISTS nutrition_logs_user_data_source_idx
  ON public.nutrition_logs (user_id, data_source)
  WHERE data_source IS NOT NULL;
```

- [ ] **Step 2: Apply via Supabase MCP**

Run via the MCP tool `mcp__plugin_supabase_supabase__apply_migration` on project `nnhkcufyqjojdbvdrpky`. Confirm `list_tables` shows the new column on `nutrition_logs`.

- [ ] **Step 3: Verify with a no-op SELECT**

```sql
SELECT data_source FROM public.nutrition_logs LIMIT 0;
```

Expected: empty result, no error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260512050000_prompt_164_nutrition_logs_data_source.sql
git commit -m "feat(nutrition): add data_source column to nutrition_logs (#164 phase 1)"
```

### Task 1.2: Migration — `usda_food_cache` table

**Files:**
- Create: `supabase/migrations/20260512200100_prompt_164_usda_food_cache.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Prompt #164: cache USDA FoodData Central lookups. The most important
-- optimization in the new stack: after 2 weeks of real use, ~80% of common
-- foods will be cached and Gemini-free-tier-call-per-meal drops toward 1.
--
-- TTL is 30 days. USDA data rarely changes; a refresh window protects against
-- the rare correction without making us re-fetch eggs every week.

CREATE TABLE IF NOT EXISTS public.usda_food_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_normalized TEXT NOT NULL,
  food_name TEXT NOT NULL,
  fdc_id INTEGER,
  serving_size_g NUMERIC(8,2),
  calories_per_100g NUMERIC(8,2),
  protein_per_100g NUMERIC(8,2),
  carbs_per_100g NUMERIC(8,2),
  total_fat_per_100g NUMERIC(8,2),
  saturated_fat_per_100g NUMERIC(8,2),
  trans_fat_per_100g NUMERIC(8,2),
  omega3_per_100g NUMERIC(8,2),
  sugar_per_100g NUMERIC(8,2),
  fiber_per_100g NUMERIC(8,2),
  raw_payload JSONB,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE UNIQUE INDEX IF NOT EXISTS usda_food_cache_query_idx
  ON public.usda_food_cache (query_normalized);
CREATE INDEX IF NOT EXISTS usda_food_cache_expires_idx
  ON public.usda_food_cache (expires_at);

ALTER TABLE public.usda_food_cache ENABLE ROW LEVEL SECURITY;

-- No user-facing policies. Reads + writes go through createAdminClient
-- (service-role bypasses RLS). RLS is on so the Supabase advisor stays happy.
```

- [ ] **Step 2: Apply via Supabase MCP**

Run `mcp__plugin_supabase_supabase__apply_migration`. Then `list_tables` to confirm table + indexes exist.

- [ ] **Step 3: Run security advisor check**

`mcp__plugin_supabase_supabase__get_advisors` with type=`security`. Confirm no new findings on `usda_food_cache`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260512050010_prompt_164_usda_food_cache.sql
git commit -m "feat(nutrition): add usda_food_cache table (#164 phase 1)"
```

### Task 1.3: Migration — `ai_route_audit` table (#163 fold-in)

**Files:**
- Create: `supabase/migrations/20260512200200_prompt_164_ai_route_audit.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Prompt #164 (#163 fold-in): per-request audit of every AI route hit so we
-- can see latency, error code, cost, and outcome on an admin dashboard.
--
-- The recorder (lib/observability/audit-recorder.ts) writes ONE row per
-- request, success or failure, with the request_id the route surfaced to the
-- client. Insert is infallible: failures are swallowed and logged.

CREATE TABLE IF NOT EXISTS public.ai_route_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  error_code TEXT,
  http_status INTEGER,
  input_chars INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_route_audit_user_created_idx
  ON public.ai_route_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_route_audit_route_outcome_idx
  ON public.ai_route_audit (route, outcome, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_route_audit_request_id_idx
  ON public.ai_route_audit (request_id);

ALTER TABLE public.ai_route_audit ENABLE ROW LEVEL SECURITY;

-- Service-role writes only; no user policies. Admin reads from a separate
-- admin endpoint (not in scope for #164 fold-in).
```

- [ ] **Step 2: Apply via Supabase MCP** + verify with `list_tables`.

- [ ] **Step 3: Run security + performance advisors**

`mcp__plugin_supabase_supabase__get_advisors` type=`security` then type=`performance`. Note any findings. Both indexes should pass; performance advisor sometimes flags FK-covering indexes on `user_id` — note as known residual per project_advisor_known_residuals memory.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260512050020_prompt_164_ai_route_audit.sql
git commit -m "feat(observability): add ai_route_audit table (#164 #163 fold-in)"
```

### Task 1.4: Migration — `system_health_checks` table (#163 fold-in)

**Files:**
- Create: `supabase/migrations/20260512200300_prompt_164_system_health_checks.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Prompt #164 (#163 fold-in): rolling log of provider ping results.
-- /api/admin/health/ai-stack writes one row per checked provider per ping.
-- The most recent row per check_name is the current status.

CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency_ms INTEGER,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_health_checks_name_checked_idx
  ON public.system_health_checks (check_name, checked_at DESC);

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply via Supabase MCP** + `list_tables` verify.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260512050030_prompt_164_system_health_checks.sql
git commit -m "feat(observability): add system_health_checks table (#164 #163 fold-in)"
```

**Phase 1 checkpoint:** Jeffery reviews all four migrations together. Confirm `list_migrations` shows all four applied. No outstanding security advisor findings. Hand to Phase 2.

---

## Phase 2: Schema + Type Extensions

**Owner:** Michelangelo  
**Coordination:** Gordon reviews `data_source` enum values for the nutrition vocabulary.

### Task 2.1: Extend `NutritionAnalysisSchema` with `data_source`

**Files:**
- Modify: `src/lib/nutrition/schema.ts`
- Test: `src/lib/nutrition/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/nutrition/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest';
import { NutritionAnalysisSchema, DataSourceSchema } from '../schema';

describe('DataSourceSchema', () => {
  it.each(['usda', 'gemini_fallback', 'mixed', 'manual'])('accepts %s', (v) => {
    expect(DataSourceSchema.safeParse(v).success).toBe(true);
  });
  it('rejects unknown values', () => {
    expect(DataSourceSchema.safeParse('claude').success).toBe(false);
  });
});

describe('NutritionAnalysisSchema with data_source', () => {
  const base = {
    calories: 200, protein_g: 10, carbs_g: 20, total_fat_g: 8,
    good_fat_g: 4, healthy_fat_g: 1, saturated_fat_g: 3,
    sugar_g: 5, fiber_g: 3,
    confidence: 0.9, ai_notes: 'ok', serving_description: 'one egg',
  };
  it('accepts an object without data_source (back-compat)', () => {
    expect(NutritionAnalysisSchema.safeParse(base).success).toBe(true);
  });
  it('accepts an object with data_source=usda', () => {
    expect(NutritionAnalysisSchema.safeParse({ ...base, data_source: 'usda' }).success).toBe(true);
  });
  it('rejects an object with data_source=foo', () => {
    expect(NutritionAnalysisSchema.safeParse({ ...base, data_source: 'foo' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npx vitest run src/lib/nutrition/__tests__/schema.test.ts`
Expected: FAIL — `DataSourceSchema is not exported`.

- [ ] **Step 3: Modify `schema.ts`**

Replace the file contents with:

```ts
// Prompt #160 (extended by #164): Zod schema for the macronutrient analysis
// returned by the Layer-1/Layer-2/Layer-3 pipeline. parseGeminiParse() and
// aggregate() both validate against this shape so the route handler can
// return 502 to the client without leaking partial data.

import { z } from 'zod';

export const DataSourceSchema = z.enum(['usda', 'gemini_fallback', 'mixed', 'manual']);
export type DataSource = z.infer<typeof DataSourceSchema>;

export const NutritionAnalysisSchema = z.object({
  calories: z.number().int().min(0).max(20000),
  protein_g: z.number().min(0).max(2000),
  carbs_g: z.number().min(0).max(2000),
  total_fat_g: z.number().min(0).max(2000),
  good_fat_g: z.number().min(0).max(2000),
  healthy_fat_g: z.number().min(0).max(2000),
  saturated_fat_g: z.number().min(0).max(2000),
  sugar_g: z.number().min(0).max(2000),
  fiber_g: z.number().min(0).max(2000),
  confidence: z.number().min(0).max(1),
  ai_notes: z.string().max(2000),
  serving_description: z.string().max(2000),
  data_source: DataSourceSchema.optional(),
});

export type NutritionAnalysis = z.infer<typeof NutritionAnalysisSchema>;

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const NutritionSourceSchema = z.enum(['manual_text', 'photo_ai', 'barcode', 'imported', 'quick_calories']);
export type NutritionSource = z.infer<typeof NutritionSourceSchema>;

export const NutritionStatusSchema = z.enum(['pending_review', 'confirmed', 'discarded']);
export type NutritionStatus = z.infer<typeof NutritionStatusSchema>;
```

- [ ] **Step 4: Run tests to verify passing**

Run: `npx vitest run src/lib/nutrition/__tests__/schema.test.ts`
Expected: PASS (5 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/schema.ts src/lib/nutrition/__tests__/schema.test.ts
git commit -m "feat(nutrition): extend NutritionAnalysisSchema with optional data_source (#164 phase 2)"
```

### Task 2.2: Zod schema for Gemini parse output

**Files:**
- Create: `src/lib/nutrition/parsed-meal-schema.ts`
- Test: `src/lib/nutrition/__tests__/parsed-meal-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/nutrition/__tests__/parsed-meal-schema.test.ts
import { describe, it, expect } from 'vitest';
import { ParsedMealSchema } from '../parsed-meal-schema';

describe('ParsedMealSchema', () => {
  const valid = {
    items: [{ name: 'egg', quantity: 2, unit: 'whole' }],
    confidence: 0.9,
    notes: 'standard breakfast portion',
  };
  it('accepts a valid parse result', () => {
    expect(ParsedMealSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects unit outside the allow-list', () => {
    expect(ParsedMealSchema.safeParse({
      ...valid,
      items: [{ name: 'egg', quantity: 2, unit: 'pinch' }],
    }).success).toBe(false);
  });
  it('accepts an item with optional preparation', () => {
    const ok = ParsedMealSchema.safeParse({
      ...valid,
      items: [{ name: 'egg', quantity: 2, unit: 'whole', preparation: 'fried' }],
    });
    expect(ok.success).toBe(true);
  });
  it('accepts an empty items array for confidence=0.2 ambiguous input', () => {
    expect(ParsedMealSchema.safeParse({ items: [], confidence: 0.2, notes: 'too vague' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npx vitest run src/lib/nutrition/__tests__/parsed-meal-schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/parsed-meal-schema.ts
// Prompt #164 Layer 1: validates the JSON Gemini returns when parsing a meal
// description or photo. Any deviation throws and the route returns 502 with
// the MALFORMED_RESPONSE taxonomy code.

import { z } from 'zod';

export const ParsedItemUnitSchema = z.enum([
  'whole', 'slice', 'cup', 'tbsp', 'tsp', 'g', 'oz', 'ml',
  'medium', 'large', 'small', 'serving',
]);
export type ParsedItemUnit = z.infer<typeof ParsedItemUnitSchema>;

export const ParsedItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive().max(1000),
  unit: ParsedItemUnitSchema,
  preparation: z.string().max(200).optional(),
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const ParsedMealSchema = z.object({
  items: z.array(ParsedItemSchema).max(50),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(2000).default(''),
});
export type ParsedMeal = z.infer<typeof ParsedMealSchema>;
```

- [ ] **Step 4: Run tests to verify passing**

Run: `npx vitest run src/lib/nutrition/__tests__/parsed-meal-schema.test.ts`
Expected: PASS (4 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/parsed-meal-schema.ts src/lib/nutrition/__tests__/parsed-meal-schema.test.ts
git commit -m "feat(nutrition): add ParsedMealSchema for Gemini Layer-1 output (#164 phase 2)"
```

**Phase 2 checkpoint:** Jeffery reviews. Both schemas exported, all tests green.

---

## Phase 3: Shared Infrastructure (#163 fold-in)

**Owner:** Michelangelo (with security-advisor cross-check on audit recorder).

### Task 3.1: Provider-agnostic AI error taxonomy

**Files:**
- Create: `src/lib/errors/classify-ai.ts`
- Test: `src/lib/errors/__tests__/classify-ai.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/errors/__tests__/classify-ai.test.ts
import { describe, it, expect } from 'vitest';
import { AIRouteError, classifyGeminiResponse, classifyUSDAResponse, classifyFetchError } from '../classify-ai';

describe('AIRouteError', () => {
  it('exposes code, httpStatus, userMessage', () => {
    const e = new AIRouteError('RATE_LIMITED', 'gemini 429', 503, 'Try again in a moment.');
    expect(e.code).toBe('RATE_LIMITED');
    expect(e.httpStatus).toBe(503);
    expect(e.userMessage).toBe('Try again in a moment.');
  });
});

describe('classifyGeminiResponse', () => {
  it('maps 400 to INVALID_INPUT', () => {
    expect(classifyGeminiResponse(400).code).toBe('INVALID_INPUT');
  });
  it('maps 403 to AUTH_INVALID', () => {
    expect(classifyGeminiResponse(403).code).toBe('AUTH_INVALID');
  });
  it('maps 429 to RATE_LIMITED', () => {
    expect(classifyGeminiResponse(429).code).toBe('RATE_LIMITED');
  });
  it('maps 500 to API_DOWN', () => {
    expect(classifyGeminiResponse(500).code).toBe('API_DOWN');
  });
  it('maps 503 to API_DOWN', () => {
    expect(classifyGeminiResponse(503).code).toBe('API_DOWN');
  });
});

describe('classifyUSDAResponse', () => {
  it('maps 429 to RATE_LIMITED', () => {
    expect(classifyUSDAResponse(429).code).toBe('RATE_LIMITED');
  });
  it('maps 403 to AUTH_INVALID', () => {
    expect(classifyUSDAResponse(403).code).toBe('AUTH_INVALID');
  });
});

describe('classifyFetchError', () => {
  it('maps a TimeoutError to TIMEOUT', () => {
    const err = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    expect(classifyFetchError(err).code).toBe('TIMEOUT');
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npx vitest run src/lib/errors/__tests__/classify-ai.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/errors/classify-ai.ts
// Prompt #164 (#163 fold-in): provider-agnostic AI error taxonomy.
// Routes catch errors and throw an AIRouteError so the JSON response has a
// consistent { code, message, requestId } shape regardless of provider.

export type AIErrorCode =
  | 'AUTH_MISSING'
  | 'AUTH_INVALID'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'API_DOWN'
  | 'INVALID_INPUT'
  | 'MALFORMED_RESPONSE'
  | 'UNAUTHENTICATED'
  | 'UNKNOWN';

export class AIRouteError extends Error {
  readonly code: AIErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;
  readonly cause?: unknown;

  constructor(code: AIErrorCode, internalMessage: string, httpStatus: number, userMessage: string, cause?: unknown) {
    super(internalMessage);
    this.name = 'AIRouteError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

interface Classified {
  code: AIErrorCode;
  httpStatus: number;
  userMessage: string;
}

export function classifyGeminiResponse(status: number): Classified {
  if (status === 400) return { code: 'INVALID_INPUT', httpStatus: 400, userMessage: 'We could not understand that meal description. Try being more specific.' };
  if (status === 401 || status === 403) return { code: 'AUTH_INVALID', httpStatus: 500, userMessage: 'AI is misconfigured. Please contact support.' };
  if (status === 429) return { code: 'RATE_LIMITED', httpStatus: 503, userMessage: 'AI is busy. Try again in a moment or enter manually.' };
  if (status >= 500) return { code: 'API_DOWN', httpStatus: 503, userMessage: 'AI is temporarily unavailable. Try again or enter manually.' };
  return { code: 'UNKNOWN', httpStatus: 502, userMessage: 'Something went wrong. Try again or enter manually.' };
}

export function classifyUSDAResponse(status: number): Classified {
  if (status === 403) return { code: 'AUTH_INVALID', httpStatus: 500, userMessage: 'Nutrition database is misconfigured. Please contact support.' };
  if (status === 429) return { code: 'RATE_LIMITED', httpStatus: 503, userMessage: 'Nutrition database is busy. Try again in a moment.' };
  if (status === 404) return { code: 'INVALID_INPUT', httpStatus: 404, userMessage: 'Food not found in the nutrition database.' };
  if (status >= 500) return { code: 'API_DOWN', httpStatus: 503, userMessage: 'Nutrition database is temporarily unavailable.' };
  return { code: 'UNKNOWN', httpStatus: 502, userMessage: 'Nutrition lookup failed.' };
}

export function classifyFetchError(error: unknown): Classified {
  if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'TimeoutError') {
    return { code: 'TIMEOUT', httpStatus: 504, userMessage: 'The request took too long. Try again.' };
  }
  return { code: 'UNKNOWN', httpStatus: 502, userMessage: 'Something went wrong. Try again or enter manually.' };
}

export function toAIRouteError(error: unknown, fallbackInternal = 'unexpected'): AIRouteError {
  if (error instanceof AIRouteError) return error;
  const cls = classifyFetchError(error);
  return new AIRouteError(cls.code, fallbackInternal, cls.httpStatus, cls.userMessage, error);
}
```

- [ ] **Step 4: Run tests to verify passing**

Run: `npx vitest run src/lib/errors/__tests__/classify-ai.test.ts`
Expected: PASS (8 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors/classify-ai.ts src/lib/errors/__tests__/classify-ai.test.ts
git commit -m "feat(errors): add AIRouteError + classify-ai taxonomy (#164 phase 3)"
```

### Task 3.2: AI pricing constants

**Files:**
- Create: `src/lib/observability/ai-pricing.ts`
- Test: `src/lib/observability/__tests__/ai-pricing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/observability/__tests__/ai-pricing.test.ts
import { describe, it, expect } from 'vitest';
import { PRICING, estimateCostUsd } from '../ai-pricing';

describe('PRICING', () => {
  it('includes gemini-2.5-flash at 0/0 (free tier)', () => {
    expect(PRICING['gemini-2.5-flash']).toEqual({ input: 0, output: 0 });
  });
  it('preserves claude-sonnet-4-20250514 for non-nutrition surfaces', () => {
    expect(PRICING['claude-sonnet-4-20250514']).toBeDefined();
  });
});

describe('estimateCostUsd', () => {
  it('returns 0 for free-tier model regardless of tokens', () => {
    expect(estimateCostUsd('gemini-2.5-flash', 1_000_000, 1_000_000)).toBe(0);
  });
  it('returns null for unknown model', () => {
    expect(estimateCostUsd('nonexistent', 100, 100)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npx vitest run src/lib/observability/__tests__/ai-pricing.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/observability/ai-pricing.ts
// Prompt #164 (#163 fold-in): per-model pricing per million tokens.
// Gemini 2.5 Flash free-tier rows record $0 so dashboards track usage without
// inflating cost figures. The 'gemini-2.5-flash-paid' row is for the day we
// outgrow the free quota; switch is one constant change in gemini-client.ts.

export type ProviderId = 'anthropic' | 'google';

export interface ModelPrice {
  input: number;
  output: number;
}

export const PRICING: Record<string, ModelPrice> = {
  // Anthropic — still used by Hannah, Sherlock, peptide explanations.
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  // Google Gemini — free tier counts $0; paid for future ramp.
  'gemini-2.5-flash': { input: 0, output: 0 },
  'gemini-2.5-flash-paid': { input: 0.30, output: 2.50 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICING[model];
  if (!price) return null;
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}
```

- [ ] **Step 4: Run tests to verify passing**

Run: `npx vitest run src/lib/observability/__tests__/ai-pricing.test.ts`
Expected: PASS (4 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/observability/ai-pricing.ts src/lib/observability/__tests__/ai-pricing.test.ts
git commit -m "feat(observability): add provider-agnostic ai-pricing constants (#164 phase 3)"
```

### Task 3.3: Audit recorder

**Files:**
- Create: `src/lib/observability/audit-recorder.ts`
- Test: `src/lib/observability/__tests__/audit-recorder.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/observability/__tests__/audit-recorder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { recordAudit } from '../audit-recorder';

describe('recordAudit', () => {
  beforeEach(() => { insertMock.mockClear(); fromMock.mockClear(); });

  it('inserts one row with the given fields', async () => {
    await recordAudit({
      requestId: 'req-1', userId: 'u1', route: '/api/nutrition/analyze-text',
      provider: 'google', model: 'gemini-2.5-flash', outcome: 'success',
      httpStatus: 200, inputChars: 30, latencyMs: 421, costUsd: 0,
    });
    expect(fromMock).toHaveBeenCalledWith('ai_route_audit');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.request_id).toBe('req-1');
    expect(row.provider).toBe('google');
    expect(row.outcome).toBe('success');
    expect(row.cost_usd).toBe(0);
  });

  it('never throws on Supabase failure', async () => {
    insertMock.mockResolvedValueOnce({ error: { message: 'boom' } });
    await expect(recordAudit({
      requestId: 'req-2', route: '/api/nutrition/analyze-text',
      provider: 'google', outcome: 'failure', httpStatus: 503,
    })).resolves.toBeUndefined();
  });

  it('newRequestId returns a unique-ish string', async () => {
    const { newRequestId } = await import('../audit-recorder');
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npx vitest run src/lib/observability/__tests__/audit-recorder.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/observability/audit-recorder.ts
// Prompt #164 (#163 fold-in): write one row to ai_route_audit per request.
// Infallible: any Supabase or serialization error is swallowed and logged.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export type Provider = 'google' | 'anthropic' | 'usda';
export type Outcome = 'success' | 'failure';

export interface AuditRecord {
  requestId: string;
  userId?: string | null;
  route: string;
  provider: Provider;
  model?: string | null;
  outcome: Outcome;
  errorCode?: string | null;
  httpStatus?: number | null;
  inputChars?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
  costUsd?: number | null;
}

export function newRequestId(): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `req-${rand}`;
}

export async function recordAudit(record: AuditRecord): Promise<void> {
  try {
    const client = createAdminClient();
    const { error } = await client.from('ai_route_audit').insert({
      request_id: record.requestId,
      user_id: record.userId ?? null,
      route: record.route,
      provider: record.provider,
      model: record.model ?? null,
      outcome: record.outcome,
      error_code: record.errorCode ?? null,
      http_status: record.httpStatus ?? null,
      input_chars: record.inputChars ?? null,
      input_tokens: record.inputTokens ?? null,
      output_tokens: record.outputTokens ?? null,
      latency_ms: record.latencyMs ?? null,
      cost_usd: record.costUsd ?? null,
    });
    if (error) {
      safeLog.warn('observability.audit-recorder', 'insert failed', { error, requestId: record.requestId });
    }
  } catch (err) {
    safeLog.warn('observability.audit-recorder', 'unexpected', { error: err, requestId: record.requestId });
  }
}
```

- [ ] **Step 4: Run tests to verify passing**

Run: `npx vitest run src/lib/observability/__tests__/audit-recorder.test.ts`
Expected: PASS (3 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/observability/audit-recorder.ts src/lib/observability/__tests__/audit-recorder.test.ts
git commit -m "feat(observability): add infallible audit recorder (#164 phase 3)"
```

**Phase 3 checkpoint:** Security-advisor confirms `audit-recorder` only writes from server, never reads PII to client. Hand to Phase 4.

---

## Phase 4: Nutrition Support Modules

**Owner:** Gordon (writes), Michelangelo (reviews).

### Task 4.1: `normalize-query.ts`

**Files:**
- Create: `src/lib/nutrition/normalize-query.ts`
- Test: `src/lib/nutrition/__tests__/normalize-query.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/nutrition/__tests__/normalize-query.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeQuery } from '../normalize-query';

describe('normalizeQuery', () => {
  it('lowercases', () => expect(normalizeQuery('EGG')).toBe('egg'));
  it('trims whitespace', () => expect(normalizeQuery('  egg  ')).toBe('egg'));
  it('depluralizes naive -s', () => expect(normalizeQuery('eggs')).toBe('egg'));
  it('depluralizes -es for words ending in s/x/z/ch/sh', () => {
    expect(normalizeQuery('tomatoes')).toBe('tomato');
    expect(normalizeQuery('peaches')).toBe('peach');
  });
  it('leaves single chars alone', () => expect(normalizeQuery('a')).toBe('a'));
  it('strips trailing punctuation', () => expect(normalizeQuery('egg.')).toBe('egg'));
  it('collapses whitespace inside', () => expect(normalizeQuery('whole  wheat   bread')).toBe('whole wheat bread'));
  it('removes leading articles', () => expect(normalizeQuery('an avocado')).toBe('avocado'));
});
```

- [ ] **Step 2: Run to verify failing**

`npx vitest run src/lib/nutrition/__tests__/normalize-query.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/normalize-query.ts
// Prompt #164 Layer 2: normalize a food name so "Eggs", "egg", "EGGS", "  egg "
// all share the same usda_food_cache row. Naive depluralization is fine for
// the food name domain; words like "fish" survive as "fish" and stay correct.

const ARTICLES = /^(a|an|the)\s+/i;
const PUNCT_TAIL = /[.,;:!?]+$/;
const WS = /\s+/g;

export function normalizeQuery(input: string): string {
  let s = input.toLowerCase().trim();
  s = s.replace(ARTICLES, '');
  s = s.replace(PUNCT_TAIL, '');
  s = s.replace(WS, ' ');
  s = depluralize(s);
  return s;
}

function depluralize(word: string): string {
  if (word.length <= 2) return word;
  if (/(ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (8 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/normalize-query.ts src/lib/nutrition/__tests__/normalize-query.test.ts
git commit -m "feat(nutrition): add normalize-query helper for USDA cache keys (#164 phase 4)"
```

### Task 4.2: `typical-weights.ts`

**Files:**
- Create: `src/lib/nutrition/typical-weights.ts`
- Test: `src/lib/nutrition/__tests__/typical-weights.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/nutrition/__tests__/typical-weights.test.ts
import { describe, it, expect } from 'vitest';
import { unitToGrams } from '../typical-weights';

describe('unitToGrams', () => {
  it('converts oz to grams', () => expect(unitToGrams('oz', 1, 'avocado')).toBeCloseTo(28.35));
  it('converts g to grams (identity)', () => expect(unitToGrams('g', 50, 'egg')).toBe(50));
  it('converts ml to grams water-density default', () => expect(unitToGrams('ml', 100, 'water')).toBe(100));
  it('returns 50 for one whole egg', () => expect(unitToGrams('whole', 1, 'egg')).toBe(50));
  it('returns 28 for one slice of bread', () => expect(unitToGrams('slice', 1, 'bread')).toBe(28));
  it('returns 200 for one medium avocado', () => expect(unitToGrams('medium', 1, 'avocado')).toBe(200));
  it('returns null for an unknown whole-food it cannot weigh', () => {
    expect(unitToGrams('whole', 1, 'unknown-food-xyz')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/typical-weights.ts
// Prompt #164 Layer 2: convert (unit, quantity, foodHint) to grams when USDA's
// per-food portion data is unavailable. Sources are USDA SR Legacy averages
// and common kitchen references. When this returns null, the caller falls
// back to Gemini estimation rather than guessing.

const GRAMS_PER_OZ = 28.3495;
const GRAMS_PER_TBSP_WATER = 14.79;
const GRAMS_PER_TSP_WATER = 4.93;
const GRAMS_PER_CUP_WATER = 240;

const WHOLE_FOODS_G: Record<string, number> = {
  egg: 50, apple: 182, banana: 118, avocado: 200, orange: 131,
  tomato: 123, potato: 173, 'sweet potato': 130, onion: 110,
  carrot: 61, pepper: 119, peach: 150, pear: 178,
};

const SIZE_MULTIPLIERS: Record<string, number> = {
  small: 0.7, medium: 1.0, large: 1.4,
};

const SLICE_G: Record<string, number> = {
  bread: 28, 'whole wheat bread': 28, 'sourdough bread': 36,
  bacon: 12, ham: 28, cheese: 23, pizza: 107,
};

export function unitToGrams(unit: string, quantity: number, foodHint: string): number | null {
  const hint = foodHint.toLowerCase().trim();

  if (unit === 'g') return quantity;
  if (unit === 'oz') return quantity * GRAMS_PER_OZ;
  if (unit === 'ml') return quantity;
  if (unit === 'tbsp') return quantity * GRAMS_PER_TBSP_WATER;
  if (unit === 'tsp') return quantity * GRAMS_PER_TSP_WATER;
  if (unit === 'cup') return quantity * GRAMS_PER_CUP_WATER;
  if (unit === 'slice') return quantity * (matchPrefix(SLICE_G, hint) ?? 28);
  if (unit === 'serving') return null;

  if (unit === 'whole' || unit === 'small' || unit === 'medium' || unit === 'large') {
    const base = matchPrefix(WHOLE_FOODS_G, hint);
    if (base == null) return null;
    const mult = SIZE_MULTIPLIERS[unit] ?? 1.0;
    return quantity * base * mult;
  }

  return null;
}

function matchPrefix(table: Record<string, number>, hint: string): number | null {
  for (const key of Object.keys(table)) {
    if (hint === key || hint.includes(key)) return table[key];
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (7 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/typical-weights.ts src/lib/nutrition/__tests__/typical-weights.test.ts
git commit -m "feat(nutrition): add typical-weights unit→grams lookup (#164 phase 4)"
```

### Task 4.3: `usda-nutrient-ids.ts`

**Files:**
- Create: `src/lib/nutrition/usda-nutrient-ids.ts`
- Test: `src/lib/nutrition/__tests__/usda-nutrient-ids.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/nutrition/__tests__/usda-nutrient-ids.test.ts
import { describe, it, expect } from 'vitest';
import { USDA_NUTRIENT_IDS, extractNutrientsPer100g } from '../usda-nutrient-ids';

describe('USDA_NUTRIENT_IDS', () => {
  it('has the canonical ids', () => {
    expect(USDA_NUTRIENT_IDS.ENERGY_KCAL).toBe(1008);
    expect(USDA_NUTRIENT_IDS.PROTEIN_G).toBe(1003);
    expect(USDA_NUTRIENT_IDS.OMEGA3_DHA_G).toBe(1272);
  });
});

describe('extractNutrientsPer100g', () => {
  it('reads nutrients out of a USDA foodNutrients array', () => {
    const payload = {
      foodNutrients: [
        { nutrient: { id: 1008 }, amount: 155 },
        { nutrient: { id: 1003 }, amount: 13 },
        { nutrient: { id: 1004 }, amount: 11 },
        { nutrient: { id: 1258 }, amount: 3.3 },
        { nutrient: { id: 1404 }, amount: 0.1 },
      ],
    };
    const out = extractNutrientsPer100g(payload);
    expect(out.calories).toBe(155);
    expect(out.protein_g).toBe(13);
    expect(out.total_fat_g).toBe(11);
    expect(out.saturated_fat_g).toBeCloseTo(3.3);
    expect(out.omega3_g).toBeCloseTo(0.1);
  });
  it('handles missing nutrients by defaulting to 0', () => {
    const out = extractNutrientsPer100g({ foodNutrients: [] });
    expect(out.calories).toBe(0);
    expect(out.fiber_g).toBe(0);
  });
  it('sums all four omega-3 sub-nutrients into omega3_g', () => {
    const payload = {
      foodNutrients: [
        { nutrient: { id: 1404 }, amount: 0.5 },
        { nutrient: { id: 1278 }, amount: 0.3 },
        { nutrient: { id: 1272 }, amount: 0.2 },
        { nutrient: { id: 1280 }, amount: 0.1 },
      ],
    };
    expect(extractNutrientsPer100g(payload).omega3_g).toBeCloseTo(1.1);
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/usda-nutrient-ids.ts
// Prompt #164 Layer 2: USDA returns nutrients keyed by integer nutrient.id.
// These constants come from the FDC nutrient table at
// https://fdc.nal.usda.gov/api-guide.html and are stable across data types.

export const USDA_NUTRIENT_IDS = {
  ENERGY_KCAL: 1008,
  PROTEIN_G: 1003,
  CARBS_G: 1005,
  TOTAL_FAT_G: 1004,
  SATURATED_FAT_G: 1258,
  TRANS_FAT_G: 1257,
  SUGAR_G: 2000,
  FIBER_G: 1079,
  OMEGA3_ALA_G: 1404,
  OMEGA3_EPA_G: 1278,
  OMEGA3_DHA_G: 1272,
  OMEGA3_DPA_G: 1280,
} as const;

export interface NutrientsPer100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  total_fat_g: number;
  saturated_fat_g: number;
  trans_fat_g: number;
  omega3_g: number;
  sugar_g: number;
  fiber_g: number;
}

interface FoodNutrient {
  nutrient?: { id?: number };
  amount?: number;
}

interface USDAPayload {
  foodNutrients?: FoodNutrient[];
}

export function extractNutrientsPer100g(payload: USDAPayload): NutrientsPer100g {
  const map = new Map<number, number>();
  for (const fn of payload.foodNutrients ?? []) {
    const id = fn.nutrient?.id;
    if (typeof id === 'number' && typeof fn.amount === 'number') {
      map.set(id, fn.amount);
    }
  }
  const get = (id: number) => map.get(id) ?? 0;
  const omega3 =
    get(USDA_NUTRIENT_IDS.OMEGA3_ALA_G) +
    get(USDA_NUTRIENT_IDS.OMEGA3_EPA_G) +
    get(USDA_NUTRIENT_IDS.OMEGA3_DHA_G) +
    get(USDA_NUTRIENT_IDS.OMEGA3_DPA_G);
  return {
    calories: get(USDA_NUTRIENT_IDS.ENERGY_KCAL),
    protein_g: get(USDA_NUTRIENT_IDS.PROTEIN_G),
    carbs_g: get(USDA_NUTRIENT_IDS.CARBS_G),
    total_fat_g: get(USDA_NUTRIENT_IDS.TOTAL_FAT_G),
    saturated_fat_g: get(USDA_NUTRIENT_IDS.SATURATED_FAT_G),
    trans_fat_g: get(USDA_NUTRIENT_IDS.TRANS_FAT_G),
    omega3_g: omega3,
    sugar_g: get(USDA_NUTRIENT_IDS.SUGAR_G),
    fiber_g: get(USDA_NUTRIENT_IDS.FIBER_G),
  };
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (3 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/usda-nutrient-ids.ts src/lib/nutrition/__tests__/usda-nutrient-ids.test.ts
git commit -m "feat(nutrition): add USDA nutrient-id constants + extractor (#164 phase 4)"
```

### Task 4.4: `usda-client.ts`

**Files:**
- Create: `src/lib/nutrition/usda-client.ts`
- Test: `src/lib/nutrition/__tests__/usda-client.test.ts`

- [ ] **Step 1: Write failing test (uses MSW-style fetch mock and Supabase mock)**

```ts
// src/lib/nutrition/__tests__/usda-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const cacheSelect = vi.fn();
const cacheInsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: cacheSelect }) }),
      insert: cacheInsert,
    }),
  }),
}));

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  cacheSelect.mockReset();
  cacheInsert.mockReset();
  cacheInsert.mockResolvedValue({ error: null });
  process.env.USDA_FDC_API_KEY = 'TESTKEY';
});

import { lookupFood } from '../usda-client';

describe('lookupFood', () => {
  it('returns cached row without hitting USDA when not expired', async () => {
    cacheSelect.mockResolvedValueOnce({
      data: {
        food_name: 'egg', fdc_id: 1, serving_size_g: 50,
        calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1,
        total_fat_per_100g: 11, saturated_fat_per_100g: 3.3, trans_fat_per_100g: 0,
        omega3_per_100g: 0.1, sugar_per_100g: 1.1, fiber_per_100g: 0,
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      },
      error: null,
    });
    const result = await lookupFood('Eggs', 2, 'whole');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.calories).toBeGreaterThan(0);
  });

  it('searches+fetches USDA on cache miss and writes to cache', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      foods: [{ fdcId: 9999, description: 'Egg, whole, raw, fresh' }],
    }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      foodNutrients: [
        { nutrient: { id: 1008 }, amount: 155 },
        { nutrient: { id: 1003 }, amount: 13 },
        { nutrient: { id: 1004 }, amount: 11 },
        { nutrient: { id: 1258 }, amount: 3.3 },
      ],
    }), { status: 200 }));
    const result = await lookupFood('egg', 1, 'whole');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cacheInsert).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
  });

  it('returns null when USDA search has no results', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
    const result = await lookupFood('unicornmeat', 1, 'oz');
    expect(result).toBeNull();
  });

  it('throws AIRouteError on USDA 429', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValueOnce(new Response('rate limited', { status: 429 }));
    await expect(lookupFood('egg', 1, 'whole')).rejects.toThrow(/AIRouteError|RATE_LIMITED|rate/i);
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/usda-client.ts
// Prompt #164 Layer 2: search USDA FoodData Central for a food, fetch its
// nutrient detail, scale per serving, and cache the result for 30 days.

import { createAdminClient } from '@/lib/supabase/admin';
import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError, classifyUSDAResponse } from '@/lib/errors/classify-ai';
import { normalizeQuery } from './normalize-query';
import { extractNutrientsPer100g, type NutrientsPer100g } from './usda-nutrient-ids';
import { unitToGrams } from './typical-weights';

const BASE = 'https://api.nal.usda.gov/fdc/v1';
const TIMEOUT_MS = 6000;
const breaker = getCircuitBreaker('usda-api', { failureThreshold: 5, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 1 });

export interface ItemNutrients {
  calories: number;
  protein_g: number;
  carbs_g: number;
  total_fat_g: number;
  saturated_fat_g: number;
  trans_fat_g: number;
  omega3_g: number;
  sugar_g: number;
  fiber_g: number;
  source: 'usda';
}

interface CacheRow {
  food_name: string;
  fdc_id: number | null;
  serving_size_g: number | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  total_fat_per_100g: number;
  saturated_fat_per_100g: number;
  trans_fat_per_100g: number;
  omega3_per_100g: number;
  sugar_per_100g: number;
  fiber_per_100g: number;
  expires_at: string;
}

export async function lookupFood(name: string, quantity: number, unit: string): Promise<ItemNutrients | null> {
  const normalized = normalizeQuery(name);
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from('usda_food_cache')
    .select('food_name, fdc_id, serving_size_g, calories_per_100g, protein_per_100g, carbs_per_100g, total_fat_per_100g, saturated_fat_per_100g, trans_fat_per_100g, omega3_per_100g, sugar_per_100g, fiber_per_100g, expires_at')
    .eq('query_normalized', normalized)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return scaleToServing(cached as CacheRow, quantity, unit, normalized);
  }

  const search = await searchUSDA(normalized);
  if (!search) return null;

  const detail = await fetchUSDADetail(search.fdcId);
  const per100g = extractNutrientsPer100g(detail);

  const row: CacheRow = {
    food_name: search.description,
    fdc_id: search.fdcId,
    serving_size_g: 100,
    calories_per_100g: per100g.calories,
    protein_per_100g: per100g.protein_g,
    carbs_per_100g: per100g.carbs_g,
    total_fat_per_100g: per100g.total_fat_g,
    saturated_fat_per_100g: per100g.saturated_fat_g,
    trans_fat_per_100g: per100g.trans_fat_g,
    omega3_per_100g: per100g.omega3_g,
    sugar_per_100g: per100g.sugar_g,
    fiber_per_100g: per100g.fiber_g,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const { error: insErr } = await admin.from('usda_food_cache').insert({
    query_normalized: normalized,
    food_name: row.food_name,
    fdc_id: row.fdc_id,
    serving_size_g: row.serving_size_g,
    calories_per_100g: row.calories_per_100g,
    protein_per_100g: row.protein_per_100g,
    carbs_per_100g: row.carbs_per_100g,
    total_fat_per_100g: row.total_fat_per_100g,
    saturated_fat_per_100g: row.saturated_fat_per_100g,
    trans_fat_per_100g: row.trans_fat_per_100g,
    omega3_per_100g: row.omega3_per_100g,
    sugar_per_100g: row.sugar_per_100g,
    fiber_per_100g: row.fiber_per_100g,
    raw_payload: detail,
  });
  if (insErr) safeLog.warn('nutrition.usda-client', 'cache write failed', { error: insErr });
  return scaleToServing(row, quantity, unit, normalized);
}

async function searchUSDA(query: string): Promise<{ fdcId: number; description: string } | null> {
  const key = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
  if (key === 'DEMO_KEY') safeLog.warn('nutrition.usda-client', 'using DEMO_KEY (30/hr limit)');
  const url = `${BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=5&api_key=${key}`;
  const res = await breaker.execute(() => withAbortTimeout((s) => fetch(url, { signal: s }), TIMEOUT_MS, 'usda.search'));
  if (!res.ok) {
    const c = classifyUSDAResponse(res.status);
    throw new AIRouteError(c.code, `usda search ${res.status}`, c.httpStatus, c.userMessage);
  }
  const json = await res.json() as { foods?: Array<{ fdcId: number; description: string }> };
  const first = json.foods?.[0];
  if (!first) return null;
  return { fdcId: first.fdcId, description: first.description };
}

async function fetchUSDADetail(fdcId: number): Promise<{ foodNutrients?: Array<{ nutrient?: { id?: number }; amount?: number }> }> {
  const key = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
  const url = `${BASE}/food/${fdcId}?api_key=${key}`;
  const res = await breaker.execute(() => withAbortTimeout((s) => fetch(url, { signal: s }), TIMEOUT_MS, 'usda.detail'));
  if (!res.ok) {
    const c = classifyUSDAResponse(res.status);
    throw new AIRouteError(c.code, `usda detail ${res.status}`, c.httpStatus, c.userMessage);
  }
  return res.json();
}

function scaleToServing(row: CacheRow, quantity: number, unit: string, foodHint: string): ItemNutrients {
  const grams = unitToGrams(unit, quantity, foodHint) ?? (row.serving_size_g ?? 100);
  const f = grams / 100;
  return {
    calories: Math.round(row.calories_per_100g * f),
    protein_g: round1(row.protein_per_100g * f),
    carbs_g: round1(row.carbs_per_100g * f),
    total_fat_g: round1(row.total_fat_per_100g * f),
    saturated_fat_g: round1(row.saturated_fat_per_100g * f),
    trans_fat_g: round1(row.trans_fat_per_100g * f),
    omega3_g: round1(row.omega3_per_100g * f),
    sugar_g: round1(row.sugar_per_100g * f),
    fiber_g: round1(row.fiber_per_100g * f),
    source: 'usda',
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (4 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/usda-client.ts src/lib/nutrition/__tests__/usda-client.test.ts
git commit -m "feat(nutrition): add cached USDA FoodData Central client (#164 phase 4)"
```

### Task 4.5: `gemini-prompts.ts`

**Files:**
- Create: `src/lib/nutrition/gemini-prompts.ts`
- Test: `src/lib/nutrition/__tests__/gemini-prompts.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/nutrition/__tests__/gemini-prompts.test.ts
import { describe, it, expect } from 'vitest';
import {
  TEXT_PARSE_SYSTEM_INSTRUCTION,
  PHOTO_PARSE_SYSTEM_INSTRUCTION,
  ESTIMATION_FALLBACK_INSTRUCTION,
  GEMINI_MODEL,
} from '../gemini-prompts';

describe('Gemini prompts', () => {
  it('uses gemini-2.5-flash', () => {
    expect(GEMINI_MODEL).toBe('gemini-2.5-flash');
  });
  it('text instruction tells the model to emit JSON only', () => {
    expect(TEXT_PARSE_SYSTEM_INSTRUCTION).toMatch(/JSON object/);
    expect(TEXT_PARSE_SYSTEM_INSTRUCTION).toMatch(/no preamble/i);
  });
  it('text instruction lists every allowed unit', () => {
    for (const u of ['whole','slice','cup','tbsp','tsp','g','oz','ml','medium','large','small','serving']) {
      expect(TEXT_PARSE_SYSTEM_INSTRUCTION).toContain(u);
    }
  });
  it('photo instruction extends text instruction', () => {
    expect(PHOTO_PARSE_SYSTEM_INSTRUCTION.length).toBeGreaterThan(TEXT_PARSE_SYSTEM_INSTRUCTION.length);
  });
  it('estimation fallback asks for the macro JSON shape', () => {
    expect(ESTIMATION_FALLBACK_INSTRUCTION).toMatch(/calories/);
    expect(ESTIMATION_FALLBACK_INSTRUCTION).toMatch(/protein_g/);
  });
  it('no prompt contains em-dashes or en-dashes', () => {
    const all = TEXT_PARSE_SYSTEM_INSTRUCTION + PHOTO_PARSE_SYSTEM_INSTRUCTION + ESTIMATION_FALLBACK_INSTRUCTION;
    expect(all).not.toMatch(/[–—]/);
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/gemini-prompts.ts
// Prompt #164 Layer 1: system instructions for the three Gemini 2.5 Flash
// call sites (text parse, photo parse, single-item estimation fallback).

export const GEMINI_MODEL = 'gemini-2.5-flash';

export const TEXT_PARSE_SYSTEM_INSTRUCTION = `You are a meal parser. The user will describe what they ate in natural language. Your job is to extract structured food items.

Return ONLY a JSON object with this shape, no preamble, no markdown fences:

{
  "items": [
    {
      "name": "string, simple food name suitable for a nutrition database lookup",
      "quantity": number,
      "unit": "whole" | "slice" | "cup" | "tbsp" | "tsp" | "g" | "oz" | "ml" | "medium" | "large" | "small" | "serving",
      "preparation": "string, optional, e.g. 'fried', 'boiled', 'raw'"
    }
  ],
  "confidence": number between 0 and 1,
  "notes": "string, brief explanation of assumptions"
}

Rules:
1. Split compound dishes into component foods (e.g. avocado toast splits into bread plus avocado).
2. If no portion is specified, assume a single standard adult serving and state it in notes.
3. Use simple, searchable food names. Prefer "egg" over "large brown organic egg" so a database lookup succeeds.
4. If a phrase is ambiguous (e.g. "lunch"), return confidence 0.2 and an empty items array with a note explaining what is missing.
5. NEVER include text outside the JSON object.`;

export const PHOTO_PARSE_SYSTEM_INSTRUCTION = `${TEXT_PARSE_SYSTEM_INSTRUCTION}

You will receive a photo of a meal. Identify each visible food item, estimate portion sizes from visual cues (plate size, utensil scale, item density), and emit the same JSON structure as the text task.

Additional rules:
6. List each visible item separately.
7. If image is blurry, dark, or hard to read, return confidence at or below 0.4 and explain in notes.
8. If the user provided a context note (passed as a separate user message), weight it heavily.
9. Be conservative with portion estimates.`;

export const ESTIMATION_FALLBACK_INSTRUCTION = `You are a nutrition estimator. Estimate per-serving macros for the food described in the user message.

Return ONLY a JSON object with this shape, no preamble, no markdown fences:

{
  "calories": integer,
  "protein_g": number,
  "carbs_g": number,
  "total_fat_g": number,
  "saturated_fat_g": number,
  "trans_fat_g": number,
  "omega3_g": number,
  "sugar_g": number,
  "fiber_g": number,
  "confidence": number between 0 and 1
}

Be conservative. Use USDA FoodData Central reference values where you know them. NEVER include text outside the JSON object.`;
```

- [ ] **Step 4: Run tests to verify passing** → PASS (6 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/gemini-prompts.ts src/lib/nutrition/__tests__/gemini-prompts.test.ts
git commit -m "feat(nutrition): add Gemini 2.5 Flash system instructions (#164 phase 4)"
```

### Task 4.6: `gemini-client.ts`

**Files:**
- Create: `src/lib/nutrition/gemini-client.ts`
- Test: `src/lib/nutrition/__tests__/gemini-client.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/nutrition/__tests__/gemini-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  process.env.GEMINI_API_KEY = 'TESTKEY';
});

import { parseDescriptionWithGemini, parseImageWithGemini, estimateItemWithGemini } from '../gemini-client';

function geminiOk(text: string) {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
    usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 30 },
  }), { status: 200 });
}

describe('parseDescriptionWithGemini', () => {
  it('returns parsed items + usage on 200', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk(JSON.stringify({
      items: [{ name: 'egg', quantity: 2, unit: 'whole' }],
      confidence: 0.9,
      notes: 'breakfast portion',
    })));
    const r = await parseDescriptionWithGemini('two eggs');
    expect(r.parsed.items[0].name).toBe('egg');
    expect(r.usage.inputTokens).toBe(50);
  });

  it('throws AIRouteError MALFORMED_RESPONSE on garbage JSON', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk('not json {{{'));
    await expect(parseDescriptionWithGemini('two eggs')).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });

  it('throws AIRouteError RATE_LIMITED on 429', async () => {
    fetchMock.mockResolvedValueOnce(new Response('rate', { status: 429 }));
    await expect(parseDescriptionWithGemini('two eggs')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('throws AIRouteError AUTH_MISSING when env var is unset', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(parseDescriptionWithGemini('two eggs')).rejects.toMatchObject({ code: 'AUTH_MISSING' });
  });
});

describe('parseImageWithGemini', () => {
  it('returns parsed items on 200', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk(JSON.stringify({
      items: [{ name: 'salad', quantity: 1, unit: 'serving' }],
      confidence: 0.7,
      notes: 'plate of mixed greens',
    })));
    const r = await parseImageWithGemini(Buffer.from('fake'), 'image/jpeg', 'note');
    expect(r.parsed.items[0].name).toBe('salad');
  });
});

describe('estimateItemWithGemini', () => {
  it('returns per-item nutrients on 200', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk(JSON.stringify({
      calories: 200, protein_g: 5, carbs_g: 30, total_fat_g: 7,
      saturated_fat_g: 2, trans_fat_g: 0, omega3_g: 0,
      sugar_g: 10, fiber_g: 2, confidence: 0.5,
    })));
    const r = await estimateItemWithGemini('protein bar', 1, 'serving');
    expect(r.nutrients.calories).toBe(200);
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/gemini-client.ts
// Prompt #164 Layer 1 + fallback: three call sites against the Gemini 2.5
// Flash REST API. Direct fetch, no SDK, no package.json change.

import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { AIRouteError, classifyGeminiResponse } from '@/lib/errors/classify-ai';
import { TEXT_PARSE_SYSTEM_INSTRUCTION, PHOTO_PARSE_SYSTEM_INSTRUCTION, ESTIMATION_FALLBACK_INSTRUCTION, GEMINI_MODEL } from './gemini-prompts';
import { ParsedMealSchema, type ParsedMeal } from './parsed-meal-schema';

const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 10_000;
const breaker = getCircuitBreaker('gemini-api', { failureThreshold: 5, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 1 });

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ParseResult {
  parsed: ParsedMeal;
  usage: Usage;
}

export interface EstimationResult {
  nutrients: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    total_fat_g: number;
    saturated_fat_g: number;
    trans_fat_g: number;
    omega3_g: number;
    sugar_g: number;
    fiber_g: number;
  };
  confidence: number;
  usage: Usage;
}

function requireKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new AIRouteError('AUTH_MISSING', 'GEMINI_API_KEY not configured', 500, 'AI is not configured. Please contact support.');
  return k;
}

async function callGemini(body: unknown): Promise<{ text: string; usage: Usage }> {
  const key = requireKey();
  const res = await breaker.execute(() =>
    withAbortTimeout((s) => fetch(`${BASE}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: s,
    }), TIMEOUT_MS, 'gemini.generateContent'),
  );
  if (!res.ok) {
    const c = classifyGeminiResponse(res.status);
    throw new AIRouteError(c.code, `gemini ${res.status}`, c.httpStatus, c.userMessage);
  }
  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new AIRouteError('MALFORMED_RESPONSE', 'empty candidates', 502, 'AI returned no content. Try again or enter manually.');
  return {
    text,
    usage: {
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

function parseJsonOrThrow(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AIRouteError('MALFORMED_RESPONSE', 'gemini json parse', 502, 'AI returned malformed output. Try again or enter manually.');
  }
}

export async function parseDescriptionWithGemini(description: string): Promise<ParseResult> {
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: TEXT_PARSE_SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: description }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 1024 },
  });
  const parsed = ParsedMealSchema.parse(parseJsonOrThrow(text));
  return { parsed, usage };
}

export async function parseImageWithGemini(buf: Buffer, mimeType: string, note: string): Promise<ParseResult> {
  const data = buf.toString('base64');
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: PHOTO_PARSE_SYSTEM_INSTRUCTION }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data } },
        { text: note ? `Context: ${note}` : 'Analyze this meal.' },
      ],
    }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 1024 },
  });
  const parsed = ParsedMealSchema.parse(parseJsonOrThrow(text));
  return { parsed, usage };
}

export async function estimateItemWithGemini(name: string, quantity: number, unit: string): Promise<EstimationResult> {
  const { text, usage } = await callGemini({
    systemInstruction: { parts: [{ text: ESTIMATION_FALLBACK_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: `${quantity} ${unit} ${name}` }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 512 },
  });
  const parsed = parseJsonOrThrow(text) as Record<string, number>;
  return {
    nutrients: {
      calories: Math.round(parsed.calories ?? 0),
      protein_g: parsed.protein_g ?? 0,
      carbs_g: parsed.carbs_g ?? 0,
      total_fat_g: parsed.total_fat_g ?? 0,
      saturated_fat_g: parsed.saturated_fat_g ?? 0,
      trans_fat_g: parsed.trans_fat_g ?? 0,
      omega3_g: parsed.omega3_g ?? 0,
      sugar_g: parsed.sugar_g ?? 0,
      fiber_g: parsed.fiber_g ?? 0,
    },
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    usage,
  };
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (6 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/gemini-client.ts src/lib/nutrition/__tests__/gemini-client.test.ts
git commit -m "feat(nutrition): add Gemini 2.5 Flash REST client (parse + estimate) (#164 phase 4)"
```

### Task 4.7: `aggregate.ts`

**Files:**
- Create: `src/lib/nutrition/aggregate.ts`
- Test: `src/lib/nutrition/__tests__/aggregate.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/nutrition/__tests__/aggregate.test.ts
import { describe, it, expect } from 'vitest';
import { aggregate, type AggregatedItem } from '../aggregate';

const eggUSDA: AggregatedItem = {
  parsed: { name: 'egg', quantity: 2, unit: 'whole' },
  nutrients: { calories: 155, protein_g: 13, carbs_g: 1.1, total_fat_g: 11, saturated_fat_g: 3.3, trans_fat_g: 0, omega3_g: 0.1, sugar_g: 1.1, fiber_g: 0, source: 'usda' },
};
const avocadoUSDA: AggregatedItem = {
  parsed: { name: 'avocado', quantity: 1, unit: 'medium' },
  nutrients: { calories: 160, protein_g: 2, carbs_g: 9, total_fat_g: 15, saturated_fat_g: 2.1, trans_fat_g: 0, omega3_g: 0.1, sugar_g: 0.7, fiber_g: 7, source: 'usda' },
};
const proteinBarFallback: AggregatedItem = {
  parsed: { name: 'protein bar', quantity: 1, unit: 'serving' },
  nutrients: { calories: 200, protein_g: 20, carbs_g: 20, total_fat_g: 7, saturated_fat_g: 3, trans_fat_g: 0, omega3_g: 0, sugar_g: 10, fiber_g: 5, source: 'gemini_fallback' },
};

describe('aggregate', () => {
  it('sums macros across USDA items', () => {
    const r = aggregate([eggUSDA, avocadoUSDA]);
    expect(r.calories).toBe(315);
    expect(r.protein_g).toBe(15);
    expect(r.total_fat_g).toBeCloseTo(26);
  });
  it('marks data_source=usda when all items USDA', () => {
    expect(aggregate([eggUSDA, avocadoUSDA]).data_source).toBe('usda');
  });
  it('marks data_source=gemini_fallback when all items fallback', () => {
    expect(aggregate([proteinBarFallback]).data_source).toBe('gemini_fallback');
  });
  it('marks data_source=mixed when items have both sources', () => {
    expect(aggregate([eggUSDA, proteinBarFallback]).data_source).toBe('mixed');
  });
  it('computes healthy_fat_g as omega-3 sum', () => {
    expect(aggregate([eggUSDA, avocadoUSDA]).healthy_fat_g).toBeCloseTo(0.2);
  });
  it('computes good_fat_g as total minus saturated minus trans minus omega-3', () => {
    const r = aggregate([eggUSDA, avocadoUSDA]);
    expect(r.good_fat_g).toBeCloseTo(26 - 5.4 - 0 - 0.2);
  });
  it('confidence equals usda fraction', () => {
    expect(aggregate([eggUSDA, proteinBarFallback]).confidence).toBe(0.5);
  });
  it('serving_description concatenates items', () => {
    expect(aggregate([eggUSDA, avocadoUSDA]).serving_description).toBe('2 whole egg, 1 medium avocado');
  });
  it('returns confidence 0 + empty for zero items (caller should have errored upstream)', () => {
    const r = aggregate([]);
    expect(r.confidence).toBe(0);
    expect(r.calories).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/aggregate.ts
// Prompt #164 Layer 3: sum per-item nutrients into the final NutritionAnalysis
// shape that nutrition_logs persists. Pure. No I/O.

import type { ParsedItem } from './parsed-meal-schema';
import type { NutritionAnalysis, DataSource } from './schema';

export interface AggregatedItem {
  parsed: ParsedItem;
  nutrients: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    total_fat_g: number;
    saturated_fat_g: number;
    trans_fat_g: number;
    omega3_g: number;
    sugar_g: number;
    fiber_g: number;
    source: 'usda' | 'gemini_fallback';
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function sum(xs: number[]): number { return xs.reduce((a, b) => a + b, 0); }

export function aggregate(items: AggregatedItem[]): NutritionAnalysis {
  if (items.length === 0) {
    return {
      calories: 0, protein_g: 0, carbs_g: 0, total_fat_g: 0,
      good_fat_g: 0, healthy_fat_g: 0, saturated_fat_g: 0, sugar_g: 0, fiber_g: 0,
      confidence: 0, ai_notes: 'No items identified.', serving_description: '',
      data_source: 'gemini_fallback',
    };
  }

  const calories = Math.round(sum(items.map((i) => i.nutrients.calories)));
  const protein_g = round1(sum(items.map((i) => i.nutrients.protein_g)));
  const carbs_g = round1(sum(items.map((i) => i.nutrients.carbs_g)));
  const total_fat_g = round1(sum(items.map((i) => i.nutrients.total_fat_g)));
  const saturated_fat_g = round1(sum(items.map((i) => i.nutrients.saturated_fat_g)));
  const trans_fat_g = round1(sum(items.map((i) => i.nutrients.trans_fat_g)));
  const omega3 = round1(sum(items.map((i) => i.nutrients.omega3_g)));
  const sugar_g = round1(sum(items.map((i) => i.nutrients.sugar_g)));
  const fiber_g = round1(sum(items.map((i) => i.nutrients.fiber_g)));

  const healthy_fat_g = omega3;
  const good_fat_g = round1(Math.max(0, total_fat_g - saturated_fat_g - trans_fat_g - omega3));

  const usdaCount = items.filter((i) => i.nutrients.source === 'usda').length;
  const total = items.length;
  const confidence = total === 0 ? 0 : Math.round((usdaCount / total) * 100) / 100;
  const data_source: DataSource =
    usdaCount === total ? 'usda' : usdaCount === 0 ? 'gemini_fallback' : 'mixed';

  const serving_description = items
    .map((i) => `${i.parsed.quantity} ${i.parsed.unit} ${i.parsed.name}`)
    .join(', ')
    .slice(0, 2000);

  const ai_notes =
    data_source === 'usda'
      ? `Nutrition data from USDA FoodData Central. ${total} ${total === 1 ? 'item' : 'items'} matched.`
      : data_source === 'mixed'
        ? `Nutrition data from USDA FoodData Central for ${usdaCount} of ${total} items. Others estimated.`
        : `Nutrition values estimated. No USDA matches found for this meal.`;

  return {
    calories,
    protein_g,
    carbs_g,
    total_fat_g,
    good_fat_g,
    healthy_fat_g,
    saturated_fat_g,
    sugar_g,
    fiber_g,
    confidence,
    ai_notes,
    serving_description,
    data_source,
  };
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (9 specs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/aggregate.ts src/lib/nutrition/__tests__/aggregate.test.ts
git commit -m "feat(nutrition): add Layer-3 aggregate() builder (#164 phase 4)"
```

**Phase 4 checkpoint:** Gordon reviews each module's behavior against the spec. Michelangelo confirms no package.json mutations, no SDK additions. Jeffery signs off. Hand to Phase 5.

---

## Phase 5: Route Refactors

**Owner:** Michelangelo (writes), Jeffery (reviews entrypoint contract).

### Task 5.1: Rewrite `analyze-text/route.ts`

**Files:**
- Modify: `src/app/api/nutrition/analyze-text/route.ts`
- Test: `src/app/api/nutrition/analyze-text/__tests__/route.test.ts` (NEW)

- [ ] **Step 1: Write integration test (mocks Gemini + USDA + Supabase)**

```ts
// src/app/api/nutrition/analyze-text/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const supabaseUser = { id: 'user-1' };
const supabaseAuth = vi.fn().mockResolvedValue({ data: { user: supabaseUser } });
const insertSelect = vi.fn().mockResolvedValue({ data: { id: 'log-1' }, error: null });
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: supabaseAuth },
    from: () => ({ insert: () => ({ select: () => ({ single: insertSelect }) }) }),
  }),
}));

const parseDescription = vi.fn();
vi.mock('@/lib/nutrition/gemini-client', () => ({
  parseDescriptionWithGemini: parseDescription,
  estimateItemWithGemini: vi.fn().mockResolvedValue({
    nutrients: { calories: 100, protein_g: 5, carbs_g: 10, total_fat_g: 3, saturated_fat_g: 1, trans_fat_g: 0, omega3_g: 0, sugar_g: 2, fiber_g: 1 },
    confidence: 0.5,
    usage: { inputTokens: 30, outputTokens: 20 },
  }),
}));

const lookupFood = vi.fn();
vi.mock('@/lib/nutrition/usda-client', () => ({ lookupFood }));

vi.mock('@/lib/observability/audit-recorder', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  newRequestId: () => 'req-test',
}));

beforeEach(() => {
  parseDescription.mockReset();
  lookupFood.mockReset();
  insertSelect.mockClear();
});

import { POST } from '../route';

function makeReq(body: object): NextRequest {
  return new Request('http://localhost/api/nutrition/analyze-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/nutrition/analyze-text', () => {
  it('returns 200 + logId for happy path (all USDA)', async () => {
    parseDescription.mockResolvedValueOnce({
      parsed: { items: [{ name: 'egg', quantity: 2, unit: 'whole' }], confidence: 0.9, notes: 'ok' },
      usage: { inputTokens: 40, outputTokens: 30 },
    });
    lookupFood.mockResolvedValueOnce({
      calories: 155, protein_g: 13, carbs_g: 1, total_fat_g: 11, saturated_fat_g: 3.3, trans_fat_g: 0, omega3_g: 0.1, sugar_g: 1, fiber_g: 0, source: 'usda',
    });
    const res = await POST(makeReq({ description: 'two eggs', mealType: 'breakfast' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.logId).toBe('log-1');
    expect(json.analysis.data_source).toBe('usda');
    expect(insertSelect).toHaveBeenCalledTimes(1);
  });

  it('returns mixed when one item misses USDA', async () => {
    parseDescription.mockResolvedValueOnce({
      parsed: { items: [
        { name: 'egg', quantity: 1, unit: 'whole' },
        { name: 'protein bar', quantity: 1, unit: 'serving' },
      ], confidence: 0.7, notes: '' },
      usage: { inputTokens: 50, outputTokens: 30 },
    });
    lookupFood.mockResolvedValueOnce({
      calories: 78, protein_g: 6, carbs_g: 0, total_fat_g: 5, saturated_fat_g: 1.5, trans_fat_g: 0, omega3_g: 0.05, sugar_g: 0, fiber_g: 0, source: 'usda',
    });
    lookupFood.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ description: 'one egg and one protein bar', mealType: 'snack' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.analysis.data_source).toBe('mixed');
  });

  it('returns 400 when description is too short', async () => {
    const res = await POST(makeReq({ description: 'hi', mealType: 'breakfast' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq({ description: 'two eggs', mealType: 'breakfast' }));
    expect(res.status).toBe(401);
  });

  it('returns 502 MALFORMED_RESPONSE when Gemini returns zero items', async () => {
    parseDescription.mockResolvedValueOnce({
      parsed: { items: [], confidence: 0.2, notes: 'too vague' },
      usage: { inputTokens: 20, outputTokens: 15 },
    });
    const res = await POST(makeReq({ description: 'lunch yesterday', mealType: 'lunch' }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error.code).toBe('MALFORMED_RESPONSE');
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL (route still calls Anthropic).

- [ ] **Step 3: Rewrite the route**

```ts
// src/app/api/nutrition/analyze-text/route.ts
// Prompt #164: text meal analysis using Gemini 2.5 Flash + USDA FoodData
// Central. Layer 1 → Layer 2 → Layer 3 → insert. One audit row per outcome.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { MealTypeSchema } from '@/lib/nutrition/schema';
import { parseDescriptionWithGemini, estimateItemWithGemini } from '@/lib/nutrition/gemini-client';
import { lookupFood } from '@/lib/nutrition/usda-client';
import { aggregate, type AggregatedItem } from '@/lib/nutrition/aggregate';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { recordAudit, newRequestId } from '@/lib/observability/audit-recorder';
import { GEMINI_MODEL } from '@/lib/nutrition/gemini-prompts';
import { estimateCostUsd } from '@/lib/observability/ai-pricing';

const ROUTE = '/api/nutrition/analyze-text';
const MIN_LEN = 5;
const MAX_LEN = 2000;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = newRequestId();
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AIRouteError('UNAUTHENTICATED', 'no session', 401, 'Please sign in to log meals.');
    userId = user.id;

    const body = await req.json().catch(() => null);
    if (!body || typeof body.description !== 'string') {
      throw new AIRouteError('INVALID_INPUT', 'invalid body', 400, 'Please describe what you ate.');
    }
    const description: string = body.description.trim();
    if (description.length < MIN_LEN || description.length > MAX_LEN) {
      throw new AIRouteError('INVALID_INPUT', 'len out of range', 400, `Description must be ${MIN_LEN}-${MAX_LEN} characters.`);
    }
    const mealTypeP = MealTypeSchema.safeParse(body.mealType);
    if (!mealTypeP.success) throw new AIRouteError('INVALID_INPUT', 'mealType', 400, 'Pick a meal type.');
    const mealType = mealTypeP.data;
    const loggedAt = typeof body.loggedAt === 'string' && !Number.isNaN(Date.parse(body.loggedAt))
      ? body.loggedAt : new Date().toISOString();

    const { parsed, usage } = await parseDescriptionWithGemini(description);
    if (parsed.items.length === 0) {
      throw new AIRouteError('MALFORMED_RESPONSE', 'no items parsed', 502, 'We could not identify foods. Try being more specific or enter manually.');
    }

    const items: AggregatedItem[] = [];
    for (const item of parsed.items) {
      const usda = await lookupFood(item.name, item.quantity, item.unit).catch((e) => {
        safeLog.warn('api.nutrition.analyze-text', 'usda lookup failed', { error: e, name: item.name });
        return null;
      });
      if (usda) {
        items.push({ parsed: item, nutrients: usda });
      } else {
        const est = await estimateItemWithGemini(item.name, item.quantity, item.unit);
        items.push({
          parsed: item,
          nutrients: {
            calories: est.nutrients.calories, protein_g: est.nutrients.protein_g,
            carbs_g: est.nutrients.carbs_g, total_fat_g: est.nutrients.total_fat_g,
            saturated_fat_g: est.nutrients.saturated_fat_g, trans_fat_g: est.nutrients.trans_fat_g,
            omega3_g: est.nutrients.omega3_g, sugar_g: est.nutrients.sugar_g,
            fiber_g: est.nutrients.fiber_g, source: 'gemini_fallback',
          },
        });
      }
    }

    const analysis = aggregate(items);
    const latencyMs = Date.now() - startedAt;

    const { data: inserted, error: insErr } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id, logged_at: loggedAt, meal_type: mealType,
        source: 'manual_text', raw_input: description,
        serving_description: analysis.serving_description,
        calories: analysis.calories, protein_g: analysis.protein_g, carbs_g: analysis.carbs_g,
        total_fat_g: analysis.total_fat_g, good_fat_g: analysis.good_fat_g,
        healthy_fat_g: analysis.healthy_fat_g, saturated_fat_g: analysis.saturated_fat_g,
        sugar_g: analysis.sugar_g, fiber_g: analysis.fiber_g,
        confidence: analysis.confidence, ai_notes: analysis.ai_notes,
        ai_model: GEMINI_MODEL, ai_latency_ms: latencyMs,
        data_source: analysis.data_source, status: 'pending_review',
      })
      .select('id')
      .single();

    if (insErr || !inserted) throw new AIRouteError('UNKNOWN', `insert failed: ${insErr?.message}`, 500, 'Could not save draft. Try again.');

    await recordAudit({
      requestId, userId: user.id, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'success', httpStatus: 200,
      inputChars: description.length, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      latencyMs, costUsd: estimateCostUsd(GEMINI_MODEL, usage.inputTokens, usage.outputTokens),
    });

    return NextResponse.json({ logId: inserted.id, analysis, requestId });
  } catch (err) {
    const ai = err instanceof AIRouteError ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again or enter manually.', err);
    safeLog.warn('api.nutrition.analyze-text', 'failure', { code: ai.code, userId, message: ai.message });
    await recordAudit({
      requestId, userId, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'failure', errorCode: ai.code, httpStatus: ai.httpStatus,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: { code: ai.code, message: ai.userMessage, requestId } }, { status: ai.httpStatus });
  }
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (5 specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/nutrition/analyze-text/route.ts src/app/api/nutrition/analyze-text/__tests__/route.test.ts
git commit -m "feat(nutrition): rewrite analyze-text to Gemini+USDA pipeline (#164 phase 5)"
```

### Task 5.2: Rewrite `analyze-photo/route.ts`

**Files:**
- Modify: `src/app/api/nutrition/analyze-photo/route.ts`
- Test: `src/app/api/nutrition/analyze-photo/__tests__/route.test.ts` (NEW)

- [ ] **Step 1: Write integration test (mirrors 5.1 with multipart input + photo mock)**

```ts
// src/app/api/nutrition/analyze-photo/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const supabaseAuth = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } });
const upload = vi.fn().mockResolvedValue({ error: null });
const insertSelect = vi.fn().mockResolvedValue({ data: { id: 'log-1' }, error: null });
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: supabaseAuth },
    storage: { from: () => ({ upload }) },
    from: () => ({ insert: () => ({ select: () => ({ single: insertSelect }) }) }),
  }),
}));

const parseImage = vi.fn();
vi.mock('@/lib/nutrition/gemini-client', () => ({
  parseImageWithGemini: parseImage,
  estimateItemWithGemini: vi.fn().mockResolvedValue({
    nutrients: { calories: 100, protein_g: 5, carbs_g: 10, total_fat_g: 3, saturated_fat_g: 1, trans_fat_g: 0, omega3_g: 0, sugar_g: 2, fiber_g: 1 },
    confidence: 0.5, usage: { inputTokens: 30, outputTokens: 20 },
  }),
}));

const lookupFood = vi.fn();
vi.mock('@/lib/nutrition/usda-client', () => ({ lookupFood }));
vi.mock('@/lib/observability/audit-recorder', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  newRequestId: () => 'req-test',
}));

import { POST } from '../route';

function makePhotoReq(): NextRequest {
  const fd = new FormData();
  fd.append('image', new File([new Uint8Array([0xff, 0xd8, 0xff])], 'meal.jpg', { type: 'image/jpeg' }));
  fd.append('mealType', 'lunch');
  fd.append('note', 'lunch on the patio');
  return new Request('http://localhost/api/nutrition/analyze-photo', {
    method: 'POST', body: fd,
  }) as unknown as NextRequest;
}

beforeEach(() => { parseImage.mockReset(); lookupFood.mockReset(); upload.mockClear(); insertSelect.mockClear(); });

describe('POST /api/nutrition/analyze-photo', () => {
  it('happy path returns 200 + logId', async () => {
    parseImage.mockResolvedValueOnce({
      parsed: { items: [{ name: 'salad', quantity: 1, unit: 'serving' }], confidence: 0.7, notes: '' },
      usage: { inputTokens: 100, outputTokens: 40 },
    });
    lookupFood.mockResolvedValueOnce({
      calories: 80, protein_g: 3, carbs_g: 14, total_fat_g: 2, saturated_fat_g: 0.3, trans_fat_g: 0, omega3_g: 0.05, sugar_g: 5, fiber_g: 4, source: 'usda',
    });
    const res = await POST(makePhotoReq());
    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(insertSelect).toHaveBeenCalledTimes(1);
  });

  it('returns 400 on missing image', async () => {
    const fd = new FormData(); fd.append('mealType', 'lunch');
    const res = await POST(new Request('http://x/p', { method: 'POST', body: fd }) as unknown as NextRequest);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL.

- [ ] **Step 3: Rewrite the route**

```ts
// src/app/api/nutrition/analyze-photo/route.ts
// Prompt #164: photo meal analysis using Gemini 2.5 Flash Vision + USDA.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { MealTypeSchema } from '@/lib/nutrition/schema';
import { parseImageWithGemini, estimateItemWithGemini } from '@/lib/nutrition/gemini-client';
import { lookupFood } from '@/lib/nutrition/usda-client';
import { aggregate, type AggregatedItem } from '@/lib/nutrition/aggregate';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { recordAudit, newRequestId } from '@/lib/observability/audit-recorder';
import { GEMINI_MODEL } from '@/lib/nutrition/gemini-prompts';
import { estimateCostUsd } from '@/lib/observability/ai-pricing';

const ROUTE = '/api/nutrition/analyze-photo';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = newRequestId();
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AIRouteError('UNAUTHENTICATED', 'no session', 401, 'Please sign in to log meals.');
    userId = user.id;

    const form = await req.formData().catch(() => null);
    if (!form) throw new AIRouteError('INVALID_INPUT', 'no form', 400, 'Please upload a photo.');
    const image = form.get('image');
    if (!(image instanceof File)) throw new AIRouteError('INVALID_INPUT', 'no image', 400, 'Please upload a photo.');
    if (image.size > MAX_FILE_BYTES) throw new AIRouteError('INVALID_INPUT', 'too large', 400, 'Image too large (max 10 MB).');
    const mime = image.type.toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      if (mime === 'image/heic' || mime === 'image/heif') {
        throw new AIRouteError('INVALID_INPUT', 'heic', 400, 'HEIC not supported yet. Please use JPG or PNG.');
      }
      throw new AIRouteError('INVALID_INPUT', 'mime', 400, 'Unsupported image type.');
    }
    const mealTypeP = MealTypeSchema.safeParse(form.get('mealType'));
    if (!mealTypeP.success) throw new AIRouteError('INVALID_INPUT', 'mealType', 400, 'Pick a meal type.');
    const mealType = mealTypeP.data;
    const loggedAtRaw = form.get('loggedAt');
    const loggedAt = typeof loggedAtRaw === 'string' && !Number.isNaN(Date.parse(loggedAtRaw))
      ? loggedAtRaw : new Date().toISOString();
    const noteRaw = form.get('note');
    const note = typeof noteRaw === 'string' ? noteRaw.slice(0, 500).trim() : '';

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const ym = new Date().toISOString().slice(0, 7);
    const fileId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${user.id}/${ym}/${fileId}.${ext}`;
    const buf = Buffer.from(await image.arrayBuffer());
    const uploadResult = await supabase.storage.from('nutrition-photos').upload(storagePath, buf, { contentType: mime, upsert: false });
    if (uploadResult.error) throw new AIRouteError('API_DOWN', `upload: ${uploadResult.error.message}`, 503, 'Could not upload photo. Check your connection.');

    const { parsed, usage } = await parseImageWithGemini(buf, mime, note);
    if (parsed.items.length === 0) {
      throw new AIRouteError('MALFORMED_RESPONSE', 'no items', 502, 'We could not identify foods in this photo. Try a clearer shot or enter manually.');
    }

    const items: AggregatedItem[] = [];
    for (const item of parsed.items) {
      const usda = await lookupFood(item.name, item.quantity, item.unit).catch(() => null);
      if (usda) items.push({ parsed: item, nutrients: usda });
      else {
        const est = await estimateItemWithGemini(item.name, item.quantity, item.unit);
        items.push({
          parsed: item,
          nutrients: { ...est.nutrients, source: 'gemini_fallback' },
        });
      }
    }

    const analysis = aggregate(items);
    const latencyMs = Date.now() - startedAt;

    const { data: inserted, error: insErr } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id, logged_at: loggedAt, meal_type: mealType,
        source: 'photo_ai', photo_url: storagePath, context_note: note || null,
        serving_description: analysis.serving_description,
        calories: analysis.calories, protein_g: analysis.protein_g, carbs_g: analysis.carbs_g,
        total_fat_g: analysis.total_fat_g, good_fat_g: analysis.good_fat_g,
        healthy_fat_g: analysis.healthy_fat_g, saturated_fat_g: analysis.saturated_fat_g,
        sugar_g: analysis.sugar_g, fiber_g: analysis.fiber_g,
        confidence: analysis.confidence, ai_notes: analysis.ai_notes,
        ai_model: GEMINI_MODEL, ai_latency_ms: latencyMs,
        data_source: analysis.data_source, status: 'pending_review',
      })
      .select('id').single();
    if (insErr || !inserted) throw new AIRouteError('UNKNOWN', `insert: ${insErr?.message}`, 500, 'Could not save draft. Try again.');

    await recordAudit({
      requestId, userId: user.id, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'success', httpStatus: 200,
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      latencyMs, costUsd: estimateCostUsd(GEMINI_MODEL, usage.inputTokens, usage.outputTokens),
    });

    return NextResponse.json({ logId: inserted.id, analysis, requestId });
  } catch (err) {
    const ai = err instanceof AIRouteError ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again or enter manually.', err);
    safeLog.warn('api.nutrition.analyze-photo', 'failure', { code: ai.code, userId, message: ai.message });
    await recordAudit({
      requestId, userId, route: ROUTE, provider: 'google', model: GEMINI_MODEL,
      outcome: 'failure', errorCode: ai.code, httpStatus: ai.httpStatus,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: { code: ai.code, message: ai.userMessage, requestId } }, { status: ai.httpStatus });
  }
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (2 specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/nutrition/analyze-photo/route.ts src/app/api/nutrition/analyze-photo/__tests__/route.test.ts
git commit -m "feat(nutrition): rewrite analyze-photo to Gemini Vision + USDA (#164 phase 5)"
```

### Task 5.3: Pass-through `data_source` in confirm route

**Files:**
- Modify: `src/app/api/nutrition/confirm/route.ts`

- [ ] **Step 1: Edit `confirm/route.ts`**

Locate the `if (userEdited)` block (~line 71–74) and replace with:

```ts
    if (userEdited) {
      update.user_edited = true;
      update.confidence = 1.0;
      update.data_source = 'manual';
    }
```

That single-key addition is the entire change.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/nutrition/confirm/route.ts
git commit -m "feat(nutrition): flag confirmed-with-edits rows as data_source=manual (#164 phase 5)"
```

**Phase 5 checkpoint:** Jeffery confirms both rewrites produce the same response shape `{ logId, analysis, requestId }`. Existing client code (`MealResultCard` flow) stays compatible because `analysis` now has an OPTIONAL extra field. Hand to Phase 6.

---

## Phase 6: Admin Health Route

**Owner:** Michelangelo. **Coordination:** security-advisor confirms admin gate.

### Task 6.1: `/api/admin/health/ai-stack/route.ts`

**Files:**
- Create: `src/app/api/admin/health/ai-stack/route.ts`
- Test: `src/app/api/admin/health/ai-stack/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/app/api/admin/health/ai-stack/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

const insert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ insert }) }),
}));

beforeEach(() => {
  fetchMock.mockReset(); insert.mockClear();
  process.env.GEMINI_API_KEY = 'TK';
  process.env.USDA_FDC_API_KEY = 'TK';
  process.env.ADMIN_HEALTH_TOKEN = 'secret';
});

import { GET } from '../route';

function req(token?: string): NextRequest {
  const url = new URL('http://localhost/api/admin/health/ai-stack');
  if (token) url.searchParams.set('token', token);
  return new Request(url) as unknown as NextRequest;
}

describe('GET /api/admin/health/ai-stack', () => {
  it('rejects missing token', async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns healthy/healthy and writes 2 rows when both providers OK', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ foods: [{ fdcId: 1, description: 'Apple' }] }), { status: 200 }));
    const res = await GET(req('secret'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.gemini.status).toBe('healthy');
    expect(json.usda.status).toBe('healthy');
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('marks gemini down when Gemini returns 500', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('boom', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
    const res = await GET(req('secret'));
    const json = await res.json();
    expect(json.gemini.status).toBe('down');
  });
});
```

- [ ] **Step 2: Run to verify failing** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/app/api/admin/health/ai-stack/route.ts
// Prompt #164 (#163 fold-in): ping Gemini + USDA and persist results to
// system_health_checks. Token-gated. Cron can hit this with a fixed query token.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { GEMINI_MODEL } from '@/lib/nutrition/gemini-prompts';

const TIMEOUT = 5000;

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  const expected = process.env.ADMIN_HEALTH_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [gemini, usda] = await Promise.all([pingGemini(), pingUSDA()]);
  const admin = createAdminClient();
  await admin.from('system_health_checks').insert({
    check_name: 'gemini_api',
    status: gemini.status,
    latency_ms: gemini.latencyMs,
    error_code: gemini.errorCode,
    error_message: gemini.errorMessage,
    metadata: { model: GEMINI_MODEL },
  });
  await admin.from('system_health_checks').insert({
    check_name: 'usda_api',
    status: usda.status,
    latency_ms: usda.latencyMs,
    error_code: usda.errorCode,
    error_message: usda.errorMessage,
    metadata: null,
  });
  return NextResponse.json({ gemini, usda });
}

interface PingResult {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  errorCode: string | null;
  errorMessage: string | null;
}

async function pingGemini(): Promise<PingResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { status: 'down', latencyMs: 0, errorCode: 'AUTH_MISSING', errorMessage: 'GEMINI_API_KEY unset' };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const t0 = Date.now();
  try {
    const res = await withAbortTimeout((s) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 16 } }),
      signal: s,
    }), TIMEOUT, 'health.gemini');
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      return { status: res.status >= 500 ? 'down' : 'degraded', latencyMs, errorCode: `HTTP_${res.status}`, errorMessage: await res.text().then((t) => t.slice(0, 200)).catch(() => null) };
    }
    return { status: 'healthy', latencyMs, errorCode: null, errorMessage: null };
  } catch (err) {
    return { status: 'down', latencyMs: Date.now() - t0, errorCode: 'EXCEPTION', errorMessage: String(err).slice(0, 200) };
  }
}

async function pingUSDA(): Promise<PingResult> {
  const key = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=apple&pageSize=1&api_key=${key}`;
  const t0 = Date.now();
  try {
    const res = await withAbortTimeout((s) => fetch(url, { signal: s }), TIMEOUT, 'health.usda');
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      return { status: res.status >= 500 ? 'down' : 'degraded', latencyMs, errorCode: `HTTP_${res.status}`, errorMessage: null };
    }
    return { status: 'healthy', latencyMs, errorCode: null, errorMessage: null };
  } catch (err) {
    return { status: 'down', latencyMs: Date.now() - t0, errorCode: 'EXCEPTION', errorMessage: String(err).slice(0, 200) };
  }
}
```

- [ ] **Step 4: Run tests to verify passing** → PASS (3 specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/health/ai-stack src/app/api/admin/health/ai-stack/__tests__
git commit -m "feat(admin): add ai-stack health check route (#164 phase 6 / #163 fold-in)"
```

**Phase 6 checkpoint:** Security-advisor confirms `ADMIN_HEALTH_TOKEN` gating is sufficient (no auth user required because cron may need to hit it). Confirm token added to Vercel env in deploy step.

---

## Phase 7: UI Attribution

**Owner:** Hannah (copy review), Michelangelo (UI patch).

### Task 7.1: Attribution line in `MealResultCard.tsx`

**Files:**
- Modify: `src/components/nutrition/MealResultCard.tsx`

- [ ] **Step 1: Edit the component**

Locate the existing `analysis.ai_notes` block (~line 149–154) and immediately AFTER it (still inside the outer motion.div), insert:

```tsx
      {analysis.data_source && (
        <p className="mt-2 text-[11px] text-white/40">
          {dataSourceAttribution(analysis.data_source)}
        </p>
      )}
```

Then add this helper near the top of the file (after the imports, before `function ConfidenceChip`):

```tsx
function dataSourceAttribution(ds: NonNullable<NutritionAnalysis['data_source']>): string {
  if (ds === 'usda') return 'Nutrition data from USDA FoodData Central.';
  if (ds === 'mixed') return 'Nutrition data from USDA FoodData Central and AI estimation.';
  if (ds === 'gemini_fallback') return 'Nutrition values estimated. No USDA match for these foods.';
  return 'Nutrition values entered manually.';
}
```

- [ ] **Step 2: Marshall dictionary scan on the four strings**

Run the Marshall scanner script (per `feedback_marshall_dictionary_predelivery_scan` memory):

```bash
node scripts/marshall/scan-text.mjs --text "Nutrition data from USDA FoodData Central." --text "Nutrition data from USDA FoodData Central and AI estimation." --text "Nutrition values estimated. No USDA match for these foods." --text "Nutrition values entered manually."
```

Expected: zero hits. No em-dashes, no en-dashes, no banned compounds.

(If `scripts/marshall/scan-text.mjs` does not exist or is named differently, inspect `scripts/marshall/` and run the equivalent. If no Marshall scanner is present in the repo, Hannah eyeballs the four strings.)

- [ ] **Step 3: Type-check**

`npx tsc --noEmit -p tsconfig.json` → no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/nutrition/MealResultCard.tsx
git commit -m "feat(nutrition): add data_source attribution line to MealResultCard (#164 phase 7)"
```

**Phase 7 checkpoint:** Hannah signs off on the four attribution strings. No copy contains dashes.

---

## Phase 8: Cleanup

**Owner:** Michelangelo.

### Task 8.1: Delete `src/lib/nutrition/prompts.ts`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -r "from '@/lib/nutrition/prompts'" src/
```

Expected after Phase 5 rewrite: only the old route imports remain, which we already replaced. Should be zero matches.

- [ ] **Step 2: Delete the file**

```bash
git rm src/lib/nutrition/prompts.ts
```

- [ ] **Step 3: Type-check**

`npx tsc --noEmit -p tsconfig.json` → no errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(nutrition): remove Anthropic prompts module (replaced by gemini-prompts) (#164 phase 8)"
```

### Task 8.2: Delete `src/lib/nutrition/parse.ts`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -r "from '@/lib/nutrition/parse'" src/
```

Expected: zero matches.

- [ ] **Step 2: Delete + type-check + commit**

```bash
git rm src/lib/nutrition/parse.ts
npx tsc --noEmit -p tsconfig.json
git commit -m "chore(nutrition): remove Anthropic JSON-fence stripper (replaced by parsed-meal-schema) (#164 phase 8)"
```

### Task 8.3: Update `.env.local.example` + create `.env.example`

**Files:**
- Modify: `.env.local.example`
- Create: `.env.example`

- [ ] **Step 1: Edit `.env.local.example`**

Replace the existing `# AI Providers` block with:

```
# AI Providers (server-side only — never expose in NEXT_PUBLIC_*)
ANTHROPIC_API_KEY=
XAI_API_KEY=
OPENAI_API_KEY=
# Prompt #164: nutrition analysis pipeline
GEMINI_API_KEY=
USDA_FDC_API_KEY=

# Prompt #164 (#163 fold-in): admin health-check route gate
ADMIN_HEALTH_TOKEN=
```

- [ ] **Step 2: Create `.env.example`**

Copy the contents of `.env.local.example` to `.env.example`. Convention is identical.

- [ ] **Step 3: Commit**

```bash
git add .env.local.example .env.example
git commit -m "docs(env): add GEMINI_API_KEY, USDA_FDC_API_KEY, ADMIN_HEALTH_TOKEN (#164 phase 8)"
```

**Phase 8 checkpoint:** Repo has no Anthropic-specific nutrition code left. `.env.local.example` + `.env.example` document the two new keys + the health-check token.

---

## Phase 9: Quality Gates

**Owner:** Michelangelo. **Coordination:** Jeffery final review.

### Task 9.1: Full test suite

- [ ] Run all Vitest tests:

```bash
npx vitest run
```

Expected: all green. Specifically the new specs from Tasks 2.1, 2.2, 3.1, 3.2, 3.3, 4.1–4.7, 5.1, 5.2, 6.1.

- [ ] If any pre-existing tests break (e.g. tests that imported `@/lib/nutrition/prompts` directly), fix them or replace them. Do NOT rationalize away red.

### Task 9.2: Type-check

- [ ] Run:

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: clean. **Do NOT run `npm run build`** (Gary's poisons-`.next` rule).

### Task 9.3: ESLint

- [ ] Run:

```bash
npx next lint --dir src --max-warnings 0
```

Expected: clean on new/changed files. If lint flags existing unrelated warnings, leave them — do not fix unrelated code.

### Task 9.4: Marshall pre-delivery audit

Per `feedback_predelivery_locked_rules_audit` memory, run Michelangelo's 12-rule audit against:
- `gemini-prompts.ts` (no banned compounds; allowed because internal)
- `MealResultCard.tsx` attribution strings (public-facing — MUST pass Marshall)
- `aggregate.ts` `ai_notes` template strings (public-facing — MUST pass)
- Error `userMessage` strings in `classify-ai.ts` (public-facing — MUST pass)

- [ ] **Marshall pass:** confirm zero hits across all public-facing copy.

### Task 9.5: Apply migrations on Supabase preview branch (optional safety)

Per `project_local_vs_live_migrations_drift` memory, **list_migrations against the live project before applying** to confirm we know what is there. If a Supabase branch is feasible:

```bash
# Via MCP
mcp__plugin_supabase_supabase__list_migrations    # confirm 4 new migrations applied
```

Expected: the four `20260512200*` migrations show as applied.

**Phase 9 checkpoint:** Green tests + green type-check + green lint + Marshall pass. Jeffery signs off.

---

## Phase 10: Localhost Deploy + Manual QA

**Owner:** Gary F. **Per `feedback_launch_localhost` standing rule: deploy to localhost:3000 for Gary's review BEFORE live push.**

### Task 10.1: Start dev server

- [ ] Gary runs:

```bash
cd C:/Users/garyf/ViaConnect2026/viaconnect-web
npm run dev
```

(Per `feedback_never_npm_build_locally` we never run `npm run build` here — `npm run dev` only.)

### Task 10.2: Set env in `.env.local`

- [ ] Gary edits `.env.local`:
  - Add real `GEMINI_API_KEY` (https://aistudio.google.com/apikey)
  - Add real `USDA_FDC_API_KEY` (https://fdc.nal.usda.gov/api-key-signup.html)
  - Add `ADMIN_HEALTH_TOKEN` (any opaque string)
- [ ] Restart dev server.

### Task 10.3: Manual QA checklist

- [ ] Visit `http://localhost:3000/nutrition`, sign in.
- [ ] Tap "Log Full Meal" → type "two eggs with avocado on toast" → expect analyze in <5s, result card renders, attribution line says "Nutrition data from USDA FoodData Central." (or "...and AI estimation" if any item missed USDA).
- [ ] Tap "Show full breakdown" → secondary metrics appear.
- [ ] Confirm → row saves; check Supabase `nutrition_logs` directly for `data_source` value.
- [ ] Photo route: upload a meal photo, confirm flow works, `data_source` populated.
- [ ] Quick Log (Prompt #161 surface): unaffected, still saves with `data_source IS NULL`.
- [ ] Daily Totals (Prompt #162): unaffected, totals identical to before swap.
- [ ] Repeat the same text query 3 times → `usda_food_cache` shows rows for each food queried; the 2nd and 3rd calls hit cache (verify by checking latency in audit table — should drop from ~2-4s to ~1s).
- [ ] Admin health check: `curl 'http://localhost:3000/api/admin/health/ai-stack?token=<your-token>'` → returns `gemini.status: healthy, usda.status: healthy`.
- [ ] `ai_route_audit` table has rows with `provider='google'`, `model='gemini-2.5-flash'`, `outcome='success'`, `cost_usd=0`.
- [ ] No emojis, em-dashes, or en-dashes visible anywhere.

### Task 10.4: Gary reviews + green-lights

- [ ] Gary either signs off (proceed to Phase 11) or files issues (fix and re-QA).

---

## Phase 11: Jeffery Audit Chain

**Per `feedback_jeffery_pre_launch_review` standing rule. Sequential.**

### Task 11.1: Michelangelo full-diff review

- [ ] Michelangelo runs the 12-rule pre-delivery audit on the full PR diff:
  - No package.json changes ✓
  - No em/en-dashes ✓
  - No emojis ✓
  - Append-only migrations ✓
  - Public copy passed Marshall ✓
  - All Phase 9 gates green ✓
  - No scope creep (only what §16 of #164 required) ✓
  - Type-safe (Zod at boundaries, never `as any`) ✓
  - Audit + error taxonomy infallible ✓
  - Localhost QA evidence attached ✓
  - Cost-per-meal table in PR description ✓
  - Marshall pre-delivery dictionary scan clean ✓

### Task 11.2: Gordon (Nutrition) sign-off

- [ ] Gordon confirms the analysis output schema is unchanged from #160 (only `data_source` added), confirms aggregation math, confirms USDA dataset choice (`Foundation,SR Legacy`) is the right call vs. `Branded`/`Survey`.

### Task 11.3: Hannah (UX + copy) sign-off

- [ ] Hannah confirms attribution strings, confirms confidence chip behavior unchanged, confirms low-confidence amber banner still triggers on the new pipeline (since `confidence` is now deterministic, threshold may need a future tune).

### Task 11.4: Kelsey (Regulatory) sign-off on attribution copy

- [ ] Kelsey confirms "Nutrition data from USDA FoodData Central" is the right attribution (USDA is the canonical source — strongest possible attribution for nutrition).
- [ ] Confirms "AI estimation" disclosure is honest and adequate.
- [ ] No FDA / HIPAA implications from the swap (no medical claims; same product surface).

### Task 11.5: Jeffery final orchestrator sign-off

- [ ] Jeffery aggregates all four sign-offs + Gary's localhost QA + Phase 9 evidence into a single verdict and authorizes Phase 12.

**Phase 11 checkpoint:** All sign-offs recorded. Jeffery posts the audit summary.

---

## Phase 12: Live Launch

**Only after Gary's explicit go (per `feedback_launch_localhost`).**

### Task 12.1: Vercel env vars

- [ ] In Vercel UI for `viaconnect2026`, add:
  - `GEMINI_API_KEY` (Production + Preview + Development)
  - `USDA_FDC_API_KEY` (Production + Preview + Development)
  - `ADMIN_HEALTH_TOKEN` (Production + Preview)
- [ ] Leave `ANTHROPIC_API_KEY` set — still used by Hannah, Sherlock, peptide explanations.

### Task 12.2: Apply migrations to live Supabase

- [ ] Run `mcp__plugin_supabase_supabase__apply_migration` against `nnhkcufyqjojdbvdrpky` for all four #164 migrations IF not already applied via Phase 1. (Phase 1 may have applied them to a dev branch; reconcile per `project_local_vs_live_migrations_drift`.)
- [ ] `mcp__plugin_supabase_supabase__list_migrations` confirms the four new entries.
- [ ] Security advisor + performance advisor: no new high-severity findings.

### Task 12.3: Push to origin/main

- [ ] After Gary's explicit "go live":

```bash
git push origin main
```

- [ ] Vercel auto-deploys. Watch the build complete via `mcp__claude_ai_Vercel__list_deployments`.

### Task 12.4: Smoke test on production

- [ ] Repeat Task 10.3 QA checklist against `https://viaconnectapp.com/nutrition`.

### Task 12.5: Post-launch memory writes

- [ ] Update `MEMORY.md` with a one-line entry pointing to a new `project_prompt_164_*.md` file capturing the cost-comparison decision + the Gemini 2.0→2.5 swap.

---

## Anti-Pattern Reminder (paste from §17 of #164)

Do **not**:
- Add `@google/generative-ai` to `package.json` — direct `fetch` only.
- Run `npm run build` locally.
- Call Anthropic from nutrition routes.
- Use em-dashes, en-dashes, or emojis anywhere.
- Cache USDA by un-normalized food name.
- Skip the audit recorder on a route that succeeded.
- Use DEMO_KEY for USDA in production.
- Use `Branded` USDA dataType as primary.
- Delete `ANTHROPIC_API_KEY` from Vercel.
- Show "Vitality Score" or any text other than "Bio Optimization Score" / "10x to 28x".

---

## Self-Review Pass (against the writing-plans checklist)

**1. Spec coverage check** — every §16 file in #164 has a task that creates or modifies it:
- ✓ `app/api/nutrition/analyze-text/route.ts` (Task 5.1)
- ✓ `app/api/nutrition/analyze-photo/route.ts` (Task 5.2)
- ✓ `app/api/nutrition/confirm/route.ts` (Task 5.3)
- ✓ `app/api/admin/health/...` (Task 6.1)
- ✓ `lib/nutrition/gemini-client.ts` (4.6)
- ✓ `lib/nutrition/gemini-prompts.ts` (4.5)
- ✓ `lib/nutrition/usda-client.ts` (4.4)
- ✓ `lib/nutrition/usda-nutrient-ids.ts` (4.3)
- ✓ `lib/nutrition/typical-weights.ts` (4.2)
- ✓ `lib/nutrition/normalize-query.ts` (4.1)
- ✓ `lib/nutrition/aggregate.ts` (4.7)
- ✓ `lib/nutrition/parsed-meal-schema.ts` (2.2)
- ✓ `lib/errors/classify-ai.ts` (3.1)
- ✓ `lib/observability/ai-pricing.ts` (3.2)
- ✓ Audit recorder, an addition beyond §16, justified by #163 fold-in (3.3)
- ✓ `components/nutrition/MealResultCard.tsx` (7.1)
- ✓ Two migrations from #164 + two from #163 fold-in (Phase 1)
- ✓ `.env.example` + `.env.local.example` (8.3)
- ✓ Deletion of `prompts.ts` + `parse.ts` (8.1, 8.2)

**2. Placeholder scan** — no TODO/TBD/"appropriate error handling" anywhere. All test specs include real assertions. All implementations include full code.

**3. Type consistency** — `AggregatedItem.nutrients.source` is `'usda' | 'gemini_fallback'` in both `aggregate.ts` (Task 4.7) and the route handlers (Tasks 5.1, 5.2). `data_source` is `DataSource` (`'usda' | 'gemini_fallback' | 'mixed' | 'manual'`) in `schema.ts` (Task 2.1) and used consistently in aggregate, routes, confirm, and the UI component. `NutrientsPer100g` from `usda-nutrient-ids.ts` (Task 4.3) is consumed by `usda-client.ts` (Task 4.4) via `ItemNutrients` which extends it with `source: 'usda'`.

---

## Plan Status

Plan complete. Saved to `docs/superpowers/plans/2026-05-12-prompt-164-free-nutrition-analysis.md`.
