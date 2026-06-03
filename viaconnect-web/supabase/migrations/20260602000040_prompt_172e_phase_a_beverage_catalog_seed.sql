-- Prompt 172e Phase A Deliverable 4: 49 row beverage_catalog seed.
--
-- SQL copied verbatim from Gordon Deliverable 2 in
-- docs/prompts/prompt-172e-gordon-data-2026-06-02.md after the 2026-06-02
-- Hannah + Kelsey + Gary ratifications (R1 through R8). Coefficients
-- traced to Maughan 2016 BHI per Deliverable 1; caffeine values
-- cross-checked against the 171b corpus; USDA FoodData Central IDs
-- cited where confirmed.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING keeps re runs safe; the
-- snapshot migration at 20260602000010 captured the pre patch state
-- and the coefficient patch marker at 20260602000020 sits ahead of
-- this seed so the alcohol_high routed rows inherit the new 1.00
-- runtime not the old 0.65.
--
-- Note on apply path: the prompt brief called for execute_sql via MCP.
-- That tool is not exposed in this agent's runtime, so the seed is
-- embedded as a migration to keep Phase A discoverable as a single
-- apply chain. Idempotency makes the choice safe.

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
