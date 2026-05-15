# Prompt 168: Quick Logs Slider Standardization, Gordon AI Quality Score Engine, Unified Meal Object Architecture

## Decisions locked by Gary 2026-05-14 (deltas from the original spec)

These supersede the original spec wherever they conflict.

### Section 4.1 / Section 9 (SSOT vs existing nutrition_logs)

Path chosen: A + B combined.

- A: Rewire `src/app/api/nutrition/analyze-text/route.ts` and `src/app/api/nutrition/analyze-photo/route.ts` so the SINGLE row each request inserts lands in the new `meals` table. They stop writing the existing `nutrition_logs` table for new entries from cutover onward.
- B: Dashboard hooks (`useUserMeals`, plus the daily summary aggregator) read a UNION of `meals` and `nutrition_logs` during the 168 to 168a transition window so legacy `nutrition_logs` rows still display in the dashboard while new rows land in `meals`. Once 168a backfills or ages out `nutrition_logs`, the UNION can drop in a future cleanup prompt.

This preserves the SSOT principle for new entries from day one, no UX regression on photo-AI logs.

### Section 2.2 (Calorie slider max)

Calorie slider max raised from 1,500 to 2,500 kcal. Step stays 10. Reason: macro-max algebra (150g protein + 200g carbs + 100g fat) yields 2,300 kcal; restaurant meals routinely hit 1,800 to 2,200. 2,500 covers both with headroom.

### Section 3.3 (Snack sub-distribution)

When `meal_type = 'snack'`, Gordon's per-meal target is computed as `total_snack_kcal_share / count(snacks_logged_today)`, capped at 4 snacks per day for the divisor. Same proportional logic applies to protein, carbs, fat, fiber.

### Section 4.2 (Timezone)

Dashboard "today's meals" filter uses the user's local date, not UTC. Add a derived `logged_at_local_date` GENERATED column on `meals` once we know how the user's timezone is stored. Open question for Build phase: where does the per-user timezone live today? Michelangelo confirms in Outline phase.

### Section 3.4 (Goal-direction blindness)

Acknowledged for v1. Score modifier uses `abs(delta_pct)` and treats over and under target the same. Gordon v1.1 (future prompt) will weight by goal direction. Do NOT add this to 168.

### Score breakdown copy (Sugar)

The "Sugar Penalty" modifier note must clarify the value is total sugar including natural sources, not just added sugar. Wording: "Total sugar from all sources, including natural fruit and dairy". Kelsey reviews final copy before ship.

### Section 7.1 cleanup items

- Delete `src/components/nutrition/QuickMealLog.tsx` once `src/components/meals/QuickLogModal.tsx` is wired in, during the Apply phase.
- Drop the `[#154 force-fresh-chunk v1]` console.log Gary's CDN cache-bust added to `src/app/(app)/(consumer)/nutrition/log-meal/page.tsx` line 26 when Michelangelo rewrites that file's slider implementation.

### Section 7.1 path normalization

The spec uses shorthand paths like `app/log-meal/page.tsx`. Actual paths use Next.js App Router route groups:

| Spec path | Actual path |
|---|---|
| `app/dashboard/page.tsx` | `src/app/(app)/(consumer)/dashboard/page.tsx` |
| `app/log-meal/page.tsx` | `src/app/(app)/(consumer)/nutrition/log-meal/page.tsx` |
| `components/meals/...` | `src/components/meals/...` |
| `components/dashboard/...` | `src/components/dashboard/...` |
| `hooks/...` | `src/hooks/...` |
| `lib/gordon/...` | `src/lib/gordon/...` |
| `__tests__/...` | `viaconnect-web/__tests__/...` or `viaconnect-web/src/__tests__/...` per project convention |
| `supabase/migrations/...` | `viaconnect-web/supabase/migrations/...` |
| `supabase/functions/...` | `viaconnect-web/supabase/functions/...` |

Michelangelo confirms exact convention in Outline phase by reading two existing components and one existing test.

## Tier naming

Keeping "Perfection" as per spec. Gary did not override.

## Original spec verbatim follows below

---

# Prompt 168: Quick Logs Slider Standardization, Gordon AI Quality Score Engine, and Unified Meal Object Architecture

Project: ViaConnect 2026
Local Path: C:\Users\garyf\ViaConnect2026\viaconnect-web
Supabase Project: nnhkcufyqjojdbvdrpky (us-east-2)
Deployment: via-connect2026.vercel.app
Owner: Gary Ferenczi, CEO Farmceutica Wellness Ltd
Predecessor Prompts: 138k v2 (hero cards), 153a (Body Tracker), 117 (App Store Foundation)
Successor: Prompt 168a (Cross-reference wiring across all input channels)

