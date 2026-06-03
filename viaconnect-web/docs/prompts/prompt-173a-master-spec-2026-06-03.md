# Prompt 173a: Daily Macros Target Recomputation on the Nutrition Log

**Filed:** 2026-06-03
**Status:** Master spec filed; pending 6 decision-point confirmations + Jeffery ultrathink review
**Relationship to Prompt 173:** Amendment to the Gordon Daily Macros engine defined in Prompt 173. Supersedes the protein basis in 173 Section 5.3, replaces the relevant constants in 173 Section 5.4, activates the diet-philosophy hook that 173 Section 11 left stubbed, and adds Fiber as a fourth tracked macro. Everything in 173 not explicitly changed here still holds, including the safety guardrails in 173 Section 5.5 and the "computed in exactly one place" rule.

**Agents:** Gordon (Nutrition, slug gordon, owns the calculation), Arnold (Body Tracker and FormaVision, supplies body composition), Kelsey (FDA / Health Canada compliance, reviews coefficients and disclaimer), Michelangelo (TDD / OBRA)
**Date:** June 1, 2026
**Stack:** Next.js 14+, TypeScript, Tailwind CSS, Supabase (nnhkcufyqjojdbvdrpky, us-east-2), Capacitor (com.farmceutica.viaconnect), Vercel to viaconnectapp.com
**Delivery model:** Direct push to main. No PRs. Desktop and Mobile built simultaneously. Bio Optimization is the only score name. No em-dashes or en-dashes in any UI copy or comment.

## 0. Confirm before running (6 decision points)

1. **Protein coefficient.** The note reads ".08 grams / lean body weight lbs." 0.08 g per lb would be far too low to be a real protein target (roughly 10 g per day for most people). This prompt reads it as 0.8 grams of protein per pound of lean body mass, which is a standard, defensible figure. Confirm 0.8, or hand back a different value. For reference, 1.0 g per lb of lean mass is a common higher-protein target if you want to push protein up.
2. **Lean body mass requires a body composition input.** Protein is now anchored to lean body mass, not total body weight. Lean mass comes from a measured body fat percentage (FormaVision on Platinum, or manual Body Tracker entry on Gold). When no measurement exists, this prompt estimates lean mass from height, weight, and sex using the Boer equation and labels the target as an estimate. Confirm that lean-mass basis and the estimate fallback. Note this changes 173, where protein was based on total body weight in kilograms.
3. **Display convention for the macro rows.** Your examples were written as pairs, for example "94 / 50" for protein. This prompt reads each pair as consumed / target (the standard tracker convention), with the parenthetical describing how the target is computed. The specific numbers in your examples are treated as illustrative of one user's screen, not as fixed values to hardcode. Confirm the consumed / target reading.
4. **Dietary choice capture point.** Carbs and fat now depend on the user's dietary choice (balanced, Mediterranean, low-carb, keto, higher-carb, plant-based). Confirm where dietary choice is stored. If it is captured in the CAQ wellness goals area or a Nutrition setting, this prompt reads it from there. If it is not captured anywhere yet, this prompt adds a dietary-choice selector in the CAQ wellness goals area and mirrors it in Nutrition settings.
5. **Per-diet split defaults and keto carb cap.** Section 6 lists the fat share per diet and the keto carbohydrate cap (default 30 g net per day). Confirm or adjust.
6. **Fiber basis.** Your note says "14 grams of fiber / 1000 calories consumed." A daily target should not move with what was already eaten, so this prompt computes the fiber target as 14 g per 1000 kcal of the calorie target, which is the established Dietary Guidelines figure. Confirm using the calorie target rather than calories consumed.

## 1. Permanent do-not-touch (reaffirmed)

- No package.json changes without explicit Gary approval. Append-only Supabase migrations. Supabase email templates untouched. Bioavailability copy stays "10x to 28x" verbatim. Helix stays consumer-only.
- Legacy nutrition exception holds: text-description meals via /api/nutrition/analyze-text and /nutrition/log-meal are excluded from macro adherence, exactly as in 173.
- The calorie target itself, including BMR (Mifflin-St Jeor), TDEE, the goal-direction deficit and surplus, the calorie floors, and the weekly rate cap, is unchanged from 173 Section 5.3 and 5.4. This prompt changes only how protein, carbohydrate, fat, and the new fiber target are derived from that calorie target, plus the Nutrition Log display.

