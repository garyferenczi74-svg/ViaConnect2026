# Prompt 173: CAQ Restructure, Weight Goals Capture, and Gordon Daily Macros Engine

**Filed:** 2026-06-03 (spec dated 2026-06-01)
**Owner:** Gary (gary@farmceuticawellness.com)
**Status:** FILED. 4 decision points open; pre-ratifications carried over from 173a HELD state.
**Amended by:** Prompt 173a (Daily Macros recomputation, fiber, lean-mass protein), Prompt 173b (interstitial remap, phase renumbering)

---

## Agents

Jeffery (Orchestrator), Gordon (Nutrition, slug `gordon`), Arnold (Body Tracker), Kelsey (FDA / Health Canada Compliance), Michelangelo (TDD / OBRA).

## Stack

Next.js 14+, TypeScript, Tailwind CSS, Supabase (project nnhkcufyqjojdbvdrpky, region us-east-2), Capacitor (bundle ID com.farmceutica.viaconnect), Vercel to viaconnectapp.com.

## Delivery model

Direct push to main. No PRs. Desktop + Mobile built simultaneously with responsive Tailwind from the first commit. Bio Optimization is the only score name.

---

## 0. Confirm before running (4 decision points)

1. **Interstitial remap** (touches locked 15e map). Moving Lifestyle from position 7 to 2 changes phase order. Assumed semantic binding: interstitials travel with their phase, C6 quote stays with Medications/Supplements/Allergies wherever it sits. Counts preserved: 16 progress dots, 10 interstitials. **RESOLVED by Prompt 173b §1.** Confirm or specify positional remap instead. *(173b confirmed semantic binding.)*
2. **Location of "What are your top wellness goals?" component.** Assumed inside Lifestyle phase, which is why relocating Lifestyle to 2 surfaces wellness goals + activity level early. If it lives elsewhere, name the phase and Weight Goals sub-section attaches there.
3. **Macro default constants.** Section 5.4 lists every coefficient. All centralized in one config module, tunable. Confirm defaults or hand back adjusted. Kelsey reviews disclaimer + safe-range guardrails before ship.
4. **Prompt number reassignment.** A prior NutriVision planning doc tentatively reserved 173 for an i18n foundation prompt. This now occupies 173. To keep the i18n placeholder, renumber it (e.g., 173i or 174).

## 1. Permanent do-not-touch (reaffirmed)

- Supabase email templates untouched.
- package.json no edits without explicit Gary approval.
- Existing applied migrations append-only.
- Legacy nutrition exception (May 14, 2026): `/api/nutrition/analyze-text` Gemini endpoint and `/nutrition/log-meal` full-page editor remain permanent legacy exceptions. Text-description meals do NOT write to unified meals table, are NOT scored by Gordon, do NOT surface on Dashboard, do NOT emit Helix events. Macro adherence scoring in §6 excludes legacy text meals by construction.
- Bioavailability copy stays "10x to 28x" verbatim, unchanged at all three layers.
- Helix Rewards stays consumer-portal only. Practitioners see only the aggregate engagement score (0 to 100).
- No em-dashes, no en-dashes in any new UI copy or comment. Hyphens in compound words are fine.

## 2. Objective

Two coordinated changes sharing one canonical data source.

- **Change 1 (CAQ restructure):** Relocate Lifestyle from position 7 to 2. Add Weight Goals sub-section inside "What are your top wellness goals?". Weight Goals references the current weight already captured in Phase 1 Demographics and captures a goal weight. The pair (current weight, goal weight) + derived goal direction is the single canonical statement of weight intent.
- **Change 2 (Gordon Daily Macros engine):** Compute Daily Macros (calorie + protein + carb + fat targets) from CAQ weight goal + demographics + activity. Surface in Nutrition Log, feed into nutritional scoring, feed goal weight into Body Tracker body composition goals.

Sequenced: Change 1 establishes the canonical weight goal record, Change 2 consumes it.

## 3. Part 1A: CAQ phase reorder (position 7 to position 2)

### 3.1 Canonical phase order

