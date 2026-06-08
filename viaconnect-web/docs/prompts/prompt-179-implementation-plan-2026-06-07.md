# Body Tracker Goals Tab (#179) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Body Tracker "Goals" tab where a member sets a weight trajectory; Gordon computes an initial and weekly-recalibrated daily calorie and macro target that drives the daily scores when a goal is active.

**Architecture:** A pure Gordon energy engine (Katch-McArdle or Mifflin BMR, activity TDEE, EWMA-reconciled adaptive TDEE, safety-clamped calorie solver) feeds the existing `generateMacroTargets` macro split, extracted into a shared `deriveMacroSplit` so there is one macro source of truth. Computed targets persist to `body_goal_targets` (append-only, versioned). A precedence resolver (manual override, then goal target, then `nutrition_targets` static) overlays the goal target onto the existing client hook and server meal-scoring read so the daily scores consume it unchanged in shape. Six resilient API routes plus a weekly Vercel cron drive create, edit, recalibrate, override, revert, and read. The Goals tab renders six responsive sections. Goal saves project goal weight back into `user_weight_goals` (Prompt 179a write-through, save path only).

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + RLS), Recharts, Vitest, Tailwind. Reused utils: `withTimeout` / `safeLog` (resilience), `resolveLeanBodyMass` (LBM), `personalizeHydrationTarget` (hydration), `writeWeightGoal` (write-through), `generateMacroTargets` / `MACRO_CONFIG` (macros).

---

## File Structure

**New (pure logic, fully unit-tested):**
- `src/lib/body-goals/types.ts` - shared types: `GoalDriver`, `GoalActivityLevel`, `BodyGoalRow`, `BodyGoalTargetRow`, `BuildGoalTargetInput`, `BuiltGoalTarget`.
- `src/lib/body-goals/activity.ts` - activity enum maps: goal level -> TDEE multiplier, goal level -> hydration activity level.
- `src/lib/body-goals/ewma.ts` - time-aware EWMA smoother over a weight series.
- `src/lib/body-goals/energy.ts` - `computeBmr`, `computeInitialTdee`, `estimateAdaptiveTdee`, `solveCalorieTarget`.
- `src/lib/gordon/macroSplit.ts` - `deriveMacroSplit` extracted from `generateMacroTargets` (behavior-preserving).
- `src/lib/body-goals/buildGoalTarget.ts` - orchestrates engine + macro split + sugar + hydration into one target object.
- `src/lib/gordon/resolveDailyTarget.ts` - `pickResolvedTarget` (pure), mappers, `fetchResolvedDailyTarget` (IO, fail-open).

**New (IO modules):**
- `src/lib/body-goals/goalsData.ts` - Supabase access: active goal, weight series, logged-kcal window, target insert, latest/prior target, same-day override.
- `src/lib/body-goals/projectWeightGoal.ts` - write-through projection into `user_weight_goals` (resilient).
- `src/lib/body-goals/recalibrate.ts` - `recalibrateGoal(goalId, supabase)`: window stats -> adaptive TDEE -> new target + audit row.

**New (API routes, all resilient):**
- `src/app/api/body/goals/route.ts` (POST create/replace)
- `src/app/api/body/goals/[id]/route.ts` (PATCH)
- `src/app/api/body/goals/[id]/recalibrate/route.ts` (POST)
- `src/app/api/body/goals/[id]/override/route.ts` (POST)
- `src/app/api/body/goals/[id]/revert/route.ts` (POST)
- `src/app/api/body/goals/active/route.ts` (GET)
- `src/app/api/body/goals/recalibrate-cron/route.ts` (GET, cron, service role)

**New (UI):**
- `src/app/(app)/(consumer)/body-tracker/goals/page.tsx`
- `src/components/body-tracker/goals/useActiveGoal.ts`
- `src/components/body-tracker/goals/TrajectoryPlanner.tsx`
- `src/components/body-tracker/goals/TrajectoryChart.tsx`
- `src/components/body-tracker/goals/DailyTargetsPanel.tsx`
- `src/components/body-tracker/goals/AdaptiveRecalibrationPanel.tsx`
- `src/components/body-tracker/goals/AdherenceProgress.tsx`
- `src/components/body-tracker/goals/SafetyDisclaimer.tsx`

**New (migration):**
- `supabase/migrations/20260607HHMMSS_prompt_179_body_goals.sql`

**Modified:**
- `src/lib/gordon/generateMacroTargets.ts` - delegate split step to `deriveMacroSplit`.
- `src/lib/gordon/types.ts` - add optional `targetSource` to `NutritionTargets`.
- `src/hooks/useNutritionTargets.ts` - overlay goal target (DD-1 client).
- `src/lib/gordon/scoreMealForServerInsert.ts` - overlay goal target (DD-1 server).
- `src/lib/body-tracker/constants.ts` - add Goals tab.
- `src/components/body-tracker/BodyTrackerTabs.tsx` - add Target icon.
- `vercel.json` - add weekly recalibration cron.

**Units:** `body_tracker_weight` and `body_goals` are in pounds; `user_weight_goals` and the energy formulas are in kilograms. Convert at boundaries with `LBS_PER_KG = 2.20462` (`src/lib/weight-goals/guardrails.ts`); height inches to cm via `* 2.54`.

---

## Phase 0: Migration (data foundation)

### Task 0.1: Append-only migration for the three tables

**Files:**
- Create: `supabase/migrations/20260607HHMMSS_prompt_179_body_goals.sql` (use a real 14-digit timestamp after the latest existing migration `20260607010000`)

- [ ] **Step 1: Write the migration**

```sql
-- Prompt 179: Body Tracker Goals. Append-only. Three tables, RLS per user,
-- one-active-goal partial unique index, updated_at trigger on body_goals.

CREATE TABLE IF NOT EXISTS public.body_goals (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','achieved','paused','abandoned')),
  driver                   TEXT NOT NULL CHECK (driver IN ('date','rate')),
  start_weight_lb          NUMERIC(6,2) NOT NULL,
  goal_weight_lb           NUMERIC(6,2) NOT NULL,
  goal_bodyfat_pct         NUMERIC(4,1),
  start_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date              DATE,
  target_rate_lb_per_week  NUMERIC(4,2),
  sex                      TEXT,
  age_years                INT,
  height_in                NUMERIC(5,2),
  activity_level           TEXT CHECK (activity_level IN ('sedentary','light','moderate','very','extra')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_body_goals_one_active_per_user
  ON public.body_goals(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_body_goals_user ON public.body_goals(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.body_goal_targets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id              UUID NOT NULL REFERENCES public.body_goals(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_date       DATE NOT NULL,
  source               TEXT NOT NULL
                         CHECK (source IN ('initial_plan','weekly_recalibration','manual_override','revert')),
  estimated_tdee_kcal  INT,
  calorie_target_kcal  INT NOT NULL,
  protein_g            INT NOT NULL,
  fat_g                INT NOT NULL,
  carb_g               INT NOT NULL,
  fiber_g              INT NOT NULL,
  added_sugar_limit_g  INT,
  hydration_ml         INT,
  rationale            JSONB,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_body_goal_targets_lookup
  ON public.body_goal_targets(goal_id, effective_date DESC, computed_at DESC);

CREATE TABLE IF NOT EXISTS public.body_goal_recalibrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id              UUID NOT NULL REFERENCES public.body_goals(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start         DATE NOT NULL,
  window_end           DATE NOT NULL,
  days_logged          INT NOT NULL,
  avg_logged_kcal      INT,
  weight_change_lb     NUMERIC(5,2),
  estimated_tdee_kcal  INT,
  prev_calorie_target  INT,
  new_calorie_target   INT,
  adherence_pct        NUMERIC(5,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_body_goal_recal_goal
  ON public.body_goal_recalibrations(goal_id, created_at DESC);

ALTER TABLE public.body_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_goal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_goal_recalibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own body goals" ON public.body_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own goal targets" ON public.body_goal_targets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own goal recalibrations" ON public.body_goal_recalibrations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.body_goals_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_body_goals_updated_at') THEN
    CREATE TRIGGER trg_body_goals_updated_at BEFORE UPDATE ON public.body_goals
    FOR EACH ROW EXECUTE FUNCTION public.body_goals_set_updated_at();
  END IF;
END $$;
```

- [ ] **Step 2: Verify migration parses** (apply happens at the Supabase apply checkpoint, not locally)

Run: `node -e "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');if(!/CREATE TABLE IF NOT EXISTS public.body_goals/.test(s))process.exit(1);console.log('ok')" supabase/migrations/20260607*_prompt_179_body_goals.sql`
Expected: `ok`