## 2. Objective

Upgrade the Daily Macros section on the Nutrition Log so each target is recomputed from the CAQ data established in 173 (current weight, goal weight and direction, Lifestyle and Goals, and the wellness goals), plus a body composition input and the user's dietary choice. Add Fiber as a fourth macro target. The four macro targets are:

- **Protein:** 0.8 g per pound of lean body mass.
- **Carbohydrate:** the remainder after protein and fat, which makes it a direct function of the weight-loss goal (through total calories) and the dietary choice (through the fat share). Keto floors carbohydrate at a low cap.
- **Fat:** driven by the dietary choice, with a healthy-fat floor, rising substantially under keto.
- **Fiber:** 14 g per 1000 kcal of the calorie target.

## 3. What 173a changes relative to 173

| 173 element | 173a change |
|---|---|
| Protein basis (Section 5.3 Step 4) | Replaced. Protein = 0.8 g per lb of lean body mass, not g per kg of total body weight. |
| Protein constants (Section 5.4) | protein_factor_* retired. Replaced by protein_g_per_lb_lbm and the lean-mass source rules. |
| Fat and carb split (Section 5.3 Steps 5 and 6) | Now governed by dietary choice. Carbs remain the balancer in non-keto diets. Keto inverts this: carbs are capped, fat is the balancer. |
| Diet-philosophy hook (Section 11, out of scope) | Activated. Dietary choice now drives the fat and carb split. |
| Macro set (Section 5.1) | Fiber added as a fourth tracked target. |
| daily_macro_targets table (Section 5.6) | Add fiber_g column and lean-mass fields in basis. Append-only migration. |

## 4. Inputs and dependencies

### 4.1 Lean body mass (for protein)

Resolve lean body mass (LBM) by precedence:

1. **Measured.** If a body fat percentage exists from FormaVision (Platinum) or a manual Body Tracker entry (Gold), compute `LBM_kg = current_weight_kg * (1 - body_fat_fraction)`. Use the most recent measurement. Mark the protein target as based on a measured value.
2. **Estimated.** If no body fat measurement exists, estimate with the Boer equation and mark the target as an estimate:
   - Male: `LBM_kg = (0.407 * weight_kg) + (0.267 * height_cm) - 19.2`
   - Female: `LBM_kg = (0.252 * weight_kg) + (0.473 * height_cm) - 48.3`
   - Unspecified or non-binary sex: average the two results, label as an estimate, and route through one named constant so the fallback is auditable.
3. **Convert to pounds for the protein formula:** `LBM_lbs = LBM_kg * 2.2046`.
4. **Recompute the protein target** whenever a new body fat measurement or a new weight lands, consistent with the 173 Section 5.6 recalculation triggers. This ties protein precision to body composition: it improves automatically when a FormaVision scan or a manual body fat entry arrives.

### 4.2 Dietary choice (for fat and carbohydrate)

- Read the dietary choice from the capture point confirmed in decision point 4. Supported values: Balanced (default), Mediterranean, Low-carb, Keto, Higher-carb, Plant-based.
- Plant-based does not change the macro math here. Protein stays lean-mass based and the split follows the Balanced rule unless the user also selects another diet. Plant-based affects food sourcing and suggestions, not the macro targets.
- If no dietary choice is set, default to Balanced and surface a gentle prompt to choose one, so the split is explainable.

## 5. Target formulas and order of operations (Gordon, one pure function)

Compute in this order so the macros always reconcile to the calorie target from 173.