**Current order (7 phases):**
1. Demographics
2. Health Concerns and Family History
3. Physical Symptoms
4. Neuro Symptoms
5. Emotional Symptoms
6. Medications, Supplements, and Allergies
7. Lifestyle

**New order after this prompt (7 phases):**
1. Demographics
2. Lifestyle (moved from 7)
3. Health Concerns and Family History
4. Physical Symptoms
5. Neuro Symptoms
6. Emotional Symptoms
7. Medications, Supplements, and Allergies

### 3.2 Phase index references must be updated, not hardcoded

Medications/Supplements/Allergies was "Phase 6 of 7" in 15 series, now "Phase 7 of 7." Update every phase-position label, progress indicator, and analytics tag referencing phase by old numeric position.

The AI protocol engine that runs after the final phase must be bound to a "final phase complete" event, not a hardcoded phase index. After reorder, final phase is Medications/Supplements/Allergies, and the protocol engine still runs at the end. **The AI protocol engine continues to work WITHOUT GENEX360, exactly as before.** Refactor any hardcoded "after Phase 7" trigger into a trigger keyed off completion of the last phase in the canonical order array.

### 3.3 Progress dots and interstitials

- Preserve counts: 16 progress dots, 10 interstitials.
- Re-derive dot sequence from new phase order so dots advance in order user experiences.
- Per DP1 + 173b: interstitials stay semantically bound to their phase. C6 quote ("What you take matters. What you take it with matters more.") stays with Medications/Supplements/Allergies. Single interstitial video (Supabase `DNA HD.mp4`) unchanged for all interstitials.
- Phase order as DATA, not scattered literals. Canonical order array in ONE module. Progress component, interstitial sequencer, protocol trigger all read from it.

### 3.4 State, resume, analytics

- Users with in-progress CAQ must resume correctly under new order. Lightweight migration of in-flight CAQ session state. If stored session references old phase index, map to new order on load.
- Update funnel/drop-off analytics keying on phase position so historical comparisons remain interpretable. Tag events with stable phase identifier (e.g., `phase_lifestyle`) rather than position number.

## 4. Part 1B: Weight Goals sub-section inside "What are your top wellness goals?"

### 4.1 Placement and behavior

Add Weight Goals sub-section (tab or accordion panel matching existing pattern) inside "What are your top wellness goals?", now in Phase 2 Lifestyle.

Sub-section contains:

- **Current weight, referenced from Phase 1.** Display the current weight user already entered in Demographics as read-only reference in user's unit. Do NOT re-ask. Link labeled to return to Demographics (e.g., "Edit on Demographics"). Value data-bound to Phase 1 field. If user edits weight on Phase 1, Weight Goals reference reflects new value on return.
- **Goal weight input.** Required numeric, same unit as current weight, unit-aware validation. Support metric (kg) and imperial (lb). Store canonical in kilograms, convert for display.
- **Derived goal direction.** Compute Lose / Gain / Maintain from current and goal weight. Small neutral threshold so trivial difference reads as Maintain (default 1.0 kg, configurable). Show as calm factual label, not motivational.

### 4.2 Validation and guardrails (Kelsey reviews)

- Goal weight must be positive within physiologically sane band for user's height. Reject implausible.
- If goal weight implies target BMI < 18.5 for user's height, don't block silently. Surface calm non-alarming note recommending healthcare professional. Route to conservative path in §5.5.
- If 170c eating-disorder safety mode active: defers to that mode. Does not push deficit, does not display rate-of-loss framing, presents maintenance-oriented professional-referral copy. Macro engine path defined in §5.5. Reuse existing 170c signal. No parallel detection system.
- Tone supportive and neutral. No numeric goal framed as success or failure. No streaks, pressure, or comparison.

### 4.3 Canonical data model (new, append-only migration)

Create new table as single canonical source of weight goal intent, readable by CAQ, Body Tracker (Arnold), Nutrition / Macros engine (Gordon). Compute goal direction in exactly one place, mirroring Bio Optimization "computed in exactly one place".

**Proposed table `user_weight_goals`:**

