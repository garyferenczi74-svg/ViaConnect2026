# Prompt 171b Filed: Bio Optimization Scoring - Caffeine Timing & Circadian Alignment

Date: 2026-05-31
Status: **Filed at spec level; ratified.** Four gates resolved same-day-as-filing. Three-phase build plan proposed. **Pre-production, Ready to Build pending Gary's phase signal.**
Memorialized by: Jeffery (orchestrator).

## Mission (one line)

Make the shipped Hannah-based Bio Optimization Score (BOS) caffeine-aware by adding a 10th source slice that computes circadian impact from caffeine_mg + consumed_at + user sleep window, with Quick Log pill panel + 170l barcode + future 170m text parser feeding the data inputs.

## Why this filing posture matches the 170-series + 171a pattern (with 5 structural distinctions)

171b memorializes-only with phase split proposed. Five structural distinctions vs prior 17x filings:

1. **Spec required architectural translation** (same shape as 171a). The spec originally described:
   - `lib/gordon/nutrition-parser.ts` (doesn't exist; `src/lib/gordon/` has `scoreMeal.ts` for meal scoring, no text parser)
   - `lib/bio-optimization/` namespace (doesn't exist; BOS is at `src/lib/scoring/bio-optimization-score.ts`)
   - `170g corpus` as standalone code (doesn't exist; overlaps with 170m Haiku Rule 3.9 inference table shipped to Blueprint draft 30 min ago)
   - `/api/nutrition/photo-ai/analyze` route (doesn't exist; actual is `/api/nutrition/photo/analyze` — same path correction needed in 171a)
   - Deterministic BOS calculation with penalty_weight (doesn't match shipped Hannah-AI-based BOS)

   Filed with translations applied.

2. **BOS is Hannah-AI-based, not deterministic.** Shipped BOS at `src/lib/scoring/bio-optimization-score.ts` (~570 LOC) uses Claude Sonnet 4.5 via forced tool use consuming 9 source slices. Hannah decides weighting; no deterministic penalty engine exists. Caffeine integration honors this: new caffeine-timing-source.ts becomes the 10th slice, and the Hannah BOS prompt is extended to consider circadian pharmacokinetics. Score adjustment is Hannah's decision, not a hardcoded weight.

3. **Caffeine data sources are split across shipped + filed + future prompts.** Three feed paths:
   - **170l barcode (SHIPPED)**: extend OFF lookup to extract caffeine from `off_product_cache.nutriments['caffeine_100ml']` field when OFF has it (Red Bull, Monster, branded coffee drinks). No new migration; data is already in cache.
   - **Quick Log pill panel (existing /nutrition surface)**: add "Caffeine intake" manual entry field that writes `meal_items.caffeine_mg` + `meals.logged_at` directly. Ships in 171b Phase 2.
   - **170m Quick Log text parser (FILED, not built)**: Haiku Rule 3.9 inference table emits caffeine_mg from text descriptions. Ships when 170m builds (~3-5 weeks post-Gordon Long-Pole 2). Phase 2 of 171b will line up cleanly because the meal_items.caffeine_mg column is already migrated.

4. **CAQ Phase 7 sleep window step** is a new CAQ surface. Existing CAQ has Phase 1-6 per memory. Phase 7 asks "When do you usually go to bed and wake up?" Persisted to `user_profiles.sleep_start` + `user_profiles.sleep_wake`. v1 defaults to 23:00-07:00 for users who haven't completed Phase 7. Hannah dispatch for §X CAQ wireframe needed at Phase 3 kickoff.

5. **Pre-launch P0 status (per spec "Approved for Immediate Development")** but the value lands incrementally. Phase 1 ships the BOS source slice + Hannah prompt extension immediately (BOS becomes caffeine-aware even with empty data). Phase 2 ships data inputs (Quick Log entry + 170l barcode extension). Phase 3 ships precision (CAQ Phase 7 sleep window). The loop closes when all three ship.

## Gate decisions resolved (Gary, 2026-05-31)

| # | Decision |
|---|---|
| 1 | **BOS architecture for caffeine integration**: Add caffeine as a **10th source slice** (`src/lib/scoring/sources/caffeine-timing-source.ts`). Hannah's BOS prompt extended to consider circadian pharmacokinetics. Preserves the shipped Hannah-based architecture from #159 + #161. Score adjustment is Hannah's decision. |
| 2 | **Caffeine path of entry**: **Manual entry on Quick Log pill panel TODAY + 170l shipped OFF data when applicable**. 170m text parser caffeine emission (Haiku Rule 3.9) lands when 170m ships (~3-5 weeks). Photo analyze path stays unchanged (vision can't reliably detect caffeine concentration). |
| 3 | **portion_display_unit / portion_display_value placement**: **Add to BOTH meals + meal_items** (belt-and-suspenders). meal_items carries per-item display unit; meals carries the single-unit shortcut for single-item meals + the meal-level aggregate display where it makes sense. |
| 4 | **Sleep window data source**: **Add CAQ Phase 7 step + user_profiles columns**. Default 23:00-07:00 for users who haven't completed Phase 7. Future wearable integration overrides when wearable-source connects (e.g., Apple Health sleep data). |

## Three-phase build plan

**Phase 1 (this session candidate): BOS source slice + Hannah prompt extension + schema migrations.** ~600 LOC.

- New `src/lib/scoring/sources/caffeine-timing-source.ts` (10th source slice; reads meal_items.caffeine_mg + meals.logged_at over the 24h window; reads user_profiles.sleep_start + sleep_wake; computes per-meal circadian impact summary; returns slice for Hannah)
- Extend `src/lib/scoring/hannah-prompt.ts` to include caffeine timing section in the system prompt (~30-50 LOC of prompt text additions)
- Append-only migrations:
  - `meal_items` ADD: `caffeine_mg NUMERIC(6,2)` + `portion_display_unit TEXT` + `portion_display_value NUMERIC(10,2)`
  - `meals` ADD: `total_caffeine_mg NUMERIC(7,2)` + `portion_display_unit TEXT` + `portion_display_value NUMERIC(10,2)`
  - `user_profiles` ADD: `sleep_start TIME` + `sleep_wake TIME`
- Apply migrations to live Supabase via MCP
- Unit tests for the source slice + caffeine impact math + sleep window default handling
- 170m caffeine_mg migration already filed; 171b Phase 1 lands the actual ALTER (one migration, both 170m + 171b benefit)

**Phase 2: Data input surfaces.** ~400 LOC.

- Quick Log pill panel: add "Caffeine intake" field (caffeine_mg numeric input + auto-stamped consumed_at). Existing pill panel surface; just adds a new pill.
- 170l shipped barcode path: extend `lookupProductByBarcode` to extract caffeine_mg from `off_product_cache.nutriments['caffeine_100ml']` when present. Branded drinks (Red Bull, Monster, Celsius) carry this data.
- Wire both paths into `meal_items.caffeine_mg` + `meals.total_caffeine_mg` roll-up at meal-save time.

**Phase 3: CAQ Phase 7 sleep window precision + Hannah dispatch for §X wireframe.** ~500 LOC + Hannah work.

- New CAQ Phase 7 step component
- Hannah dispatch for §X CAQ Phase 7 wireframe (sleep window form with picker, defaults, validation)
- Persist to user_profiles.sleep_start + sleep_wake
- 24h default fallback for users who haven't completed Phase 7

## Five flags for Gary

### Flag 1: Phase split confirmation — **NEEDS YOUR CALL**

The three-phase split above is my proposal. Three options:

- (A) **Recommended**: Build Phase 1 in this session (~600 LOC); Phases 2 + 3 land in subsequent turns. Closes the BOS-caffeine-aware loop architecturally even with empty data.
- (B) Build Phase 1 + Phase 2 in this session (~1000 LOC); CAQ Phase 7 in subsequent turn. Closes both architecture + data inputs in one session.
- (C) Build all three phases in this session (~1500 LOC + Hannah dispatch). Full ship tonight; more coordination risk.

### Flag 2: 170m meal_items.caffeine_mg migration conflict — **AUTO-RESOLVED**

170m filing already added `meal_items.caffeine_mg NUMERIC(6,2)` to the §7.3 ALTER but 170m hasn't shipped (build pending Gordon Long-Pole 2). 171b Phase 1 lands the ALTER immediately. When 170m ships, the column is already in place; 170m's migration uses `ADD COLUMN IF NOT EXISTS` so no conflict. Same applies to `meals.total_caffeine_mg`.

### Flag 3: caffeine-timing-source.ts initial empty behavior

The new BOS source slice will return empty/no-impact when no caffeine data exists (which is the case for every user at Phase 1 ship time). Hannah's prompt explicitly handles "caffeine_timing has no data this window" gracefully. Users see no BOS change until Phase 2 ships and they start entering caffeine via Quick Log or scanning energy drinks.

### Flag 4: Hannah BOS prompt version bump

Per existing pattern, Hannah BOS prompt version bumps when prompt content changes. Adding caffeine section bumps `hannah.bos.v2.0.1` → `hannah.bos.v2.1.0`. New BOS computes are versioned in telemetry. Old BOS scores remain valid; new scores get the new prompt's score.

### Flag 5: Recipe_match_hint gating (Gordon's Q2 — Gary picked Option B "recipe gated")

Gordon's Open Question 2 was about whether recipe_match_hint emits unconditionally or stays gated. Per the spec preamble, Gary picked Option B (gated). 170m Haiku draft addendum noted Open Q2 as "recommend unconditional"; per Gary's call, this gets resolved as "gated behind QUICK_LOG_RECIPE_SHORT_CIRCUIT_ENABLED env var; default off until 170f flag enabled." Applies to the 170m Haiku draft + future Quick Log parse route response shape. No immediate 171b code change because 170m isn't shipped yet; the resolution is captured for when 170m builds.

## Migrations filed (Phase 1)

All append-only:

1. **`meal_items` augmentation**: `caffeine_mg NUMERIC(6,2)` + `portion_display_unit TEXT` + `portion_display_value NUMERIC(10,2)` (consolidates 170m filing §7.3 with 171b additions)
2. **`meals` augmentation**: `total_caffeine_mg NUMERIC(7,2)` + `portion_display_unit TEXT` + `portion_display_value NUMERIC(10,2)`
3. **`user_profiles` augmentation**: `sleep_start TIME` + `sleep_wake TIME` (CAQ Phase 7 destination)

## Composition cross-references

- **170 base (shipped)**: meals + meal_items schema reused; Phase 1 migration is append-only to the existing tables
- **170j (shipped)**: voice editing path can refine caffeine entries the same way it refines other meal_items
- **170l (shipped)**: extend barcode lookup to extract caffeine from OFF when present; one of the two Phase 2 data input paths
- **170m (FILED)**: 171b Phase 1 lands the `meal_items.caffeine_mg` ALTER that 170m's §7.3 plans; double-benefit. 170m Haiku Rule 3.9 caffeine inference table becomes a Phase 3+ data input path when 170m ships.
- **171a (SHIPPED)**: photo capture + signed URL paths unchanged
- **#159 + #161 (shipped BOS)**: Phase 1 adds 10th source slice; preserves Hannah-AI-based architecture; prompt version bumps
- **Future 170h (filed)**: caffeine timing data becomes load-bearing input to retrospective symptom pattern detection (sleep quality, anxiety, energy correlations)
- **Future wearable-source.ts**: when wearable integration matures, sleep window can be overridden by Apple Health / Fitbit data instead of CAQ Phase 7 manual input

## Ratification posture (2026-05-31)

Gary acknowledged 171b at spec level + resolved all 4 architectural gates 2026-05-31. Filed and ratified at the spec level. Phase split confirmation needed before Phase 1 code lands.

## Related

- Prompt 159 + 161 (shipped; Hannah-based BOS architecture)
- Prompt 168 (shipped; Gordon meal scoring at `src/lib/gordon/`)
- Prompt 170 Phase 1 (shipped; meal_items + meals schema)
- Prompt 170j (shipped 2026-05-30; voice editing composes)
- Prompt 170l (shipped 2026-05-30; OFF cache reused for caffeine extraction)
- Prompt 170m (FILED 2026-05-30; meal_items.caffeine_mg + Haiku Rule 3.9 inference table)
- Prompt 171a (shipped 2026-05-30; photo capture overlay unchanged)
- Heritage: Prompt 170l §6 (barcode composition pattern); Prompt 170m Gate 5 (caffeine inference rule); Prompt 161 (BOS source slice pattern)
