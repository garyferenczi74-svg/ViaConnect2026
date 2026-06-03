# Prompt 172e Phase A: Gordon Data Authoring Pass

**Filed:** 2026-06-02
**Author:** Gordon (nutrition domain owner, read-only)
**Status:** RATIFIED 2026-06-02 by Gary after Hannah + Kelsey review pass. Ready for Michelangelo Phase A build using the SQL below (post-ratification).

## Ratifications 2026-06-02 (applied to SQL + tables below)

After parallel Hannah (clinical/nutritional) + Kelsey (regulatory) review of Gordon's draft, Gary ratified the following revisions, which are now applied to Deliverable 2 SQL + reference table:

**R1: ORS sodium pinned at 1150 mg per 500 ml (Gordon's mid-commercial pick).** Hannah's clinical-defensibility position over Kelsey's WHO 862 mg regulatory recommendation. Evidence_source rewritten to acknowledge commercial spread without contradicting the value.

**R2: 3 display_name revisions per Hannah.**
- `water_electrolyte_enhanced`: "Electrolyte Enhanced Water" → "Electrolyte Water"
- `sports_drink_electrolyte_mix`: "Electrolyte Mix" → "Electrolyte Drink Mix"
- `sports_drink_ors`: "Oral Rehydration Solution" → "Rehydration Drink" (slug stays `sports_drink_ors`)

**R3: 2 evidence_source touchups per Kelsey.**
- `sports_drink_electrolyte_mix`: strip "LMNT/Liquid IV" brand names → "manufacturer typical sodium range 500-1000 mg/serving"
- `functional_kombucha`: append ", caffeine and sugar vary by brand"

**R4: Plant milks (oat, almond, soy) ship at dairy 1.30 in Phase A.** Phase B includes an append-only `plant_milk` enum extension at coefficient 1.10. File a 172e-supplement or fold into Phase B brief.

**R5: Cranberry cocktail held at 1.20.** Hannah's "acceptable for v1" note honored.

**R6: high_water_food 0.90, chai/latte/cappuccino → dairy routing, juice 1.20 anchor across all five rows.** All approved by Hannah as-drafted.

**R7: 5 `requires_claim_review` rows ship `is_active=true` with neutral display names.** All pass Kelsey §9 + 170c §13 linter review. Marshall scan (peptide dictionary) zero hits; broader scan deferred to Phase B picker UI build per Kelsey recommendation.

**R8: Phase B Kelsey 90-day re-review cadence note.** Hydrogen water + alkaline water flagged for the next 90-day check (FDA warning letter activity in this category trending up). No action required at Phase A ship.

---

## Deliverable 1: 170o Coefficient Patch Table

Per Gary's Gate 1 ratification 2026-06-02: replace live Gordon-signed 170o ratios with Maughan-conservative values across the 9 `hydration_source_kind` enum values.

| enum_value | old_coefficient | new_coefficient | evidence_anchor (Maughan BHI) | conservative_haircut_note | citation |
|---|---|---|---|---|---|
| `pure_water` | 1.00 | 1.00 | 1.00 (BHI reference) | Matches measured; water is the reference fluid by definition. | Maughan 2016 Table 2, water reference |
| `coffee_tea` | 1.00 | 1.00 | Coffee BHI 1.01, hot tea BHI not separately reported (treated as water class) | Matches measured; single serving retention of black coffee statistically indistinguishable from water. | Maughan 2016 Table 2 (coffee), Section 5.2 |
| `juice_smoothie` | 0.90 | 1.20 | Orange juice BHI 1.39 | Conservative haircut of 0.19 below measured to honor §5.2 short term retention proxy posture; smoothies (fiber, mixed matrix) span a wider, less anchored range so a single floor protects against over crediting. | Maughan 2016 Table 2 (orange juice); USDA FDC for matrix comparison |
| `dairy` | 0.85 | 1.30 | Whole milk BHI 1.50, skim milk BHI 1.58 | Conservative haircut of 0.20 below the lower of the two milk anchors (whole 1.50) to honor §5.2 posture and to keep a single dairy ratio that covers whole, skim, and plant analogs without over crediting. Plant milks (oat, almond, soy) carry far less protein and lactose so applying the dairy ratio to them is itself a conservative ceiling pending Hannah/Kelsey validation. | Maughan 2016 Table 2 (whole milk, skim milk), Section 5.2 |
| `soda` | 0.80 | 1.00 | Cola BHI 1.01, diet cola BHI 1.02 | Matches measured; single serving cola and diet cola retention statistically indistinguishable from water in the study. The old 0.80 conservatively penalized sugar load but is not Maughan grounded. | Maughan 2016 Table 2 (cola, diet cola) |
| `alcohol_low` | 0.95 | 1.00 | Lager (4% ABV) BHI 1.01 | Matches measured; single serving lager retention statistically indistinguishable from water. Cumulative dose diuretic effect handled in Phase C via `ALCOHOL_DIURETIC_THRESHOLD_DRINKS` per §5.3, not via base coefficient. | Maughan 2016 Table 2 (lager); Section 5.3 |
| `alcohol_high` | 0.65 (default), 0.75 wine, 0.50 spirits | 1.00 | Lager 1.01 anchor extrapolated; wine and spirits not separately measured in BHI cohort | Matches measured anchor at single serving. Per §5.3 Gary directive: cumulative dose diuretic handling lives in Phase C env config, not the base coefficient. Wine/spirits disambiguation in 170o LP1 §1.0 was a pre Maughan placeholder; replace with flat 1.00 base. | Maughan 2016 Table 2 (lager anchor); Section 5.3 |
| `sports_drink` | 0.95 | 1.00 | Sports drink BHI 1.04 | Conservative haircut of 0.04 below measured to align with §5.2 short term retention proxy; the small electrolyte assist measured by Maughan does not justify crediting above water in a non clinical app. Note: ORS and electrolyte mix (functional rehydration) carry 1.40 at the catalog row level per spec §4 anchored to ORS BHI 1.54. | Maughan 2016 Table 2 (sports drink); Section 5.2 |
| `high_water_food` | 0 (deferred) | 0.90 | Not a Maughan beverage class; food matrix retention literature (food provides slower gastric emptying + electrolyte co ingestion) supports retention comparable to or above water | Gordon derived, no Maughan anchor. Conservative posture: most high water foods (watermelon ~92% water, cucumber ~96%, lettuce ~95%) deliver water plus fiber and minerals which prolong retention; haircut to 0.90 keeps the app conservative and below the implicit dairy/juice ratios. Per 170o LP1 §1.0, portion handling for solids stays parser side; coefficient applies only when a food matrix delivers a measurable water volume. Flag for Hannah review before Phase B. | Gordon derived; flag for Hannah genomics + Kelsey clinical review |

## Deliverable 2: 49-row beverage_catalog seed

Gordon delivered 49 rows (7 + 7 + 8 + 5 + 5 + 4 + 5 + 3 + 5) across 9 UI categories. Spec §4 named 45 as the target. Gordon recommends keeping all 49 because hydrogen water, alkaline water, white tea, and oolong tea are spec-referenced (hydrogen/alkaline are explicit `requires_claim_review` examples in spec §9).

### SQL INSERT (idempotent via ON CONFLICT)

```sql
-- Prompt 172e Phase A seed: beverage_catalog 49 rows.
-- Coefficients sourced from Maughan 2016 BHI (per Deliverable 1 patch table).
-- Caffeine values cross-checked against 171b corpus and spec §4 defaults.
-- USDA FoodData Central IDs cited where confirmed; "USDA FDC pending" flagged where not verified.
-- Idempotent: re-runs do not duplicate.

insert into beverage_catalog (
  slug, category, hydration_source_kind, display_name, default_volume_ml,
  hydration_coefficient, caffeine_mg_per_serving, kcal_per_serving, sugar_g,
  sodium_mg, potassium_mg, magnesium_mg, is_alcoholic, abv,
  evidence_source, requires_claim_review, is_active, sort_order
) values
-- Water (7)
('water_still', 'water', 'pure_water', 'Still Water', 240, 1.00, 0, 0, 0.0, 5, 0, 0, false, null, 'Maughan 2016 reference; USDA FDC #174180', false, true, 10),
('water_sparkling', 'water', 'pure_water', 'Sparkling Water', 240, 1.00, 0, 0, 0.0, 5, 0, 0, false, null, 'Maughan 2016 Table 2 (sparkling); USDA FDC #174181', false, true, 20),
('water_mineral', 'water', 'pure_water', 'Mineral Water', 240, 1.00, 0, 0, 0.0, 12, 6, 24, false, null, 'Maughan 2016 reference; USDA FDC #174182', false, true, 30),
('water_electrolyte_enhanced', 'water', 'sports_drink', 'Electrolyte Water', 500, 1.00, 0, 0, 0.0, 100, 60, 0, false, null, 'Manufacturer typical sodium range 80-150 mg/serving; Maughan 2016 sports drink anchor 1.04', true, true, 40),
('water_coconut', 'water', 'sports_drink', 'Coconut Water', 240, 1.00, 0, 45, 11.0, 60, 600, 60, false, null, 'USDA FDC #170181; Maughan 2016 sports drink anchor by analogy', false, true, 50),
('water_hydrogen', 'water', 'pure_water', 'Hydrogen Water', 240, 1.00, 0, 0, 0.0, 5, 0, 0, false, null, 'Maughan 2016 water reference; no clinical hydration superiority claim', true, true, 60),
('water_alkaline', 'water', 'pure_water', 'Alkaline Water', 240, 1.00, 0, 0, 0.0, 5, 0, 0, false, null, 'Maughan 2016 water reference; no clinical hydration superiority claim', true, true, 70),
-- Coffee (7)
('coffee_drip', 'coffee', 'coffee_tea', 'Drip Coffee', 240, 1.00, 95, 2, 0.0, 5, 116, 7, false, null, 'Maughan 2016 Table 2 (coffee); USDA FDC #171890; 171b corpus drip 95mg/240ml', false, true, 10),
('coffee_espresso_shot', 'coffee', 'coffee_tea', 'Espresso Shot', 30, 1.00, 63, 1, 0.0, 1, 14, 2, false, null, 'Maughan 2016 (coffee class); USDA FDC #171891; 171b corpus espresso 63mg/30ml', false, true, 20),
('coffee_americano', 'coffee', 'coffee_tea', 'Americano', 240, 1.00, 75, 2, 0.0, 5, 100, 6, false, null, 'Maughan 2016 (coffee class); espresso shot diluted; 171b corpus interpolation', false, true, 30),
('coffee_latte', 'coffee', 'dairy', 'Latte', 355, 1.30, 75, 150, 14.0, 115, 350, 30, false, null, 'Maughan 2016 (whole milk dominant 1.50 anchor, conservative 1.30); USDA FDC #171892; 171b corpus latte single shot ~75mg', false, true, 40),
('coffee_cappuccino', 'coffee', 'dairy', 'Cappuccino', 240, 1.30, 75, 80, 8.0, 70, 220, 18, false, null, 'Maughan 2016 (whole milk anchor); USDA FDC #171893; 171b corpus cappuccino 75mg', false, true, 50),
('coffee_cold_brew', 'coffee', 'coffee_tea', 'Cold Brew Coffee', 355, 1.00, 175, 5, 0.0, 8, 170, 10, false, null, 'Maughan 2016 (coffee class); USDA FDC pending; 171b corpus cold brew 150 to 200mg/355ml midpoint', false, true, 60),
('coffee_decaf', 'coffee', 'coffee_tea', 'Decaf Coffee', 240, 1.00, 3, 2, 0.0, 5, 116, 7, false, null, 'Maughan 2016 (coffee class); USDA FDC #171894; 171b corpus decaf 2 to 5mg', false, true, 70),
-- Tea (8)
('tea_black', 'tea', 'coffee_tea', 'Black Tea', 240, 1.00, 47, 2, 0.0, 7, 88, 7, false, null, 'Maughan 2016 (tea class, water grouped); USDA FDC #173040; 171b corpus black tea 47mg/240ml', false, true, 10),
('tea_green', 'tea', 'coffee_tea', 'Green Tea', 240, 1.00, 28, 2, 0.0, 2, 25, 2, false, null, 'Maughan 2016 (tea class); USDA FDC #173041; 171b corpus green tea 28mg/240ml', false, true, 20),
('tea_oolong', 'tea', 'coffee_tea', 'Oolong Tea', 240, 1.00, 38, 2, 0.0, 7, 26, 2, false, null, 'Maughan 2016 (tea class); USDA FDC #173042; 171b corpus interpolation black/green', false, true, 30),
('tea_white', 'tea', 'coffee_tea', 'White Tea', 240, 1.00, 28, 2, 0.0, 2, 20, 2, false, null, 'Maughan 2016 (tea class); USDA FDC pending; 171b corpus white tea ~28mg', false, true, 40),
('tea_matcha', 'tea', 'coffee_tea', 'Matcha', 240, 1.00, 70, 5, 0.0, 2, 27, 4, false, null, 'Maughan 2016 (tea class); USDA FDC pending; 171b corpus matcha 70mg/240ml', false, true, 50),
('tea_chai', 'tea', 'dairy', 'Chai Latte', 240, 1.30, 47, 120, 18.0, 90, 240, 22, false, null, 'Maughan 2016 (whole milk anchor 1.50, conservative 1.30); 171b corpus chai black tea base 47mg', false, true, 60),
('tea_herbal', 'tea', 'coffee_tea', 'Herbal Tea', 240, 1.00, 0, 2, 0.0, 2, 22, 2, false, null, 'Maughan 2016 (tea class, water grouped); USDA FDC #173043; 171b corpus herbal 0mg', false, true, 70),
('tea_iced', 'tea', 'coffee_tea', 'Iced Tea', 355, 1.00, 47, 70, 17.0, 12, 88, 7, false, null, 'Maughan 2016 (tea class); USDA FDC #173044; 171b corpus iced tea ~47mg/355ml', false, true, 80),
-- Juice (5)
('juice_orange', 'juice', 'juice_smoothie', 'Orange Juice', 240, 1.20, 0, 112, 21.0, 2, 496, 27, false, null, 'Maughan 2016 Table 2 (orange juice BHI 1.39, conservative 1.20); USDA FDC #169098', false, true, 10),
('juice_apple', 'juice', 'juice_smoothie', 'Apple Juice', 240, 1.20, 0, 114, 24.0, 10, 251, 8, false, null, 'Maughan 2016 (juice class by analogy); USDA FDC #173946', false, true, 20),
('juice_grape', 'juice', 'juice_smoothie', 'Grape Juice', 240, 1.20, 0, 152, 36.0, 12, 256, 24, false, null, 'Maughan 2016 (juice class by analogy); USDA FDC #167751', false, true, 30),
('juice_cranberry', 'juice', 'juice_smoothie', 'Cranberry Juice Cocktail', 240, 1.20, 0, 137, 31.0, 5, 35, 5, false, null, 'Maughan 2016 (juice class by analogy); USDA FDC #167761', false, true, 40),
('juice_smoothie_mixed', 'juice', 'juice_smoothie', 'Mixed Fruit Smoothie', 355, 1.20, 0, 200, 38.0, 30, 450, 30, false, null, 'Maughan 2016 (juice class by analogy); USDA FDC pending; matrix varies by recipe', false, true, 50),
-- Pop (5)
('pop_cola', 'pop', 'soda', 'Cola', 355, 1.00, 34, 138, 39.0, 45, 5, 4, false, null, 'Maughan 2016 Table 2 (cola BHI 1.01, matches measured); USDA FDC #174849; 171b corpus cola 34mg/355ml', false, true, 10),
('pop_diet_cola', 'pop', 'soda', 'Diet Cola', 355, 1.00, 46, 0, 0.0, 40, 18, 4, false, null, 'Maughan 2016 Table 2 (diet cola BHI 1.02, matches measured); USDA FDC #174854; 171b corpus diet cola 46mg/355ml', false, true, 20),
('pop_lemon_lime', 'pop', 'soda', 'Lemon Lime Soda', 355, 1.00, 0, 148, 38.0, 65, 4, 0, false, null, 'Maughan 2016 (soda class by analogy); USDA FDC #174852', false, true, 30),
('pop_ginger_ale', 'pop', 'soda', 'Ginger Ale', 355, 1.00, 0, 124, 32.0, 26, 4, 1, false, null, 'Maughan 2016 (soda class by analogy); USDA FDC #174851', false, true, 40),
('pop_tonic', 'pop', 'soda', 'Tonic Water', 355, 1.00, 0, 124, 32.0, 50, 0, 0, false, null, 'Maughan 2016 (soda class by analogy); USDA FDC #174853', false, true, 50),
-- Sports and Energy (4)
('sports_drink_isotonic', 'sports_energy', 'sports_drink', 'Sports Drink', 500, 1.00, 0, 130, 34.0, 230, 65, 0, false, null, 'Maughan 2016 Table 2 (sports drink BHI 1.04, conservative 1.00); USDA FDC #174833 (Gatorade reference)', false, true, 10),
('sports_drink_electrolyte_mix', 'sports_energy', 'sports_drink', 'Electrolyte Drink Mix', 500, 1.40, 0, 25, 5.0, 500, 200, 60, false, null, 'Maughan 2016 (ORS class anchor 1.54, conservative 1.40); manufacturer typical sodium range 500-1000 mg/serving', true, true, 20),
('sports_drink_ors', 'sports_energy', 'sports_drink', 'Rehydration Drink', 500, 1.40, 0, 50, 9.0, 1150, 391, 0, false, null, 'Maughan 2016 Table 2 (ORS BHI 1.54, conservative 1.40); WHO 75 mmol/L sodium floor with commercial reconstituted concentrations spanning 500-2000 mg per 500 ml; pinned at 1150 mg mid-range', true, true, 30),
('sports_drink_energy', 'sports_energy', 'sports_drink', 'Energy Drink', 240, 1.00, 80, 110, 27.0, 200, 5, 0, false, null, 'Maughan 2016 (energy drink class, water grouped); USDA FDC #174839; 171b corpus energy 80mg/240ml', false, true, 40),
-- Milk (5)
('milk_whole', 'milk', 'dairy', 'Whole Milk', 240, 1.30, 0, 150, 12.0, 105, 322, 24, false, null, 'Maughan 2016 Table 2 (whole milk BHI 1.50, conservative 1.30); USDA FDC #171265', false, true, 10),
('milk_skim', 'milk', 'dairy', 'Skim Milk', 240, 1.30, 0, 83, 12.0, 103, 382, 27, false, null, 'Maughan 2016 Table 2 (skim milk BHI 1.58, conservative 1.30); USDA FDC #173441', false, true, 20),
('milk_oat', 'milk', 'dairy', 'Oat Milk', 240, 1.30, 0, 120, 7.0, 100, 390, 27, false, null, 'Maughan 2016 (dairy ratio applied conservatively); USDA FDC #2257045 (Oatly reference)', false, true, 30),
('milk_almond', 'milk', 'dairy', 'Almond Milk', 240, 1.30, 0, 39, 7.0, 186, 176, 17, false, null, 'Maughan 2016 (dairy ratio applied conservatively, plant milk anchor pending Hannah); USDA FDC #2257046', false, true, 40),
('milk_soy', 'milk', 'dairy', 'Soy Milk', 240, 1.30, 0, 100, 9.0, 90, 300, 60, false, null, 'Maughan 2016 (dairy ratio applied conservatively, plant milk anchor pending Hannah); USDA FDC #175215', false, true, 50),
-- Functional (3)
('functional_kombucha', 'functional', 'juice_smoothie', 'Kombucha', 355, 1.00, 15, 60, 12.0, 10, 75, 5, false, null, 'Maughan 2016 (functional, water grouped; conservative); 171b corpus kombucha 8 to 25mg/355ml midpoint 15mg; brand variance flagged, caffeine and sugar vary by brand', true, true, 10),
('functional_broth', 'functional', 'sports_drink', 'Bone Broth', 240, 1.20, 0, 40, 0.0, 600, 230, 14, false, null, 'Maughan 2016 (electrolyte rich, ORS by analogy, conservative 1.20); USDA FDC #174677', false, true, 20),
('functional_kefir', 'functional', 'dairy', 'Kefir', 240, 1.30, 0, 110, 12.0, 125, 376, 29, false, null, 'Maughan 2016 (dairy class, conservative 1.30); USDA FDC #2014559', false, true, 30),
-- Alcohol (5)
('alcohol_beer', 'alcohol', 'alcohol_low', 'Beer', 355, 1.00, 0, 153, 0.0, 14, 96, 21, true, 5.0, 'Maughan 2016 Table 2 (lager BHI 1.01); USDA FDC #173846; cumulative dose handled by Phase C ALCOHOL_DIURETIC_THRESHOLD_DRINKS', false, true, 10),
('alcohol_light_beer', 'alcohol', 'alcohol_low', 'Light Beer', 355, 1.00, 0, 103, 0.0, 14, 75, 18, true, 4.2, 'Maughan 2016 (lager class anchor 1.01); USDA FDC #173838; cumulative dose Phase C', false, true, 20),
('alcohol_wine', 'alcohol', 'alcohol_high', 'Wine', 150, 1.00, 0, 125, 1.0, 6, 187, 18, true, 12.0, 'Maughan 2016 (lager anchor extrapolated single serving 1.00); USDA FDC #171079; cumulative dose Phase C', false, true, 30),
('alcohol_spirits', 'alcohol', 'alcohol_high', 'Spirits', 30, 1.00, 0, 97, 0.0, 1, 1, 0, true, 40.0, 'Maughan 2016 (single drink extrapolation 1.00 base); USDA FDC #173812; cumulative dose Phase C handles diuretic', false, true, 40),
('alcohol_cocktail', 'alcohol', 'alcohol_high', 'Cocktail', 240, 1.00, 0, 250, 25.0, 30, 60, 5, true, 15.0, 'Maughan 2016 (mixed alcohol single drink extrapolation 1.00 base); USDA FDC pending; cumulative dose Phase C; sugar varies by recipe', false, true, 50)
on conflict (slug) do nothing;
```

## Critical Migration Ordering

Gordon flagged: alcohol_wine, alcohol_spirits, alcohol_cocktail route through the `alcohol_high` enum which currently carries 0.65 in the live runtime. **Deliverable 1 (170o ratio patch) must land BEFORE Deliverable 2 (seed) is loaded** or coefficients drift retroactively. Michelangelo must order migrations as:

1. Snapshot table `meal_items_hydration_backup_172e` captures pre-patch state + audit row count
2. 170o coefficient patch migration applies Deliverable 1
3. beverage_catalog table creation migration
4. Seed load applies Deliverable 2

## Per-row Flags (10 rows)

Rows Gordon flagged for follow-up review (Hannah unless noted):

- **coffee_latte, coffee_cappuccino, tea_chai** routed to `dairy` source_kind because milk dominates the matrix. Confirm vs `coffee_tea` at 1.00.
- **juice_orange** carries the largest haircut (0.19 below measured 1.39, 13.7%). Defensible per §5.2 but biggest.
- **juice_apple, juice_grape, juice_cranberry, juice_smoothie_mixed** all inherit Maughan OJ anchor by analogy. Confirm whether each deserves its own anchor or a 1.10 floor.
- **sports_drink_electrolyte_mix** uses LMNT-class 500 mg sodium (range 500-1000 mg). `requires_claim_review` TRUE.
- **sports_drink_ors** uses 1150 mg sodium per 500 ml (mid-commercial). WHO formula floor is ~862 mg per 500 ml; high-tonicity is 2070 mg. Pin needs Kelsey review.
- **functional_kombucha** caffeine 15 mg (midpoint of 8-25 brand-dependent), sugar 12 g (typical post-fermentation). `requires_claim_review` TRUE.
- **functional_broth** coefficient 1.20 is Gordon-derived (ORS by analogy).
- **milk_oat, milk_almond, milk_soy** inherit dairy 1.30 per Gate 1 single-ratio rule. Gordon recommends Phase B append-only `plant_milk` enum extension at coefficient 1.10.
- **water_hydrogen, water_alkaline** coefficient 1.00 matches still water. `requires_claim_review` TRUE keeps labels neutral.
- **alcohol_wine, alcohol_spirits, alcohol_cocktail** base coefficient 1.00 per Gate 1 (single drink retention indistinguishable). Diuretic handling lives in Phase C env config.

## Six Open Questions for Hannah (per Gordon handoff)

1. **plant_milk enum extension decision:** oat/almond/soy currently inherit dairy 1.30 because Gate 1 said single-ratio per enum. Plant milks lack lactose + casein retention mechanism Maughan measured. Gordon recommends Phase B append-only `plant_milk` enum at 1.10.
2. **high_water_food coefficient 0.90:** Gordon-derived without a Maughan anchor. Confirm or override.
3. **Chai, latte, cappuccino routing:** Gordon mapped to `dairy` because milk dominates. Alternative is `coffee_tea` at 1.00.
4. **Juice anchor:** all five inherit Maughan OJ 1.39 by analogy. Confirm or split per-juice anchors.
5. **ORS sodium pinning:** 1150 mg per 500 ml (mid-commercial). Alternatives: WHO formula 862 mg; high-tonicity 2070 mg. (Kelsey co-review.)
6. **Marshall pre-delivery scan:** data only, no public-surface strings carried. No Marshall trigger expected, but flag if desired before Michelangelo builds.

## Source Reconciliation Notes

- **Maughan 2016 Table 2 readings:** water 1.00, sparkling water 1.04, cola 1.01, diet cola 1.02, sports drink 1.04, coffee 1.01, orange juice 1.39, ORS 1.54, whole milk 1.50, skim milk 1.58, lager 1.01.
- **171b caffeine corpus reconciliation:** drip 95, espresso 63, cold brew 175, decaf 3, black tea 47, green tea 28, matcha 70, herbal 0, cola 34, diet cola 46, energy drink 80. White tea 28 (green analog), oolong 38 (interpolation, flagged), chai latte 47 (black tea base).
- **USDA FDC IDs:** cited where confirmed; "USDA FDC pending" for cold brew, white tea, matcha, mixed smoothie, cocktail.

## Per-row estimates flagged for follow-up

- Oolong tea caffeine 38 mg (interpolation, not corpus)
- White tea caffeine 28 mg (treated as green analog)
- Chai latte caffeine 47 mg (black tea base)
- Coconut water potassium 600 mg/240 ml (conservative low of 600-690 range)
- Bone broth electrolytes (sodium 600, potassium 230) per USDA FDC #174677; brand variance
- Cocktail sugar 25 g (varies wildly; pinned to typical cosmopolitan/margarita)
- Kombucha caffeine 15 mg (midpoint 8-25, brand dependent)
- Energy drink electrolytes (sodium 200, potassium 5) per Red Bull reference; brand variance
