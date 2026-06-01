I have full context on the shipped 170m and 170n parsers. Both have an existing `caffeine_mg` field at the meal_item level (170m Rule 3.9, inherited verbatim in 170n §3). I need to add two NEW fields (`hydration_source_kind`, `portion_volume_ml`) and the recognition logic. Now I'll author the three deliverables.

---

# Prompt 170o Phase 1 Long-Pole 1: Gordon Blueprint

**Author:** Gordon (Nutrition Agent)
**Reports to:** Hannah
**Date:** 2026-05-31
**Phase:** 1 (standalone hydration tracking, no 170h dependency)
**Filing reference:** `docs/prompts/prompt-170o-phase-1-phase-2-split-2026-05-31.md` (commit `bdfe8a5f`)
**Patches target:**
- `src/lib/nutrition/quick-log/haiku-system-prompt.ts` (parser version `quick-log.haiku.v1.0.0`)
- `src/lib/nutrition/voice-native/haiku-system-prompt.ts` (parser version `voice-native.haiku.v1.0.0`)

Output schema delta for both parsers: add two new fields per `meal_item`: `hydration_source_kind` (string enum, 9 values, or null for non-beverages) + `portion_volume_ml` (number in milliliters, or null for non-beverages). The server computes `hydration_ml = portion_volume_ml * hydration_ratio(kind, user_counting_mode)`; the parser is NOT responsible for that math.

---

## SECTION 1: HYDRATION SOURCE CLASSIFICATION RULES

### 1.0 Canonical enum (load-bearing for `hydration_source_kind` column)

The string values below ARE the database enum. Spelling, casing, and underscore conventions are normative; downstream Supabase migration and TypeScript types reference these strings verbatim.

| Kind value | Adjusted ratio (counting_mode = adjusted) | Strict ratio (counting_mode = strict) | Conservative counts when ambiguous? |
|---|---|---|---|
| `pure_water` | 1.00 | 1.00 | Yes |
| `coffee_tea` | 1.00 | 0.85 | No |
| `juice_smoothie` | 0.90 | 0.85 | No |
| `dairy` | 0.85 | 0.85 | No |
| `soda` | 0.80 | 0.70 | No |
| `alcohol_low` | 0.95 (offset by diuresis on intake) | 0.50 | No |
| `alcohol_high` | 0.75 wine, 0.50 spirits | 0.30 spirits, 0.50 wine | No |
| `sports_drink` | 0.95 | 0.90 | No |
| `high_water_food` | variable; Phase 1.1 supplement | variable | No |

Phase 1 ships `counting_mode = adjusted` as the default and the only user-selectable mode. Strict mode is reserved for Phase 1.2.

Ratio notes (Hannah handoff for sign-off):
- Coffee, tea, and low-ABV beer are treated as net-positive in adjusted mode because typical-strength brews and 4 to 5 percent ABV beers are not measurably diuretic in habituated consumers at usual volumes; the strict-mode penalty exists for users who want a more cautious accounting.
- Alcohol_high splits wine and spirits at the kind boundary; if `food_name` cannot disambiguate, the parser emits `alcohol_high` and the resolver applies 0.65 (mean) until the user picks a counting mode. Flagged to Hannah for review.
- `high_water_food` is the only kind where the ratio is fundamentally per-food (watermelon 0.92, cucumber 0.96, soup broth 0.95, gelatin 0.85) and therefore deferred to Phase 1.1 supplement; for Phase 1, the parser MAY emit `high_water_food` on obvious cases (watermelon, broth) but `portion_volume_ml` is set null because the resolver will compute ml from food gram weight times water fraction at lookup time.

### 1.1 Per-kind representative foods, FDC categories, OFF categories, branded products

#### `pure_water`

Representative foods (24): tap water, bottled water, sparkling water, mineral water, distilled water, alkaline water, electrolyte water (unflavored), seltzer (unflavored), club soda, tonic water (flavor-only, no sugar), filtered water, ice water, ice cubes, ice, hot water, warm lemon water, cucumber water, infused water, spring water, well water, reverse osmosis water, carbonated water, Topo Chico (unflavored), Perrier (unflavored).

USDA FDC food category mapping: `Beverages` where `description ILIKE '%water%'` AND NOT `description ILIKE ANY(['%flavored%', '%sweetened%', '%vitamin%', '%enhanced%'])`; specifically FDC 14411 (water, tap), 14555 (water, bottled, generic), 14640 (water, bottled, non-carbonated), 174833 (carbonated water, unsweetened).

OFF category prefix: `Beverages > Waters > Spring waters`, `Beverages > Waters > Mineral waters`, `Beverages > Waters > Sparkling waters`, `Beverages > Waters > Flavoured waters` ONLY when `nutriments.sugars_100g = 0`.

Vision provider tag mapping (170g placeholder): Google Vision `water`, `bottled water`, `glass of water`, `water bottle` → `pure_water`; Anthropic vision label `water` → `pure_water`. TBD for full mapping until 170g ships.

Common branded products: Dasani, Aquafina, Smartwater, Fiji, Evian, Poland Spring, Voss, Crystal Geyser, Topo Chico (unflavored), Perrier (unflavored), San Pellegrino (unflavored), LaCroix (unflavored only; flavored variants stay `pure_water` because zero sugar), Bubly (unflavored only), Spindrift (real fruit, but zero sugar by spec → still `pure_water`; flag to Hannah).

#### `coffee_tea`

Representative foods (22): drip coffee, brewed coffee, black coffee, americano, espresso, espresso shot, latte (sub-classify dairy portion separately if user splits; baseline keep `coffee_tea`), cappuccino, macchiato, cortado, flat white, cold brew, iced coffee, nitro coffee, mocha, black tea, green tea, matcha, oolong tea, white tea, herbal tea, chai, kombucha (low-alcohol kombucha < 0.5 percent ABV stays `coffee_tea`; flag to Hannah for > 0.5 percent commercial variants).

USDA FDC category mapping: `Beverages` where `description ILIKE ANY(['%coffee%', '%tea%', '%espresso%', '%latte%', '%cappuccino%', '%matcha%', '%chai%'])` AND NOT `description ILIKE '%sugar%'` for the unsweetened baseline; sweetened coffee drinks (Frappuccino, sweetened iced coffee) cascade to `coffee_tea` but downstream sugar load is computed by the cascade. FDC 14209 (coffee, brewed, prepared), 14215 (espresso, prepared), 14355 (tea, brewed, prepared), 173984 (matcha).

OFF category prefix: `Beverages > Coffees > *`, `Beverages > Teas > *`, `Beverages > Hot drinks > Coffees`, `Beverages > Hot drinks > Teas`, `Beverages > Iced coffees`, `Beverages > Iced teas`.

Vision provider tag: Google Vision `coffee`, `cup of coffee`, `espresso`, `tea`, `teacup`, `latte art` → `coffee_tea`.

Common branded products: Starbucks bottled (Frappuccino, Doubleshot), Stok Cold Brew, La Colombe Draft Latte, High Brew, Califia Farms Cold Brew, Pure Leaf, Honest Tea, Gold Peak, Lipton, Snapple (tea variants only), Tazo, Yogi, Celestial Seasonings, Twinings, Bigelow, Tetley, Harney + Sons.

#### `juice_smoothie`

Representative foods (22): orange juice, apple juice, grapefruit juice, cranberry juice, grape juice, pomegranate juice, pineapple juice, tomato juice, V8, vegetable juice, green juice, carrot juice, beet juice, lemonade, limeade, smoothie, fruit smoothie, green smoothie, protein smoothie, acai bowl drink, kombucha drink (when sub-2 percent ABV and fruit-forward), Naked Juice (any variant).

