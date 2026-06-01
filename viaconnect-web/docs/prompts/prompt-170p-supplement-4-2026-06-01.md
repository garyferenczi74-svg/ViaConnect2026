# Prompt 170p-supplement-4: Meal Suggestion Engine

**Filed:** 2026-06-01
**Status:** Filed Blueprint-ready. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Apr 2027 (parallel with Phase 3 build).
**Owner agent:** Gordon (suggestion scoring algorithm + cold-start public recipe template library + system prompt for suggestion summary + Bio Optimization Score integration + safety mode posture)
**Build agent:** Michelangelo
**UX agent:** Hannah ("Make from your pantry" Dashboard card + Pantry tab suggestions section + cold-start template browser composition with 170f + safety mode adjusted UI per 170c)
**Co-owners:** Arnold (suggestion surfacing + tap + conversion telemetry + 6-month adoption rollup), Kelsey (suggestion disclaimer + ED safety mode posture review)
**Orchestrator:** Jeffery
**Hard-blocked-by:** 170p Phase 1 SHIPPED + at least 6 months of Phase 1 production data + 170f recipe library SHIPPED at sufficient maturity (most active users with at least 5 saved recipes OR public template library at 200+ rows) + 170c ratified at the dietary filter and ED safety mode levels + Anthropic API quota verified at expected suggestion-engine volume
**Provides for 170q:** Suggestion scoring contract reused by forward meal planning.

## 0. Summary

Supplement 4 ships the headline behavioral feature: a meal suggestion engine that turns the pantry into recipe proposals. The user sees "Make from your pantry" cards on the Dashboard and the Pantry tab; each card proposes a recipe scored by:
- How much of the recipe's ingredients are already in pantry (coverage).
- Whether any pantry ingredients are about to expire (expiration boost).
- Whether the user has logged this recipe recently (recency penalty for variety).
- Whether the recipe aligns with the user's dietary filters and 170c safety mode posture.
- Whether the recipe contributes to the user's Bio Optimization Score targets.

Recipes come from two sources via the 170f canonical query contract `getRecipesForSuggestion`: the user's saved recipes (after at least 5 saved, cold-start drops to public templates) and the Gordon-curated public template library (200 recipes spanning common cuisines + diets + difficulties).

Phase 4 closes the pantry-suggestion-meal loop that Phases 1-3 built the inputs for. Headline behavioral metric: pantry_meal_suggestion_conversion_rate above 15% (tapped suggestion + logged meal within 48 hours / total surfacings).

## 1. What it is

A read-only suggestion engine that reads from `pantry_items` + `recipes` + `recipe_public_templates` + (optionally) `meals` log history, scores each candidate, and surfaces top N as suggestions. The user taps a suggestion and is routed to the 170f recipe detail view with quantity-adjusted "Log this meal" CTA pre-filled with pantry-source attribution.

User-facing affordances added in Phase 4:
1. Dashboard "Make from your pantry" card: 3 suggestions ranked by score.
2. Pantry tab "Make from your pantry" section: same 3 + "see more" expansion to 10.
3. Suggestion detail tap: routes to existing 170f recipe detail view (no new UI; 170f detail view is the canonical destination).
4. Logging a suggested meal: inserts `meals` row + decrements `pantry_items.quantity` for matched ingredients via `pantry_consumption_log` rows (with `consumed_via='meal_log_link'`).
5. Pantry auto-deduction opt-in (Settings toggle): when ON, logging ANY meal cross-references pantry items by ingredient and decrements automatically; default OFF until explicit consent because of misattribution risk.

## 2. Why this matters

Phase 1 + 2 + 3 build the pantry; Phase 4 makes the pantry useful in a measurable, daily-frequency way. Without Phase 4, the pantry is a tracker; with Phase 4, the pantry is a decision-making surface. The original 170p positioned this as the headline behavioral feature; the phase split preserved that positioning while sequencing it last.

Cold-start mitigation (the central risk): if 170f maturity is uneven (some users have 5 saved recipes, others have 0), the suggestion engine must work for cold-start users. The 200-recipe Gordon-curated public template library is the cold-start solution.

## 3. Data model

Three small additions. Append-only migrations.

### 3.1 `meals` columns added

