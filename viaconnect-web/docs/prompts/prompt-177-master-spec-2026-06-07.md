# Prompt 177: Nutrition Score and Total Daily Macros Daily Scoring Architecture (Specification)

Filed 2026-06-07. Reflects the 177e correction to sections 4.3, 4.4, and Section 11 (Open Tuning Decision 3): the canonical tracked macro set is calories, protein, carbs, fat, fiber, matching what `nutrition_targets` already targets.

This is an architecture specification, not a single executable task. It defines the canonical scoring model for the `/nutrition` surface and the Dashboard Daily Scores. Implementation prompts (177a, 177b, and so on) will be cut from it. Read it in full before any code is written.

## 1. Decisions Locked

These are settled and are not open for the implementing agent to reinterpret.

- Every score in this model is a daily score. There is no cumulative or perpetually evolving single Nutrition Score number.
- A day's Nutrition Score and Total Daily Macros are live and recomputable during the user's local day, then snapshot into Daily Scores at the end of the user's local day and freeze into an immutable historical point.
- The evolving, motivational experience is delivered by the 7-Day Meal History (expanded to show wins and losses), not by mutating the daily score.
- The Nutrition Score is purely food and macros. The Dashboard daily check-in (energy and recovery and similar subjective inputs) feeds the Bio Optimization Score, not the Nutrition Score.
- Gordon owns the computation of both the Nutrition Score and Total Daily Macros. Gordon slug is exactly `gordon`. Do not route any part of this to Arnold. Arnold remains the Body Tracker engine and has no role here.

## 2. Canonical Data Flow

One direction, one source of truth, recomputed top to bottom whenever the day's meals change:

```
Meal log (quick log | log full meal | photo AI meal log | plug-in meal log)
   -> one Gordon score per meal (channel-agnostic, meal_source enum records origin)
   -> Today's Meals (Breakfast, Lunch, Dinner, Snacks, Hydration)
   -> Daily Macros (calories, protein, carbs, fat, fiber vs personalized targets)
   -> Total Daily Macros (daily score)
   -> Nutrition Score (daily score) = meal quality aggregate + Total Daily Macros
   -> writes both Nutrition Score and Total Daily Macros to Dashboard Daily Scores
```

The Dashboard daily check-in branches off this flow entirely and writes to the Bio Optimization Score, not into the chain above.

## 3. Core Principles

- **One meal, one score, any channel.** All four logging channels write into the single unified `meals` record. Each meal carries exactly one Gordon score. The originating channel is recorded in the existing `meal_source` enum but does not change how the meal is scored. Two channels logging the same food must produce the same score.
- **Single source of truth for the day's meals.** The Nutrition Score, Total Daily Macros, Today's Meals, and the 7-Day Meal History all read from one `meals` dataset for the day. This is why Prompt 176 (single shared meal fetch) is a hard prerequisite. Three independent fetches that can disagree mid-render would let the same day produce different scores in different cards.
- **Idempotent recomputation, never deltas.** Both daily scores are pure functions of the day's scored meals and the user's personalized targets. On any meal add, edit, or delete, recompute the affected day's scores from scratch. Never accumulate or reverse deltas. This is what makes corrections, late logging, and deletions safe.
- **Live during the day, frozen at the boundary.** See Section 5.

## 4. The Daily Atom

### 4.1 Per-meal quality score

Each scored meal has one Gordon quality score on the 0 to 100 scale, tiered with the locked Quality Score bands (non-overlapping integer bounds): Poor 0 to 19, Fair 20 to 39, Good 40 to 59, Excellent 60 to 79, Perfection 80 to 100. This is unchanged from the existing Gordon scoring engine.

### 4.2 Today's Meals population

Scored meals populate Today's Meals grouped into Breakfast, Lunch, Dinner, Snacks, and Hydration. Grouping is by the meal's category, not by its logging channel. A photo AI log and a quick log both land in the same group if they are both lunch.

### 4.3 Daily Macros

**Corrected by Prompt 177e (2026-06-07): the tracked set is five macros, matching the engine.**

The five tracked macros are calories, protein, carbs, fat, and fiber. Daily Macros are the running totals of these five across all of the day's macro-bearing meals, measured against the user's personalized daily targets (sourced from Gordon and the CAQ). Targets represent what is needed to complete the day's intake. The set matches what `nutrition_targets` already persists (`daily_kcal`, `daily_protein_g`, `daily_carbs_g`, `daily_fat_total_g`, `daily_fiber_g`). Fat retains its total, saturated, and unsaturated breakdown as the engine already stores it. Sugar and sodium remain part of Gordon's broader 8-nutrient quality scoring but are not part of the Daily Macros target set.