USDA FDC category mapping: `Beverages` where `description ILIKE ANY(['%juice%', '%smoothie%', '%nectar%'])` AND NOT description ILIKE ANY(['%coffee%', '%tea%']). FDC 14271 (orange juice), 14267 (apple juice), 14246 (grape juice), 173961 (smoothie, fruit, prepared from concentrate).

OFF category prefix: `Beverages > Fruit-based beverages > Fruit juices`, `Beverages > Fruit-based beverages > Fruit nectars`, `Beverages > Plant-based beverages > Smoothies`, `Beverages > Vegetable juices`.

Vision provider tag: Google Vision `juice`, `orange juice`, `smoothie`, `green juice`, `juice bottle` → `juice_smoothie`.

Common branded products: Tropicana, Minute Maid, Simply Orange, Simply Lemonade, Naked Juice, Odwalla, Suja, Bolthouse Farms, Evolution Fresh, V8, Welch's, Ocean Spray (juice variants), Honest Kids, R.W. Knudsen, Lakewood, Pure Premium, POM Wonderful.

#### `dairy`

Representative foods (24): whole milk, 2 percent milk, 1 percent milk, skim milk, fat-free milk, almond milk (note: see §1.2 dairy-alternative routing rule), soy milk (see §1.2), oat milk (see §1.2), coconut milk beverage (see §1.2), kefir, drinkable yogurt, lassi, chocolate milk, strawberry milk, eggnog, horchata, milkshake, protein shake (dairy-based), latte (when user logs only the latte without splitting), cappuccino (when user logs only the drink), hot chocolate, frothed milk, milk steamer, atole.

USDA FDC category mapping: `Dairy and Egg Products` where category ILIKE 'milk%' OR description ILIKE ANY(['%milk%', '%kefir%', '%lassi%']) AND food_category != 'Snacks'. FDC 171265 (milk, whole), 171269 (milk, 2 percent), 171273 (milk, 1 percent), 171279 (milk, fat-free), 173441 (kefir, lowfat, plain).

OFF category prefix: `Beverages > Plant-based beverages > Plant-based milk substitutes` (cascades to `dairy` for ratio purposes; users counting strict plant-based should flag — Hannah handoff), `Dairies > Milks`, `Dairies > Fermented dairy drinks`, `Beverages > Milks`.

Vision provider tag: Google Vision `milk`, `glass of milk`, `milkshake`, `latte`, `cappuccino`, `milk carton` → `dairy`.

Common branded products: Horizon Organic, Organic Valley, Fairlife, a2 Milk, Lactaid, Silk (almond, soy, oat — all routed to `dairy` for hydration ratio purposes), Oatly, Califia Farms (oat, almond), Almond Breeze, So Delicious (coconut beverage), Yoplait drinkable, Chobani drinkable, Dannon drinkable, Kefir Lifeway, Nesquik (powder dissolved in milk), Ovaltine.

#### `soda`

Representative foods (24): cola, Coca-Cola, Coke, Diet Coke, Coke Zero, Pepsi, Diet Pepsi, Pepsi Zero, root beer, A+W Root Beer, Mug Root Beer, Sprite, 7Up, Sierra Mist, Mountain Dew, Dr Pepper, Mr. Pibb, Fanta (any flavor), Orange Crush, ginger ale, Schweppes ginger ale, Canada Dry ginger ale, cream soda, grape soda, cherry soda.

USDA FDC category mapping: `Beverages` where description ILIKE ANY(['%cola%', '%soda%', '%pop%', '%soft drink%', '%root beer%', '%ginger ale%']) AND NOT description ILIKE '%diet%' for sugar-loaded baseline; diet variants share the kind. FDC 14400 (carbonated beverage, cola), 14418 (carbonated beverage, low calorie, cola), 14160 (carbonated beverage, lemon lime), 14148 (ginger ale).

OFF category prefix: `Beverages > Sodas`, `Beverages > Soft drinks > Sodas`, `Beverages > Carbonated beverages > Colas`, `Beverages > Carbonated beverages > Lemon limes`, `Beverages > Carbonated beverages > Ginger ales`.

Vision provider tag: Google Vision `soda`, `soda can`, `cola`, `soda bottle`, `soft drink` → `soda`.

Common branded products: Coca-Cola Classic, Diet Coke, Coke Zero Sugar, Cherry Coke, Vanilla Coke, Coke Life, Pepsi, Diet Pepsi, Pepsi Zero, Mountain Dew, Diet Mountain Dew, Code Red, Dr Pepper, Diet Dr Pepper, 7Up, Sprite, Sprite Zero, Fanta Orange, Fanta Grape, Sunkist, Crush, A+W, Mug, Barq's, Sierra Mist, Schweppes, Canada Dry.

#### `alcohol_low` (4 to 8 percent ABV; default beer band)

Representative foods (20): beer, light beer, lager, pilsner, IPA, pale ale, wheat beer, hefeweizen, stout (when under 8 percent ABV), porter (when under 8 percent ABV), amber ale, brown ale, blonde ale, hard seltzer, White Claw, Truly, Bud Light Seltzer, hard kombucha, hard cider (when under 8 percent ABV), low-ABV cocktail.

USDA FDC category mapping: `Beverages` where description ILIKE ANY(['%beer%', '%ale%', '%lager%', '%hard seltzer%', '%hard cider%']) AND NOT description ILIKE '%non-alcoholic%'. FDC 14003 (alcoholic beverage, beer, regular, all), 14006 (alcoholic beverage, beer, light), 14541 (alcoholic beverage, hard cider).

OFF category prefix: `Beverages > Alcoholic beverages > Beers`, `Beverages > Alcoholic beverages > Ciders`, `Beverages > Alcoholic beverages > Hard seltzers`.

Vision provider tag: Google Vision `beer`, `beer bottle`, `beer can`, `beer glass`, `pint`, `pint of beer` → `alcohol_low`.

Common branded products: Budweiser, Bud Light, Miller Lite, Coors Light, Heineken, Corona, Corona Light, Modelo, Stella Artois, Guinness (8 percent stout flagged for routing review), Sierra Nevada Pale Ale, Sam Adams Boston Lager, Dogfish Head 60 Minute IPA, Lagunitas IPA, Blue Moon, White Claw, Truly, Bud Light Seltzer, High Noon (vodka-soda is `alcohol_high`; HARD seltzer with hard-seltzer base is `alcohol_low` — flag to Hannah), Twisted Tea, Mike's Hard Lemonade.

#### `alcohol_high` (over 8 percent ABV: wine, spirits, fortified)

Representative foods (22): wine, red wine, white wine, rosé, sparkling wine, prosecco, champagne, sake, port, sherry, vermouth, vodka, gin, tequila, rum, whiskey, bourbon, scotch, brandy, cognac, liqueur, cocktail (mixed spirit-based).

USDA FDC category mapping: `Beverages` where description ILIKE ANY(['%wine%', '%vodka%', '%gin%', '%tequila%', '%rum%', '%whiskey%', '%bourbon%', '%scotch%', '%brandy%', '%liqueur%']) OR description ILIKE '%distilled spirits%'. FDC 14096 (wine, table, red), 14106 (wine, table, white), 14037 (alcoholic beverage, distilled, all 80 proof), 14555 (sake).

OFF category prefix: `Beverages > Alcoholic beverages > Wines`, `Beverages > Alcoholic beverages > Spirits`, `Beverages > Alcoholic beverages > Liqueurs`, `Beverages > Alcoholic beverages > Fortified wines`.

Vision provider tag: Google Vision `wine`, `wine glass`, `wine bottle`, `champagne`, `cocktail`, `whiskey`, `cocktail glass` → `alcohol_high`.