- `id` (uuid, pk)
- `user_id` (uuid, fk, RLS scoped)
- `current_weight_kg` (numeric) snapshot at capture time + reference to live Demographics value so engine can recompute on change
- `goal_weight_kg` (numeric)
- `goal_direction` (enum: lose, gain, maintain) derived, written by one service
- `source` (text, default `caq`) for attribution
- `created_at`, `updated_at` (timestamptz)

Requirements:

- RLS on, policies scope reads + writes to owning user. Consumer health data.
- Append-only migration file.
- One writer service owns `goal_direction`. No component recomputes direction independently.
- Typed read accessor that Body Tracker and Gordon both import. Single read path AND single write path.

## 5. Part 2: Gordon Daily Macros engine

### 5.1 What "Daily Macros" means here

Daily target set Gordon computes:
- Calorie target (kcal/day)
- Protein target (g/day)
- Carbohydrate target (g/day)
- Fat target (g/day)

Determined by CAQ weight goal + demographic + activity inputs below. Basis for Nutrition Log diet/calorie intake display, daily protein recommendation, macro adherence contribution to nutritional scoring (§6).

*(Amended by 173a: adds Fiber as a fourth target.)*

### 5.2 Inputs

All inputs exist in CAQ after this prompt:

- Current + goal weight from `user_weight_goals` (§4.3)
- Height, age, biological sex from Demographics (Phase 1)
- Activity level from Lifestyle (now Phase 2)

If any required input missing: engine returns clearly labeled "estimate unavailable, complete your profile" state. Never fabricates a default body metric.

### 5.3 Calculation (centralized in Gordon, computed in exactly one place)

Single pure function in Gordon domain. Nutrition Log, Body Tracker, Dashboard all consume one computed result. Recompute when any input changes (§5.6).

**Step 1, BMR (Mifflin-St Jeor):** Convert to kg + cm.
- Male: `BMR = (10 * kg) + (6.25 * cm) - (5 * age) + 5`
- Female: `BMR = (10 * kg) + (6.25 * cm) - (5 * age) - 161`
- Sex unspecified or non-binary: default to average of the two constant terms (use `-78` in place of `+5` or `-161`). Label result as estimate. Single named constant for the fallback.

**Step 2, TDEE:** `TDEE = BMR * activity_multiplier`, where:
- Sedentary: 1.2
- Lightly active: 1.375
- Moderately active: 1.55
- Very active: 1.725
- Extra active: 1.9

**Step 3, calorie target by goal direction:**
- Maintain: `calorie_target = TDEE`
- Lose: `calorie_target = TDEE * (1 - deficit_pct)`, clamp so absolute deficit <= `max_deficit_kcal`, apply calorie floor §5.4
- Gain: `calorie_target = TDEE * (1 + surplus_pct)`, clamp so absolute surplus <= `max_surplus_kcal`

**Step 4, protein target:** `protein_g = protein_factor * reference_weight_kg`, where:
- `reference_weight_kg` is goal weight for Lose + Gain; current weight for Maintain. Using goal weight on Lose avoids over-prescribing protein for higher starting weights.
- `protein_factor` defaults: Lose 2.0, Maintain 1.6, Gain 1.8 (g/kg)
- Clamp into 1.2 to 2.4 g/kg of reference weight. Sanity check: protein calories not > 40% of calorie target. If yes, reduce `protein_factor` toward band minimum.

*(Amended by 173a §3: protein basis changes to 0.8 g per pound of lean body mass, not g per kg of total body weight.)*

**Step 5, fat target:** `fat_g = (calorie_target * fat_pct) / 9`, with hormonal-health minimum `min_fat_g_per_kg * current_weight_kg`. If percentage-based < minimum, use minimum.

**Step 6, carbohydrate target:** Carbohydrate fills remainder.
- `carb_kcal = calorie_target - (protein_g * 4) - (fat_g * 9)`
- `carb_g = max(0, carb_kcal / 4)`
- If `carb_kcal` would be negative (rare, only at very low calorie + high protein + fat minimums): first reduce fat toward minimum, then if still negative reduce protein toward band minimum. Never negative. Log structured warning when clamp fires.