```sql
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS suggested_from_pantry BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suggested_from_recipe_id UUID;

CREATE INDEX IF NOT EXISTS idx_meals_suggested_from_pantry
  ON public.meals(user_id, suggested_from_pantry, logged_at DESC) WHERE suggested_from_pantry = TRUE;
```

`suggested_from_pantry=TRUE` flags a meal that originated from a pantry suggestion tap. `suggested_from_recipe_id` references either `recipes.id` or `recipe_public_templates.id` (Phase 4 supplement may discriminate via a separate column; v1 uses one column with a `suggested_recipe_source` enum field added if needed).

### 3.2 `meal_items.consumed_from_pantry_item_id`

```sql
ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS consumed_from_pantry_item_id UUID REFERENCES public.pantry_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meal_items_pantry_link
  ON public.meal_items(consumed_from_pantry_item_id) WHERE consumed_from_pantry_item_id IS NOT NULL;
```

When pantry auto-deduction is on AND a meal_item's canonical name matches a pantry_item's canonical name, this column links them. The corresponding `pantry_consumption_log` row also records the link.

### 3.3 `pantry_suggestion_events` (telemetry + scoring tuning)

```sql
CREATE TABLE IF NOT EXISTS public.pantry_suggestion_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggestion provenance
  recipe_id             UUID,
  template_id           UUID,
  source_corpus         TEXT NOT NULL CHECK (source_corpus IN ('saved', 'public_template')),

  -- Score components (for tuning)
  coverage_score        NUMERIC CHECK (coverage_score BETWEEN 0 AND 1),
  expiration_boost      NUMERIC CHECK (expiration_boost BETWEEN 0 AND 1),
  recency_penalty       NUMERIC CHECK (recency_penalty BETWEEN 0 AND 1),
  diet_match_score      NUMERIC CHECK (diet_match_score BETWEEN 0 AND 1),
  bio_score_alignment   NUMERIC CHECK (bio_score_alignment BETWEEN 0 AND 1),
  composite_score       NUMERIC NOT NULL CHECK (composite_score BETWEEN 0 AND 1),

  -- Surface metadata
  surface               TEXT NOT NULL CHECK (surface IN (
                          'dashboard_card', 'pantry_section', 'pantry_section_expanded')),
  surface_position      INTEGER NOT NULL,

  -- Event type
  event_type            TEXT NOT NULL CHECK (event_type IN (
                          'surfaced', 'tapped', 'logged_within_48h',
                          'logged_after_48h', 'ignored_48h')),

  surfaced_at           TIMESTAMPTZ,
  tapped_at             TIMESTAMPTZ,
  logged_meal_id        UUID,
  logged_at             TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_events_user_event_created
  ON public.pantry_suggestion_events(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestion_events_surface_event
  ON public.pantry_suggestion_events(surface, event_type);

ALTER TABLE public.pantry_suggestion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestion_events_owner_select" ON public.pantry_suggestion_events;
CREATE POLICY "suggestion_events_owner_select"
  ON public.pantry_suggestion_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "suggestion_events_service_role_write" ON public.pantry_suggestion_events;
CREATE POLICY "suggestion_events_service_role_write"
  ON public.pantry_suggestion_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

100% sampling for Phase 4 first 6 months. Composite score components persisted so Arnold can A/B tune the weights via SQL-only changes.

## 4. Scoring engine

### 4.1 Inputs

For each candidate recipe (from `getRecipesForSuggestion` per 170f single-read-path contract):
- `recipe.ingredient_canonical_names` array
- User's `pantry_items` active set (lowercase canonical names + quantities + expirations)
- User's last 14 days of `meals` log (for recency penalty)
- User's `dietary_restrictions` (170c)
- User's safety mode posture (170c)
- User's `bio_optimization_score_targets` (170h)

### 4.2 Score components

Each component normalizes to [0, 1].

**coverage_score**: intersection of recipe ingredients with pantry. Required ingredients carry 2x weight vs. optional. Formula:
```
required_in_pantry = count of recipe.required_ingredients with canonical match in pantry
required_total = recipe.required_ingredient_count
optional_in_pantry = count of recipe.optional_ingredients with canonical match in pantry
optional_total = recipe.optional_ingredient_count