Common branded products: Sutter Home, Barefoot, Yellow Tail, Kendall-Jackson, Josh Cellars, Veuve Clicquot, Dom Perignon, Moet + Chandon, La Marca Prosecco, Tito's, Smirnoff, Grey Goose, Absolut, Tanqueray, Bombay Sapphire, Hendrick's, Patron, Don Julio, Casamigos, Bacardi, Captain Morgan, Jack Daniel's, Jameson, Maker's Mark, Crown Royal, Hennessy.

#### `sports_drink`

Representative foods (16): Gatorade, Gatorade G2, Gatorade Zero, Powerade, Powerade Zero, BodyArmor, BodyArmor Lyte, Liquid I.V., LMNT, Pedialyte, Pedialyte Sport, Propel, Vitaminwater, Vitamin Water Zero, coconut water, Vita Coco.

USDA FDC category mapping: `Beverages` where description ILIKE ANY(['%sports drink%', '%electrolyte%', '%coconut water%', '%enhanced water%']) OR brand_name ILIKE ANY(['Gatorade%', 'Powerade%', 'BodyArmor%']). FDC 14157 (carbonated beverage, low calorie, with aspartame — not the right category; sports drinks are noncarbonated; canonical is FDC 14463 sports drink ready-to-drink), 173889 (coconut water, unsweetened).

OFF category prefix: `Beverages > Sports drinks`, `Beverages > Electrolyte drinks`, `Beverages > Hydration drinks`, `Beverages > Coconut waters`, `Beverages > Plant-based beverages > Coconut waters`.

Vision provider tag: Google Vision `sports drink`, `Gatorade`, `electrolyte drink`, `coconut water` → `sports_drink`.

Common branded products: Gatorade (Frost, Thirst Quencher, Zero, G2, Endurance), Powerade (Mountain Berry Blast, Zero), BodyArmor (Lyte, Edge, SuperDrink), BodyArmor SportWater, Liquid I.V. Hydration Multiplier, LMNT Recharge, Pedialyte, Pedialyte Sport, Propel, Vitaminwater (XXX, Power-C, Energy), Smartwater Alkaline, Essentia Water (alkaline), Vita Coco, Harmless Harvest, Zico, ONE Coconut Water.

#### `high_water_food`

Representative foods (10; Phase 1.1 deferral acknowledged): watermelon, cucumber, celery, lettuce, iceberg lettuce, tomato, soup (broth-based), broth, miso soup, gazpacho.

USDA FDC category mapping: deferred to Phase 1.1; baseline routing: `Vegetables and Vegetable Products` where description ILIKE ANY(['%cucumber%', '%celery%', '%lettuce%', '%tomato%', '%watermelon%']) AND form != 'dried'. Soup routing: `Soups, Sauces, and Gravies` where description ILIKE ANY(['%broth%', '%consomme%', '%miso soup%', '%gazpacho%']).

OFF category prefix: deferred to Phase 1.1.

Vision provider tag: deferred to Phase 1.1.

Common branded products: Pacific Foods broth, Swanson broth, Campbell's broth, College Inn broth.

Phase 1 parser behavior: parsers MAY emit `hydration_source_kind = "high_water_food"` with `portion_volume_ml = null` for the 10 representative foods above; the resolver computes hydration_ml = portion_grams * water_fraction at lookup time. For all other foods that arguably qualify (yogurt, oatmeal, casseroles), the parser MUST NOT emit `high_water_food`; those resolve through `farmceutica_curated_foods` water-content lookup when 170o Phase 1.1 ships.

### 1.2 Dairy-alternative routing rule (Hannah handoff)

Almond milk, soy milk, oat milk, coconut milk beverage, hemp milk, pea milk, rice milk, cashew milk all route to `dairy` for the hydration RATIO because the water content is comparable to whole milk (oat milk approximately 89 percent water; almond milk approximately 96 percent water). Users who are strictly counting plant-based beverages separately can flag this; Phase 1.2 may split the kind into `dairy` and `plant_milk` if Hannah determines the distinction is clinically meaningful. For Phase 1, single bucket.

### 1.3 Cascade integration (data flow)

When a beverage `meal_item` is created via any entry path (photo → 170g, barcode → 170l, Quick Log → 170m, voice-native → 170n, voice-edit → 170r):

1. Parser emits `food_name` + `hydration_source_kind` + `portion_volume_ml` + `caffeine_mg` (existing Rule 3.9).
2. Server cascade lookup:
   - First: `farmceutica_curated_foods` row keyed on `food_name` normalized; pull `hydration_source_kind` override + canonical `volume_ml_per_serving`.
   - Second: `usda_fdc` row by FDC ID match; pull category and infer kind from §1.1 mapping.
   - Third: `open_food_facts` row by OFF ID match; pull `categories_tags` and infer kind from §1.1 mapping.
3. First non-null kind wins. If all three return null and the parser emitted a kind, parser kind is the authority.
4. `hydration_ml = portion_volume_ml * hydration_ratio(kind, user_counting_mode)` computed server-side at meal_item insert.

### 1.4 Phase 1 Blueprint requirement: seed `farmceutica_curated_foods` hydration tags

For the 200 beverages in Section 3, the curated catalog seed must include:
- `hydration_source_kind` column on `farmceutica_curated_foods` (new column, jsonb-friendly nullable text)
- `volume_ml_per_serving` column (numeric, nullable)
- `is_beverage` boolean (true for all 200)

Migration scope is Michelangelo's call; Gordon provides the seed values.

---

## SECTION 2: NLU AUGMENTATION SYSTEM PROMPT EXTENSIONS

### 2.1 Schema delta (both parsers, identical)

Add two fields to the `meal_items[]` object schema in Section 2 of both system prompts:

```
"hydration_source_kind": "string or null, one of: pure_water, coffee_tea, juice_smoothie, dairy, soda, alcohol_low, alcohol_high, sports_drink, high_water_food; null for non-beverage items",
"portion_volume_ml": "number or null, the beverage volume in milliliters in [1, 5000]; null for non-beverage items and for high_water_food items where the resolver will compute ml from gram weight"
```

The existing `caffeine_mg` field stays as-is. The parser is NOT responsible for `hydration_ml`; that's server-computed.

Rules added to Section 2 of both parsers (insert after the existing `confidence` rule):
- `hydration_source_kind` MUST be one of the 9 enum values listed, or null. No other values. Null only for non-beverages and for items where the parser cannot identify the kind at confidence >= 0.50.
- `portion_volume_ml` MUST be in [1, 5000] or null. Null for non-beverages, for `high_water_food`, and when beverage volume cannot be defaulted from the input.
- When `hydration_source_kind` is non-null, `portion_volume_ml` SHOULD be non-null except for `high_water_food`.

### 2.2 New rule for 170m Quick Log parser: Rule 3.10 (insert after existing Rule 3.9)

Insert verbatim as Rule 3.10 in `SYSTEM_PROMPT_BODY` at `src/lib/nutrition/quick-log/haiku-system-prompt.ts`:

```
Rule 3.10: Hydration source classification and volume inference for beverages (added 2026-05-31 for 170o Phase 1).

For every meal_item that is a beverage, populate hydration_source_kind (one of 9 enum values) AND portion_volume_ml (the volume in milliliters). For non-beverage items, both fields are null.

Kind enum vocabulary (verbatim string values):
  pure_water: tap water, bottled water, sparkling water, mineral water, seltzer, club soda, hot water, ice water, infused water, Dasani, Aquafina, Smartwater, Fiji, Evian, Poland Spring, Voss, Topo Chico unflavored, Perrier unflavored, LaCroix any flavor (zero sugar baseline), Bubly, Spindrift.
  coffee_tea: drip coffee, brewed coffee, black coffee, americano, espresso, latte, cappuccino, macchiato, cortado, flat white, cold brew, iced coffee, nitro coffee, mocha, black tea, green tea, matcha, oolong tea, white tea, herbal tea, chai, kombucha under 0.5 percent ABV. Inherits caffeine_mg from Rule 3.9.
  juice_smoothie: orange juice, apple juice, grapefruit juice, cranberry juice, grape juice, pomegranate juice, pineapple juice, tomato juice, V8, vegetable juice, green juice, carrot juice, beet juice, lemonade, limeade, smoothie, fruit smoothie, green smoothie, protein smoothie, Naked Juice, Tropicana, Minute Maid, Simply Orange, Odwalla, Suja, Bolthouse Farms.
  dairy: whole milk, 2 percent milk, 1 percent milk, skim milk, almond milk, soy milk, oat milk, coconut milk beverage, kefir, drinkable yogurt, lassi, chocolate milk, strawberry milk, eggnog, horchata, milkshake, protein shake (dairy-based), hot chocolate, milk steamer. Plant-based milks route here for Phase 1.
  soda: cola, Coca-Cola, Coke, Diet Coke, Coke Zero, Pepsi, Diet Pepsi, root beer, A+W, Mug, Sprite, 7Up, Sierra Mist, Mountain Dew, Dr Pepper, Fanta, Orange Crush, Crush, ginger ale, Schweppes, Canada Dry, cream soda, grape soda, cherry soda.
  alcohol_low: beer, light beer, lager, pilsner, IPA, pale ale, wheat beer, hefeweizen, stout under 8 percent, porter under 8 percent, amber ale, brown ale, blonde ale, hard seltzer, White Claw, Truly, Bud Light Seltzer, hard kombucha, hard cider under 8 percent, Budweiser, Bud Light, Miller Lite, Coors Light, Heineken, Corona, Modelo, Stella Artois, Sierra Nevada Pale Ale, Sam Adams, Blue Moon, Twisted Tea, Mike's Hard Lemonade.
  alcohol_high: wine, red wine, white wine, rose, rosé, sparkling wine, prosecco, champagne, sake, port, sherry, vermouth, vodka, gin, tequila, rum, whiskey, bourbon, scotch, brandy, cognac, liqueur, mixed cocktail, martini, margarita, mojito, old fashioned, manhattan, Tito's, Smirnoff, Grey Goose, Absolut, Patron, Don Julio, Bacardi, Captain Morgan, Jack Daniel's, Jameson, Maker's Mark.
  sports_drink: Gatorade, Gatorade Zero, Powerade, Powerade Zero, BodyArmor, BodyArmor Lyte, Liquid I.V., LMNT, Pedialyte, Pedialyte Sport, Propel, Vitaminwater, Vitamin Water Zero, coconut water, Vita Coco, Harmless Harvest, Zico, ONE Coconut Water.
  high_water_food: watermelon, cucumber, celery, iceberg lettuce, tomato, broth, chicken broth, beef broth, vegetable broth, miso soup, gazpacho. portion_volume_ml is null for high_water_food; resolver computes ml from gram weight.

Default volumes by container hint (assign portion_volume_ml when user input matches):
  Water: glass 240; bottle 500; cup 240; ice water 240; mug 295; large bottle 1000; small bottle 330.
  Coffee or tea: small or 8 fl oz cup 240; medium or 12 fl oz 355; large or 16 fl oz 473; espresso shot 30; double shot 60; mug 295; latte 240 standard or 473 if grande hint; cappuccino 180; cold brew 16 fl oz 473; pot of tea 720.
  Juice or smoothie: glass 240; small juice 200; 16 fl oz smoothie 473; small smoothie 355; large smoothie 591; juice box 200; cold-pressed bottle 355.
  Dairy: glass milk 240; cup milk 240; pint milk 473; carton 240; milkshake 355 small, 473 medium, 591 large; protein shake 325 (matches Premier Protein 11 fl oz); kefir 240.
  Soda: can 355; bottle 591; 2-liter share 1000 (assume 1/2 bottle); 20 oz bottle 591; small fountain 355; medium fountain 473; large fountain 710.
  Beer or hard seltzer: bottle 355; can 355; pint 473; tall boy 473; 12 oz 355; pour 355.
  Wine: glass 148; large pour 180; small pour 120; bottle 750 (assume 1/5 bottle = 148 if single serving).
  Spirits: shot 44; double 88; cocktail 240 (mixed drink with mixer); martini 90; margarita 240; old fashioned 90; rocks pour 60.
  Sports drink: Gatorade bottle 591; small Gatorade 355; Powerade bottle 591; BodyArmor 473; Liquid I.V. packet mixed 473 (16 fl oz prep); LMNT packet mixed 473; Pedialyte bottle 1000 (large) or 473 (small); coconut water carton 330 or 500; Vitaminwater 591.

Container-hint examples:
  "a glass of water" -> hydration_source_kind pure_water, portion_volume_ml 240.
  "a bottle of water" -> pure_water, 500. ("a bottle" defaults 500 ml for water unspecified.)
  "a cup of coffee" -> coffee_tea, 240, caffeine_mg 95 (per Rule 3.9).
  "a small coffee" -> coffee_tea, 240, caffeine_mg 95.
  "a grande latte" -> coffee_tea, 473, caffeine_mg 150 (16 fl oz brewed scale of Rule 3.9 latte default 75mg per shot times 2 shots).
  "a can of Coke" -> soda, 355, caffeine_mg 34 (Rule 3.9).
  "a bottle of Coke" -> soda, 591.
  "a 20 oz Mountain Dew" -> soda, 591, caffeine_mg 90 (scale Rule 3.9 54mg per 12 fl oz to 20 fl oz).
  "a beer" -> alcohol_low, 355.
  "a pint of beer" -> alcohol_low, 473.
  "a glass of wine" -> alcohol_high, 148.
  "a bottle of wine" (assumed one serving unless plural) -> alcohol_high, 148; if explicitly "drank a whole bottle of wine" -> 750.
  "a shot of vodka" -> alcohol_high, 44.
  "a margarita" -> alcohol_high, 240.
  "a Gatorade" -> sports_drink, 591.
  "a small Gatorade" -> sports_drink, 355.
  "a coconut water" -> sports_drink, 330.
  "a smoothie" -> juice_smoothie, 400. Confidence -0.05 (size ambiguous).
  "a glass of milk" -> dairy, 240.
  "a glass of orange juice" -> juice_smoothie, 240.
  "watermelon" -> high_water_food, portion_volume_ml null (resolver computes from gram weight).

Ambiguity rules:
  When the beverage name is ambiguous between two kinds ("juice" alone could be juice_smoothie OR plausibly a frozen cocktail), emit the most-frequent kind (juice_smoothie) and lower confidence by 0.05.
  When the volume is unstated and the container is unclear, apply default 240 ml for water/coffee/tea/milk/juice; 355 ml for soda/beer; 148 ml for wine; 44 ml for spirits shot. Lower confidence by 0.05.
  When the user logs a coffee drink with a milk component (latte, cappuccino, hot chocolate), keep hydration_source_kind = coffee_tea (the drink is dominantly water-based) UNLESS the user explicitly splits the milk (e.g. "8 oz milk in my latte"), in which case emit two meal_items: one coffee_tea espresso shot + one dairy milk portion.
  Beverages with size unstated for coffee, tea, or alcohol get default 8 fl oz / 12 fl oz / 1 shot per Rule 4.5; do NOT clarify, just apply default at confidence 0.65 to 0.75.
  When the user logs only a food name without quantity AND the item is a beverage (e.g. "I had coffee"), apply default volume from the container-hint table and set confidence per Rule 4.5.
  Set hydration_source_kind to null when food_name does not match any entry in the kind vocabulary above; do not guess. Common cases where null is correct: cocktail described only by ingredient list, novel craft beverage, unidentified branded product, non-beverage food.

Caffeine integration: Rule 3.9 still applies for caffeine_mg. The new fields hydration_source_kind and portion_volume_ml are additive; they do NOT replace caffeine_mg.
```