*(Amended by 173a §5: fat + carb governed by dietary choice. Keto inverts so carbs are capped and fat is balancer.)*

### 5.4 Centralized constants (tunable, confirm DP3)

All in one config module. No magic numbers elsewhere.

| Constant | Default | Notes |
|---|---|---|
| `deficit_pct` | 0.18 | 18% below TDEE for Lose |
| `surplus_pct` | 0.12 | 12% above TDEE for Gain |
| `max_deficit_kcal` | 600 | Absolute daily deficit cap |
| `max_surplus_kcal` | 500 | Absolute daily surplus cap |
| `calorie_floor_female` | 1200 | Hard floor, kcal/day |
| `calorie_floor_male` | 1500 | Hard floor, kcal/day |
| `protein_factor_lose` | 2.0 | g/kg of reference weight *(retired by 173a)* |
| `protein_factor_maintain` | 1.6 | g/kg of reference weight *(retired by 173a)* |
| `protein_factor_gain` | 1.8 | g/kg of reference weight *(retired by 173a)* |
| `protein_band_min` | 1.2 | g/kg, lower clamp *(retired by 173a)* |
| `protein_band_max` | 2.4 | g/kg, upper clamp *(retired by 173a)* |
| `protein_max_pct_of_kcal` | 0.40 | Sanity ceiling on protein calories |
| `fat_pct` | 0.28 | Fat as share of calorie target *(replaced by 173a per-diet table)* |
| `min_fat_g_per_kg` | 0.6 | Hormonal-health minimum |
| `maintain_threshold_kg` | 1.0 | Below this gap reads as Maintain |
| `weekly_rate_cap_pct` | 0.01 | Max change per week, 1% of body weight |

**Calorie floor rule:** Lose-path calorie target is never below sex-based floor AND never below BMR. Effective floor = max(configured floor, BMR).

### 5.5 Safety and special populations (Kelsey reviews, defers to 170c)

- If 170c eating-disorder safety mode active: conservative path. Maintenance-oriented targets only. Suppress deficit framing + rate-of-loss messaging. Calm professional-referral notice. Never aggressive calorie target.
- If goal weight implies target BMI < 18.5: conservative path. Professional guidance.
- Pregnancy or breastfeeding, or under 18: do NOT auto-prescribe deficit or surplus. Default to maintenance + professional-referral notice. Reuse existing CAQ signals where they exist. No new collection if data already in profile.
- Rate cap: never imply weight change > `weekly_rate_cap_pct` of body weight per week. Body Tracker timeline projections (§7) respect same cap.
- Disclaimer copy on every macros surface: general wellness estimates, not medical/dietetic/clinical advice, consult qualified professional before significant dietary changes. Kelsey signs off on exact wording for US (FDA, FTC) + Canada (Health Canada) before ship.

### 5.6 Recalculation and storage

- Recompute when any input changes: goal weight, current weight (including new Body Tracker logs), activity level, age, sex.
- Store in new append-only table, e.g., `daily_macro_targets`, keyed by `user_id` + `effective_date`, with `calorie_target`, `protein_g`, `carb_g`, `fat_g`, and `basis` JSON capturing BMR, TDEE, activity_multiplier, goal_direction, clamps_fired. RLS on, user-scoped, append-only migration.
- `basis` column makes every target auditable. Explains to support + Kelsey exactly how a number was produced.
- One writer service computes and writes targets. Nutrition Log, Body Tracker, Dashboard read latest effective row. Do not recompute targets in UI layer.

*(173a §8: extend with `fiber_g` column + `lbm_kg`, `lbm_source`, `body_fat_fraction`, `dietary_choice` in basis.)*

## 6. Nutritional scoring and macro adherence

- Gordon's daily nutrition score incorporates adherence to Daily Macro targets: proximity of logged calories to calorie target, and whether protein target was met, are first-class inputs.
- Adherence computed ONLY from unified meals table. Legacy text-description meals excluded as in current Gordon scoring. Where day's intake includes legacy meals, surface labels them "Score not available for legacy meal" + shows N/A for that portion.
- Framing supportive. Show progress toward targets, not penalties for missing them. No negative or shaming copy.
- If Daily Macros unavailable (incomplete profile): nutrition scoring falls back to existing pre-macro behavior rather than zeroing out. Macro adherence is ADDITIVE, not a gate.

