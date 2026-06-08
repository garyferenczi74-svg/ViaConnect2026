# Prompt 179: Body Tracker Goals Tab (Arnold trajectory and Gordon adaptive daily targets) (Specification)

Filed 2026-06-07. Ratified by Gary the same day: DD-1, DD-2, DD-3 approved as written; goal model resolved to Option 1 (`body_goals` is the write authority with write-through to `user_weight_goals`, elaborated in Prompt 179a); build #179 end to end with a localhost:3000 review gate before any push to main.

Platform: ViaConnect (Via Cura consumer brand). Entity: Farmceutica Wellness Ltd. Module: Body Tracker (Arnold). Stack: Next.js / TypeScript / Supabase / Vercel. Delivery: direct push to main after the localhost gate. Desktop and mobile built simultaneously with responsive Tailwind from the first commit.

## 0. As-built reconciliation (verified against main, commit 51f48f61)

The spec below is the intent. These are the verified integration points and the four places where the spec's framing differs from the current code. The build follows this reconciliation.

- Reuse, do not rebuild: the Gordon Daily Macros engine `src/lib/gordon/generateMacroTargets.ts` (protein 0.8 g/lb LBM, fiber 14 g/1000 kcal, floors 1500 M / 1200 F already present); the LBM resolver `src/lib/gordon/lbm.ts` `resolveLeanBodyMass()` (measured body fat yields the Katch-McArdle path, Boer estimate yields the Mifflin path); the hydration target `src/lib/nutrition/hydration/target-personalizer.ts` `personalizeHydrationTarget()`; the resilience utilities `src/lib/utils/with-timeout.ts` and `src/lib/utils/safe-log.ts` (plus `circuit-breaker.ts`).
- The CAQ static target is the row in `nutrition_targets` (written by `/api/nutrition/generate-targets`, read by `src/hooks/useNutritionTargets.ts`). It persists `daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_total_g, daily_fiber_g`. `body_goal_targets` maps onto exactly these five so the daily scores consume the resolved target unchanged in shape. No precedence layer exists yet; DD-1 adds it.
- The unified meals table is `meals` (channel in `source`), with legacy `meal_logs` deduped via `legacy_nutrition_log_id`. The recalibration window reads both, all channels including analyze-text, mirroring the existing union in `src/lib/scoring/bio-optimization-score.ts`.
- Difference 1, no EWMA exists. "Arnold's exponentially smoothed weight trend" is aspirational. This prompt builds the EWMA smoother (default about a 10 day half-life). It powers both the trajectory chart and the recalibration weight-change term.
- Difference 2, `user_weight_goals` already exists (Prompt 173) and already feeds the macro engine and the Weight tab `GoalWeightTimelineCard`. The new `body_goals` is the richer trajectory. Resolution per Prompt 179a: `body_goals` is the single write authority; the goal-save path projects `goal_weight` and `direction` into `user_weight_goals`, fail-open and logged. In #179 this write-through is wired at the Goals tab planner save path only. Redirecting the Weight tab card writer and the CAQ writer is Prompt 179a.
- Difference 3, the codebase renders Inter, not Instrument Sans. Match existing Body Tracker styling; do not add a font dependency (package.json is locked).
- Difference 4, the canonical label is "Bio Optimization Score." Use it wherever the downstream score is referenced.
- Macro derivation: Section 5 (reuse the engine) governs over the looser numbers in Section 5.5. The goal engine feeds `generateMacroTargets` a dynamic calorie target and the engine owns the protein, fat, and carb split. Acceptance criterion 1 reads "protein per the engine's 0.8 g/lb LBM rule."

## 1. Context

The Body Tracker module (Arnold) exposes tabs including "Milestones." This prompt adds a new first-class tab, "Goals," immediately to the right of Milestones (between `milestones` and `metabolic` in `BODY_TRACKER_TABS`, `src/lib/body-tracker/constants.ts`).

The Goals tab is where a member sets a weight trajectory (current weight, goal weight, and either a target date or a target weekly rate). Arnold owns this trajectory and the underlying weight-loss markers. Gordon reads those markers together with the member's actual daily nutrition logs (the unified `meals` table) and sets the daily calorie and macro goals that drive the daily scores (Nutrition Score, Daily Macros, and downstream Bio Optimization Score).