## 1. Executive Summary

Prompt 168 establishes the foundational data and scoring architecture for meal logging across ViaConnect. It accomplishes four objectives in one consolidated push:

- Standardizes the Quick Logs meal slider scale to grams so that Quick Logs, Manual Full Meal Log, Photo AI Log, Meal Tracker Plug-ins, and Wearable inputs all speak the same unit language.
- Expands the slider set from five inputs to eight nutritionally meaningful inputs (Protein, Carbs, Fat, Healthy Fat, Fiber, Sugar, Sodium, Calories) with per-meal ranges grounded in real-world meal sizes.
- Introduces Gordon as the dedicated AI agent persona responsible for personalized meal quality scoring against each user's CAQ-derived daily nutritional targets.
- Enforces a single-source-of-truth Meal Object schema so that whichever log method the user selects is the canonical data record, eliminating double-entry and guaranteeing dashboard parity.

This is a foundation-only prompt. Cross-channel wiring across all five input methods (Quick Logs, Full Manual, Photo Upload, Tracker Plug-in, Wearable) is reserved for Prompt 168a once 168 is locked, shipped, and verified in production.

## 2. Locked Specifications

### 2.1 Slider Unit Conversion

All Quick Logs nutrient sliders move from arbitrary scale to grams (g), except Sodium (milligrams, mg) and Calories (kilocalories, kcal) which use industry-standard nutrition label units. This matches the unit conventions of every downstream data source ViaConnect will integrate including USDA FoodData Central, MyFitnessPal, Cronometer, Lose It, Apple HealthKit, Google Fit, and CGM platforms (Levels, Stelo, Dexcom).

### 2.2 Per-Meal Slider Set and Ranges

The slider set is locked at eight inputs with the following per-meal ranges (see calorie max override above):

| Slider | Unit | Min | Max | Step | Default |
|---|---|---|---|---|---|
| Protein | g | 0 | 150 | 1 | 25 |
| Carbs | g | 0 | 200 | 1 | 40 |
| Fat (Total) | g | 0 | 100 | 1 | 15 |
| Healthy Fat | g | 0 | 100 | 1 | 8 |
| Fiber | g | 0 | 50 | 1 | 5 |
| Sugar | g | 0 | 100 | 1 | 10 |
| Sodium | mg | 0 | 3000 | 50 | 400 |
| Calories | kcal | 0 | 2500 | 10 | auto |

Calories displays as auto-calculated from macros by default using the standard Atwater factors (Protein 4 kcal/g, Carbs 4 kcal/g, Fat 9 kcal/g) with a toggle to manual override for cases where the user has a packaged-food calorie count that does not algebraically match the macro breakdown (common for items containing alcohol, sugar alcohols, or fiber subtraction).

### 2.3 Healthy Fat Validation Rule (Option C, Locked)

Healthy Fat is a subset of Fat (Total). The validation rule is:

`Healthy Fat <= Fat (Total)`

UI enforcement:

- If the user drags Healthy Fat above the current Fat (Total) value, Fat (Total) auto-increases to match.
- If the user drags Fat (Total) below the current Healthy Fat value, Healthy Fat auto-decreases to match.
- A subtle helper text below the Healthy Fat slider reads: "Subset of total fat (mono-unsaturated, poly-unsaturated, omega-3)".

This preserves the dual-slider UX Gary specified while preventing logically impossible inputs.

### 2.4 AI Quality Score Tiers (Locked)

The Quality Score is an integer 0 to 100 with five named tiers and explicit non-overlapping boundaries:

| Tier | Range | Color Token | Hex |
|---|---|---|---|
| Poor | 0 to 19 | Orange Deep | #B75E18 |
| Fair | 20 to 39 | Orange Light | #D4823B |
| Good | 40 to 59 | Amber Neutral | #C9A23A |
| Excellent | 60 to 79 | Teal Light | #5BC0BB |
| Perfection | 80 to 100 | Teal Primary | #2DA5A0 |

The tier color is applied to the score ring or progress bar, the tier label text, and the celebration accent on tier crossover (subtle pulse animation, no confetti, no emoji).

## 3. Gordon AI Scoring Engine

### 3.1 Agent Persona

