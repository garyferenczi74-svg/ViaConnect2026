# Prompt 183: My Nutrition Bento Hub. Inventory, Contracts, and Build Plan

Owner: Gordon. Orchestration: Jeffery. Code quality and OBRA: Michelangelo.
Tree: `src/app/(app)/(consumer)/nutrition/`. Branch: `main`. Migrations: none required.

This note is the Step 1 (inventory) and Step 2 (crossover contract) deliverable. The
Step 6 verification walks it line by line. Built read-only over existing data: no new
tables, no new writes, no new section routes.

## 0. Decisions ratified by Gary (2026-06-10)

1. Launcher tiles (Save My Meal, Nutrition Insights, Nutrition by Genetics): EXPAND
   INLINE on the hub. No new routes. The Open control toggles a full width panel that
   renders the existing component unchanged.
2. Unmapped sections (My Recipes, Connected App synced meals dropdown): rendered as
   full width SECTIONS BELOW the eight tiles. My Recipes stays behind its flag; the
   dropdown self hides when no app is connected. Nothing lost.
3. Display name wiring: render the Guided by Gordon pill via `getDisplayName('gordon')`
   and self heal the shared map by ADDING `gordon: "Gordon"` (additive). H1 title
   "My Nutrition" stays a literal, matching My Biology.
4. Deploy gate: commit to `main` locally, verify, run the Jeffery and Michelangelo
   review chain, then HOLD before push for Gary's localhost:3000 sign off.

## 1. Inventory: current /nutrition surface

Routes under the tree (all that exist today):
- `/nutrition` -> `nutrition/page.tsx` (the landing being redesigned)
- `/nutrition/log-meal` -> `log-meal/page.tsx` (text meal entry)
- `/nutrition/log-meal/review` -> `log-meal/review/page.tsx` + `ReviewForm.tsx`
- `/nutrition/photo-ai` -> `photo-ai/page.tsx` (mounts NutriVisionTab)
- `/nutrition/guide` -> `guide/page.tsx` (genetics nutritional guide)
No layout/error/loading boundaries, no route handlers, no server actions in the tree.

Section components rendered by the current landing (all preserved):
| Component | Path | Props | Role |
| --- | --- | --- | --- |
| NutritionScoreCard | components/nutrition/NutritionScoreCard.tsx | `{ userId?: string\|null }` | Nutrition Score gauge (+2 secondary gauges) |
| DailyMacrosCard | components/nutrition/DailyMacrosCard.tsx | none | Daily Macros rings (P/C/F/Fiber) |
| ConnectedAppMealDropdown | components/nutrition/ConnectedAppMealDropdown.tsx | none | Synced meals from connected apps |
| DailyTotalsTab | components/nutrition/DailyTotalsTab.tsx | `{ onGoToLog: () => void }` | wraps TodaysMealsSummary |
| TodaysMealsSummary | components/nutrition/TodaysMealsSummary.tsx | `{ meals, userTimezone? }` | Today's Meals accordion + Hydration (has delete/edit = writes) |
| MyMeals | components/nutrition/MyMeals.tsx | `{ onRelog?: () => void }` | Saved meal library (relog) |
| NutritionInsights | components/nutrition/NutritionInsights.tsx | `{ mealsLoggedToday, score }` | Insight copy |
| MealHistory | components/nutrition/MealHistory.tsx | none | 7 day dot grid (no streak today) |
| RecipesLibrarySection | components/recipes/RecipesLibrarySection.tsx | none | My Recipes (flag NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED) |
| MobileHeroBackground | components/ui/MobileHeroBackground.tsx | many | full bleed hero (REMOVED: hub is plain Deep Navy) |
| useNutrivisionManualLogHandoff | hooks/useNutrivisionManualLogHandoff.ts | hook | conditional handoff banner (preserved) |