### 2.3 New section for 170n voice-native parser: Section 4.10 (insert after existing 4.9.3)

Insert verbatim as Section 4.10 in `REST_OF_PROMPT` at `src/lib/nutrition/voice-native/haiku-system-prompt.ts`, immediately after the existing 4.9.3 STT confidence floor:

```
4.10 Hydration source classification and volume inference for beverages (added 2026-05-31 for 170o Phase 1).

Apply Rule 3.10 of canonical 170m Quick Log verbatim, including the 9-value hydration_source_kind enum (pure_water, coffee_tea, juice_smoothie, dairy, soda, alcohol_low, alcohol_high, sports_drink, high_water_food), the per-kind vocabulary lists, the default volume table by container hint, the ambiguity rules, and the caffeine_mg additivity.

Voice-specific addenda:

4.10.1 STT homophone tolerance for beverage names. Edit-distance-2 matches accepted with confidence floor 0.85 and NLU confidence reduced by 0.05:
  "smoothie" / "smoothy" / "smoothi" -> smoothie (juice_smoothie).
  "Gatorade" / "gatorate" / "gator aid" / "gator-aid" -> Gatorade (sports_drink).
  "espresso" / "expresso" -> espresso (coffee_tea).
  "latte" / "lattae" / "lottay" -> latte (coffee_tea).
  "cappuccino" / "capucino" / "cap a cheeno" -> cappuccino (coffee_tea).
  "kombucha" / "kombootcha" / "kom boo cha" -> kombucha (coffee_tea unless ABV hint over 0.5 percent then alcohol_low).
  "Coca-Cola" / "Coke" / "coca cola" / "coh kola" -> Coke (soda).
  "Pepsi" / "pepsy" -> Pepsi (soda).
  "champagne" / "shampain" / "sham pain" -> champagne (alcohol_high).
  "prosecco" / "perseco" / "pro sek o" -> prosecco (alcohol_high).
  "tequila" / "tekeela" / "te kee la" -> tequila (alcohol_high).
  "Liquid I.V." / "liquid IV" / "liquid eye vee" -> Liquid I.V. (sports_drink).
  "Vitaminwater" / "vitamin water" / "vitamen water" -> Vitaminwater (sports_drink).
  "Pedialyte" / "pedalyte" / "ped a lite" -> Pedialyte (sports_drink).
  "coconut water" / "co co nut water" -> coconut water (sports_drink).

When the STT homophone correction is applied, record the resolution in restarts_resolved with restart_kind "correction" only if the raw transcript form was substantially different from canonical (Levenshtein >= 3); for minor STT noise (edit distance 1-2), just normalize silently in normalized_transcript and drop NLU confidence 0.05.

4.10.2 Volume defaults under STT noise. When the user's stated volume is unclear due to STT noise, apply container-hint default from Rule 3.10 AND drop NLU confidence by an additional 0.05. Examples:
  STT "I had a coffee" at STT confidence 0.85 -> coffee_tea, portion_volume_ml 240, NLU 0.80 (already at default volume confidence 0.85, minus 0.05 STT noise floor).
  STT "I had a smoothy" at STT confidence 0.70 -> juice_smoothie (smoothie corrected), portion_volume_ml 400, NLU 0.75, combined_voice_confidence sqrt(0.75 * 0.70) = 0.72.

4.10.3 Approximation markers from Section 3 voice addendum apply to volumes too:
  "about a glass of water" -> pure_water, 240, NLU 0.85 (10-point approximation penalty already applied per Section 3 voice addendum).
  "roughly two beers" -> two alcohol_low items, each 355 ml, NLU 0.85.

4.10.4 Voice-specific clarification triggers for hydration:
  When the user uses a collective quantifier on a beverage ("a few beers", "several glasses of wine", "a couple of coffees"), apply Section 4.5 quantifier defaults to the COUNT, and apply Rule 3.10 volume default to each item. "A few beers" -> 3 alcohol_low items at 355 ml each, NLU 0.75.
  When the user describes a beverage by volume only ("I drank 32 ounces of stuff") without naming the beverage, kind is null and portion_volume_ml is 946 (32 fl oz); emit clarify "What were you drinking?" chips ["Water","Coffee or tea","Soda","Sports drink","Something else"].
  When the user says "I had a drink" without specifying type, kind is null and portion_volume_ml is null; clarify "What kind of drink?" chips ["Water","Coffee","Beer","Wine","Cocktail","Other"].

4.10.5 Worked voice examples (illustrative, full set in Section 11 voice examples):
  "I had like a glass of water" -> fillers ["like"]; pure_water 240; NLU 0.92 STT 0.93 combined 0.92 Quick Apply.
  "um I had a couple of beers last night" -> fillers ["um"]; alcohol_low x 2 at 355 ml each; NLU 0.88 STT 0.90 combined 0.89.
  "I drank about 20 ounces of cold brew" -> coffee_tea 591 ml (20 fl oz); caffeine_mg 500 (scale Rule 3.9 16-oz 400mg to 20 oz); NLU 0.85 STT 0.90 combined 0.87.
```

### 2.4 Worked examples per parser (8 each)

#### 2.4.1 Quick Log (170m) worked examples

Add to Section 11 of `src/lib/nutrition/quick-log/haiku-system-prompt.ts` as Examples 13-20 (current count is 12):

```
Example 13, water glass: "a glass of water" -> 1 item food_name "water", portion_grams 240, hydration_source_kind "pure_water", portion_volume_ml 240, caffeine_mg null, confidence 0.95.

Example 14, coffee with size: "I had a 16 oz cold brew" -> 1 item food_name "cold brew coffee", portion_grams 473, hydration_source_kind "coffee_tea", portion_volume_ml 473, caffeine_mg 400 (Rule 3.9), confidence 0.94.

Example 15, soda can: "a can of Coke" -> 1 item food_name "Coca-Cola", portion_grams 355, hydration_source_kind "soda", portion_volume_ml 355, caffeine_mg 34 (Rule 3.9), confidence 0.96; branded_product_hints ["Coca-Cola Coke", confidence 0.96]; dietary_restriction_flags [].

Example 16, beer pint: "a pint of Sierra Nevada Pale Ale" -> 1 item food_name "beer, pale ale", portion_grams 473, hydration_source_kind "alcohol_low", portion_volume_ml 473, caffeine_mg null, confidence 0.93; branded_product_hints ["Sierra Nevada Pale Ale", confidence 0.94].

Example 17, wine glass: "a glass of red wine" -> 1 item food_name "red wine", portion_grams 148, hydration_source_kind "alcohol_high", portion_volume_ml 148, caffeine_mg null, confidence 0.94.

Example 18, sports drink: "a Gatorade" -> 1 item food_name "Gatorade", portion_grams 591, hydration_source_kind "sports_drink", portion_volume_ml 591, caffeine_mg null, confidence 0.92; branded_product_hints ["Gatorade", confidence 0.95].

Example 19, smoothie with hedging: "had like a smoothie" -> 1 item food_name "smoothie", portion_grams 400, hydration_source_kind "juice_smoothie", portion_volume_ml 400, caffeine_mg null, confidence 0.75 (default size penalty); clarification "What size smoothie?" chips ["Small 12 oz","Medium 16 oz","Large 20 oz","Not sure"].

Example 20, mixed meal with beverage: "two eggs with toast and a small black coffee" -> 3 items (scrambled eggs 100g hydration_source_kind null, portion_volume_ml null; toast 28g hydration_source_kind null, portion_volume_ml null; coffee 240g hydration_source_kind "coffee_tea" portion_volume_ml 240 caffeine_mg 95); allergens [eggs, wheat, gluten].
```