Gordon joins the multi-agent system as the dedicated Personalized Nutrition Intelligence agent. He sits alongside Jeffery (Orchestrator), Michelangelo (TDD development, OBRA framework), Sherlock (Research), Hannah (UX and Tutorial), Arnold (Body Tracker), LEX (Litigation), Kelsey (Regulatory), Gordon (Personalized Nutrition Scoring and Meal Intelligence) NEW.

Gordon's domain ownership covers personalized daily nutritional target generation from CAQ data, per-meal target distribution based on user meal patterns, Meal Quality Score calculation across all five input channels, whole-food versus processed-food discrimination, macro fit analysis against user goals and current Bio Optimization phase, glucose response interpretation (post-hoc score adjustment from CGM data), future expansion: meal timing analysis, circadian carb fit, post-prandial metabolic load.

Gordon's reasoning tier follows the same Fast / Standard / Ultrathink architecture established for Hannah in Prompt 88, with default Standard for live slider feedback and Ultrathink reserved for daily nutrition reports and weekly trend analysis.

### 3.2 Step 1: Personalized Daily Target Calculation from CAQ

When a user completes the 7-phase CAQ, Gordon generates a personalized daily nutrition target profile stored in a new Supabase table `nutrition_targets`. Inputs consumed:

From CAQ Phase 1 (Demographics): Age, biological sex, height (cm or in normalized to cm), weight (kg or lb normalized to kg).

From CAQ Phase 2 (Health Concerns and Family History): Weight management goal (loss, maintenance, gain, recomposition), cardiovascular risk factors (sodium ceiling tightening, sat fat tightening), diabetes or insulin resistance flags (sugar ceiling tightening, fiber floor raising), kidney function concerns (protein ceiling adjustment).

From CAQ Phase 3 (Physical Symptoms): Digestive issues (fiber adjustment with ramping schedule), energy patterns (carb distribution adjustment).

From CAQ Phase 7 (Lifestyle): Activity level (sedentary, light, moderate, very active, athlete), sleep duration, stress level.

From Body Tracker (Arnold): Lean body mass (when available, drives protein target), body fat percentage, resting metabolic rate (when measured).

From Bio Optimization phase: Current day in 40-day blend cycle (drives the 80/20 to 40/60 weighting of formulation versus lifestyle inputs).

Calculation logic:

```
BMR (Mifflin-St Jeor):
  Male:   BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age - 5 + 5
  Female: BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age - 5 - 161

TDEE = BMR * activity_factor
  Sedentary: 1.2, Light: 1.375, Moderate: 1.55, Very Active: 1.725, Athlete: 1.9

Goal-adjusted daily kcal:
  Loss: TDEE - 500, Maintenance: TDEE, Gain: TDEE + 300, Recomposition: TDEE - 200

Protein target (g):
  Loss: 1.6 to 2.2 g per kg (default 1.8)
  Maintenance: 1.2 to 1.6 g per kg (default 1.4)
  Gain: 1.6 to 2.0 g per kg (default 1.8)
  Recomposition: 2.0 to 2.4 g per kg (default 2.2)
  Adjust DOWN if kidney concerns flagged in CAQ Phase 2.

Fat target (g):
  25 to 35 percent of daily kcal, divided by 9.
  Saturated fat ceiling: 10 percent of daily kcal divided by 9.
  Unsaturated fat floor: 65 percent of total fat target.

Carb target (g):
  Remainder after protein and fat allocations.

Fiber target (g):
  Male: 38 g daily (35 g if age > 50)
  Female: 25 g daily (21 g if age > 50)
  Adjust DOWN by 50 percent for first 14 days if Phase 3 digestive flag set, then ramp.

Sugar limit (g):
  WHO recommendation: added sugar less than 10 percent of daily kcal (ideally less than 5 percent).
  Per-meal ceiling: daily_limit / number_of_meals.
  Tighten by 30 percent if diabetes or insulin resistance flag set in Phase 2.

Sodium limit (mg):
  Default: 2300 mg daily.
  Cardiovascular risk flag: 1500 mg daily.
  Hypertension flag in Phase 2 medications: 1500 mg daily.
```

Recalculation triggers: User updates CAQ answers, Body Tracker logs new biometric measurements, Bio Optimization phase advances past a 10-day boundary, user explicitly requests target recalculation via Profile settings, goal change in Profile. Recalculation does NOT trigger on every meal log.

### 3.3 Step 2: Per-Meal Target Distribution

Gordon distributes daily targets across the user's meal pattern. Default distribution (3 meals plus 2 snacks):