Strategic framing. No single consumer tool seamlessly combines a metabolically honest target-date plan, dynamic recalibration that learns true maintenance calories from real data, and full nutrient tracking. ViaConnect can unify all three because Arnold owns measured body composition (lean body mass when a body fat percent is present) and a smoothed weight trend, and Gordon owns multi-channel logging into one `meals` table. Two differentiators result. First, BMR uses Katch-McArdle seeded with measured lean body mass when available, falling back to Mifflin-St Jeor only when lean mass is unknown. Second, adaptive maintenance reconciles genuine multi-channel intake against the smoothed weight trend, sidestepping the flat 3,500 kcal per pound assumption by measuring real expenditure rather than assuming it.

## 2. Objective

Ship a Goals tab that lets a member define and edit an active weight goal (current weight, goal weight, driver = target date or weekly rate, optional goal body-fat percent); computes an initial daily calorie target and macro split with hard safety floors; recalibrates weekly (Gordon estimates true maintenance TDEE from logged intake and the smoothed weight trend, then updates the calorie target to keep pace); surfaces a trajectory chart, daily targets, adaptive history, adherence, and a live projected completion date; and feeds those daily targets into the daily scores so that, when a goal is active, the daily calorie and macro goals come from Arnold's weight-loss markers rather than the static CAQ targets.

## 3. Design decisions (ratified 2026-06-07, approved as written)

- DD-1: the goal target overrides the static CAQ target with clean precedence. When an active goal exists, the daily calorie and macro target resolves as: (1) a same-day manual override if pinned, (2) the latest effective goal target row, (3) the existing CAQ / Daily Macros static target as the fail-open fallback. When no goal is active, behavior is unchanged. Exactly one resolved target per day, provenance always recorded.
- DD-2: weekly recalibration is auto-applied but transparent and reversible. Gordon computes and applies a new target each week (no modal nag), writes an audit row explaining expected versus actual, and surfaces the change in the Adaptive panel. The member can revert to the prior target or switch to manual.
- DD-3: safety floors are hard constraints that bend the date, never the calories. If a target date would require dropping below the calorie floor or exceeding the maximum safe rate, the engine clamps to the safe value, recomputes a realistic projected date, and surfaces the conflict. The engine never outputs an unsafe calorie target to satisfy a date.

## 4. Data model (append-only migration)

New append-only migration. Do not alter existing columns. Unknown or not-yet-computable nutrient values are stored as NULL, never 0. All `body_*` tables enable RLS with a per-user policy (`auth.uid() = user_id`), uuid pk `gen_random_uuid()`, `user_id` fk to `auth.users(id) ON DELETE CASCADE`, and an `updated_at` trigger where an `updated_at` column exists, mirroring `body_tracker_entries` and `body_photo_sessions`.

### 4.1 body_goals (Arnold-owned trajectory; one active per member)

| column | type | notes |
| --- | --- | --- |
| id | uuid | pk |
| user_id | uuid | fk to auth.users |
| status | text | active, achieved, paused, abandoned |
| driver | text | date or rate |
| start_weight_lb | numeric | snapshot at creation from latest Arnold log |
| goal_weight_lb | numeric | |
| goal_bodyfat_pct | numeric | nullable |
| start_date | date | default today |
| target_date | date | nullable when driver = rate |
| target_rate_lb_per_week | numeric | nullable when driver = date |
| sex | text | snapshot from profile, nullable |
| age_years | int | snapshot, nullable |
| height_in | numeric | snapshot, nullable |
| activity_level | text | sedentary, light, moderate, very, extra; nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

Partial unique index: one row per `user_id` where `status = 'active'` (mirror `uq_customer_archetypes_one_primary` style).

### 4.2 body_goal_targets (Gordon-computed daily targets; versioned, append-only)

| column | type | notes |
| --- | --- | --- |
| id | uuid | pk |
| goal_id | uuid | fk body_goals |
| user_id | uuid | |
| effective_date | date | the date this target becomes active |
| source | text | initial_plan, weekly_recalibration, manual_override, revert |
| estimated_tdee_kcal | int | NULL until enough data |
| calorie_target_kcal | int | post-floor, post-cap |
| protein_g | int | 0.8 g/lb lean body mass per the engine rule |
| fat_g | int | |
| carb_g | int | remainder |
| fiber_g | int | 14 g per 1000 kcal |
| added_sugar_limit_g | int | 10 percent of calories ceiling |
| hydration_ml | int | from the hydration engine, activity-adjusted |
| rationale | jsonb | expected vs actual, clamp reasons, model used |
| computed_at | timestamptz | default now() |

The daily score read path selects the latest `body_goal_targets` row for the goal where `effective_date <= the scoring date`, per DD-1 precedence.

### 4.3 body_goal_recalibrations (adaptive audit; append-only)