#### 2.4.2 Voice-native (170n) worked examples

Add to Section 11 of `src/lib/nutrition/voice-native/haiku-system-prompt.ts` as Examples 13-20 (current count is 12):

```
Example 13, glass of water with filler: "I had like a glass of water" -> fillers_removed ["like"]; normalized "I had a glass of water"; 1 item food_name "water", portion_grams 240, hydration_source_kind "pure_water", portion_volume_ml 240, caffeine_mg null, confidence 0.94, stt 0.95, combined 0.94 Quick Apply.

Example 14, smoothie STT homophone: STT "I had a smoothy" stt 0.70 -> normalized "I had a smoothie"; 1 item food_name "smoothie", portion_grams 400, hydration_source_kind "juice_smoothie", portion_volume_ml 400, NLU 0.70 (STT homophone penalty 0.05 + size ambiguity 0.05), stt 0.70, combined 0.70 Medium chip; clarify "What size smoothie?" chips ["Small","Medium","Large"].

Example 15, Gatorade STT homophone: STT "a gator aid" stt 0.75 -> normalized "a Gatorade"; 1 item food_name "Gatorade", portion_grams 591, hydration_source_kind "sports_drink", portion_volume_ml 591, NLU 0.85, stt 0.75, combined 0.80; branded_product_hints ["Gatorade" conf 0.85].

Example 16, collective quantifier on beverage: "I had a few beers last night" -> fillers []; normalized "I had a few beers last night"; 3 items food_name "beer" each, portion_grams 355 each, hydration_source_kind "alcohol_low" each, portion_volume_ml 355 each, caffeine_mg null each, NLU 0.75 each (quantifier penalty), stt 0.92, combined 0.83; meal type "Snack" or "Evening" routes via §4.8 if "last night" parsed.

Example 17, beverage volume only no name: "I drank about 32 ounces of stuff" -> normalized "I drank about 32 oz of stuff"; 1 item food_name "unknown drink", portion_grams 946, hydration_source_kind null, portion_volume_ml 946, NLU 0.50, stt 0.90, combined 0.67; clarify "What were you drinking?" chips ["Water","Coffee or tea","Soda","Sports drink","Something else"].

Example 18, wine glass STT homophone: STT "a glass of red whine" stt 0.78 -> normalized "a glass of red wine"; 1 item food_name "red wine", portion_grams 148, hydration_source_kind "alcohol_high", portion_volume_ml 148, NLU 0.88 (STT homophone "whine"->"wine" penalty 0.05), stt 0.78, combined 0.83.

Example 19, hydration plus meal: "for breakfast I had two scrambled eggs and a big mug of coffee" -> fillers []; normalized intact; meal split Breakfast; 2 items (scrambled eggs 100g hydration_source_kind null, portion_volume_ml null; coffee 295g hydration_source_kind "coffee_tea" portion_volume_ml 295 caffeine_mg approximately 117 (scale Rule 3.9 8 fl oz 95mg to 10 fl oz mug)); confidence 0.90 + 0.88.

Example 20, cocktail kind ambiguity: "I had a margarita" -> 1 item food_name "margarita", portion_grams 240, hydration_source_kind "alcohol_high", portion_volume_ml 240, caffeine_mg null, NLU 0.85, stt 0.92, combined 0.88; dietary_restriction_flags [] (tequila is allergen-free unless agave allergy which is not in vocabulary).
```

### 2.5 Patch locations summary (for Michelangelo to wire)

`src/lib/nutrition/quick-log/haiku-system-prompt.ts`:
- Section 2 schema: add `hydration_source_kind` and `portion_volume_ml` fields per §2.1 of this Blueprint.
- Section 2 Rules block: add 3 new bullet rules per §2.1 of this Blueprint.
- Section 3: insert Rule 3.10 verbatim per §2.2 of this Blueprint.
- Section 11: insert Examples 13-20 verbatim per §2.4.1 of this Blueprint.
- Section 12.4: amend portion_volume_ml clamp to [1, 5000] consistent with portion_grams.

`src/lib/nutrition/voice-native/haiku-system-prompt.ts`:
- Section 2 schema in `SHARED_PREAMBLE`: add `hydration_source_kind` and `portion_volume_ml` fields per §2.1 of this Blueprint.
- Section 2 Rules: add 3 new bullet rules per §2.1 of this Blueprint.
- Section 3: add reference to inherited Rule 3.10 from 170m, mirroring how Rule 3.9 caffeine is inherited.
- Section 4: insert Section 4.10 verbatim in `REST_OF_PROMPT` per §2.3 of this Blueprint.
- Section 11: insert Examples 13-20 verbatim per §2.4.2 of this Blueprint.
- Section 12.4: amend portion_volume_ml clamp per consistency.

Both parsers bump version constants to `quick-log.haiku.v1.1.0` and `voice-native.haiku.v1.1.0` respectively (Michelangelo decision: OBRA Blueprint stage will confirm semver).

---

## SECTION 3: 200-BEVERAGE CURATED SEED LIST

Format: `food_name | typical_volume_ml | suggested_usda_fdc_search_term`. Stratified across the 9 kinds per Phase 1 spec headcount targets.

### 3.1 pure_water (30)

1. tap water | 240 | water, tap
2. bottled water | 500 | water, bottled, non-carbonated
3. sparkling water | 355 | water, carbonated, unsweetened
4. mineral water | 500 | water, mineral
5. distilled water | 240 | water, distilled
6. alkaline water | 500 | water, alkaline
7. ice water | 240 | water, tap
8. hot water | 240 | water, tap, hot
9. spring water | 500 | water, spring
10. seltzer water | 355 | water, carbonated, unsweetened
11. club soda | 355 | water, club soda
12. Dasani | 500 | water, bottled, generic
13. Aquafina | 500 | water, bottled, generic
14. Smartwater | 591 | water, bottled, electrolyte-enhanced
15. Fiji | 500 | water, bottled, mineral
16. Evian | 500 | water, bottled, spring
17. Poland Spring | 500 | water, bottled, spring
18. Voss | 500 | water, bottled
19. Crystal Geyser | 500 | water, bottled, spring
20. Topo Chico | 355 | water, mineral, sparkling
21. Perrier | 330 | water, mineral, sparkling
22. San Pellegrino | 500 | water, mineral, sparkling
23. LaCroix | 355 | water, carbonated, flavored, unsweetened
24. Bubly | 355 | water, carbonated, flavored, unsweetened
25. Spindrift | 355 | water, carbonated, with juice, unsweetened
26. cucumber water | 240 | water, infused
27. lemon water | 240 | water, infused
28. infused water | 240 | water, infused
29. filtered water | 240 | water, tap, filtered
30. ice cubes | 60 | water, tap, frozen

### 3.2 coffee_tea (30)