- [ ] **Step 3: Commit** (hold push; commit to working tree only)

```bash
git add supabase/migrations/20260607*_prompt_179_body_goals.sql
git commit -m "feat(179): append-only migration for body_goals, body_goal_targets, body_goal_recalibrations"
```

---

## Phase 1: Pure energy engine (TDD)

### Task 1.1: Shared types and activity maps

**Files:**
- Create: `src/lib/body-goals/types.ts`
- Create: `src/lib/body-goals/activity.ts`
- Test: `tests/body-goals/activity.test.ts`

- [ ] **Step 1: Write `types.ts`**

```typescript
import type { BiologicalSex } from '@/lib/gordon/generateMacroTargets';
import type { GoalDirection } from '@/lib/weight-goals/accessor';

export type GoalDriver = 'date' | 'rate';
export type GoalActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned';
export type TargetSource = 'initial_plan' | 'weekly_recalibration' | 'manual_override' | 'revert';
export type BmrMethod = 'katch_mcardle' | 'mifflin_st_jeor';

export interface BodyGoalRow {
  id: string;
  user_id: string;
  status: GoalStatus;
  driver: GoalDriver;
  start_weight_lb: number;
  goal_weight_lb: number;
  goal_bodyfat_pct: number | null;
  start_date: string;
  target_date: string | null;
  target_rate_lb_per_week: number | null;
  sex: BiologicalSex | null;
  age_years: number | null;
  height_in: number | null;
  activity_level: GoalActivityLevel | null;
  created_at: string;
  updated_at: string;
}

export interface BuiltGoalTarget {
  effectiveDate: string;
  source: TargetSource;
  estimatedTdeeKcal: number | null;
  calorieTargetKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  fiberG: number;
  addedSugarLimitG: number;
  hydrationMl: number;
  rationale: Record<string, unknown>;
  projectedDate: string | null;
}
```

- [ ] **Step 2: Write the failing test for `activity.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { goalActivityMultiplier, goalToHydrationActivity } from '@/lib/body-goals/activity';

describe('activity maps', () => {
  it('maps goal activity levels to the 179 Section 5.2 multipliers', () => {
    expect(goalActivityMultiplier('sedentary')).toBe(1.2);
    expect(goalActivityMultiplier('light')).toBe(1.375);
    expect(goalActivityMultiplier('moderate')).toBe(1.55);
    expect(goalActivityMultiplier('very')).toBe(1.725);
    expect(goalActivityMultiplier('extra')).toBe(1.9);
  });
  it('defaults to light (1.375) when activity is null', () => {
    expect(goalActivityMultiplier(null)).toBe(1.375);
  });
  it('maps goal activity to hydration activity buckets', () => {
    expect(goalToHydrationActivity('very')).toBe('intense');
    expect(goalToHydrationActivity('extra')).toBe('intense');
    expect(goalToHydrationActivity('moderate')).toBe('moderate');
    expect(goalToHydrationActivity(null)).toBe('light');
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/body-goals/activity.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Write `activity.ts`**

```typescript
import type { GoalActivityLevel } from './types';
import type { ActivityLevel as HydrationActivity } from '@/lib/nutrition/hydration/target-personalizer';

// 179 Section 5.2 multipliers, keyed by the body_goals activity enum.
const GOAL_ACTIVITY_MULTIPLIER: Record<GoalActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

export function goalActivityMultiplier(level: GoalActivityLevel | null): number {
  // Default to light per 179 Section 5.2 when unknown.
  return GOAL_ACTIVITY_MULTIPLIER[level ?? 'light'];
}

const GOAL_TO_HYDRATION: Record<GoalActivityLevel, HydrationActivity> = {
  sedentary: 'sedentary',
  light: 'light',
  moderate: 'moderate',
  very: 'intense',
  extra: 'intense',
};