coverage_score = (2 * required_in_pantry + optional_in_pantry) / (2 * required_total + optional_total)
```

**expiration_boost**: max [0, 1] over recipe ingredients that match a pantry item with expiration within 3 days. Each matching expiring ingredient adds 0.2 to a base 0; cap at 1.0. The intuition: expiring ingredients should bias toward recipes that use them.

**recency_penalty**: 1.0 if recipe was NOT logged in the last 14 days; reduces linearly to 0.0 if logged today. Penalty multiplies the composite score.

**diet_match_score**: 1.0 if recipe.diet_tags intersect user's dietary_restrictions allowlist; 0.0 if recipe.contains_allergens intersects user's allergen blocklist (hard block, removes from candidate set entirely rather than scoring).

**bio_score_alignment**: 1.0 if recipe's per-serving nutrition contributes to the user's current Bio Optimization Score targets (e.g., user is in a protein-deficit week and recipe is high-protein); 0.5 if neutral; 0.0 if anti-aligned (recipe sets back current target). Phase 4 v1 uses a simple 3-bucket rule; future versions may use a model.

### 4.3 Composite

```
composite_score = recency_penalty * (
  0.45 * coverage_score +
  0.20 * expiration_boost +
  0.20 * diet_match_score +
  0.15 * bio_score_alignment
)
```

Weights env-tunable via `SUGGESTION_WEIGHT_COVERAGE`, etc. for A/B tuning.

### 4.4 Surfaces

3 surfaces:
- Dashboard card: top 3 candidates with composite score above 0.50 threshold; if fewer than 3 cross threshold, fall back to top 3 of public templates with at least 1 pantry ingredient match.
- Pantry tab section: same 3.
- Pantry tab section expanded ("see more"): top 10.

When user has fewer than 5 saved recipes, surface mixes saved + public templates. When user has 5+ saved recipes, saved-recipe candidates dominate; public templates surfaced only when none of the user's saved recipes meet the 0.50 threshold.

### 4.5 Cold-start: public recipe templates

Gordon authors 200 cold-start templates spanning:
- 8 cuisine archetypes (Mediterranean, Asian, American, Mexican, Italian, Middle Eastern, African, Indian) at ~25 each
- 5 dietary patterns crossed with cuisines (vegetarian, vegan, paleo, keto, gluten-free) for each cuisine where applicable
- 3 difficulty levels (15min/30min/60min)
- 9 allergen-free variations of base recipes

Each template has: ingredients, macros, cooking time, difficulty, cuisine tag, dietary pattern tags, photo (Hannah Gordon-paired effort), step instructions.

Gordon long-pole: 100-200 hours of content authoring. Sequenced to run in parallel with Phase 1-3 builds; targets completion by Phase 4 Blueprint clear (Apr 2027).

## 5. UI surfaces

### 5.1 Dashboard "Make from your pantry" card

A new card on `/dashboard` between the existing Pantry widget (Phase 1) and the meal-quick-log row.

Header: "Make from your pantry" + small "Refresh" icon button.
Content:
- 3 horizontal cards, each with: recipe photo, recipe name, per-serving calories, pantry-coverage chip ("4 of 5 ingredients ready"), "Make this" CTA.
- Below the 3 cards: small "How we choose suggestions" link (Kelsey-authored explainer; one screen)
- Empty state: "Add a few more items to your pantry to see suggestions" with "Go to pantry" link

Hidden entirely when user has 0 pantry items OR has not opted into the suggestion engine (Settings toggle).

### 5.2 Pantry tab "Make from your pantry" section

A new section in the Pantry tab between Running Low and Items list.

Content matches Dashboard card 3-suggestion layout + "See more" expands to 10 with infinite-scroll variant.

### 5.3 Recipe detail integration

When user taps a suggestion, route to `/recipes/[id]` (170f-shipped detail view) with a new banner at top: "Suggested from your pantry" + "{matched_count} of your pantry items match this recipe". The 170f "Log this meal" CTA still fires the existing log flow but adds `suggested_from_pantry=TRUE` and `suggested_from_recipe_id` to the meals row.

### 5.4 Pantry auto-deduction Settings

A new toggle in Settings > Pantry: "Auto-deduct pantry items when I log a meal".
- Default OFF
- When ON, every meal log cross-references meal_items canonical names against pantry; matching items decrement quantity + insert `pantry_consumption_log` row with `consumed_via='meal_log_link'`.
- When ON, meal_items rows get `consumed_from_pantry_item_id` populated where matched.

The toggle defaults OFF because misattribution is irreversible without manual correction (the user's pantry quantity decrements based on an inferred match that might be wrong). Users must explicitly turn it on.

## 6. Helix events

Phase 4 adds 3 Helix events.

| Event | Points | Cap | Trigger |
|---|---|---|---|
| `pantry_meal_suggestion_made` | 3 | 1/day | The Dashboard "Make from your pantry" card renders with at least 1 suggestion above 0.50 threshold |
| `pantry_meal_suggestion_logged` | 5 | 5/day | A meal is logged with `suggested_from_pantry=TRUE` AND was tapped from a suggestion surface within the prior 48h |
| `pantry_auto_deduct_enabled` | 5 | 1 lifetime | User enables the pantry auto-deduct toggle |

`pantry_meal_suggestion_logged` is the headline behavioral event tied to the suggestion-conversion-rate metric. The cap of 5/day allows for an active multi-meal day without rewarding farming.

## 7. API surface

Phase 4 adds 2 routes.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/pantry/suggestions` | Scored suggestions for current user (3 by default; ?limit=10 for expanded) |
| POST | `/api/pantry/suggestion-events/[id]` | Telemetry write for tap + log + ignore events |