## 7. Body Tracker (Arnold) body composition goals

- Reads goal weight from canonical `user_weight_goals` accessor (§4.3). Does NOT store own separate goal weight.
- Display goal weight as target line against logged weight over time, with current value, goal value, progress indicator.
- Projected timeline to goal based on calorie deficit / surplus, capped by `weekly_rate_cap_pct`. Estimate, same disclaimer posture as macros surfaces.
- When user logs new weight in Body Tracker: that weight becomes live current weight input to macro engine, triggering recalc (§5.6). Body Tracker weight log + Demographics current weight resolve to ONE consistent current-weight value for engine. Documented precedence rule: most recent logged weight wins. Document in code comments.
- Respect existing module ownership: Arnold owns Body Tracker surfaces, Gordon owns macro computation. Shared contract is canonical weight goal accessor + computed macro targets, not duplicated logic.

## 8. Integration map (single source of truth)

- Weight goal intent: written once to `user_weight_goals`, direction computed once.
- Daily Macros: computed once in Gordon, written to `daily_macro_targets`, read by Nutrition Log, Body Tracker, Dashboard.
- No component recomputes goal direction or macro targets independently. Mirrors Bio Optimization "computed in exactly one place" rule. Prevents multi-table divergence observed elsewhere in codebase.

## 9. Responsive UI requirements

- Desktop + Mobile simultaneously with responsive Tailwind from the start.
- Weight Goals sub-section, macros display in Nutrition Log, Body Tracker goal surfaces all render cleanly at mobile widths (Capacitor) + desktop.
- "Edit on Demographics" navigation works in both web flow + Capacitor mobile flow, preserving CAQ state on return.
- WCAG accessibility consistent with existing CAQ + NutriVision surfaces: labeled inputs, sufficient contrast, focus states, screen-reader-friendly labels for derived direction + macro targets.

## 10. Acceptance criteria (Michelangelo, TDD or OBRA)

Write tests first. Must hold:

1. CAQ renders 7 phases in new order with Lifestyle in 2 and Medications/Supplements/Allergies in 7.
2. Progress dots remain 16, interstitials remain 10, C6 quote attached to Medications/Supplements/Allergies.
3. AI protocol engine triggers on completion of final phase regardless of phase index, still runs WITHOUT GENEX360.
4. In-progress CAQ session started under old order resumes without landing on broken step.
5. Weight Goals sub-section displays Phase 1 current weight as read-only reference + working link back to Demographics preserving state on return, web + mobile.
6. Goal weight input validates units, rejects implausible values, derives Lose/Gain/Maintain correctly including Maintain threshold.
7. `user_weight_goals` and `daily_macro_targets` enforce RLS scoped to owning user. Both ship via append-only migrations with no edits to prior migrations.
8. Macro computation matches §5.3 formulas for representative fixtures across all three goal directions and across metric + imperial inputs.
9. All §5.4 clamps fire correctly: deficit cap, surplus cap, calorie floor (max of sex floor + BMR), protein band, protein percent ceiling, fat minimum, non-negative carbohydrate guard.
10. 170c eating-disorder safety mode path returns maintenance-only targets, suppresses deficit framing, shows referral notice. Sub-18.5 target BMI, pregnancy/breastfeeding, under-18 paths route to conservative path.
11. Macro adherence in nutritional scoring uses ONLY unified-table meals + excludes legacy text meals which display N/A.
12. Body Tracker reads goal weight from canonical accessor, shows target line + rate-capped timeline. New logged weight triggers macro recalculation.
13. No component recomputes goal direction or macro targets independently. Exactly one writer for each.
14. No new dependency in package.json. No Supabase email template, applied migration, or "10x to 28x" copy touched. No em-dashes or en-dashes in any new UI copy or comment.

## 11. Out of scope