1. **Calorie target.** Unchanged from 173 Section 5.3 (TDEE adjusted by goal direction, clamped by floors and caps).
2. **Protein.** `protein_g = protein_g_per_lb_lbm * LBM_lbs`. Apply the sanity ceiling: protein calories must not exceed `protein_max_pct_of_kcal` of the calorie target. If they would, reduce protein toward the ceiling and log a structured warning.
3. **Fat and carbohydrate, by dietary choice.** Let `remaining_kcal = calorie_target - (protein_g * 4)`.

   **Non-keto diets** (Balanced, Mediterranean, Low-carb, Higher-carb, Plant-based):
   - `fat_kcal = fat_pct[diet] * calorie_target`, enforced to be at least the healthy-fat floor `min_fat_g_per_kg * current_weight_kg * 9`.
   - `fat_g = fat_kcal / 9`.
   - `carb_g = max(0, (remaining_kcal - fat_kcal) / 4)`. Carbohydrate is the balancer.
   - Low-carb additionally caps carbohydrate at `low_carb_cap_pct` of the calorie target; any calories freed by the cap move to fat.

   **Keto:**
   - `carb_g = keto_carb_cap_g` (net carbohydrate cap, default 30 g).
   - `fat_g = max(healthy_fat_floor_g, (remaining_kcal - (carb_g * 4)) / 9)`. Fat is the balancer.
4. **Fiber.** `fiber_g = round(fiber_g_per_1000_kcal * calorie_target / 1000)`.
5. **Reconciliation guard.** If any macro would fall below its floor or go negative, rebalance with this precedence: protein is anchored first, fat is pulled to its healthy-fat floor next, and carbohydrate absorbs the remainder. In keto, carbohydrate is anchored at its cap and fat absorbs the remainder. Never emit a negative or sub-floor macro. Log a structured warning whenever a clamp fires so the constants can be reviewed.

The weight-loss goal enters through the calorie target (a deficit lowers total calories, which lowers carbohydrate grams), satisfying "carbs based on your weightloss goals and dietary choice." The dietary choice enters through the fat share and the keto cap, satisfying "fat based on healthy fats and keto."

## 6. Centralized constants (tunable, Kelsey reviews)

Define all of these in one config module alongside the 173 constants. No magic numbers elsewhere.

| Constant | Default | Notes |
|---|---|---|
| `protein_g_per_lb_lbm` | 0.8 | Protein grams per pound of lean body mass |
| `protein_max_pct_of_kcal` | 0.40 | Sanity ceiling on protein calories, carried from 173 |
| `fat_pct_balanced` | 0.30 | Fat as a share of calorie target |
| `fat_pct_mediterranean` | 0.35 | Higher healthy-fat emphasis |
| `fat_pct_low_carb` | 0.40 | Fat share before the carb cap reallocation |
| `fat_pct_higher_carb` | 0.25 | Lower fat to make room for carbohydrate |
| `fat_pct_plant_based` | 0.30 | Same as Balanced |
| `low_carb_cap_pct` | 0.25 | Carbohydrate ceiling as a share of calorie target |
| `keto_carb_cap_g` | 30 | Net carbohydrate cap per day under keto |
| `min_fat_g_per_kg` | 0.6 | Healthy-fat floor, carried from 173 |
| `fiber_g_per_1000_kcal` | 14 | Dietary Guidelines figure |

## 7. Nutrition Log Daily Macros display

- The Daily Macros section shows the calorie target at the top as consumed / target kcal, then four macro rows: Protein, Carbohydrate, Fat, Fiber. Each row shows consumed / target in grams with its progress indicator, matching the existing component pattern.
- Targets are read from the latest computed `daily_macro_targets` row. The UI never recomputes targets. It only displays them and shows progress against them.
- Each row has an info affordance that states the basis in plain language, for example: "Protein target is 0.8 g per pound of lean body mass (measured)" or "(estimated)"; "Fat target follows your Keto plan"; "Carbohydrate fills the calories remaining after protein and fat"; "Fiber target is 14 g per 1000 calories." This makes every number explainable to the user and to support.
- Framing stays supportive. Exceeding a target is shown neutrally, not as a failure. No streaks, no shaming copy, consistent with 173.
- When a required input is missing (no lean-mass basis at all, or no calorie target because the profile is incomplete), show a clearly labeled "complete your profile to see targets" state rather than a fabricated number, consistent with 173 Section 5.2.

## 8. Recalculation and storage