Plus 170f's existing log endpoint extends to accept `from_pantry_suggestion=true` flag.

## 8. Composition

### 8.1 With 170p Phase 1

Reads `pantry_items` via direct query (allowed inside Gordon's suggestion lib only; no separate read path). Writes `pantry_consumption_log` rows on meal logs with `consumed_via='meal_log_link'`.

### 8.2 With 170f

HARD COMPOSITION. Phase 4 cannot ship without 170f shipped at sufficient maturity. Reads recipes + public templates via the 170f canonical `getRecipesForSuggestion` contract. The 170f "Log this meal" path is reused; Phase 4 only adds the suggestion flag.

### 8.3 With 170c

HARD COMPOSITION. Dietary restrictions filter candidates (hard block on allergen + soft preference on diet tag). ED safety mode adjusts:
- Hide calorie chips on suggestion cards
- Hide bio_score_alignment component (display only; engine still uses it for ranking)
- Replace "Make this" CTA with neutral copy ("Add to plan")
- Suppress macro per-serving details on cards

### 8.4 With 170h

Bio Optimization Score targets feed into bio_score_alignment scoring. Phase 4 reads from the existing 170h target schema (no new columns); writes back only via the existing meal-log path.

### 8.5 With 170q

170q (forward meal planning) reads from the same `getRecipesForSuggestion` contract + extends scoring with multi-day planning logic. Phase 4 provides the scoring lib; 170q reuses it without modification.

## 9. Hard rules reaffirmed

Per Phase 1 §10 + Phase 2 §10 + Phase 3 §11. Additionally:
- Suggestion telemetry persisted at 100% Phase 4 first 6 months for A/B tuning; drops to 20% after.
- Suggestion engine is read-only at the database level (writes only telemetry); recipe library + pantry items are not modified by the engine.
- Pantry auto-deduction is opt-in; default OFF.
- ED safety mode UI adjustments are MANDATORY when 170c safety mode is active for the user; not optional.

## 10. Phasing within supplement 4

| Slice | Engineer-weeks |
|---|---|
| 4.A Schema additions | 0.5 |
| 4.B Scoring engine library | 3 |
| 4.C API routes | 1 |
| 4.D Dashboard card + Pantry section + recipe detail integration | 2 |
| 4.E 170c safety mode UI adjustments | 1 |
| 4.F Pantry auto-deduction wiring | 1 |
| 4.G Bio Optimization Score integration | 1 |
| 4.H Cold-start template library (Gordon long-pole, parallel) | 100-200 hours (~3-5 wk content) |
| 4.I Audit + smoke + beta + 30-day ratification | 2-3 |
| **Total engineering** | **11.5 weeks** |
| **Plus Gordon content** | **3-5 weeks parallel** |

With 2 engineers + Gordon: ~10-14 calendar weeks for engineering + content overlap. Beta gate adds 30 days.

Optimistic ship target: Oct 2027 (Blueprint Apr 2027 parallel with Phase 3 build, build May-Sep, beta + ratification Sep-Oct, ship Oct).

## 11. Acceptance criteria

1. 3 schema additions applied (meals + meal_items columns + pantry_suggestion_events table).
2. Scoring engine library deterministic; same inputs produce same output ranking; documented in `src/lib/pantry/suggestion/`.
3. Cold-start template library 200 rows in `recipe_public_templates` (Gordon-curated; coordinated with 170f public template seed list which may have authored a portion already).
4. Dashboard card renders top 3 when conditions met; empty state when pantry under threshold.
5. Pantry tab section renders + expands to 10.
6. Recipe detail view shows "Suggested from your pantry" banner when arrived via suggestion tap.
7. Log-from-suggestion flow: meal inserts with `suggested_from_pantry=TRUE` + suggestion event records `event_type='tapped'` then `event_type='logged_within_48h'` on log.
8. Pantry auto-deduction: toggle on + log a meal → matched pantry items decrement + `pantry_consumption_log` rows insert with `consumed_via='meal_log_link'`.
9. Suggestion conversion rate: in 30-day beta, reaches at least 10% on active users (target 15% public ship).
10. 170c ED safety mode UI adjustments verified by Kelsey review.
11. Bio Optimization Score integration: scoring composite shifts measurably when user changes targets.
12. 3 Helix events fire correctly with caps.
13. 170f canonical query contract used as ONLY read path; no direct queries on recipes/recipe_ingredients outside the suggestion lib.
14. Telemetry sessions write at 100% sampling Phase 4 first 6 months.
15. Practitioner test account: no pantry suggestion UI visible.
16. Hard rules satisfied.

## 12. Open questions for Gary (pre-Blueprint resolution)

| # | Question | Recommendation |
|---|---|---|
| Q1 | 6-month Phase 1 adoption gate vs. 3-month gate before Phase 4 Blueprint? | 6 months; we need real consumption data for scoring tuning |
| Q2 | 170c ratification status: hard block on full ratification or partial ratification acceptable? | Hard block on partial ratification covering dietary filter + safety mode; full 170c roadmap can lag |
| Q3 | Public template library size: 200 vs. 100 vs. 300? | 200 covers the cuisine × diet × difficulty matrix at reasonable density; 300 padding adds maintenance cost without proportional value; 100 is too sparse for cold-start. |
| Q4 | Suggestion conversion rate target: 15% public ship vs. 10% acceptable for v1 + iterate? | Ship at 10% measured in beta with weight tuning queued for first 30 days; tighten to 15% by 30 days post-launch |
| Q5 | Pantry auto-deduction default: OFF (recommended) vs. ON-with-confirm? | OFF; misattribution risk is high; user signal of consent is necessary |
| Q6 | When 170c safety mode is active, should the suggestion card hide ENTIRELY or show with neutral copy? | Show with neutral copy + macro chips hidden; full hide misses the value of pantry suggestions |
| Q7 | Surface position: Dashboard card above or below the existing nutrition score card? | Below the existing nutrition score card + Phase 1 pantry widget; suggestion is downstream context |
| Q8 | Scoring engine A/B framework: ship with the documented weights or with weights env-tunable for SQL-only iteration? | Env-tunable for SQL-only iteration; suggestion accuracy is a tuning frontier, not a one-shot design |

## 13. Filed-not-built reaffirmation

Filed 2026-06-01. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Apr 2027 (parallel with Phase 3 build) contingent on:
- 170p Phase 1 SHIPPED with at least 6 months production data
- 170f SHIPPED at maturity (most active users at 5+ saved recipes OR public templates seeded at 200+ rows by Gordon)
- 170c ratified at the dietary filter and ED safety mode levels
- Anthropic API quota verified at expected volume

Build authorization separate. Phase 4 is the highest-leverage post-launch feature in the 170-series queue per phase split memo §2.

## 14. Related

- `prompt-170p-phase-1-spec-2026-06-01.md` (Phase 1; hard prerequisite + provides pantry data)
- `prompt-170p-supplement-2-2026-06-01.md` (Phase 2; provides email-imported pantry data)
- `prompt-170p-supplement-3-2026-06-01.md` (Phase 3; provides PDF + Chrome agent + multi-store data)
- `project_prompt_170f_shipped.md` (170f Phase 1 SHIPPED 2026-06-01; provides canonical query contract)
- `project_prompt_170c_filed.md` (170c dietary filter + ED safety mode; hard composition)
- `project_prompt_170p_phase_split.md` (ratified phase split memo)
- `feedback_jeffery_pre_launch_review.md` (Phase 4 audit gate; mandatory before flag flip)