| column | type | notes |
| --- | --- | --- |
| id | uuid | pk |
| goal_id | uuid | |
| user_id | uuid | |
| window_start | date | |
| window_end | date | |
| days_logged | int | |
| avg_logged_kcal | int | |
| weight_change_lb | numeric | EWMA endpoint delta |
| estimated_tdee_kcal | int | |
| prev_calorie_target | int | |
| new_calorie_target | int | |
| adherence_pct | numeric | days logged over window length |
| created_at | timestamptz | default now() |

## 5. Energy and macro engine

New engine module under the Gordon nutrition domain (slug `gordon`), consumed by the Arnold Goals UI. Reuse the existing Daily Macros engine for the macro split; this prompt extends it to accept a dynamic calorie target rather than reimplementing macros.

### 5.1 Basal metabolic rate

If Arnold lean body mass is available (body fat percent present, `resolveLeanBodyMass` source measured): Katch-McArdle, BMR = 370 + 21.6 * LBM_kg. Else if sex, age, height, weight are available: Mifflin-St Jeor. Else surface a setup prompt for the missing profile fields; do not silently guess.

### 5.2 Initial maintenance (TDEE)

TDEE_initial = BMR times the activity multiplier (sedentary 1.2, light 1.375, moderate 1.55, very 1.725, extra 1.9). Default to light when activity is unknown, labeled as an estimate to be refined by recalibration.

### 5.3 Adaptive maintenance (the differentiator)

Once at least 10 logged days exist inside a rolling 14-day window: TDEE_estimated = avg_logged_kcal minus (weight_change_lb times KCAL_PER_LB) divided by window_days, where weight_change_lb is the EWMA-smoothed weight at window end minus window start (negative when losing). KCAL_PER_LB defaults to 3500 with an explicit code comment that this is the tissue-energy approximation and the reconciliation, not the constant, is what captures real metabolic adaptation. Blend the estimate with the prior estimate using an exponential weight (alpha default 0.5) to damp noise.

### 5.4 Calorie target solver

Rate-driven: target = TDEE minus (target_rate_lb_per_week times KCAL_PER_LB divided by 7). Date-driven: required_rate = (start_weight minus goal_weight) divided by weeks_remaining; target = TDEE minus (required_rate times KCAL_PER_LB divided by 7). Apply the safety floor and rate cap (Section 8). If clamped, recompute the realistic projected_date and record the clamp in rationale.

### 5.5 Macro and nutrient derivation

Reuse `generateMacroTargets` fed the solved calorie target; the engine owns the split. Protein 0.8 g per lb lean body mass (engine rule). Fat per the engine's dietary-choice split, with a floor of 0.3 g per lb body weight. Carb is the remainder. Fiber 14 g per 1000 kcal. Added sugar limit 10 percent of the calorie target (display a 5 percent stretch marker). Hydration defers to `personalizeHydrationTarget`, activity-adjusted.

## 6. API surface

All new routes carry the standard resilience pattern (Section 9): `withTimeout` timeout race, try/catch fail-open, `safeLog` structured logging.

- POST /api/body/goals: create or replace the active goal (close any prior active goal as superseded). Triggers initial_plan target computation. Projects goal_weight and direction into user_weight_goals on success (Prompt 179a write-through, save path).
- PATCH /api/body/goals/:id: edit goal fields; recompute targets; re-project write-through.
- POST /api/body/goals/:id/recalibrate: run adaptive reconciliation for the current window; write a recalibration audit row and a new target row. Also invoked by the scheduled weekly job.
- POST /api/body/goals/:id/override: pin today's macros manually; write a manual_override target row.
- POST /api/body/goals/:id/revert: revert to the immediately prior target row; write a revert target row.
- GET /api/body/goals/active: return the active goal, latest effective target, recalibration history, trajectory series, adherence, and projected date.

## 7. UI specification (Goals tab)

Tokens only: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18; match existing Body Tracker typography (Inter). Lucide React icons at strokeWidth 1.5. No emojis. Responsive desktop and mobile from the first commit. No em dashes or en dashes in copy.

Tab label "Goals," immediately to the right of "Milestones." Page at `src/app/(app)/(consumer)/body-tracker/goals/page.tsx`, tab entry in `BODY_TRACKER_TABS`, icon in `BodyTrackerTabs.tsx` (Target). Sections top to bottom:

1. Trajectory Planner (Arnold). Current weight (auto from latest Arnold log, editable), goal weight, driver toggle (target date versus weekly rate), the dependent field, optional goal body-fat percent. Inline feasibility note when a date conflicts with safety floors. Primary action sets the goal.
2. Trajectory Chart. Actual EWMA weight trend (Teal), projected trajectory (Orange dashed), goal line (Navy). On-track band shaded. Recharts, mirroring `WeightChart.tsx` token usage.
3. Daily Targets (Gordon). Calorie target, protein, fat, carb, fiber, added sugar ceiling, hydration. Each labeled with provenance, for example "Set by Gordon from your goal trajectory." Link line explaining these drive today's Nutrition Score and Daily Macros.
4. Adaptive Recalibration (Gordon). Current estimated maintenance, last adjustment with expected versus actual, compact history list. Revert and Switch to manual controls.
5. Adherence and Progress. Days logged this window, average intake versus target, weight change versus projected, live projected completion date.
6. Safety and Disclaimer. Floor and rate-cap explanation, medical disclaimer, explicit note to consult a clinician or dietitian, especially with GLP-1 or other weight-affecting medications or conditions. Peptides remain educational only and are never surfaced as commercial goal inputs.

Attribution is consistent: Arnold for body markers, Gordon for nutrition targets.

## 8. Safety constraints (hard)

Calorie floor: configurable, default 1500 kcal male, 1200 kcal female, with a code comment that these are conventional non-medical floors. Never output below the floor. Maximum rate: the lesser of 2.0 lb per week and 1.0 percent of current body weight per week. Date-versus-safety conflict: clamp to the safe value, recompute a realistic projected_date, surface the conflict in UI and rationale. Never bend calories to hit a date. GLP-1 and medication note rendered in the disclaimer; recalibration tolerates larger early weight swings by relying on the smoothed trend.

## 9. Resilience (every new path)

Timeout via `withTimeout` (Promise.race). try/catch with fail-open: if the goal engine or recalibration fails, fall back to the existing CAQ / Daily Macros static target for the day, never block the daily score, and never write a partial target row. Structured `safeLog` of inputs, model chosen, clamps applied, and fallback events.

## 10. Daily scores integration

Extend the daily score resolver so the calorie and macro target for a date resolves per DD-1 precedence (manual override, then latest effective goal target, then static CAQ target). Nutrition Score and Daily Macros consume the resolved target unchanged in shape (the five tracked macros); only the source changes. Bio Optimization Score consumes the resulting Nutrition Score as today. The analyze-text channel and all other channels continue to write to `meals` (source preserved); the recalibration window reads all channels so a text logger is scored identically to a scanner.

## 11. Acceptance criteria (Michelangelo TDD)

1. Creating a rate-driven goal produces an initial_plan target row with calorie target equal to TDEE minus the rate deficit, clamped to the floor, with a non-null macro split where protein equals 0.8 g per lb LBM per the engine rule.
2. A date-driven goal whose date demands sub-floor calories clamps to the floor and returns a recomputed projected_date later than the requested date, with the clamp recorded in rationale.
3. After 10 or more logged days, recalibrate produces an estimated_tdee_kcal, a recalibration audit row, and a new target row whose source is weekly_recalibration.
4. With an active goal, the daily score resolver returns the goal target; with a same-day manual override, it returns the override; with no active goal, it returns the static CAQ target.
5. Forcing an engine exception causes fail-open to the static CAQ target with a structured log entry and no partial target row written.
6. Mobile and desktop layouts both render all six sections without horizontal scroll at 360px and 1280px widths.
7. No emojis, no em or en dashes, Lucide icons at strokeWidth 1.5, tokens only.

## 12. Out of scope

A full differential-equation port of the NIH Hall model (the adaptive reconciliation achieves equivalent practical accuracy; a Hall port can be a later enhancement). Any change to package.json or Supabase email templates. Practitioner exposure of goal internals beyond the existing aggregate engagement score. The Prompt 179a CAQ surface (pace selector in the Weight Goals step, the four extra body_goals columns, lazy backfill, needs_resync self-heal hardening): filed separately, built in a dedicated 179a turn.

## 13. Delivery checklist

Append-only migration for the three tables and indexes. Gordon goal engine module extending the existing Daily Macros engine, plus the new EWMA smoother. Six API routes with full resilience. Goals tab with six sections, responsive from the first commit. Daily score resolver precedence wired and tested. Goal-save write-through to user_weight_goals (179a save path). Weekly recalibration job (Vercel cron). Acceptance tests for the criteria above. Jeffery and Michelangelo agent-team audit. Deploy to localhost:3000 for Gary's gate, then push to main. Paired .md and .docx delivered to the Prompt Library.