### 4.4 Total Daily Macros (daily score)

**Corrected by Prompt 177e (2026-06-07): scored across all five tracked macros.**

A 0 to 100 daily score reflecting how well the day's macro totals hit the personalized targets. Structure (the shape is fixed, the exact curves are Gordon tunables, see Section 11):

- Compute a per-macro attainment score for each of calories, protein, carbs, fat, fiber.
- Calories and fat are target-band macros: both under and over the target band reduce the score, because overshooting calories or fat is not a win.
- Protein and fiber are floor-with-cap macros: reaching the target scores full, exceeding it holds near full with diminishing benefit up to a sane cap, and falling short scales down proportionally.
- Carbs follow the engine's macro-fit split (target-band by default with the same tight, loose, wide thresholds the per-meal scoring uses).
- Combine the five per-macro attainment scores into the Total Daily Macros score via the `DAILY_MACRO_WEIGHTS` tunable. Default weighting per 177e: composition macros (protein, carbs, fat, fiber) carry weight 1.0 each; calories is the energy-balance dimension and carries weight 0.5, so it influences the day without naively double-counting energy (calories is approximately 4P + 4C + 9F). This is a Gordon tunable, held in one place at `src/lib/gordon/constants.ts::DAILY_MACRO_WEIGHTS`.
- Per 177d Phase D honesty: a macro with no known contributor today (every meal omitted it on its source channel) is excluded from the weighted average rather than counted as 0. The macros UI surfaces an "Estimated" marker so a partial day reads honestly.

### 4.5 Nutrition Score (daily score)

A 0 to 100 daily score combining two components, both already on the 0 to 100 scale:

- **Meal quality aggregate**: the day's per-meal Gordon quality scores combined into one number. Default aggregation per 177d Phase E is calorie-weighted, so a substantial dinner influences the day more than a small snack, rather than a simple unweighted average that lets a tiny perfect snack mask a poor dinner. Held in `src/lib/gordon/daily-aggregate.ts::calorieWeightedMealQualityScore`. This is a Gordon tunable.
- **Total Daily Macros**: the score from Section 4.4.

`Nutrition Score = (quality weight × meal quality aggregate) + (macro weight × Total Daily Macros)`. Default split is 50/50. This is the most product-sensitive tunable in the model, see Section 11.

The Nutrition Score renders on the same 0 to 100 scale and reuses the same five-tier bands as the meal quality score for visual consistency, unless Gary specifies distinct bands for the daily score.

### 4.6 What the Nutrition Score must never include

The Dashboard daily check-in, energy and recovery, mood, sleep self-report, or any other subjective wellness signal. Those feed the Bio Optimization Score. The Nutrition Score is food and macros only.

## 5. Live and Frozen Lifecycle

### 5.1 Live phase

During the user's local day, the Nutrition Score and Total Daily Macros are live and fully recomputable. Every meal mutation recomputes them.

### 5.2 Intraday framing (do not punish an unfinished day)

During the live phase, do not present a harsh judged tier on a day that is only partially logged. At 9am with only breakfast in, a red Poor score is demotivating and misleading. During the live phase, present the day as progress toward today's targets (macro rings filling, meals logged so far) rather than as a sealed judgment. The judged tier is appropriate once the day is frozen. The underlying value is the same number, the framing differs by phase.

### 5.3 Snapshot and freeze

At the end of the user's local day plus a grace window (default snapshot cutoff is local midnight plus 3 hours, a Gordon tunable, chosen so a late dinner logged at 12:30am still lands on the correct day), the day's Nutrition Score and Total Daily Macros snapshot into Daily Scores and freeze. The frozen value is the immutable historical point that feeds the 7-Day Meal History and any trend view.

### 5.4 Freeze mechanism

Use lazy freeze on read plus a nightly sweep:

- **Lazy freeze**: the first read of a day that is past its snapshot cutoff and not yet frozen triggers the freeze at that moment. This avoids needing a precise per-user cron and handles active users for free.
- **Nightly sweep**: a scheduled job freezes any past-cutoff, not-yet-frozen days for users who did not open the app, so the historical series stays complete with no gaps.

### 5.5 Late-edit policy on a frozen day