| Meal Type | Daily Kcal Share | Notes |
|---|---|---|
| Breakfast | 25 percent | Higher protein bias for satiety |
| Lunch | 30 percent | Even macro distribution |
| Dinner | 30 percent | Lower carb bias if user goal is loss |
| Snack 1 | 7.5 percent | Protein and fat priority |
| Snack 2 | 7.5 percent | Protein and fat priority |

Distribution adapts dynamically: if user historically logs 2 meals per day, distribution shifts to 40 / 40 / 10 / 10. If user historically logs 4 meals plus 3 snacks, distribution flattens. Stored per user and updated weekly based on actual logging behavior (rolling 14-day window).

### 3.4 Step 3: Meal Quality Score Calculation Algorithm

Gordon computes the score using a transparent, additive modifier model. Every meal starts at base 50 and is adjusted by a sequence of modifiers. The final score is clamped to 0 to 100.

```
SCORE = 50

# Macro Fit Modifier (range -30 to +30)
For each macro in [protein, carbs, total_fat]:
  target = per_meal_target_for_user(macro)
  actual = logged_amount(macro)
  delta_pct = (actual - target) / target
  if abs(delta_pct) <= 0.15:   macro_fit_score += 10
  elif abs(delta_pct) <= 0.30: macro_fit_score += 5
  elif abs(delta_pct) <= 0.50: macro_fit_score += 0
  else:                         macro_fit_score -= 10
SCORE += macro_fit_score

# Fiber Bonus (range 0 to +15)
fiber_ratio = logged_fiber / per_meal_fiber_target
if fiber_ratio >= 1.0:   SCORE += 15
elif fiber_ratio >= 0.75: SCORE += 10
elif fiber_ratio >= 0.50: SCORE += 5
elif fiber_ratio >= 0.25: SCORE += 2

# Sugar Penalty (range 0 to -20)
sugar_ratio = logged_sugar / per_meal_sugar_limit
if sugar_ratio >= 2.0:   SCORE -= 20
elif sugar_ratio >= 1.5: SCORE -= 15
elif sugar_ratio >= 1.0: SCORE -= 10
elif sugar_ratio >= 0.75: SCORE -= 5

# Saturated Fat Penalty (Saturated Fat = max(0, Total Fat - Healthy Fat))
sat_fat = max(0, total_fat - healthy_fat)
sat_fat_ratio = sat_fat / per_meal_sat_fat_limit
if sat_fat_ratio >= 2.0:   SCORE -= 15
elif sat_fat_ratio >= 1.5: SCORE -= 10
elif sat_fat_ratio >= 1.0: SCORE -= 5

# Sodium Penalty (range 0 to -15)
sodium_ratio = logged_sodium / per_meal_sodium_limit
if sodium_ratio >= 2.0:   SCORE -= 15
elif sodium_ratio >= 1.5: SCORE -= 10
elif sodium_ratio >= 1.0: SCORE -= 5

# Whole Food Bonus (range 0 to +10)
if whole_food_flag == true:                       SCORE += 10
elif ingredients >= 80 percent whole foods:       SCORE += 7
elif ingredients >= 50 percent whole foods:       SCORE += 4

# Calorie Fit Modifier (range -5 to +5)
kcal_delta_pct = abs(logged_kcal - kcal_target) / kcal_target
if kcal_delta_pct <= 0.15:   SCORE += 5
elif kcal_delta_pct <= 0.30: SCORE += 0
elif kcal_delta_pct <= 0.50: SCORE -= 2
else:                          SCORE -= 5

SCORE = max(0, min(100, SCORE))

# Tier assignment
if SCORE <= 19:   TIER = "Poor"
elif SCORE <= 39: TIER = "Fair"
elif SCORE <= 59: TIER = "Good"
elif SCORE <= 79: TIER = "Excellent"
else:             TIER = "Perfection"
```

### 3.5 Step 4: Score Breakdown Transparency

Every score persists alongside a structured breakdown in JSONB so the user can tap the score and see why it landed where it did. Sample shape:

```json
{
  "final_score": 67,
  "tier": "Excellent",
  "base": 50,
  "modifiers": [
    { "name": "Protein Fit", "value": 10, "note": "Within 15% of your 35g target" },
    { "name": "Carb Fit", "value": 5, "note": "Within 30% of your 50g target" },
    { "name": "Fat Fit", "value": 0, "note": "42% over your 18g target" },
    { "name": "Fiber Bonus", "value": 10, "note": "8g of 10g target" },
    { "name": "Sugar Penalty", "value": -5, "note": "Total sugar from all sources, including natural fruit and dairy, slightly over per-meal guidance" },
    { "name": "Saturated Fat Penalty", "value": 0, "note": "Within healthy range" },
    { "name": "Sodium Penalty", "value": -5, "note": "Slightly elevated sodium" },
    { "name": "Whole Food Bonus", "value": 7, "note": "Mostly whole foods detected" },
    { "name": "Calorie Fit", "value": -5, "note": "Significantly over per-meal kcal target" }
  ],
  "calculated_at": "2026-05-14T18:32:11Z",
  "gordon_version": "1.0.0"
}
```

The breakdown panel renders as an expandable accordion below the score. Card token #1E3054 surface, subtle dividers, Instrument Sans.

## 4. Unified Meal Object Architecture

### 4.1 Single Source of Truth Principle (Locked)

For NEW entries from 168 cutover onward, there is exactly one row per meal in the `meals` table regardless of input channel. The Quality Score reads from this one record. The Dashboard reads from this one record (UNION with legacy `nutrition_logs` during transition per Path B). No shadow copy, no double-write of new entries.

### 4.2 Supabase Schema

Migration file: `viaconnect-web/supabase/migrations/[timestamp]_prompt_168_meals_and_nutrition_targets.sql`

