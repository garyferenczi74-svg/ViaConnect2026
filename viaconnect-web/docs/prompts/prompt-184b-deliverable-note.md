# Prompt 184b Deliverable Note: Fat Field Consolidation and Fat Source Health Value

Status: built and committed locally (migration not yet applied to live Supabase).

## What shipped

The two near-synonymous fat fields (Good Fat, Healthy Fat) are removed from every
schema binding and every surface. A single Fat field (total fat in grams) plus a
curated fat-source dropdown now drive the fat-quality component of the Nutrition
Score and the Bio Optimization Score.

- Migration `20260609160000_prompt_184b_fat_sources_and_consolidation.sql`
  (append-only): `fat_sources` reference table (18 seeded sources) plus
  `meals.fat_source_id`, `meals.fat_breakdown`, `meals.fat_quality_contribution`
  (all nullable, NULL-not-0).
- Data layer: `good_fat_g` / `healthy_fat_g` dropped from `NutritionAnalysis`,
  `aggregate()`, the gordon `Meal` type, `KnownNutrients`, `meals-insert-schema`,
  and the `useUserMeals` mappers. The legacy `meals.fat_healthy_g` column stays
  (append-only) and is left NULL going forward.
- Scoring: the Saturated Fat Penalty derives saturated from
  `fat_breakdown.saturated_g` (real saturated, not the broken total-minus-healthy
  split) and folds the source `fat_quality_value` (favorable softens, limit
  hardens, clamped to the -15 to 0 range).
- Routes: analyze-text, analyze-photo, the meals route (manual + NutriVision),
  and the confirm route write `fat_source_id` / `fat_breakdown` /
  `fat_quality_contribution` and no longer write good/healthy fat.
- UI: single Fat field + a searchable, scrollable `FatSourceDropdown` (health
  tier shown inline) on the meal review card, the Quick Log modal, the dashboard
  Quick Log block, and the meal detail card, plus a `useFatSources` client hook.
  Desktop and mobile (Capacitor) share the same components.

## Gordon and Hannah role split, as built

This honors the standing rule that Gordon owns all nutrition computation.

- Gordon (quantitative, computation owner): the per-gram fatty-acid profiles in
  the seed (saturated / monounsaturated / polyunsaturated / trans / omega-3 /
  omega-6), the `fat_quality_value`, the breakdown math (`resolveFatBreakdown`),
  and the fat-quality sub-score in `scoreMeal`. No other agent performs this
  computation.
- Hannah (qualitative, curation and framing): which sources appear on the
  curated list, the `health_tier` label (favorable / moderate / limit / neutral)
  shown inline in the dropdown, and the consumer-facing `display_name` copy.
  Hannah does not perform the numeric scoring.

This matches the section 2 assumption; Hannah's charter (feeds knowledge and data
to Gordon; frames consumer-facing nutrition) is consistent with it, so no
escalation was required.

## Hybrid attribution config switch

`FAT_ATTRIBUTION_MODE` in `src/lib/nutrition/fat-sources.ts` is the single switch
(default `hybrid`).

- `hybrid` (default): a whole food's intrinsic fat keeps its own USDA saturated
  profile; the picked source contributes its quality (and, where an added-fat
  amount is known, its added saturated). Used on the parsed engines and the
  review confirm path via `resolveMealFatBreakdown`.
- `simple`: the dropdown governs the entire entry's fat; intrinsic profiles are
  ignored. Reachable by flipping the constant, no rewrite required.

Manual slider entries (Quick Log) are inherently one-source: the slider provides
only a total, so the picked source governs that total in both modes.

## NULL and estimated handling

When a source is unspecified and cannot be inferred, `fat_source_id`,
`fat_breakdown`, and `fat_quality_contribution` stay NULL (never 0). The Saturated
Fat Penalty is excluded from the score in that case rather than computed from a
coerced zero. The fat-sources loaders use a 4 second `withTimeout`, fail open,
and log via `safeLog`.

## Remaining to take live

1. Apply the append-only migration to Supabase (`nnhkcufyqjojdbvdrpky`).
2. Push to `main` (auto-deploys to production).
3. Verify the two Prompt 184a evidence meals render a single Fat field with no
   Good Fat / Healthy Fat (verifiable once the migration is live).