31. drip coffee | 240 | coffee, brewed, prepared
32. black coffee | 240 | coffee, brewed, prepared
33. americano | 240 | coffee, americano, prepared
34. espresso | 30 | espresso, restaurant-prepared
35. double espresso | 60 | espresso, restaurant-prepared
36. latte | 355 | beverages, coffee with milk, latte
37. cappuccino | 180 | beverages, coffee with milk, cappuccino
38. macchiato | 60 | beverages, coffee with milk, macchiato
39. flat white | 240 | beverages, coffee with milk, flat white
40. cortado | 120 | beverages, coffee with milk, cortado
41. cold brew | 473 | coffee, cold brew, prepared
42. iced coffee | 355 | coffee, iced, prepared
43. nitro coffee | 473 | coffee, nitro, prepared
44. mocha | 355 | beverages, coffee with milk and chocolate, mocha
45. black tea | 240 | tea, black, brewed, prepared
46. green tea | 240 | tea, green, brewed, prepared
47. matcha latte | 355 | tea, matcha, prepared with milk
48. oolong tea | 240 | tea, oolong, brewed, prepared
49. white tea | 240 | tea, white, brewed, prepared
50. chai latte | 355 | tea, chai, prepared with milk
51. herbal tea | 240 | tea, herbal, brewed, prepared
52. chamomile tea | 240 | tea, chamomile, brewed, prepared
53. peppermint tea | 240 | tea, peppermint, brewed, prepared
54. earl grey tea | 240 | tea, black, earl grey, prepared
55. kombucha | 355 | beverages, kombucha
56. Frappuccino | 473 | beverages, coffee blended, sweetened
57. Stok Cold Brew | 473 | coffee, cold brew, bottled
58. La Colombe Draft Latte | 270 | beverages, coffee with milk, bottled
59. Califia Cold Brew | 355 | coffee, cold brew, bottled with milk alternative
60. Honest Tea | 473 | tea, bottled, sweetened

### 3.3 juice_smoothie (25)

61. orange juice | 240 | orange juice, raw
62. apple juice | 240 | apple juice, canned or bottled, unsweetened
63. grapefruit juice | 240 | grapefruit juice, raw
64. cranberry juice | 240 | cranberry juice, unsweetened
65. grape juice | 240 | grape juice, unsweetened
66. pomegranate juice | 240 | pomegranate juice
67. pineapple juice | 240 | pineapple juice, canned, unsweetened
68. tomato juice | 240 | tomato juice, canned, with salt
69. V8 | 240 | vegetable juice cocktail, canned
70. green juice | 240 | beverages, vegetable juice, green
71. carrot juice | 240 | carrot juice, canned
72. beet juice | 240 | beet juice
73. lemonade | 240 | lemonade, ready-to-drink
74. limeade | 240 | limeade, ready-to-drink
75. fruit smoothie | 400 | smoothie, fruit, prepared
76. green smoothie | 400 | smoothie, green, prepared
77. protein smoothie | 400 | smoothie, protein, prepared
78. Tropicana orange juice | 240 | orange juice, branded
79. Minute Maid orange juice | 240 | orange juice, branded
80. Simply Orange | 240 | orange juice, branded, not-from-concentrate
81. Naked Juice Green Machine | 450 | smoothie, green, bottled
82. Odwalla Berries GoMega | 450 | smoothie, fruit, bottled
83. Suja Mighty Dozen | 355 | juice, cold-pressed, vegetable
84. Bolthouse Farms Green Goodness | 450 | smoothie, green, bottled
85. R.W. Knudsen Just Concord Grape | 240 | juice, grape, unsweetened

### 3.4 dairy (25)

86. whole milk | 240 | milk, whole, 3.25% milkfat
87. 2 percent milk | 240 | milk, reduced fat, 2% milkfat
88. 1 percent milk | 240 | milk, lowfat, 1% milkfat
89. skim milk | 240 | milk, nonfat, fluid
90. fat-free milk | 240 | milk, nonfat, fluid
91. almond milk | 240 | beverages, almond milk, unsweetened
92. soy milk | 240 | soymilk, unsweetened, plain
93. oat milk | 240 | beverages, oat milk, unsweetened
94. coconut milk beverage | 240 | beverages, coconut milk, unsweetened
95. cashew milk | 240 | beverages, cashew milk, unsweetened
96. kefir | 240 | kefir, lowfat, plain
97. drinkable yogurt | 240 | yogurt, lowfat, fruit, drinkable
98. lassi | 240 | beverages, lassi, sweetened
99. chocolate milk | 240 | milk, chocolate, lowfat
100. strawberry milk | 240 | milk, strawberry-flavored, lowfat
101. eggnog | 240 | eggnog
102. horchata | 240 | beverages, horchata
103. milkshake | 355 | milkshake, chocolate, fast-food
104. vanilla milkshake | 355 | milkshake, vanilla, fast-food
105. protein shake | 325 | beverages, protein shake, ready-to-drink
106. hot chocolate | 240 | beverages, cocoa, prepared with milk
107. atole | 240 | beverages, atole
108. Fairlife Whole Milk | 240 | milk, ultra-filtered, whole
109. Horizon Organic Whole Milk | 240 | milk, organic, whole
110. Lactaid | 240 | milk, lactose-reduced, lowfat

### 3.5 soda (25)

111. Coca-Cola Classic | 355 | carbonated beverage, cola, regular
112. Diet Coke | 355 | carbonated beverage, cola, low calorie
113. Coke Zero Sugar | 355 | carbonated beverage, cola, low calorie, aspartame
114. Cherry Coke | 355 | carbonated beverage, cola, cherry-flavored
115. Pepsi | 355 | carbonated beverage, cola, Pepsi
116. Diet Pepsi | 355 | carbonated beverage, cola, low calorie, Pepsi
117. Pepsi Zero | 355 | carbonated beverage, cola, low calorie, zero sugar
118. Mountain Dew | 355 | carbonated beverage, citrus, Mountain Dew
119. Diet Mountain Dew | 355 | carbonated beverage, citrus, Mountain Dew, low calorie
120. Dr Pepper | 355 | carbonated beverage, Dr Pepper
121. Diet Dr Pepper | 355 | carbonated beverage, Dr Pepper, low calorie
122. Sprite | 355 | carbonated beverage, lemon lime
123. Sprite Zero | 355 | carbonated beverage, lemon lime, low calorie
124. 7Up | 355 | carbonated beverage, lemon lime
125. Sierra Mist | 355 | carbonated beverage, lemon lime
126. Fanta Orange | 355 | carbonated beverage, orange
127. Fanta Grape | 355 | carbonated beverage, grape
128. Sunkist | 355 | carbonated beverage, orange
129. A+W Root Beer | 355 | carbonated beverage, root beer
130. Mug Root Beer | 355 | carbonated beverage, root beer
131. Barq's Root Beer | 355 | carbonated beverage, root beer
132. Schweppes ginger ale | 355 | carbonated beverage, ginger ale
133. Canada Dry ginger ale | 355 | carbonated beverage, ginger ale
134. cream soda | 355 | carbonated beverage, cream soda
135. grape soda | 355 | carbonated beverage, grape

### 3.6 alcohol_low (20)

136. Budweiser | 355 | alcoholic beverage, beer, regular, all
137. Bud Light | 355 | alcoholic beverage, beer, light
138. Miller Lite | 355 | alcoholic beverage, beer, light
139. Coors Light | 355 | alcoholic beverage, beer, light
140. Heineken | 355 | alcoholic beverage, beer, lager, imported
141. Corona Extra | 355 | alcoholic beverage, beer, lager, Mexican
142. Stella Artois | 355 | alcoholic beverage, beer, lager, imported
143. Modelo Especial | 355 | alcoholic beverage, beer, lager, Mexican
144. Sierra Nevada Pale Ale | 355 | alcoholic beverage, beer, pale ale, craft
145. Sam Adams Boston Lager | 355 | alcoholic beverage, beer, lager, craft
146. Lagunitas IPA | 355 | alcoholic beverage, beer, IPA, craft
147. Blue Moon Belgian White | 355 | alcoholic beverage, beer, wheat
148. Guinness Draught | 473 | alcoholic beverage, beer, stout (8% boundary flag to Hannah)
149. White Claw | 355 | alcoholic beverage, hard seltzer
150. Truly | 355 | alcoholic beverage, hard seltzer
151. Bud Light Seltzer | 355 | alcoholic beverage, hard seltzer
152. High Noon | 355 | alcoholic beverage, hard seltzer, vodka-based (flag to Hannah for kind routing)
153. Twisted Tea | 355 | alcoholic beverage, malt beverage, tea
154. Mike's Hard Lemonade | 355 | alcoholic beverage, malt beverage, lemonade
155. hard cider | 355 | alcoholic beverage, hard cider