export function goalToHydrationActivity(level: GoalActivityLevel | null): HydrationActivity {
  return GOAL_TO_HYDRATION[level ?? 'light'];
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/body-goals/activity.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/body-goals/types.ts src/lib/body-goals/activity.ts tests/body-goals/activity.test.ts
git commit -m "feat(179): body-goals shared types + activity multiplier maps"
```

### Task 1.2: EWMA smoother

**Files:**
- Create: `src/lib/body-goals/ewma.ts`
- Test: `tests/body-goals/ewma.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { ewmaSeries, smoothedWeightChange } from '@/lib/body-goals/ewma';

const pts = (vals: Array<[string, number]>) => vals.map(([date, weightLb]) => ({ date, weightLb }));

describe('ewmaSeries', () => {
  it('seeds the first smoothed value to the first raw value', () => {
    const s = ewmaSeries(pts([['2026-06-01', 200]]), 10);
    expect(s[0].smoothedLb).toBe(200);
  });
  it('lags a step change toward, not onto, the new value', () => {
    const s = ewmaSeries(pts([['2026-06-01', 200], ['2026-06-02', 190]]), 10);
    expect(s[1].smoothedLb).toBeGreaterThan(190);
    expect(s[1].smoothedLb).toBeLessThan(200);
  });
  it('returns empty for empty input', () => {
    expect(ewmaSeries([], 10)).toEqual([]);
  });
});

describe('smoothedWeightChange', () => {
  it('is negative when the smoothed trend falls across the window', () => {
    const series = pts([
      ['2026-06-01', 200], ['2026-06-04', 199], ['2026-06-08', 198],
      ['2026-06-11', 197], ['2026-06-15', 196],
    ]);
    const change = smoothedWeightChange(series, '2026-06-01', '2026-06-15', 10);
    expect(change).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/body-goals/ewma.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write `ewma.ts`**

```typescript
// Time-aware EWMA over a weight series. No existing smoother in the codebase
// (Prompt 179 builds it). Irregular sampling: per-step alpha derived from the
// gap so a 10-day half-life means a sample 10 days later gets ~0.5 weight.

export interface WeightPoint { date: string; weightLb: number; }
export interface SmoothedPoint { date: string; rawLb: number; smoothedLb: number; }

const DAY_MS = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.max(0, ms / DAY_MS);
}

export function ewmaSeries(points: WeightPoint[], halfLifeDays = 10): SmoothedPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((p, q) => a(p.date) - a(q.date));
  const out: SmoothedPoint[] = [];
  let prevSmoothed = sorted[0].weightLb;
  let prevDate = sorted[0].date;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i === 0) {
      prevSmoothed = p.weightLb;
    } else {
      const dt = daysBetween(prevDate, p.date);
      const alpha = 1 - Math.pow(0.5, dt / halfLifeDays);
      prevSmoothed = alpha * p.weightLb + (1 - alpha) * prevSmoothed;
    }
    prevDate = p.date;
    out.push({ date: p.date, rawLb: p.weightLb, smoothedLb: round1(prevSmoothed) });
  }
  return out;
}

function a(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime();
}

// Smoothed value at-or-before a target date (last point whose date <= target).
function smoothedAt(series: SmoothedPoint[], date: string): number | null {
  let val: number | null = null;
  for (const s of series) {
    if (a(s.date) <= a(date)) val = s.smoothedLb;
    else break;
  }
  return val;
}

export function smoothedWeightChange(
  points: WeightPoint[], windowStart: string, windowEnd: string, halfLifeDays = 10,
): number | null {
  const series = ewmaSeries(points, halfLifeDays);
  const startVal = smoothedAt(series, windowStart) ?? series[0]?.smoothedLb ?? null;
  const endVal = smoothedAt(series, windowEnd);
  if (startVal === null || endVal === null) return null;
  return round1(endVal - startVal);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/body-goals/ewma.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/body-goals/ewma.ts tests/body-goals/ewma.test.ts
git commit -m "feat(179): time-aware EWMA weight smoother"
```

### Task 1.3: BMR, initial TDEE, adaptive TDEE

**Files:**
- Create: `src/lib/body-goals/energy.ts` (BMR + TDEE portion; solver added in 1.4)
- Test: `tests/body-goals/energy.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { computeBmr, computeInitialTdee, estimateAdaptiveTdee } from '@/lib/body-goals/energy';
import type { LbmResolution } from '@/lib/gordon/lbm';

const measuredLbm = (lbmKg: number): LbmResolution => ({ lbmKg, bodyFatFraction: 0.2, source: 'measured' });

describe('computeBmr', () => {
  it('uses Katch-McArdle when measured LBM is present', () => {
    const r = computeBmr({ lbm: measuredLbm(60), weightKg: 80, heightCm: 178, age: 35, sex: 'male' });
    expect(r?.method).toBe('katch_mcardle');
    expect(r?.bmr).toBeCloseTo(370 + 21.6 * 60, 1);
  });
  it('falls back to Mifflin-St Jeor when LBM is not measured', () => {
    const r = computeBmr({ lbm: null, weightKg: 80, heightCm: 178, age: 35, sex: 'male' });
    expect(r?.method).toBe('mifflin_st_jeor');
    expect(r?.bmr).toBeCloseTo(10 * 80 + 6.25 * 178 - 5 * 35 + 5, 1);
  });
  it('returns null when neither path has inputs', () => {
    expect(computeBmr({ lbm: null, weightKg: 0, heightCm: 0, age: 0, sex: 'male' })).toBeNull();
  });
});

describe('computeInitialTdee', () => {
  it('scales BMR by the activity multiplier', () => {
    expect(computeInitialTdee(1700, 'moderate')).toBeCloseTo(1700 * 1.55, 1);
  });
});

describe('estimateAdaptiveTdee', () => {
  it('reconciles intake against the smoothed weight delta', () => {
    // ate 1800/day, lost 2 lb over 14 days -> expenditure > intake.
    const r = estimateAdaptiveTdee({ avgLoggedKcal: 1800, weightChangeLb: -2, windowDays: 14, priorTdee: null });
    expect(r).toBeCloseTo(1800 - (-2 * 3500) / 14, 0);
  });
  it('blends with the prior estimate using alpha 0.5', () => {
    const r = estimateAdaptiveTdee({ avgLoggedKcal: 1800, weightChangeLb: 0, windowDays: 14, priorTdee: 2000 });
    expect(r).toBe(Math.round(0.5 * 1800 + 0.5 * 2000));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/body-goals/energy.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the BMR + TDEE portion of `energy.ts`**

```typescript
import type { LbmResolution } from '@/lib/gordon/lbm';
import type { BiologicalSex } from '@/lib/gordon/generateMacroTargets';
import type { BmrMethod, GoalActivityLevel } from './types';
import { goalActivityMultiplier } from './activity';

// KCAL_PER_LB is the tissue-energy approximation (the discredited flat
// constant). It is NOT what makes the engine accurate: the adaptive
// reconciliation against the measured smoothed weight trend is. The constant
// only converts a measured weight delta into an energy delta.
export const KCAL_PER_LB = 3500;
const ADAPTIVE_ALPHA = 0.5;

export interface ComputeBmrInput {
  lbm: LbmResolution | null;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
}
export interface BmrResult { bmr: number; method: BmrMethod; }

function pos(n: number): boolean { return Number.isFinite(n) && n > 0; }

export function computeBmr(input: ComputeBmrInput): BmrResult | null {
  // Katch-McArdle only when LBM is genuinely MEASURED (body fat present). A
  // Boer-estimated LBM derives from the same weight/height/sex as Mifflin, so
  // it adds no accuracy; route those to Mifflin (179 Section 5.1).
  if (input.lbm && input.lbm.source === 'measured' && pos(input.lbm.lbmKg)) {
    return { bmr: 370 + 21.6 * input.lbm.lbmKg, method: 'katch_mcardle' };
  }
  if (pos(input.weightKg) && pos(input.heightCm) && pos(input.age)) {
    const sexTerm = input.sex === 'male' ? 5 : input.sex === 'female' ? -161 : -78;
    return { bmr: 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexTerm, method: 'mifflin_st_jeor' };
  }
  return null;
}

export function computeInitialTdee(bmr: number, activity: GoalActivityLevel | null): number {
  return bmr * goalActivityMultiplier(activity);
}

export interface AdaptiveTdeeInput {
  avgLoggedKcal: number;
  weightChangeLb: number; // EWMA endpoint delta (negative when losing)
  windowDays: number;
  priorTdee: number | null;
  alpha?: number;
}

export function estimateAdaptiveTdee(input: AdaptiveTdeeInput): number {
  const raw = input.avgLoggedKcal - (input.weightChangeLb * KCAL_PER_LB) / input.windowDays;
  const alpha = input.alpha ?? ADAPTIVE_ALPHA;
  const blended = input.priorTdee === null ? raw : alpha * raw + (1 - alpha) * input.priorTdee;
  return Math.round(blended);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/body-goals/energy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/body-goals/energy.ts tests/body-goals/energy.test.ts
git commit -m "feat(179): BMR (Katch-McArdle/Mifflin), initial + adaptive TDEE"
```

### Task 1.4: Calorie solver with safety clamps (DD-3)

**Files:**
- Modify: `src/lib/body-goals/energy.ts` (append solver)
- Test: `tests/body-goals/solver.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { solveCalorieTarget } from '@/lib/body-goals/energy';

describe('solveCalorieTarget', () => {
  it('rate-driven lose: target = tdee - weekly deficit', () => {
    const r = solveCalorieTarget({
      tdee: 2500, driver: 'rate', targetRateLbPerWeek: 1, targetDate: null,
      startWeightLb: 200, goalWeightLb: 180, startDate: '2026-06-07', sex: 'male', currentWeightLb: 200,
    });
    expect(r.calorieTargetKcal).toBe(2500 - Math.round((1 * 3500) / 7));
    expect(r.clamps).not.toContain('calorie_floor');
  });
  it('clamps to the floor and pushes the date out when the date demands sub-floor calories (DD-3)', () => {
    const r = solveCalorieTarget({
      tdee: 2000, driver: 'date', targetRateLbPerWeek: null, targetDate: '2026-06-21',
      startWeightLb: 200, goalWeightLb: 180, startDate: '2026-06-07', sex: 'male', currentWeightLb: 200,
    });
    expect(r.calorieTargetKcal).toBe(1500); // male floor
    expect(r.clamps).toContain('calorie_floor');
    expect(new Date(r.projectedDate!).getTime()).toBeGreaterThan(new Date('2026-06-21').getTime());
  });
  it('clamps the rate to the max safe rate (lesser of 2 lb/wk and 1% body weight)', () => {
    const r = solveCalorieTarget({
      tdee: 4000, driver: 'rate', targetRateLbPerWeek: 5, targetDate: null,
      startWeightLb: 150, goalWeightLb: 140, startDate: '2026-06-07', sex: 'female', currentWeightLb: 150,
    });
    expect(r.clamps).toContain('rate_cap');
    // 1% of 150 = 1.5 lb/wk is the cap (lesser of 2.0 and 1.5).
    const cappedDeficit = Math.round((1.5 * 3500) / 7);
    expect(r.calorieTargetKcal).toBe(4000 - cappedDeficit);
  });
  it('maintain: target equals tdee, no projected date', () => {
    const r = solveCalorieTarget({
      tdee: 2200, driver: 'rate', targetRateLbPerWeek: 0, targetDate: null,
      startWeightLb: 170, goalWeightLb: 170, startDate: '2026-06-07', sex: 'female', currentWeightLb: 170,
    });
    expect(r.calorieTargetKcal).toBe(2200);
    expect(r.projectedDate).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/body-goals/solver.test.ts`
Expected: FAIL (solveCalorieTarget not exported)

- [ ] **Step 3: Append the solver to `energy.ts`**

```typescript
import { MACRO_CONFIG } from '@/lib/gordon/macro-config';
import type { GoalDriver } from './types';

const DAY_MS = 86_400_000;
const MAINTAIN_BAND_LB = 2.2; // ~1 kg, mirrors MACRO_CONFIG.maintain_threshold_kg
const MAX_RATE_LB_PER_WEEK = 2.0;

export type SolverClamp = 'rate_cap' | 'calorie_floor';
export type SolverDirection = 'lose' | 'gain' | 'maintain';

export interface SolveCalorieTargetInput {
  tdee: number;
  driver: GoalDriver;
  targetRateLbPerWeek: number | null;
  targetDate: string | null;
  startWeightLb: number;
  goalWeightLb: number;
  startDate: string;
  sex: BiologicalSex;
  currentWeightLb: number;
}
export interface SolveCalorieTargetResult {
  calorieTargetKcal: number;
  effectiveRateLbPerWeek: number;
  direction: SolverDirection;
  projectedDate: string | null;
  clamps: SolverClamp[];
}

function diffDays(from: string, to: string): number {
  return (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS;
}
function addDays(from: string, days: number): string {
  return new Date(new Date(`${from}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function solveCalorieTarget(input: SolveCalorieTargetInput): SolveCalorieTargetResult {
  const clamps: SolverClamp[] = [];
  const deltaLb = input.startWeightLb - input.goalWeightLb; // >0 lose, <0 gain
  const direction: SolverDirection =
    Math.abs(deltaLb) <= MAINTAIN_BAND_LB ? 'maintain' : deltaLb > 0 ? 'lose' : 'gain';

  const floor = input.sex === 'male' ? MACRO_CONFIG.calorie_floor_male : MACRO_CONFIG.calorie_floor_female;

  if (direction === 'maintain') {
    return { calorieTargetKcal: Math.round(input.tdee), effectiveRateLbPerWeek: 0, direction, projectedDate: null, clamps };
  }

  // Desired magnitude of weekly rate.
  let rate: number;
  if (input.driver === 'rate') {
    rate = Math.abs(input.targetRateLbPerWeek ?? 0);
  } else {
    const weeks = Math.max(1 / 7, diffDays(input.startDate, input.targetDate ?? input.startDate) / 7);
    rate = Math.abs(deltaLb) / weeks;
  }

  // DD-3 rate cap: lesser of 2.0 lb/wk and 1% of current body weight per week.
  const rateCap = Math.min(MAX_RATE_LB_PER_WEEK, 0.01 * input.currentWeightLb);
  if (rate > rateCap) { rate = rateCap; clamps.push('rate_cap'); }

  const dailyDelta = (rate * KCAL_PER_LB) / 7;
  let target = direction === 'lose' ? input.tdee - dailyDelta : input.tdee + dailyDelta;

  // DD-3 floor: never below the floor; bend the date instead.
  if (target < floor) { target = floor; clamps.push('calorie_floor'); }
  target = Math.round(target);

  // Effective (post-clamp) achievable rate, derived from the realized deficit.
  const realizedDailyDelta = Math.abs(input.tdee - target);
  const effectiveRate = (realizedDailyDelta * 7) / KCAL_PER_LB;
  const projectedDate = effectiveRate > 0
    ? addDays(input.startDate, (Math.abs(deltaLb) / effectiveRate) * 7)
    : null;

  return { calorieTargetKcal: target, effectiveRateLbPerWeek: Math.round(effectiveRate * 100) / 100, direction, projectedDate, clamps };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/body-goals/solver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/body-goals/energy.ts tests/body-goals/solver.test.ts
git commit -m "feat(179): calorie solver with DD-3 floor + rate-cap clamps"
```

---

## Phase 2: Macro split extraction and target builder (TDD)

### Task 2.1: Extract `deriveMacroSplit` (behavior-preserving refactor)

**Files:**
- Create: `src/lib/gordon/macroSplit.ts`
- Modify: `src/lib/gordon/generateMacroTargets.ts` (replace inline split steps 4 to 6 with a call)
- Test: `tests/gordon/macroSplit.test.ts`

- [ ] **Step 1: Write the characterization test (locks current behavior before extracting)**

```typescript
import { describe, it, expect } from 'vitest';
import { deriveMacroSplit } from '@/lib/gordon/macroSplit';

describe('deriveMacroSplit', () => {
  it('protein anchors on 0.8 g/lb LBM times the goal multiplier', () => {
    const r = deriveMacroSplit({ calorieTargetKcal: 2000, direction: 'maintain', lbmKg: 60, currentWeightKg: 80, dietaryChoice: 'balanced' });
    const lbmLbs = 60 * 2.20462;
    expect(r.proteinG).toBeCloseTo(Math.round((0.8 * 0.8 * lbmLbs) * 10) / 10, 0);
  });
  it('fiber is 14 g per 1000 kcal of the calorie target', () => {
    const r = deriveMacroSplit({ calorieTargetKcal: 2000, direction: 'lose', lbmKg: 55, currentWeightKg: 75, dietaryChoice: 'balanced' });
    expect(r.fiberG).toBe(28);
  });
  it('calories reconcile: 4*protein + 9*fat + 4*carb is within rounding of the target', () => {
    const r = deriveMacroSplit({ calorieTargetKcal: 1800, direction: 'lose', lbmKg: 50, currentWeightKg: 70, dietaryChoice: 'balanced' });
    const kcal = 4 * r.proteinG + 9 * r.fatG + 4 * r.carbG;
    expect(Math.abs(kcal - 1800)).toBeLessThan(60);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/gordon/macroSplit.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Create `macroSplit.ts` by lifting steps 4 to 6 + reconcile from `generateMacroTargets.ts`**

Move `resolveProteinGrams`, `fatPctForDiet`, `resolveFatAndCarb`, the reconciliation guard, and the fiber line into an exported pure function. Keep the math byte-for-byte identical.

```typescript
import { MACRO_CONFIG, LBS_PER_KG_MACRO, type DietaryChoice } from './macro-config';
import type { GoalDirection } from '@/lib/weight-goals/accessor';
import type { ClampReason } from './generateMacroTargets';

export interface DeriveMacroSplitInput {
  calorieTargetKcal: number;
  direction: GoalDirection;
  lbmKg: number;
  currentWeightKg: number;
  dietaryChoice: DietaryChoice;
}
export interface MacroSplitResult {
  proteinG: number; fatG: number; carbG: number; fiberG: number;
  clamps: ClampReason[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// (resolveProteinGrams, fatPctForDiet, resolveFatAndCarb verbatim from
// generateMacroTargets.ts lines 185 to 281, made local to this module.)

export function deriveMacroSplit(input: DeriveMacroSplitInput): MacroSplitResult {
  const { calorieTargetKcal, direction, lbmKg, currentWeightKg, dietaryChoice } = input;
  const protein = resolveProteinGrams(direction, lbmKg, calorieTargetKcal);
  let proteinG = protein.proteinG;
  const fatAndCarb = resolveFatAndCarb(dietaryChoice, calorieTargetKcal, proteinG, currentWeightKg);
  let fatG = fatAndCarb.fatG;
  let carbG = fatAndCarb.carbG;
  const reconcileClamps: ClampReason[] = [];
  if (dietaryChoice !== 'keto') {
    let carbKcal = carbG * 4;
    if (carbKcal < 0) {
      const fatHormonalFloorG = MACRO_CONFIG.min_fat_g_per_kg * currentWeightKg;
      const fatExcessKcal = (fatG - fatHormonalFloorG) * 9;
      if (fatExcessKcal > 0) {
        const reduction = Math.min(fatExcessKcal, -carbKcal);
        fatG -= reduction / 9; carbKcal += reduction; reconcileClamps.push('carb_reconcile_fat');
      }
    }
    if (carbKcal < 0) {
      const proteinFloorG = 1.2 * lbmKg;
      const proteinExcessKcal = (proteinG - proteinFloorG) * 4;
      if (proteinExcessKcal > 0) {
        const reduction = Math.min(proteinExcessKcal, -carbKcal);
        proteinG -= reduction / 4; carbKcal += reduction; reconcileClamps.push('carb_reconcile_protein');
      }
    }
    carbG = Math.max(0, carbKcal / 4);
  }
  const fiberG = Math.round((MACRO_CONFIG.fiber_g_per_1000_kcal * calorieTargetKcal) / 1000);
  return {
    proteinG: round1(proteinG), fatG: round1(fatG), carbG: round1(carbG), fiberG,
    clamps: [...protein.clamps, ...fatAndCarb.clamps, ...reconcileClamps],
  };
}
```

(Include `resolveProteinGrams`, `fatPctForDiet`, `resolveFatAndCarb` copied verbatim from the current `generateMacroTargets.ts`.)

- [ ] **Step 4: Modify `generateMacroTargets.ts` to delegate**

Replace lines 359 to 408 (the protein/fat/carb/reconcile/fiber block) with:

```typescript
import { deriveMacroSplit } from './macroSplit';
// ...
const split = deriveMacroSplit({
  calorieTargetKcal, direction: effectiveDirection, lbmKg: leanBodyMass.lbmKg,
  currentWeightKg: body.currentWeightKg, dietaryChoice: effectiveDietaryChoice,
});
const proteinG = split.proteinG; const fatG = split.fatG; const carbG = split.carbG; const fiberG = split.fiberG;
const splitClamps = split.clamps;
```

Update `clampsFired` to spread `splitClamps` instead of the removed local arrays, and `targets` to use these values (already rounded by `deriveMacroSplit`; drop the extra `round1`). Move the `ClampReason` type export to remain in `generateMacroTargets.ts` (macroSplit imports it).

- [ ] **Step 5: Run BOTH the new test and the existing engine tests to confirm no behavior change**

Run: `npx vitest run tests/gordon/macroSplit.test.ts tests/weight-goals/generateMacroTargets.test.ts`
Expected: PASS (all existing generateMacroTargets assertions still green)

- [ ] **Step 6: Commit**

```bash
git add src/lib/gordon/macroSplit.ts src/lib/gordon/generateMacroTargets.ts tests/gordon/macroSplit.test.ts
git commit -m "refactor(179): extract deriveMacroSplit shared by macro engine + goal engine"
```

### Task 2.2: `buildGoalTarget` orchestrator

**Files:**
- Create: `src/lib/body-goals/buildGoalTarget.ts`
- Test: `tests/body-goals/buildGoalTarget.test.ts`

- [ ] **Step 1: Write the failing test (covers acceptance criteria 1 and 2)**

```typescript
import { describe, it, expect } from 'vitest';
import { buildGoalTarget } from '@/lib/body-goals/buildGoalTarget';

const base = {
  driver: 'rate' as const, targetRateLbPerWeek: 1, targetDate: null,
  startWeightLb: 200, goalWeightLb: 180, startDate: '2026-06-07',
  latestWeightLb: 200, bodyFatPct: 22, heightIn: 70, age: 35,
  sex: 'male' as const, activityLevel: 'light' as const, dietaryChoice: 'balanced' as const,
  effectiveDate: '2026-06-07', source: 'initial_plan' as const,
  tdeeOverride: null, priorTdee: null,
};

describe('buildGoalTarget', () => {
  it('rate-driven goal: target = TDEE - deficit, protein 0.8 g/lb LBM, full macro split (criterion 1)', () => {
    const r = buildGoalTarget(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.target.proteinG).toBeGreaterThan(0);
      expect(r.target.fatG).toBeGreaterThan(0);
      expect(r.target.carbG).toBeGreaterThan(0);
      expect(r.target.calorieTargetKcal).toBeGreaterThanOrEqual(1500);
      expect(r.target.estimatedTdeeKcal).toBeNull(); // initial_plan: NULL until data
    }
  });
  it('date-driven sub-floor demand clamps to floor and pushes projectedDate out (criterion 2)', () => {
    const r = buildGoalTarget({ ...base, driver: 'date', targetRateLbPerWeek: null, targetDate: '2026-06-21' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.target.calorieTargetKcal).toBe(1500);
      expect(String(r.target.rationale.clamps)).toContain('calorie_floor');
      expect(new Date(r.target.projectedDate!).getTime()).toBeGreaterThan(new Date('2026-06-21').getTime());
    }
  });
  it('returns setup_required when profile inputs are missing', () => {
    const r = buildGoalTarget({ ...base, heightIn: 0, bodyFatPct: null });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/body-goals/buildGoalTarget.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write `buildGoalTarget.ts`**

```typescript
import { lbsToKg } from '@/lib/weight-goals/guardrails';
import { resolveLeanBodyMass } from '@/lib/gordon/lbm';
import { deriveMacroSplit } from '@/lib/gordon/macroSplit';
import { personalizeHydrationTarget } from '@/lib/nutrition/hydration/target-personalizer';
import type { BiologicalSex } from '@/lib/gordon/generateMacroTargets';
import type { DietaryChoice } from '@/lib/gordon/macro-config';
import type { GoalDirection } from '@/lib/weight-goals/accessor';
import { computeBmr, computeInitialTdee, solveCalorieTarget } from './energy';
import { goalToHydrationActivity } from './activity';
import type { BuiltGoalTarget, GoalActivityLevel, GoalDriver, TargetSource } from './types';

const IN_TO_CM = 2.54;

export interface BuildGoalTargetInput {
  driver: GoalDriver;
  targetRateLbPerWeek: number | null;
  targetDate: string | null;
  startWeightLb: number;
  goalWeightLb: number;
  startDate: string;
  latestWeightLb: number;
  bodyFatPct: number | null;
  heightIn: number | null;
  age: number | null;
  sex: BiologicalSex | null;
  activityLevel: GoalActivityLevel | null;
  dietaryChoice: DietaryChoice | null;
  effectiveDate: string;
  source: TargetSource;
  tdeeOverride: number | null;   // recalibration passes the adaptive TDEE
  priorTdee: number | null;
}

export type BuildGoalTargetResult =
  | { ok: false; reason: 'setup_required'; missing: string[] }
  | { ok: true; target: BuiltGoalTarget };

export function buildGoalTarget(input: BuildGoalTargetInput): BuildGoalTargetResult {
  const missing: string[] = [];
  if (!(input.latestWeightLb > 0)) missing.push('currentWeight');
  if (!input.heightIn || input.heightIn <= 0) missing.push('height');
  if (input.age === null || input.age <= 0) missing.push('age');
  const sex: BiologicalSex = input.sex ?? 'unspecified';

  const weightKg = lbsToKg(input.latestWeightLb);
  const heightCm = (input.heightIn ?? 0) * IN_TO_CM;
  const lbm = resolveLeanBodyMass({
    weightKg, heightCm, biologicalSex: sex,
    bodyFatFraction: input.bodyFatPct !== null && input.bodyFatPct > 0 ? input.bodyFatPct / 100 : null,
  });
  const bmrResult = input.tdeeOverride === null
    ? computeBmr({ lbm, weightKg, heightCm, age: input.age ?? 0, sex })
    : { bmr: 0, method: 'mifflin_st_jeor' as const };
  if (input.tdeeOverride === null && bmrResult === null) missing.push('bmrInputs');
  if (missing.length > 0) return { ok: false, reason: 'setup_required', missing };

  const tdee = input.tdeeOverride ?? computeInitialTdee(bmrResult!.bmr, input.activityLevel);

  const solved = solveCalorieTarget({
    tdee, driver: input.driver, targetRateLbPerWeek: input.targetRateLbPerWeek, targetDate: input.targetDate,
    startWeightLb: input.startWeightLb, goalWeightLb: input.goalWeightLb, startDate: input.startDate,
    sex, currentWeightLb: input.latestWeightLb,
  });

  const direction: GoalDirection = solved.direction;
  const split = deriveMacroSplit({
    calorieTargetKcal: solved.calorieTargetKcal, direction,
    lbmKg: lbm ? lbm.lbmKg : weightKg * 0.75, // lbm null only if weight/height invalid, gated above
    currentWeightKg: weightKg, dietaryChoice: input.dietaryChoice ?? 'balanced',
  });

  const addedSugarLimitG = Math.round((0.10 * solved.calorieTargetKcal) / 4);
  const hydrationMl = personalizeHydrationTarget({
    body_weight_kg: weightKg, custom_target_ml_per_day: null,
    activity_level: goalToHydrationActivity(input.activityLevel),
  });

  return {
    ok: true,
    target: {
      effectiveDate: input.effectiveDate,
      source: input.source,
      // 179 Section 4.2: estimated_tdee_kcal is NULL until data-derived
      // (recalibration). Initial plan TDEE is recorded in rationale, not here.
      estimatedTdeeKcal: input.tdeeOverride !== null ? Math.round(input.tdeeOverride) : null,
      calorieTargetKcal: solved.calorieTargetKcal,
      proteinG: Math.round(split.proteinG),
      fatG: Math.round(split.fatG),
      carbG: Math.round(split.carbG),
      fiberG: split.fiberG,
      addedSugarLimitG,
      hydrationMl,
      rationale: {
        bmrMethod: bmrResult?.method ?? 'tdee_override',
        tdee: Math.round(tdee),
        direction,
        effectiveRateLbPerWeek: solved.effectiveRateLbPerWeek,
        clamps: solved.clamps,
        lbmKg: lbm ? Math.round(lbm.lbmKg * 10) / 10 : null,
        lbmSource: lbm ? lbm.source : null,
        macroClamps: split.clamps,
      },
      projectedDate: solved.projectedDate,
    },
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/body-goals/buildGoalTarget.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/body-goals/buildGoalTarget.ts tests/body-goals/buildGoalTarget.test.ts
git commit -m "feat(179): buildGoalTarget orchestrator (engine + split + sugar + hydration)"
```

---

## Phase 3: Precedence resolver (DD-1) (TDD)

### Task 3.1: Pure picker + mappers

**Files:**
- Modify: `src/lib/gordon/types.ts` (add `targetSource?: TargetSource | null` to `NutritionTargets`)
- Create: `src/lib/gordon/resolveDailyTarget.ts`
- Test: `tests/gordon/resolveDailyTarget.test.ts`

- [ ] **Step 1: Write the failing test (acceptance criterion 4)**

```typescript
import { describe, it, expect } from 'vitest';
import { pickResolvedTarget } from '@/lib/gordon/resolveDailyTarget';

const goal = { dailyKcal: 1800, dailyProteinG: 150, dailyCarbsG: 150, dailyFatTotalG: 60, dailyFiberG: 25, addedSugarLimitG: 45, hydrationMl: 2600, source: 'goal_target' as const, goalId: 'g1' };
const override = { ...goal, dailyKcal: 1700, source: 'manual_override' as const };
const caq = { dailyKcal: 2000, dailyProteinG: 120, dailyCarbsG: 220, dailyFatTotalG: 70, dailyFiberG: 28, addedSugarLimitG: null, hydrationMl: null, source: 'caq_static' as const, goalId: null };

describe('pickResolvedTarget (DD-1 precedence)', () => {
  it('returns the manual override when present', () => {
    expect(pickResolvedTarget({ override, goalTarget: goal, caqStatic: caq }).source).toBe('manual_override');
  });
  it('returns the goal target when no override', () => {
    expect(pickResolvedTarget({ override: null, goalTarget: goal, caqStatic: caq }).source).toBe('goal_target');
  });
  it('falls back to the CAQ static target when no goal', () => {
    expect(pickResolvedTarget({ override: null, goalTarget: null, caqStatic: caq }).source).toBe('caq_static');
  });
  it('returns null when nothing is available', () => {
    expect(pickResolvedTarget({ override: null, goalTarget: null, caqStatic: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/gordon/resolveDailyTarget.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write `resolveDailyTarget.ts` (picker + mappers; fetch added in 3.2)**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import type { NutritionTargets } from './types';
import type { BodyGoalTargetRow } from '@/lib/body-goals/types';

export type ResolvedSource = 'manual_override' | 'goal_target' | 'caq_static';

export interface ResolvedDailyTarget {
  dailyKcal: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatTotalG: number;
  dailyFiberG: number;
  addedSugarLimitG: number | null;
  hydrationMl: number | null;
  source: ResolvedSource;
  goalId: string | null;
}

export function goalTargetRowToResolved(row: BodyGoalTargetRow, source: ResolvedSource): ResolvedDailyTarget {
  return {
    dailyKcal: row.calorie_target_kcal,
    dailyProteinG: row.protein_g,
    dailyCarbsG: row.carb_g,
    dailyFatTotalG: row.fat_g,
    dailyFiberG: row.fiber_g,
    addedSugarLimitG: row.added_sugar_limit_g,
    hydrationMl: row.hydration_ml,
    source,
    goalId: row.goal_id,
  };
}

export function caqTargetsToResolved(nt: NutritionTargets): ResolvedDailyTarget {
  return {
    dailyKcal: nt.dailyKcal,
    dailyProteinG: nt.dailyProteinG,
    dailyCarbsG: nt.dailyCarbsG,
    dailyFatTotalG: nt.dailyFatTotalG,
    dailyFiberG: nt.dailyFiberG,
    addedSugarLimitG: null,
    hydrationMl: null,
    source: 'caq_static',
    goalId: null,
  };
}

export function pickResolvedTarget(c: {
  override: ResolvedDailyTarget | null;
  goalTarget: ResolvedDailyTarget | null;
  caqStatic: ResolvedDailyTarget | null;
}): ResolvedDailyTarget | null {
  return c.override ?? c.goalTarget ?? c.caqStatic ?? null;
}
```

Add to `src/lib/body-goals/types.ts`:

```typescript
export interface BodyGoalTargetRow {
  id: string;
  goal_id: string;
  user_id: string;
  effective_date: string;
  source: TargetSource;
  estimated_tdee_kcal: number | null;
  calorie_target_kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  fiber_g: number;
  added_sugar_limit_g: number | null;
  hydration_ml: number | null;
  rationale: Record<string, unknown> | null;
  computed_at: string;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/gordon/resolveDailyTarget.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gordon/resolveDailyTarget.ts src/lib/gordon/types.ts src/lib/body-goals/types.ts tests/gordon/resolveDailyTarget.test.ts
git commit -m "feat(179): DD-1 precedence picker + target mappers"
```

### Task 3.2: `fetchResolvedDailyTarget` with fail-open (criterion 5)

**Files:**
- Modify: `src/lib/gordon/resolveDailyTarget.ts` (append fetcher)
- Test: `tests/gordon/fetchResolvedDailyTarget.test.ts`

- [ ] **Step 1: Write the failing test using a fake Supabase client**

```typescript
import { describe, it, expect } from 'vitest';
import { fetchResolvedDailyTarget } from '@/lib/gordon/resolveDailyTarget';

// Fake client: nutrition_targets returns a CAQ row; body_goal_targets THROWS.
function throwingGoalClient() {
  return {
    from(table: string) {
      if (table === 'nutrition_targets') return chain({ data: { daily_kcal: 2000, daily_protein_g: 120, daily_carbs_g: 220, daily_fat_total_g: 70, daily_fiber_g: 28 } });
      throw new Error('body_goal_targets boom');
    },
  } as any;
}
function chain(result: any) {
  const c: any = {};
  for (const m of ['select','eq','is','order','limit','lte']) c[m] = () => c;
  c.maybeSingle = async () => result;
  return c;
}

describe('fetchResolvedDailyTarget fail-open (criterion 5)', () => {
  it('falls back to the CAQ static target when the goal layer throws', async () => {
    const r = await fetchResolvedDailyTarget('u1', '2026-06-07', throwingGoalClient());
    expect(r?.source).toBe('caq_static');
    expect(r?.dailyKcal).toBe(2000);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/gordon/fetchResolvedDailyTarget.test.ts`
Expected: FAIL (fetchResolvedDailyTarget not exported)

- [ ] **Step 3: Append `fetchResolvedDailyTarget` to `resolveDailyTarget.ts`**

```typescript
export async function fetchResolvedDailyTarget(
  userId: string, localDateISO: string, supabase: SupabaseClient,
): Promise<ResolvedDailyTarget | null> {
  // CAQ static first (always the fail-open fallback).
  let caqStatic: ResolvedDailyTarget | null = null;
  try {
    const { data } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('nutrition_targets').select('*').eq('user_id', userId)
        .is('superseded_at', null).order('effective_from', { ascending: false }).limit(1).maybeSingle(),
      8000, 'resolveDailyTarget.caq');
    if (data) caqStatic = caqTargetsToResolved({
      dailyKcal: Number(data.daily_kcal) || 0, dailyProteinG: Number(data.daily_protein_g) || 0,
      dailyCarbsG: Number(data.daily_carbs_g) || 0, dailyFatTotalG: Number(data.daily_fat_total_g) || 0,
      dailyFiberG: Number(data.daily_fiber_g) || 0,
    } as NutritionTargets);
  } catch (err) {
    safeLog.warn('resolveDailyTarget', 'caq fetch failed', { err, userId });
  }

  // Goal layer (override > latest effective). Any failure fails open to CAQ.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: goal } = await withTimeout(
      sb.from('body_goals').select('id').eq('user_id', userId).eq('status', 'active').maybeSingle(),
      8000, 'resolveDailyTarget.activeGoal');
    if (!goal) return caqStatic;

    const { data: overrideRow } = await withTimeout(
      sb.from('body_goal_targets').select('*').eq('goal_id', goal.id).eq('source', 'manual_override')
        .eq('effective_date', localDateISO).order('computed_at', { ascending: false }).limit(1).maybeSingle(),
      8000, 'resolveDailyTarget.override');
    const { data: latestRow } = await withTimeout(
      sb.from('body_goal_targets').select('*').eq('goal_id', goal.id)
        .lte('effective_date', localDateISO).order('effective_date', { ascending: false })
        .order('computed_at', { ascending: false }).limit(1).maybeSingle(),
      8000, 'resolveDailyTarget.latest');

    return pickResolvedTarget({
      override: overrideRow ? goalTargetRowToResolved(overrideRow, 'manual_override') : null,
      goalTarget: latestRow ? goalTargetRowToResolved(latestRow, 'goal_target') : null,
      caqStatic,
    });
  } catch (err) {
    safeLog.warn('resolveDailyTarget', 'goal layer failed, using CAQ static', { err, userId });
    return caqStatic;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/gordon/fetchResolvedDailyTarget.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gordon/resolveDailyTarget.ts tests/gordon/fetchResolvedDailyTarget.test.ts
git commit -m "feat(179): fetchResolvedDailyTarget with fail-open to CAQ static"
```

### Task 3.3: Wire the resolver into the client hook and the server meal-scoring read

**Files:**
- Modify: `src/hooks/useNutritionTargets.ts`
- Modify: `src/lib/gordon/scoreMealForServerInsert.ts`

- [ ] **Step 1: Overlay in `useNutritionTargets.fetchActive`**

After the `nutrition_targets` row resolves to `base` (a `NutritionTargets | null`), query the goal layer for the user's local date and overlay the five macros + `targetSource` when a goal target wins. Wrap the goal query in try/catch; on any error keep `base` unchanged (fail-open). Set `targetSource: 'caq_static'` when no goal applies. Reuse `goalTargetRowToResolved` / `pickResolvedTarget` against the client supabase.

- [ ] **Step 2: Overlay in `scoreMealForServerInsert.ts` (lines 94-101 read)**

Replace the direct `nutrition_targets` read result with `fetchResolvedDailyTarget(input.userId, todayISO, supabase)` mapped into the existing `rowToTargets` shape (overlay the five macros). Keep the existing `generateTargets()` fallback when the resolver returns null. Wrap in try/catch so meal scoring never breaks (fail-open).

- [ ] **Step 3: Run the full nutrition + gordon test suite to confirm no regressions**

Run: `npx vitest run tests/gordon tests/weight-goals`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNutritionTargets.ts src/lib/gordon/scoreMealForServerInsert.ts
git commit -m "feat(179): overlay goal target onto client + server daily target reads (DD-1)"
```

---

## Phase 4: Data access, write-through, recalibration, routes, cron

### Task 4.1: `goalsData.ts` access layer

**Files:**
- Create: `src/lib/body-goals/goalsData.ts`
- Test: `tests/body-goals/goalsData.test.ts` (with fake supabase chains)

Functions (all parameterized by `(supabase, ...)` so they are testable with fakes):
- `getActiveGoal(userId, supabase): Promise<BodyGoalRow | null>`
- `getWeightSeries(userId, sinceISO, supabase): Promise<WeightPoint[]>` (reads `body_tracker_weight(weight_lbs, created_at)` ordered ascending, mapped to `{ date: created_at.slice(0,10), weightLb }`)
- `getLatestWeightLb(userId, supabase): Promise<number | null>`
- `getLoggedKcalWindow(userId, startISO, endISO, supabase): Promise<{ avgKcal: number; daysLogged: number }>` (UNION `meals(calories_kcal, logged_at, source, legacy_nutrition_log_id)` + legacy `meal_logs(calories, meal_date)`, dedupe by `legacy_nutrition_log_id`, group by day, average daily totals, count distinct logged days; mirrors `bio-optimization-score.ts` union)
- `insertGoalTarget(row, supabase)`, `getLatestTarget(goalId, supabase)`, `getPriorTarget(goalId, supabase)` (second latest), `insertRecalibration(row, supabase)`

- [ ] **Step 1-5:** TDD each with a fake chain (assert the right table/filters are called and the mapping). Commit: `feat(179): body-goals Supabase access layer`.

### Task 4.2: Write-through projection (179a save path)

**Files:**
- Create: `src/lib/body-goals/projectWeightGoal.ts`
- Test: `tests/body-goals/projectWeightGoal.test.ts`

- [ ] **Step 1: Failing test** asserts: given a `body_goals` save, it calls `writeWeightGoal` with `goalWeightKg = lbsToKg(goal_weight_lb)` and `currentWeightKg` from the existing weight goal when present, and that a thrown `writeWeightGoal` is swallowed (returns `{ ok: false }`, never throws).

- [ ] **Step 2-4:** Implement:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { lbsToKg } from '@/lib/weight-goals/guardrails';
import { readWeightGoal, writeWeightGoal } from '@/lib/weight-goals/accessor';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function projectGoalToWeightGoals(
  args: { userId: string; goalWeightLb: number; startWeightLb: number },
  supabase: SupabaseClient,
): Promise<{ ok: boolean }> {
  try {
    const existing = await withTimeout(readWeightGoal(args.userId, supabase), 8000, 'projectWeightGoal.read');
    const currentWeightKg = existing?.currentWeightKg ?? lbsToKg(args.startWeightLb);
    await withTimeout(
      writeWeightGoal({ userId: args.userId, currentWeightKg, goalWeightKg: lbsToKg(args.goalWeightLb), source: 'body_tracker' }, supabase),
      8000, 'projectWeightGoal.write');
    return { ok: true };
  } catch (err) {
    // Fail-open: the body_goals write is authoritative; never block it.
    safeLog.warn('projectWeightGoal', 'write-through projection failed', { err, userId: args.userId });
    return { ok: false };
  }
}
```

- [ ] **Step 5:** Commit `feat(179): write-through projection of goal weight into user_weight_goals (179a save path)`.

### Task 4.3: `recalibrateGoal` (criterion 3)

**Files:**
- Create: `src/lib/body-goals/recalibrate.ts`
- Test: `tests/body-goals/recalibrate.test.ts`

- [ ] **Step 1: Failing test** (fake supabase): an active goal with >=10 logged days in a 14-day window produces an `estimated_tdee_kcal`, inserts a `body_goal_recalibrations` row, and inserts a new `body_goal_targets` row with `source: 'weekly_recalibration'`.

- [ ] **Step 2-4: Implement**

```typescript
// recalibrateGoal: pure-ish orchestration over goalsData.
// 1. window = [today-13, today]; gather avgKcal + daysLogged + weight series.
// 2. if daysLogged < 10 -> return { ok: false, reason: 'insufficient_data' } (no write).
// 3. weightChangeLb = smoothedWeightChange(series, windowStart, windowEnd).
// 4. priorTdee = latest target rationale.tdee (number | null).
// 5. estimatedTdee = estimateAdaptiveTdee({ avgLoggedKcal, weightChangeLb, windowDays: 14, priorTdee }).
// 6. built = buildGoalTarget({ ...goalFields, tdeeOverride: estimatedTdee, source: 'weekly_recalibration', effectiveDate: today });
//    if !built.ok -> return fail (no partial write).
// 7. insert recalibration audit row + insert target row. Return { ok: true, target }.
```

Guard: compute fully in memory, only write after both compute steps succeed (criterion 5: no partial target row).

- [ ] **Step 5:** Commit `feat(179): weekly adaptive recalibration (criterion 3)`.

### Task 4.4: Six API routes

**Files (one per route):** see File Structure. Each mirrors `app/api/body-graphic/interaction/route.ts`: `createClient()` (server), `withTimeout(sb.auth.getUser(), 5000, scope)`, 401 if no user, validate body, do the work in `withTimeout(..., 8000, scope)`, `try/catch` with `isTimeoutError -> 503` and generic `-> 500` plus `safeLog`.

- [ ] **POST `/api/body/goals`** (`route.ts`): validate `{ driver, goalWeightLb, startWeightLb?, targetDate?, targetRateLbPerWeek?, goalBodyfatPct?, activityLevel? }`. Snapshot profile (sex, age, height) + latest weight. Close any existing active goal (`status='active' -> 'abandoned'`). Insert the new `body_goals` row. Call `buildGoalTarget({ source: 'initial_plan', effectiveDate: today, tdeeOverride: null })`; if `ok` insert the `initial_plan` target row; if `setup_required` return 422 with `missing`. Then `projectGoalToWeightGoals(...)` (fail-open). Return `{ ok: true, goal, target, projectedDate }`.
- [ ] **PATCH `/api/body/goals/[id]`**: load the goal (ownership enforced by RLS), apply allowed field edits, `UPDATE`, recompute an `initial_plan`-style target effective today, re-project write-through. Return updated goal + target.
- [ ] **POST `/api/body/goals/[id]/recalibrate`**: call `recalibrateGoal(id, supabase)`; 200 with the new target, or 200 `{ ok: false, reason: 'insufficient_data' }` when under 10 logged days.
- [ ] **POST `/api/body/goals/[id]/override`**: validate `{ calorieTargetKcal }` (and optional macro overrides); build a `manual_override` target row effective today (recompute the split for the chosen calories via `deriveMacroSplit`); insert. Return the override target.
- [ ] **POST `/api/body/goals/[id]/revert`**: read the prior target row (`getPriorTarget`), insert a copy with `source: 'revert'` effective today. Return it.
- [ ] **GET `/api/body/goals/active`**: return `{ goal, latestTarget, recalibrations, trajectory, adherence, projectedDate }` where `trajectory` = EWMA series + projected line + goal line, `adherence` = `getLoggedKcalWindow` over the last 14 days. Resilient; returns `{ goal: null }` when there is no active goal.

Each route gets a thin handler test where practical (import the handler, pass a fake `Request` + stubbed `createClient`), asserting 401 without a user and the happy-path JSON shape. Commit per route or per pair: `feat(179): body goals API route <name>`.

### Task 4.5: Weekly recalibration cron

**Files:**
- Create: `src/app/api/body/goals/recalibrate-cron/route.ts` (GET, service-role client, Bearer `CRON_SECRET` check mirroring `app/api/bos/worker/route.ts`)
- Modify: `vercel.json` (add cron)

- [ ] **Step 1:** Implement the batch: authorize via `Authorization: Bearer ${process.env.CRON_SECRET}` (timing-safe), query all `status='active'` goals, for each call `recalibrateGoal(id, serviceClient)` inside its own try/catch (one failure does not abort the batch), `safeLog` a summary `{ processed, recalibrated, skipped, failed }`.
- [ ] **Step 2:** Add to `vercel.json` `crons`: `{ "path": "/api/body/goals/recalibrate-cron", "schedule": "0 8 * * 1" }` (Mondays 08:00 UTC).
- [ ] **Step 3:** Commit `feat(179): weekly recalibration cron + route`.

---

## Phase 5: Goals tab UI (responsive desktop + mobile from first commit)

Tokens only: Deep Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`. Match existing Body Tracker typography (Inter; do not add a font). Lucide icons `strokeWidth={1.5}`. No emojis, no em or en dashes. Glassmorphism cards `rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 backdrop-blur` matching the existing Body Tracker cards. Responsive: single column on mobile, `md:` two-column where the spec groups fields; inputs `w-full text-base`; verified at 360px and 1280px (criterion 6).

### Task 5.1: Register the tab

**Files:**
- Modify: `src/lib/body-tracker/constants.ts` (insert `{ id: 'goals', label: 'Goals', href: '/body-tracker/goals' }` after the `milestones` entry, line 61)
- Modify: `src/components/body-tracker/BodyTrackerTabs.tsx` (import `Target` from `lucide-react`; add `goals: Target` to `ICONS`)

- [ ] **Step 1:** Apply both edits.
- [ ] **Step 2:** Verify type-check: `npx tsc --noEmit` (expect no new errors).
- [ ] **Step 3:** Commit `feat(179): register Goals tab right of Milestones`.

### Task 5.2: `useActiveGoal` client hook + Goals page shell

**Files:**
- Create: `src/components/body-tracker/goals/useActiveGoal.ts` (fetches `GET /api/body/goals/active`, returns `{ data, loading, error, refetch }`)
- Create: `src/app/(app)/(consumer)/body-tracker/goals/page.tsx` (client page; renders the six section components in order; passes `activeGoal` data down; shows the Trajectory Planner in create-mode when there is no active goal)

- [ ] Commit `feat(179): Goals page shell + useActiveGoal hook`.

### Task 5.3: TrajectoryPlanner (Arnold)

**Files:** Create `src/components/body-tracker/goals/TrajectoryPlanner.tsx`

Fields: current weight (prefilled from latest Arnold log, editable), goal weight, driver toggle (target date vs weekly rate) controlling which dependent field shows, optional goal body-fat percent. Inline feasibility note: when driver is date and the implied rate exceeds the cap (compute client-side preview using the same 2.0 lb/1% rule), render a calm note that the date will be adjusted to stay safe. Primary action POSTs to `/api/body/goals` then calls `refetch()`. Attribution: section header "Trajectory Planner" with an Arnold sublabel. Commit.

### Task 5.4: TrajectoryChart

**Files:** Create `src/components/body-tracker/goals/TrajectoryChart.tsx`

Recharts, mirroring `WeightChart.tsx` container + tokens. Three series from `GET /active.trajectory`: actual EWMA (Teal `#2DA5A0` line), projected (Orange `#B75E18` dashed `strokeDasharray="5 5"`), goal line (Navy `#1A2744` `ReferenceLine`). On-track band as a shaded `Area` between projected and actual. `ResponsiveContainer` for mobile. Empty state mirrors `WeightChart`. Render smoke test in `tests/body-goals/TrajectoryChart.test.tsx` (renders without crashing given a small dataset; uses `@testing-library/react` if present, else a shallow render). Commit.

### Task 5.5: DailyTargetsPanel (Gordon)

**Files:** Create `src/components/body-tracker/goals/DailyTargetsPanel.tsx`

Render calorie target, protein, fat, carb, fiber, added-sugar ceiling (with the 5% stretch marker), hydration from `latestTarget`. Each labeled with provenance "Set by Gordon from your goal trajectory." A link line: "These drive today's Nutrition Score and Daily Macros." Commit.

### Task 5.6: AdaptiveRecalibrationPanel (Gordon)

**Files:** Create `src/components/body-tracker/goals/AdaptiveRecalibrationPanel.tsx`

Current estimated maintenance (latest `estimated_tdee_kcal` or "learning, log 10 days"), last adjustment expected vs actual from the newest `recalibrations` row, a compact history list. "Revert" calls `/revert`; "Switch to manual" opens the override control calling `/override`. Commit.

### Task 5.7: AdherenceProgress + SafetyDisclaimer

**Files:** Create `src/components/body-tracker/goals/AdherenceProgress.tsx` and `src/components/body-tracker/goals/SafetyDisclaimer.tsx`

Adherence: days logged this window, average intake vs target, weight change vs projected, live projected completion date (from `GET /active.projectedDate`). Safety: floor + rate-cap explanation, medical disclaimer, explicit clinician/dietitian note including GLP-1 and weight-affecting medications, peptides educational-only line. Commit.

### Task 5.8: Manual responsive verification (criterion 6)

- [ ] Run the dev server (`npm run dev`, never `npm run build` in the working copy), open `/body-tracker/goals` at 360px and 1280px, confirm all six sections render with no horizontal scroll, and capture the result for the localhost review. Commit any fixes.

---

## Phase 6: Acceptance, audit, localhost gate

### Task 6.1: Full acceptance sweep

- [ ] Run the whole new suite: `npx vitest run tests/body-goals tests/gordon`
- [ ] Confirm each acceptance criterion maps to a green test: criterion 1 (buildGoalTarget rate-driven), 2 (date sub-floor clamp + later projectedDate), 3 (recalibrate produces audit + weekly_recalibration target), 4 (pickResolvedTarget precedence), 5 (fetchResolvedDailyTarget fail-open + recalibrate no-partial-write), 6 (manual responsive), 7 (lint: no emojis, no em/en dashes, Lucide strokeWidth 1.5, tokens only).
- [ ] Run `npx tsc --noEmit` and the linter; fix any `any` or dash violations.

### Task 6.2: Agent-team audit (Jeffery entry point)

- [ ] Route the full diff through the `jeffery` subagent for the Michelangelo + Arnold + Gordon + Hannah review (scope discipline, protected files, no-dashes, validated layouts, resilience, RLS, performance). Address findings.

### Task 6.3: Supabase apply + localhost deploy + gate

- [ ] Apply the migration to Supabase (verify via `list_migrations` first per the local-drift rule).
- [ ] Deploy to localhost:3000 (dev server) for Gary's review. Do not push to main until Gary approves on localhost.
- [ ] After approval: commit remaining work and push to main; generate the paired `.docx` for the Prompt Library.

---

## Self-Review (completed by the planner)

- **Spec coverage:** Section 4 -> Task 0.1. Section 5.1-5.4 -> Tasks 1.3, 1.4. Section 5.5 macro reuse -> Tasks 2.1, 2.2. Section 6 routes -> Task 4.4. Section 8 safety -> Task 1.4 (clamps) + 5.7 (copy). Section 9 resilience -> every route + resolver + projection. Section 10 daily scores -> Tasks 3.1-3.3. Section 7 UI six sections -> Tasks 5.1-5.8. DD-1 -> Phase 3. DD-2 -> Task 4.3 + 5.6 (revert/manual). DD-3 -> Task 1.4. 179a write-through save path -> Task 4.2 + wired in 4.4. Weekly job -> Task 4.5.
- **Type consistency:** `BuiltGoalTarget`, `BodyGoalTargetRow`, `ResolvedDailyTarget`, `solveCalorieTarget` I/O are defined once and reused. `deriveMacroSplit` signature is identical in macroSplit.ts and both callers.
- **No placeholders in the testable core.** Phases 4.4/5.3-5.7 specify files, handlers, props, data bindings, tokens, and tests; pixel polish is intentionally deferred to the localhost gate, which is how this codebase validates UI.