Nav: a single entry `{ href: "/nutrition", label: "My Nutrition", icon: Apple }` in both
`components/layout/Sidebar.tsx` and `components/layout/MobileNavBar.tsx`. No sub items.
Replacing the top level navigation with the hub therefore means: make `/nutrition`
render the hub. NO nav file change required.

### Tile to source mapping (8 tiles)
| Tile | Source today | Hub treatment |
| --- | --- | --- |
| Nutrition Score | NutritionScoreCard score path | Inline gauge tile, reuse selector + gauge, no Open |
| Daily Macros | DailyMacrosCard / DailyMacroRings | Inline gauge tile (% to target) + P/C/F/Fiber readouts, no Open |
| Log Your Meal | page TABS (3 pills) | Tile with 2 teal glass pills: Log a Full Meal -> /nutrition/log-meal, NutriVision -> /nutrition/photo-ai. (3rd pill Connect Your App becomes the bottom Connect strip) |
| Today's Meals | DailyTotalsTab/TodaysMealsSummary | NEW read only accordion matching mockup 5.3, reuse data + colors, no Open, no writes |
| Save My Meal | MyMeals | Tile + Open expands `<MyMeals/>` inline |
| Nutrition by Genetics | inline genetics section | Tile + Open expands the genetics actions inline (See NutrigenDX Results -> /genetics, Upload Nutrition Test -> /genetics, Review Nutrition Results -> /nutrition/guide) |
| Nutrition Insights | NutritionInsights | Tile + Open expands `<NutritionInsights/>` inline |
| 7 Day Meal History | MealHistory | NEW full width tile: streak gauge 1..7 + daily bars, reuse meals query, no Open |

Unmapped (resolved per decision 2, rendered below the bento, nothing dropped):
- RecipesLibrarySection (My Recipes), behind NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED.
- ConnectedAppMealDropdown, self hides when no nutrition app connected.
- useNutrivisionManualLogHandoff banner: preserved, rendered conditionally near Log Your Meal.

### Noted behavior delta (surface to Gary at delivery, not a blocker)
The current Today's Meals (TodaysMealsSummary) supports delete with a 5s undo. Contract B
makes the hub Today's Meals READ ONLY, so the new accordion does not carry delete/edit.
TodaysMealsSummary stays in the codebase untouched. If Gary wants inline delete preserved
on the hub, that is a follow up; it is intentionally out of 183 per Contract B.

## 2. Crossover contracts (PROTECTED. do not change these signatures)

Contract A. Nutrition Score
- Selector: `calorieWeightedMealQualityScore(meals: ReadonlyArray<ScoredMealContribution>): number` @ `src/lib/gordon/daily-aggregate.ts`.
- Gauge: `NutritionScoreCircleGauge(props: NutritionScoreCircleGaugeProps)` @ `src/components/nutrition/NutritionScoreCircleGauge.tsx` (wraps PlasmaGauge).
- Consumers: hub NutritionScoreCard (meals table path); Dashboard `DailyScoresPanel.tsx` (independent meal_logs path, DO NOT TOUCH); BOS reads engagement only via `getNutritionSource` @ `src/lib/scoring/sources/nutrition-source.ts` (does not call the score fn). Hub reuses the score path, never recomputes.

Contract B. Unified meals + Quick Log
- Read: `useUserMeals(userId, { days, includeLegacy })` @ `src/hooks/useUserMeals.ts`, React Query key `['user-meals', userId, days, includeLegacy]`, canonical `meals` table + legacy `nutrition_logs` (read), dedup by `legacy_nutrition_log_id`.
- All write doors converge on `POST /api/nutrition/meals` (Quick Log, log-meal, NutriVision). Hub adds NO write door. New read only Today's Meals reuses the same hook + key (shares cache, no duplicate record).