Default: the frozen Daily Scores point is immutable. If a user edits or backdates meals into an already-frozen day, the meal data updates for accuracy (and the 7-Day Meal History reflects the corrected meals), but the frozen daily score does not silently change, to preserve the integrity of the historical trend series. Surface a small "edited after close" indicator on any frozen day whose meals changed post-freeze rather than letting the score and the meal list diverge invisibly. If Gary prefers frozen days to recompute and re-snapshot on late edits, that is a one-line policy flip, flagged in Section 11.

## 6. Intraday Engagement: 7-Day Meal History

The motivational layer is the expanded 7-Day Meal History, which is convenient because the three `/nutrition` cards already fetch a 7-day window. It presents the series of frozen daily scores as wins and losses across the week so the user sees momentum and slips at a glance, keeping them engaged across their wellness journey. Derived presentations that may live here include the run of daily tiers, a streak of consecutive days hitting targets (which feeds Helix Rewards naturally on the consumer portal only), and a this-week-versus-last trend indicator. All of these are read-only projections of the frozen daily series. None of them mutate a daily score.

## 7. Boundary and Edge Cases

- **Timezone.** Every "local day" calculation uses the user's stored local timezone, never server UTC. If a user has no stored timezone, fall back to a sensible default and capture it on next session. Day boundaries and the snapshot cutoff are all local.
- **Hydration.** Hydration is logged in Today's Meals but carries no calories, protein, fat, or fiber, so it is excluded from the five-macro math and from Total Daily Macros. Hydration may contribute to a separate completeness or adherence signal and to Helix, and the existing Beverage Hydration Index engine remains its own thing. Do not let hydration distort macro totals.
- **Legacy and unscored meals.** Meals on the pre-177d unscored legacy rows display "Score not available for legacy meal" and have no Gordon quality score. They are excluded from the meal quality aggregate. Whether their macros, if present, count toward Total Daily Macros is a decision flagged in Section 11. Default recommendation: include legacy macros in the macro totals when macro fields are populated, so totals reflect everything eaten, but exclude legacy meals from the quality aggregate since they have no score.
- **Estimated text-channel meals (Prompt 177d).** Text-channel meals carry a `prompt_177d_meta.known_nutrients` map. Macros marked unknown are excluded from the day's totals rather than counted as 0. The user-facing UI surfaces an "Estimated" marker on the per-meal card and on any affected daily macro.
- **Empty day.** A day with zero scored meals has no judged Nutrition Score. Do not render it as a Poor zero. Present it as not logged, and freeze it as a no-data day in the history rather than a zero that would drag down any average.
- **Over-target macros.** Handled by the band and cap shapes in Section 4.4. Overshooting calories or fat must not score as well as hitting the band.

## 8. Ownership and System Placement

- Gordon computes the per-meal score, Total Daily Macros, and the Nutrition Score rollup.
- Both the Nutrition Score and Total Daily Macros write to the Dashboard Daily Scores.
- The Dashboard daily check-in writes to the Bio Optimization Score (the existing 161-series engine), entirely separate from this chain.
- Helix Rewards consumption (streaks and so on) is consumer portal only. Practitioners and naturopaths see only the single 0 to 100 aggregate engagement score and never streaks, tokens, challenges, or leaderboard data.

## 9. Data Model Notes

- All schema changes are append-only migrations. Do not edit applied migrations. Do not touch Supabase email templates. Ask Gary before any package.json change.
- The frozen daily scores require persistence: a daily scores record per user per local day holding the frozen Nutrition Score, frozen Total Daily Macros, the local date, the snapshot timestamp, and a frozen flag. Design so a day can be queried as live (not yet frozen) or frozen.
- Store the user's local timezone if not already stored, so day boundaries and snapshot cutoffs are correct.

## 10. Dependencies