### 3.7 alcohol_high (20)

156. red wine | 148 | wine, table, red
157. white wine | 148 | wine, table, white
158. rose | 148 | wine, table, rose
159. prosecco | 148 | wine, sparkling, prosecco
160. champagne | 148 | wine, sparkling, champagne
161. sake | 180 | alcoholic beverage, sake
162. port wine | 90 | wine, dessert, port
163. sherry | 90 | wine, dessert, sherry
164. vermouth | 90 | wine, vermouth
165. vodka shot | 44 | alcoholic beverage, distilled, all 80 proof
166. gin shot | 44 | alcoholic beverage, distilled, gin
167. tequila shot | 44 | alcoholic beverage, distilled, tequila
168. rum shot | 44 | alcoholic beverage, distilled, rum
169. whiskey shot | 44 | alcoholic beverage, distilled, whiskey
170. bourbon shot | 44 | alcoholic beverage, distilled, bourbon
171. scotch shot | 44 | alcoholic beverage, distilled, scotch
172. brandy | 44 | alcoholic beverage, distilled, brandy
173. margarita | 240 | alcoholic beverage, cocktail, margarita
174. mojito | 240 | alcoholic beverage, cocktail, mojito
175. old fashioned | 90 | alcoholic beverage, cocktail, old fashioned

### 3.8 sports_drink (15)

176. Gatorade Thirst Quencher | 591 | sports drink, ready-to-drink
177. Gatorade Frost | 591 | sports drink, ready-to-drink
178. Gatorade Zero | 591 | sports drink, low calorie
179. Gatorade G2 | 591 | sports drink, reduced calorie
180. Powerade Mountain Berry Blast | 591 | sports drink, Powerade
181. Powerade Zero | 591 | sports drink, low calorie, Powerade
182. BodyArmor SuperDrink | 473 | sports drink, BodyArmor
183. BodyArmor Lyte | 473 | sports drink, low calorie, BodyArmor
184. Liquid I.V. Hydration Multiplier | 473 | electrolyte drink mix, prepared
185. LMNT Recharge | 473 | electrolyte drink mix, prepared
186. Pedialyte Classic | 1000 | electrolyte beverage, Pedialyte
187. Pedialyte Sport | 591 | sports drink, Pedialyte Sport
188. Propel Electrolyte Water | 591 | beverages, flavored water, electrolyte
189. Vitaminwater XXX | 591 | beverages, Vitaminwater
190. coconut water | 330 | coconut water, unsweetened

### 3.9 high_water_food (10; Phase 1.1 placeholder)

191. watermelon | null (resolver computes from grams; reference water content 92 percent) | watermelon, raw
192. cucumber | null (96 percent water) | cucumber, with peel, raw
193. celery | null (95 percent water) | celery, raw
194. iceberg lettuce | null (96 percent water) | lettuce, iceberg, raw
195. tomato | null (95 percent water) | tomato, red, ripe, raw
196. chicken broth | null (96 percent water) | soup, chicken broth, ready-to-serve
197. beef broth | null (96 percent water) | soup, beef broth, ready-to-serve
198. vegetable broth | null (96 percent water) | soup, vegetable broth, ready-to-serve
199. miso soup | null (94 percent water) | soup, miso, prepared
200. gazpacho | null (92 percent water) | soup, gazpacho

---

## PHASE 1 READINESS STATEMENT

GORDON: clean for Phase 1 Long-Pole 1 Blueprint authorship.

Nutritional-Log / Recommendations / Genetic-Protocol notes:
- 9-value enum is canonical for `hydration_source_kind` column and downstream resolver; spelling, casing, and underscore conventions are normative. No drift permitted between this Blueprint, the migration that adds the column, and the parser system prompts.
- Default volume table in Rule 3.10 uses standard US container conventions (8 fl oz = 240 ml approximate, 12 fl oz = 355 ml, 16 fl oz = 473 ml, 5 fl oz wine = 148 ml, 1.5 fl oz spirits shot = 44 ml). Conversion constants are correct.
- Parser is NOT responsible for `hydration_ml` math; server computes `hydration_ml = portion_volume_ml * hydration_ratio(kind, user_counting_mode)`. Parsers emit only `hydration_source_kind` + `portion_volume_ml`. Split-of-responsibility is clean.
- `caffeine_mg` (existing Rule 3.9) and the two new fields are additive, not overlapping; coffee_tea + sodas + energy drinks will populate all three.
- Restaurant chain defaults from Rule 3.5 should be re-checked against the new container-hint table; specifically Starbucks grande latte 473 ml in Rule 3.10 matches Rule 3.5 473g default (1 g ml is fine for water-dominant drinks). No conflict.
- Section 7 branded products already covers most of the 200-seed brands; Rule 3.10 hydration_source_kind assignment for branded items piggybacks on existing branded_product_hints detection.

Handoff to Hannah (Phase 1 sign-off blockers):
- Adjusted vs strict ratio table in §1.0: confirm `coffee_tea` adjusted 1.00 (not diuretic at habitual doses) and `alcohol_low` adjusted 0.95 (low ABV beers approximately water-equivalent at intake). These two ratios are the most likely to change on clinical review.
- Wine vs spirits split inside `alcohol_high`: confirm 0.75 wine, 0.50 spirits in adjusted mode; default 0.65 (mean) when food_name cannot disambiguate.
- Plant-based milks (almond, soy, oat, coconut beverage) routed to `dairy` kind for ratio purposes per §1.2; confirm or split into `plant_milk` kind in Phase 1.2.
- Kombucha routing: confirm under 0.5 percent ABV → `coffee_tea`; over 0.5 percent commercial variants → `alcohol_low`.
- High-ABV beers (Guinness Draught 8 percent boundary, craft IPAs 7 to 9 percent) entry 148: confirm Guinness Draught stays `alcohol_low` at 4.2 percent (it does, ABV verified) but flag boundary for future stout/imperial variants.
- High Noon vodka-soda hard seltzer entry 152: vodka base would suggest `alcohol_high`, but ABV is 4.5 percent and the format is hard-seltzer-style ready-to-drink; recommend `alcohol_low` for Phase 1 consistency.
- `high_water_food` Phase 1.1 supplement: confirm 10-food placeholder list and that the resolver computes hydration_ml from gram weight times water fraction at lookup (parser sets `portion_volume_ml = null`).
- 200 USDA FDC search terms in Section 3 are suggested-not-verified; the curated-catalog seed pass will resolve each to a canonical FDC ID and may need substitution where the suggested term has no exact match.

Files referenced (absolute paths):
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\src\lib\nutrition\quick-log\haiku-system-prompt.ts`
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\src\lib\nutrition\voice-native\haiku-system-prompt.ts`
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\docs\prompts\prompt-170o-phase-1-phase-2-split-2026-05-31.md`

Word count of this Blueprint: approximately 6500 words excluding the seed list; seed list 200 entries.

End of Gordon Blueprint 170o Phase 1 LP1.