- Extend the `daily_macro_targets` table from 173 with a `fiber_g` column via an append-only migration. Do not alter prior migrations.
- Extend the basis JSON to record `lbm_kg`, `lbm_source` (measured or estimated), `body_fat_fraction` when measured, `dietary_choice`, and which clamps fired. This keeps every target auditable.
- Recompute and write a new effective-dated row whenever any input changes: goal weight, current weight, a new body fat measurement, activity level, age, sex, or dietary choice.
- One writer service computes and persists. Nutrition Log, Body Tracker, and Dashboard read the latest effective row. RLS stays on and user-scoped.

## 9. Safety (reaffirmed and extended)

- All of 173 Section 5.5 still governs. The eating-disorder safety mode (170c) path returns maintenance-oriented targets and suppresses deficit framing. The sub-18.5 target BMI, pregnancy or breastfeeding, and under-18 paths route to the conservative path.
- Keto is applied only when the user has actively chosen it. The conservative safety path overrides keto: if a safety condition is active, do not push a very low carbohydrate target. Default to a balanced split with the referral notice.
- The disclaimer on the Daily Macros surface stands: general wellness estimates, not medical or dietetic advice, consult a qualified professional. Kelsey signs off on the coefficient set and the disclaimer wording for US and Canada before ship.

## 10. Acceptance criteria (Michelangelo, TDD or OBRA)

- The Daily Macros section shows calories plus four macro rows: Protein, Carbohydrate, Fat, Fiber, each as consumed / target with the correct unit.
- Protein target equals 0.8 g per lb of lean body mass for representative fixtures, using a measured body fat percentage when present and the Boer estimate otherwise, with the measured-versus-estimated label correct in each case.
- Fat and carbohydrate match the Section 5 order of operations for every supported dietary choice, including the keto inversion where carbohydrate is capped and fat is the balancer, and the low-carb cap reallocation.
- Fiber target equals 14 g per 1000 kcal of the calorie target, rounded.
- For every fixture, `protein * 4 + carbohydrate * 4 + fat * 9` reconciles to the calorie target within rounding, and no macro is negative or below its floor.
- The protein sanity ceiling, the healthy-fat floor, the low-carb cap, and the keto cap all fire correctly and log a structured warning when they do.
- Changing dietary choice, weight, body fat, or goal triggers recomputation and a new effective-dated `daily_macro_targets` row, with basis recording lean-mass source and dietary choice.
- The calorie target, BMR, TDEE, deficit and surplus, floors, and rate cap are unchanged from 173 (regression tests pass unchanged).
- The safety paths from 173 still hold, and an active safety condition overrides keto to a balanced split with the referral notice.
- Macro adherence scoring still uses only unified-table meals and excludes legacy text meals.
- The display renders correctly on Desktop and Mobile, info affordances state the basis in plain language, and no em-dashes or en-dashes appear in any new copy or comment.
- No new dependency was added to package.json. The migration is append-only.

## 11. Out of scope

- GENEX360 SNP-aware adjustment of any macro (planned as 170u). The math here is genotype-agnostic.
- Micronutrient targets beyond fiber. Fiber is the only new target added here.
- Adding fiber to the adherence score weighting. Fiber is displayed and tracked; whether it contributes to the nutrition score is a separate decision. For now the adherence weighting from 173 Section 6 (calories and protein) is unchanged.
- CGM, lab outcomes, and meal planning surfaces.

## 12. Build sequence

1. Confirm the six decision points, in particular the protein coefficient, the lean-mass basis, and the dietary-choice capture point.
2. Add the lean-mass resolver (measured precedence, Boer estimate fallback) in the Gordon domain.
3. Resolve or add the dietary-choice input per decision point 4.
4. Replace the protein, fat, and carbohydrate logic in the Gordon Daily Macros pure function with the Section 5 order of operations. Add the fiber computation. Move all new coefficients into the shared constants module.
5. Extend `daily_macro_targets` with `fiber_g` and the expanded basis via an append-only migration. Update the writer service and recalculation triggers.
6. Update the Nutrition Log Daily Macros section to show the four rows plus calories, with per-row basis info and supportive framing, on Desktop and Mobile.
7. Kelsey reviews coefficients and disclaimer. Michelangelo's tests green across Section 10.