- GENEX360 SNP-aware macro personalization (planned as 170u). Macro engine genotype-agnostic, works without GENEX360.
- Diet-philosophy macro splits (keto, Mediterranean, etc.). Carbohydrate-and-fat split here is general default. Single named hook where future philosophy modifier could adjust `fat_pct`, but no philosophy logic now. *(Activated by 173a.)*
- CGM, lab outcomes, meal planning surfaces.
- Any Helix reward tied to hitting macro targets. If added, must follow Helix consumer-only rule.

## 12. Build sequence

1. Refactor CAQ phase order into single canonical order array. Update progress dots, interstitial sequencer, phase labels, protocol trigger to read from it. In-flight session remap.
2. Create `user_weight_goals` table, RLS, single read + write accessors.
3. Add Weight Goals sub-section inside wellness goals component, Phase 1 current-weight reference, goal weight input, derived direction, §4.2 guardrails.
4. Build Gordon Daily Macros pure function + centralized constants module. Create `daily_macro_targets`, RLS, writer service with recalculation triggers.
5. Surface Daily Macros in Nutrition Log (diet, calorie intake, daily protein). Wire macro adherence into nutritional scoring with legacy exclusion intact.
6. Wire Body Tracker goal weight, target line, rate-capped timeline through canonical accessor. New weight logs route into recalculation.
7. Kelsey reviews disclaimer + safe-range guardrails. Michelangelo tests green across §10.
8. Push to main.

---

## Live-state findings (carried from 173a HELD memo)

| Spec claim | Actual | Status |
|---|---|---|
| `daily_macro_targets` table | Table is `nutrition_targets` (Prompt #168) | rename violates append-only |
| Gordon Daily Macros pure function | `src/lib/gordon/generateTargets.ts` | exists |
| BMR Mifflin-St Jeor + TDEE | `generateTargets.ts:152-156` + `target-fallback.ts:90-94` | exists |
| FormaVision body_fat_percentage | `body_tracker_weight.body_fat_pct` + segmental + manual `lean_body_mass_lbs` | buildable |
| CAQ dietary-choice field | NOT present; CAQ phase 3 captures `wellness_goals` only | needs build per 173a Gate 2 |
| Daily Macros UI shows 4 macros | `DailyMacroRings.tsx` already shows Protein/Carbs/Fat/Fiber as 4 rings (not rows) | UI pattern mismatch with 173a §7 rows spec |
| `protein_factor_*` constants | `PROTEIN_GRAMS_PER_KG_DEFAULT` in `src/lib/gordon/constants.ts` (4 goal-tuned values) | constants module augmentation |

## Open gates (consolidated 173 + 173a + 173b)

**Resolved:**
- 173 DP1 interstitial remap: semantic binding confirmed by 173b §1.
- 173a DP1 protein basis: goal multiplier on top of 0.8 g/lb LBM. Loss 0.9, Maintenance 0.8, Gain + Recomp 1.0. (Pre-ratified 2026-06-03.)
- 173a DP4 dietary-choice capture: full CAQ selector + onboarding + Nutrition settings, Hannah-owned. (Pre-ratified 2026-06-03.)
- 173b §0 item 1 phase title: retire `Lifestyle & Functional Assessment` everywhere.
- 173b §0 item 2 teaser placement: on the interstitial card.

**Outstanding:**
- 173 DP2 wellness goals location: assumed in Lifestyle. Verify in `src/components/caq/`.
- 173 DP3 macro constants: confirm §5.4 table values.
- 173 DP4 prompt number reassignment: i18n placeholder to 173i or 174.
- 173a DP2 lean body mass basis + Boer fallback + sex-unspecified averaging.
- 173a DP3 display rings vs rows: current is rings (`DailyMacroRings.tsx`), spec calls for rows. Decide whether to swap or amend spec.
- 173a DP5 per-diet split table + keto 30 g cap.
- 173a DP6 fiber basis: 14 g per 1000 kcal of calorie target (not consumed).
- Table name strategy: spec says `daily_macro_targets`, live is `nutrition_targets`. Append-only ALTER adding the new columns to `nutrition_targets`, not a rename.
- `phase6/` directory rename to `phase-meds-supps/` for stable-id discipline.