Contract C. Daily targets
- Source: `useNutritionTargets(userId)` -> `NutritionTargets` @ `src/lib/gordon/types.ts`; table `nutrition_targets`; fallback `generateTargets()` @ `src/lib/gordon/generateTargets.ts`.
- Daily Macros tile reads these (dailyProteinG/dailyCarbsG/dailyFatTotalG/dailyFiberG). Hydration target is SEPARATE: `useHydrationToday()` -> `/api/nutrition/hydration/today` -> `personalizeHydrationTarget` over `profiles` columns. The hub reads, never writes.

Do not rename or re-sign: `calorieWeightedMealQualityScore`, `NutritionScoreCircleGaugeProps`, `useUserMeals`, `fetchUserMeals`, `useNutritionTargets`, `NutritionTargets`, `getNutritionSource`, the `['user-meals', ...]` key, the `meals`/`nutrition_targets` tables, the `/api/nutrition/meals` endpoint.

## 3. Reuse primitives (My Biology = body-tracker hub)

Import directly, unchanged (generic, no body-tracker coupling):
- `src/components/body-tracker/hub/BentoCard.tsx` `{ surface: SurfaceCard, metricValue? }`
- `src/components/body-tracker/hub/CardMedia.tsx` `{ media: SurfaceMedia }` (gradient/image/video drop-in seam; keep gradient placeholders, leave the video seam for Gary)
- `src/components/body-tracker/hub/hubConfig.ts` types `SurfaceCard`, `SurfaceMedia`, `Accent`
- `src/components/gauges/PlasmaGauge.tsx` `{ value, metric, max?, size?, variant?, finish? }` center text auto sized at 27% of size. NO new gauge math.
- `src/components/body-tracker/hub/AssessmentRetakeCard.tsx` (Retake strip, links to the CAQ flow `/onboarding/i-caq-intro`) reuse directly.

Mirror as nutrition local (to leave My Biology untouched), modeled on the originals:
- Getting Started strip (model: `GuidanceStrip.tsx`) with Gordon copy and avatar slot.
- Connect your app strip (model: `ConnectionsStrip.tsx`) linking to `/plugins/apps`.
- Fail open metrics hook (model: `useHubMetrics.ts`): Promise.race 3-5s, try/catch fail open, one `safeLog.warn` line, missing = undefined (never zero, never invented).

Meal color codes to reuse verbatim: breakfast `#FFB347`, lunch `#2DA5A0`, dinner
`#B75E18`, snack `#7C6FE0`; accordion gradients from TodaysMealsSummary lines 48-53;
hydration sky gradient. Tokens: Deep Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`,
Orange `#B75E18`.

## 4. Design compliance map (mockup = look)

Chrome: eyebrow MY NUTRITION; H1 "Your nutrition at a glance"; subline
"Eight surfaces, one hub. Tap any tile to dive in."; Guided by Gordon pill top right
via getDisplayName('gordon').
Getting Started strip: "Gordon walks you through My Nutrition. Guide coming soon." pill
"My Nutrition Guide coming soon" (text + icon white).
Banded bento: Row1 triad (Nutrition Score, Daily Macros, Log Your Meal). Row2 full
(Today's Meals). Row3 triad (Save My Meal, Nutrition by Genetics, Nutrition Insights;
Open buttons bottom aligned with a guaranteed gap above). Row4 full (7 Day Meal History).
Bottom strips: Connect your app, then Retake your assessment.
Log Your Meal pills: translucent teal glass (semi transparent teal fill, backdrop blur,
soft teal border, faint top highlight, white text), internal Next Link routes.
Resilience: every inline metric (3 gauges + saved count badge) through the fail open
path. Insights "new this week" badge has no real source -> render WITHOUT the badge
(never invent). Standing rules: Instrument Sans, Lucide strokeWidth 1.5, no emoji,
no en/em dashes, responsive desktop+mobile together.

## 5. Build plan (tasks)