- Prompt 176 (single shared meal fetch on `/nutrition`) is a hard prerequisite. The single source of truth for the day's meals is the substrate that makes "one score per meal" and "one consistent daily computation" actually true rather than three cards that can disagree. Shipped 2026-06-07 (`6407d50d`).
- Prompt 177d (text meal channel scored with honest confidence handling). Shipped 2026-06-07 across Phases A, B, C, D, E.
- Prompt 177e (macro-set realignment to the engine's five). Shipped 2026-06-07 (`97315228`).

## 11. Open Tuning Decisions (Gary to confirm; defaults noted)

These are deliberately not hardcoded because they carry product judgment. Each has a working default so implementation is not blocked, but confirm before they ship.

1. **Nutrition Score component split.** Default 50/50 between meal quality aggregate and Total Daily Macros. This most directly shapes what the score rewards. If macro discipline is the harder, more valued behavior, weight it higher (for example 40 quality / 60 macros).
2. **Meal quality aggregation method.** Default calorie-weighted average across the day's scored meals (177d Phase E shipped 2026-06-07). Alternative is simple unweighted average.
3. **Total Daily Macros internal weighting.** _Corrected by 177e (2026-06-07): five macros._ Default per `DAILY_MACRO_WEIGHTS` in `src/lib/gordon/constants.ts`: composition macros (protein, carbs, fat, fiber) at weight 1.0 each, calories at weight 0.5 as the energy-balance dimension to avoid double-counting energy. Alternative defaults to consider: equal weight across all five (calories 1.0); protein and fiber weighted higher if they are the priority targets; or a different calorie coefficient.
4. **Per-macro attainment curves.** Default: calories and fat as target bands (penalize over and under), protein and fiber as floor-with-cap (reward hitting and modest exceeding, scale down shortfalls), carbs as macro-fit split. Exact slopes and band widths are Gordon constants in `src/lib/gordon/constants.ts`.
5. **Snapshot cutoff grace window.** Default local midnight plus 3 hours.
6. **Frozen-day late-edit policy.** Default immutable with an "edited after close" indicator. Alternative is recompute and re-snapshot on late edits.
7. **Legacy meal macro inclusion.** Default include legacy macros in Total Daily Macros when present, exclude legacy meals from the quality aggregate.
8. **Daily Nutrition Score tier bands.** Default reuse the locked five-tier meal bands. Alternative is distinct bands for the daily score.

## 12. Acceptance Criteria (for the implementation prompts cut from this spec)

- All four logging channels produce exactly one Gordon score per meal, recorded with the `meal_source` enum, and identical food produces an identical score regardless of channel.
- Today's Meals groups scored meals by category (Breakfast, Lunch, Dinner, Snacks, Hydration), not by channel.
- Total Daily Macros and the Nutrition Score are both daily scores, recomputed idempotently from the day's meals on any mutation, with no delta accumulation.
- The Nutrition Score contains no check-in or subjective wellness input. The check-in feeds the Bio Optimization Score.
- A live day shows progress framing, not a punishing judged tier. A frozen day shows a judged tier.
- Days freeze at the user's local cutoff via lazy-freeze-on-read plus a nightly sweep, with no gaps in the historical series.
- The 7-Day Meal History presents frozen daily scores as wins and losses and never mutates a daily score.
- Hydration is excluded from macro math. Legacy meals show "Score not available for legacy meal" and are excluded from the quality aggregate. Empty days are not rendered as zero scores.
- Gordon owns all computation. Both daily scores write to Dashboard Daily Scores.
- All schema changes are append-only. Builds pass with resilience hardening (timeout, try/catch fail-open, structured logging) on the scoring read and compute paths, on both desktop and mobile.

## Amendment Log

- **2026-06-07, Prompt 177e**: corrected sections 4.3 and 4.4 to list five macros (added carbs). Updated Section 11 Decision 3 to reflect `DAILY_MACRO_WEIGHTS` (calories 0.5, composition 1.0 each). Both `nutrition_targets` and the engine already targeted five; the original 177 draft and the pre-177e code each dropped a different macro. The realignment lands the spec on the engine's set: calories, protein, carbs, fat, fiber. Live in code at commits `97315228` (implementation) and `b42243d3` (Phase D honesty pattern).
- **2026-06-07, Prompt 177d Phase E**: meal quality aggregate switched to calorie-weighted average (Section 4.5 default + Section 11 Decision 2). Live at commit `014caaa6`. Helper at `src/lib/gordon/daily-aggregate.ts::calorieWeightedMealQualityScore`.
- **2026-06-07, Prompt 177d Phase D**: daily aggregate honesty (Section 7 Estimated bullet + Section 4.4 unknown exclusion). Live at commit `b42243d3`.
- **2026-06-07, Prompt 177d Phases A, B, C**: text-channel scored as a first-class channel of estimated confidence. Live at commits `08b69c39`, `3de0d687`, `0b8d5601`.
- **2026-06-07, Prompt 176**: single shared `useUserMeals` query on `/nutrition`. Live at commit `6407d50d`.