```sql
CREATE TYPE meal_source AS ENUM ('quick_log', 'full_manual', 'photo_ai', 'tracker_api', 'wearable_cgm');
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE quality_tier AS ENUM ('poor', 'fair', 'good', 'excellent', 'perfection');

CREATE TABLE meals (
  meal_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type         meal_type NOT NULL,
  source            meal_source NOT NULL,
  source_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  protein_g           NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g             NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_total_g         NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_healthy_g       NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g             NUMERIC(6,2) NOT NULL DEFAULT 0,
  sugar_g             NUMERIC(6,2) NOT NULL DEFAULT 0,
  sodium_mg           NUMERIC(7,2) NOT NULL DEFAULT 0,
  calories_kcal       NUMERIC(7,2) NOT NULL DEFAULT 0,
  calories_auto_calc  BOOLEAN NOT NULL DEFAULT TRUE,
  whole_food_flag    BOOLEAN,
  ingredients_list   JSONB,
  meal_name          TEXT,
  notes              TEXT,
  raw_input          JSONB,
  quality_score      INTEGER,
  quality_tier       quality_tier,
  score_breakdown    JSONB,
  scored_at          TIMESTAMPTZ,
  gordon_version     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_healthy_fat_lte_total CHECK (fat_healthy_g <= fat_total_g),
  CONSTRAINT chk_source_confidence    CHECK (source_confidence >= 0 AND source_confidence <= 1),
  CONSTRAINT chk_quality_score_range  CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100))
);

CREATE INDEX idx_meals_user_logged   ON meals(user_id, logged_at DESC);
CREATE INDEX idx_meals_user_type_day ON meals(user_id, meal_type, DATE(logged_at));

CREATE TABLE nutrition_targets (
  target_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  daily_kcal             NUMERIC(7,2) NOT NULL,
  daily_protein_g        NUMERIC(6,2) NOT NULL,
  daily_carbs_g          NUMERIC(6,2) NOT NULL,
  daily_fat_total_g      NUMERIC(6,2) NOT NULL,
  daily_fat_saturated_g  NUMERIC(6,2) NOT NULL,
  daily_fat_unsat_g      NUMERIC(6,2) NOT NULL,
  daily_fiber_g          NUMERIC(6,2) NOT NULL,
  daily_sugar_g          NUMERIC(6,2) NOT NULL,
  daily_sodium_mg        NUMERIC(7,2) NOT NULL,
  source_caq_snapshot    JSONB NOT NULL,
  source_body_snapshot   JSONB,
  bio_opt_day            INTEGER,
  meal_distribution      JSONB NOT NULL,
  generated_by_version   TEXT NOT NULL DEFAULT 'gordon-1.0.0',
  generated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at          TIMESTAMPTZ,
  CONSTRAINT chk_daily_kcal_positive CHECK (daily_kcal > 0)
);

CREATE INDEX idx_nutrition_targets_user_effective
  ON nutrition_targets(user_id, effective_from DESC)
  WHERE superseded_at IS NULL;

ALTER TABLE meals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets  ENABLE ROW LEVEL SECURITY;

CREATE POLICY meals_owner_select ON meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY meals_owner_insert ON meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY meals_owner_update ON meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY meals_owner_delete ON meals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY nutrition_targets_owner_select ON nutrition_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY nutrition_targets_owner_insert ON nutrition_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY nutrition_targets_owner_update ON nutrition_targets FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Michelangelo verifies enum-name collisions with existing schema before applying. Verifies `set_updated_at()` function existence (use CREATE OR REPLACE either way).

### 4.3 Source Confidence Defaults

| Source | Confidence | Rationale |
|---|---|---|
| quick_log | 0.70 | User slider estimate, no ingredient detail |
| full_manual | 0.90 | User-entered with ingredient list and portion detail |
| photo_ai | 0.50 to 0.85 | Vision model dependent on photo clarity |
| tracker_api | 0.95 | Direct numeric values from authoritative tracker |
| wearable_cgm | n/a for primary | CGM contributes glucose response only |

### 4.4 Gordon Edge Functions

`viaconnect-web/supabase/functions/gordon-score-meal/index.ts` and `viaconnect-web/supabase/functions/gordon-generate-targets/index.ts`.

`gordon-score-meal` contract:
- Input: `{ meal_id: string }`
- Output: `{ meal_id, quality_score, quality_tier, score_breakdown, gordon_version }`
- Behavior: Load meal, load active nutrition_targets (generate if missing), compute per-meal targets, run scoring algorithm, write back, return payload.
- Invocation: Postgres trigger on meals INSERT and on UPDATE of nutrient fields, fired async via pg_net or supabase_functions HTTP extension.

Client-side mirror at `src/lib/gordon/scoreMeal.ts` for sub-300ms live slider feedback. Jest parity suite mandatory.

## 5. Dashboard Cross-Reference Wiring

### 5.1 Single Logging Action, Universal Update

When a user logs a meal via Quick Log:
1. Quick Log writes one row to `meals`.
2. Postgres trigger invokes `gordon-score-meal` async.
3. Edge function returns score; row updates.
4. Dashboard `useUserMeals` realtime subscription updates in place.
5. Daily summary aggregator reruns.
6. Bio Optimization Score nutrition sub-component reruns.

For analyze-text and analyze-photo routes (per Path A): they ALSO write to `meals` directly from the route handler, with the same trigger firing.

Dashboard `useUserMeals` reads `meals UNION nutrition_logs` during transition (Path B), normalizing legacy rows to the meals shape via a SQL view or in-hook normalization. Michelangelo chooses approach in Outline phase.

### 5.2 Dashboard Components

| Component | Path | Behavior |
|---|---|---|
| Today's Meals Summary Card | `src/components/dashboard/TodaysMealsSummary.tsx` | Live list with score badges |
| Daily Macro Rings | `src/components/dashboard/DailyMacroRings.tsx` | Protein, carbs, fat, fiber rings vs daily targets |
| Average Quality Score Tile | `src/components/dashboard/AverageQualityScoreTile.tsx` | Rolling 7-day average |
| Bio Optimization Score Composite | `src/components/dashboard/BioOptimizationScore.tsx` | Recalc nutrition sub-score on meal change |
| Meal Log Entry Card | `src/components/dashboard/MealLogEntryCard.tsx` | Individual meal with expandable Gordon breakdown |

One `useUserMeals(userId)` subscription per session, not per component.

### 5.3 No Duplicate Detection in 168

Reserved for 168a. User manually deletes duplicates in 168.

## 6. UX Specifications

### 6.1 Quick Logs Modal Layout

Mobile single-column: Meal Type segmented, Date/Time picker, Quality Score ring 140px with tier label updating live, eight nutrient sliders (Calories, Protein, Carbs, Fat Total, Healthy Fat, Fiber, Sugar, Sodium), Whole Food toggle, optional meal name, Save (Teal #2DA5A0), Cancel text.

Desktop two-column: Left ring 180px + tier + expandable breakdown. Right two-column slider grid 4 rows. Bottom Whole Food + meal name + buttons.

Tokens: Deep Navy #1A2744 bg, Card #1E3054 surface, Teal #2DA5A0 actions, Orange #B75E18 low tier. Instrument Sans. Lucide React strokeWidth={1.5}. No emojis. No dashes.

### 6.2 Slider Behavior

Value above thumb with unit. Three subtle reference markers at user's per-meal target, plus 30 percent over, plus 50 percent over. 200ms debounce on score recalc. Keyboard arrows: 1g default, 10g shift-arrow, 50mg for sodium. ARIA: `aria-label="Protein in grams, currently 32"`.

### 6.3 Score Ring

SVG circle with stroke proportional to score. Color interpolates across tier colors. Center: integer score (32pt mobile, 48pt desktop) in Instrument Sans. Tier label below. On tier crossover: single pulse at 1.05 scale over 200ms. No confetti, no emoji, no sound.

### 6.4 Empty State

No CAQ: neutral gray ring, tooltip "Complete your Health Profile so Gordon can score meals against your personalized targets." Generic USDA targets for 2000 kcal diet used as fallback. Re-scored when CAQ completes.

First meal post-CAQ: Hannah tutorial overlay introduces Gordon.

### 6.5 Responsive

Mobile single-column 140px ring. md two-column 160px ring. lg/xl two-column with breakdown expanded 180px ring.

## 7. Implementation Plan

### 7.1 File Map

New files (paths normalized):

- `viaconnect-web/supabase/migrations/[ts]_prompt_168_meals_and_nutrition_targets.sql`
- `viaconnect-web/supabase/functions/gordon-score-meal/index.ts`
- `viaconnect-web/supabase/functions/gordon-generate-targets/index.ts`
- `viaconnect-web/src/lib/gordon/scoreMeal.ts`
- `viaconnect-web/src/lib/gordon/generateTargets.ts`
- `viaconnect-web/src/lib/gordon/types.ts`
- `viaconnect-web/src/lib/gordon/constants.ts`
- `viaconnect-web/src/hooks/useUserMeals.ts`
- `viaconnect-web/src/hooks/useNutritionTargets.ts`
- `viaconnect-web/src/components/meals/QuickLogModal.tsx`
- `viaconnect-web/src/components/meals/NutrientSlider.tsx`
- `viaconnect-web/src/components/meals/QualityScoreRing.tsx`
- `viaconnect-web/src/components/meals/ScoreBreakdownPanel.tsx`
- `viaconnect-web/src/components/dashboard/TodaysMealsSummary.tsx`
- `viaconnect-web/src/components/dashboard/DailyMacroRings.tsx`
- `viaconnect-web/src/components/dashboard/AverageQualityScoreTile.tsx`
- `viaconnect-web/src/components/dashboard/MealLogEntryCard.tsx`
- `viaconnect-web/src/__tests__/gordon/scoreMeal.test.ts`
- `viaconnect-web/src/__tests__/gordon/generateTargets.test.ts`

Modified files:

- `viaconnect-web/src/components/dashboard/BioOptimizationScore.tsx`
- `viaconnect-web/src/app/(app)/(consumer)/dashboard/page.tsx`
- `viaconnect-web/src/app/(app)/(consumer)/nutrition/log-meal/page.tsx`
- `viaconnect-web/src/app/api/nutrition/analyze-text/route.ts` (Path A rewire)
- `viaconnect-web/src/app/api/nutrition/analyze-photo/route.ts` (Path A rewire)

Deleted files:

- `viaconnect-web/src/components/nutrition/QuickMealLog.tsx` (superseded by QuickLogModal)

Untouched: `package.json`, email templates, anything outside scope above.

### 7.2 OBRA Sequence

| Phase | Action | Checkpoint to Gary? |
|---|---|---|
| Outline | Michelangelo writes test plan + path-convention confirmation + schema-collision check report. | YES |
| Build | Migration drafted, edge functions stubbed, types and constants created. Migration NOT applied yet. | YES (before MCP apply) |
| Refine | Client-side `scoreMeal.ts` + `generateTargets.ts` written. Jest parity suite passing. | YES (test report) |
| Apply A | New UI components (QuickLogModal, NutrientSlider, QualityScoreRing, ScoreBreakdownPanel). | NO (combined report at end of Apply) |
| Apply B | Dashboard components + hooks. | NO |
| Apply C | Modify log-meal page + dashboard page + BioOptimizationScore + rewire analyze-text + analyze-photo (Path A) + delete QuickMealLog.tsx. | YES (full diff review) |
| Acceptance | Push to feature branch, Vercel preview build, Gary smoke-tests on localhost or preview. | YES (sign-off before main merge) |

### 7.3 Resilience Hardening (3-Layer Standing Rule)

Edge middleware: timeout on Gordon function invocation 3 seconds. Failover: log error, fall back to client-side score, mark `gordon_version='client-fallback'`.

Server components / SSR: dashboard renders initial snapshot from server select. If select times out at 2s, render skeleton and rely on client realtime.

API routes / server actions / edge functions: all wrap handlers in try/catch fail-open. Score calc failures never block meal save. Row persists with `quality_score=null`, background retry up to 3 attempts with exponential backoff.

## 8. Acceptance Criteria

### 8.1 Functional

User opens Quick Logs and sees eight sliders in locked unit config. Dragging any slider updates score ring in less than 300ms. Healthy Fat cannot exceed Fat Total bidirectionally. Saving creates exactly one meals row. Within 2s of save, quality_score and score_breakdown populated. Dashboard updates without refresh. Tapping score ring opens breakdown accordion with all nine modifier rows. Score uses personalized targets from nutrition_targets when CAQ complete; uses USDA generic adult targets and neutral state if not. Tier crossover triggers pulse animation exactly once per crossover.

### 8.2 Data Integrity

Client and server scoring produce identical scores across 50-meal Jest fixture set. CHECK constraint rejects fat_healthy_g > fat_total_g INSERT/UPDATE. RLS prevents cross-user access. Only one active target per user (superseded_at NULL).

### 8.3 UX and Visual

Mobile no horizontal scroll at 375px. Desktop clean at 1024px and 1920px. Instrument Sans only. Lucide strokeWidth 1.5 only. No emojis. No em-dashes or en-dashes. Tokens exact: #1A2744, #1E3054, #2DA5A0, #B75E18.

### 8.4 Resilience

Killing edge function during save: meal persists with client-fallback score. Killing realtime: dashboard renders via initial server fetch. Network failures during slider: live preview score still updates.

## 9. Out of Scope (Reserved for Prompt 168a)

- Photo upload vision-model NUTRIENT EXTRACTION wiring (the AI parse pipeline). Path A only rewires the WRITE path of the existing analyze-photo route to land in `meals` instead of `nutrition_logs`; the vision-model logic stays untouched.
- Meal Tracker plug-in integrations (MyFitnessPal, Cronometer, Lose It, Apple HealthKit, Google Fit).
- Wearable CGM integration and `glucose_response_adjustment` post-hoc score modifier.
- Cross-channel duplicate detection and reconciliation.
- Helix Rewards meal-quality event triggers.
- Practitioner aggregate nutrition engagement score wiring.
- Weekly trend analysis report (Ultrathink tier).
- Meal timing and circadian carb fit analysis.
- Backfilling existing `nutrition_logs` rows into `meals` (future cleanup prompt).

## 10. Standing Rules Compliance Checklist

Entity name "Farmceutica Wellness Ltd". No em-dashes or en-dashes anywhere. Desktop and mobile simultaneous responsive Tailwind. Lucide strokeWidth={1.5} only. No emojis. getDisplayName() for client-facing names. Append-only Supabase migration. package.json not modified. Email templates not touched. Helix Rewards consumer portal only. FarmCeutica-only product recommendations preserved. No Semaglutide. Retatrutide injectable-only never stacked. Tesofensine removed pending FDA. 64 finished commercial SKUs (peptides practitioner-only educational). Bio Optimization Score (never "Vitality Score"). Bioavailability "10x to 28x" preserved. Tokens: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans. Supabase project nnhkcufyqjojdbvdrpky us-east-2. Deployed at via-connect2026.vercel.app. Local C:\Users\garyf\ViaConnect2026\viaconnect-web.

## 11. Agent Routing

Jeffery orchestrates OBRA gate, sequences Michelangelo's test plan, approves promotion through environments.

Michelangelo owns implementation under OBRA, with Jest parity suite as mandatory acceptance gate.

Gordon is introduced as the in-product AI persona; his implementation IS this prompt. Gordon's voice surfaces in score breakdown copy.

Hannah updates in-app tutorial overlay to introduce Gordon on first meal log post-deployment.

Sherlock not engaged for 168.

Arnold provides read-only biometric inputs.

Kelsey reviews all score breakdown copy for FDA and Health Canada compliance (no diagnostic claims, no treatment claims, no structure-function claims beyond approved bounds).

LEX not engaged.

## 12. Confirmation Status

All six items confirmed by Gary 2026-05-14:
1. Slider unit map locked (with calorie max raised to 2500 kcal).
2. Tier boundaries locked.
3. Gordon scoring algorithm locked (with v1.1 goal-direction note carried).
4. Single-source-of-truth principle locked (with Path A+B for transition).
5. Out-of-scope list correct (Path A nuance noted in Section 9).
6. No additional agents, files, or features.

Jeffery may initiate the OBRA cycle.