T1 Foundations: add `gordon: "Gordon"` to `src/lib/getDisplayName.ts` NAME_MAP (additive,
self healing); create `BackToNutritionLink` (model BackToHubLink, href `/nutrition`,
label "My Nutrition"); mount it at the top of log-meal, log-meal/review, photo-ai, guide
pages (navigation chrome only, no internal change). Tests: getDisplayName('gordon')==='Gordon';
BackToNutritionLink renders href + label.

T2 Data layer: `nutritionHubConfig.ts` (8 tile config + strip configs, reuse SurfaceCard
types); `useNutritionHubMetrics.ts` fail open hook returning string metrics for
nutritionScore (reuse calorieWeightedMealQualityScore over useUserMeals), dailyMacrosPct
(reuse target attainment), streakDays (consecutive days with >=1 meal ending today, from
useUserMeals, user TZ), savedMealsCount (saved_meals). Promise.race 3-5s, try/catch,
safeLog, missing=undefined. Tests: streak math (gaps reset, ends today), fail open returns
empty on throw/timeout, missing renders no chip.

T3 Chrome + strips: header chrome + Guided by Gordon pill (getDisplayName); nutrition
Getting Started strip; Connect your app strip (-> /plugins/apps); reuse AssessmentRetakeCard.
Tests: copy literals present, pill resolves via getDisplayName, strokeWidth 1.5, no dashes.

T4 Today's Meals (read only): `NutritionTodaysMeals.tsx` matching mockup 5.3 (collapsed
row name+kcal+chevron; expand in flow: heading top left, Meal column + Macros column
[Protein/Carbs/Fat/Fiber/Sugar], enlarged Plasma gauge top right with KCAL beneath, no
Total column; Hydration row uses volumes logged/target/remaining from useHydrationToday).
Reuse useUserMeals + color codes. READ ONLY, no writes. Tests: 5 rows; expand layout;
hydration volumes; no POST/DELETE.

T5 History streak tile: `NutritionMealHistoryTile.tsx` full width, PlasmaGauge streak
1..7 (ring fills /7) + daily bars, reuse meals query. Tests: streak + bars + center text fits orb.

T6 Assemble + swap: `NutritionHub.tsx` banded bento wiring T2..T5 + the 2 inline gauge
tiles (Nutrition Score, Daily Macros reusing existing selectors) + Log Your Meal 2 teal
glass pills + Row3 inline expand launchers (MyMeals, genetics actions, NutritionInsights)
+ Row4 history + bottom strips + unmapped sections below bento (RecipesLibrarySection,
ConnectedAppMealDropdown) + preserved handoff banner. Swap `nutrition/page.tsx` to render
NutritionHub on plain Deep Navy (remove MobileHeroBackground). Bottom align Open buttons.

T7 Verify: walk this inventory; confirm Dashboard gauge + Quick Log unaffected; confirm a
meal logs once across doors and appears once on Dashboard and once on hub; confirm Daily
Macros reads the same targets; confirm getDisplayName resolves; confirm My Biology renders
unchanged (no shared primitive was modified); no en/em dashes; `npx tsc --noEmit`;
`npx vitest run` for new tests. Then Jeffery + Michelangelo + Gordon + Hannah review.

## 6. Step 6 verification checklist (walk at the end)
- [ ] Every current /nutrition route still resolves (log-meal, review, photo-ai, guide).
- [ ] Every preserved component still mounts and works from the hub.
- [ ] Dashboard Nutrition gauge unchanged, same selector path.
- [ ] One meal across doors -> once on Dashboard Quick Log, once on hub Today's Meals, no dup.
- [ ] Daily Macros reads `useNutritionTargets`; hydration reads `useHydrationToday`.
- [ ] getDisplayName('gordon') === 'Gordon'; pill renders Gordon.
- [ ] My Biology hub renders with no visual change (no body-tracker file modified).
- [ ] 3 gauges read real sources via fail open; center text fits each orb; missing = no chip.
- [ ] Teal glass pills route internally.
- [ ] No new tables, no new writes, no migration. No en/em dashes anywhere.
- [ ] Hold for Gary localhost review before live push.
