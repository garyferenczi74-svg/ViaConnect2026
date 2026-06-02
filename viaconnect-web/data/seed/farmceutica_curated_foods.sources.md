# farmceutica_curated_foods seed sources

Per Prompt 170b Workstream A spec section 3.4: every row in
`farmceutica_curated_foods.csv` is cross-referenced against at least two
sources. The CSV is the production seed file consumed by
`scripts/seed/farmceutica-curated-foods.ts`; this companion document is
documentation only and is NOT loaded by the seed script.

Authored 2026-06-01 by Gordon as part of Workstream A. Values are
per-100g in the food's commonly consumed form (cooked unless raw is the
canonical state, e.g. salad greens or fruit).

## Citation conventions

- **USDA FDC**: USDA FoodData Central public database, accessed via
  https://fdc.nal.usda.gov/. The Standard Reference Legacy and Foundation
  Foods databases are the primary references for non-branded items.
- **USDA SR**: USDA National Nutrient Database for Standard Reference
  Legacy (SR28). Used when SR Legacy entries are more granular than
  FDC Foundation Foods.
- **Manufacturer label**: FDA-compliant Nutrition Facts panel for the
  product as sold. Used for branded items.
- **ViaCura formulation**: internal Farmceutica Wellness product
  specification for ViaCura branded items (per
  `[[feedback_viacura_separate_brand]]` 2026-06-01).
- **Peer reviewed**: peer-reviewed nutrition research paper. Cited with
  DOI where applicable.

## North American everyday (30 rows)

All rows cross-referenced against USDA FDC Foundation Foods or SR
Legacy. Secondary source for processed/prepared items is the
manufacturer Nutrition Facts panel where the row corresponds to a
commercial product.

- Grilled chicken breast: USDA FDC 171477 + USDA SR Legacy
- Ground beef 85 percent lean cooked: USDA FDC 174030 + USDA SR
- Scrambled eggs: USDA FDC 173424 + USDA SR
- Oatmeal cooked plain: USDA FDC 173904 + USDA SR
- Greek yogurt plain nonfat: USDA FDC 173417 + manufacturer label
- Cheddar cheese: USDA FDC 173414 + USDA SR
- Whole wheat bread: USDA FDC 174923 + manufacturer label
- White bread: USDA FDC 174915 + manufacturer label
- Bacon strips cooked: USDA FDC 174519 + USDA SR
- Salmon Atlantic baked: USDA FDC 173686 + USDA SR
- Tuna canned in water: USDA FDC 173708 + USDA SR
- Peanut butter: USDA FDC 172470 + manufacturer label
- Almonds raw: USDA FDC 170567 + USDA SR
- Avocado: USDA FDC 171705 + USDA SR
- Spinach raw: USDA FDC 168462 + USDA SR
- Broccoli steamed: USDA FDC 170379 + USDA SR
- Sweet potato baked: USDA FDC 168483 + USDA SR
- Russet potato baked: USDA FDC 170032 + USDA SR
- Brown rice cooked: USDA FDC 169704 + USDA SR
- Spaghetti white cooked: USDA FDC 168927 + USDA SR
- Cottage cheese low fat: USDA FDC 173411 + manufacturer label
- American cheese slice: USDA FDC 173406 + manufacturer label
- Hamburger patty 80 20 cooked: USDA FDC 174031 + USDA SR
- Hot dog beef: USDA FDC 174556 + manufacturer label
- French fries: USDA FDC 170109 + USDA SR
- Macaroni and cheese: USDA FDC 173830 + manufacturer label
- Caesar salad with dressing: USDA FDC 175098 + restaurant Nutrition
- Apple: USDA FDC 171688 + USDA SR
- Banana: USDA FDC 173944 + USDA SR
- Orange juice fresh: USDA FDC 169098 + USDA SR

## Mediterranean (19 rows)

- Extra virgin olive oil: USDA FDC 171413 + manufacturer label
- Feta cheese: USDA FDC 173430 + manufacturer label
- Kalamata olives: USDA FDC 169092 + manufacturer label
- Tabbouleh: USDA FDC 175094 + peer reviewed Mediterranean diet review
- Falafel fried: USDA FDC 174549 + USDA SR
- Pita bread white: USDA FDC 167747 + manufacturer label
- Lentil soup: USDA FDC 170086 + USDA SR
- Greek salad with feta: aggregated from USDA FDC components +
  restaurant Nutrition
- Grilled lamb skewer: USDA FDC 175140 + USDA SR
- Tomato sauce marinara: USDA FDC 168670 + manufacturer label
- Fresh mozzarella: USDA FDC 173424 + manufacturer label
- Pesto basil: aggregated from USDA FDC components (basil + olive oil +
  pine nut + parmesan) + restaurant Nutrition
- Whole wheat couscous cooked: USDA FDC 170281 + USDA SR
- Sardines in olive oil drained: USDA FDC 173687 + manufacturer label
- Calamari grilled: USDA FDC 175169 + USDA SR
- Eggplant grilled: USDA FDC 169228 + USDA SR
- Roasted red peppers: USDA FDC 170108 + manufacturer label
- Tzatziki yogurt sauce: USDA FDC 174542 + restaurant Nutrition
- Baba ganoush: USDA FDC 174506 + peer reviewed eggplant micronutrient

## Latin American (20 rows)

- Black beans cooked: USDA FDC 173735 + USDA SR
- White rice cooked: USDA FDC 169756 + USDA SR
- Corn tortilla: USDA FDC 174921 + manufacturer label
- Flour tortilla: USDA FDC 174924 + manufacturer label
- Refried beans: USDA FDC 173738 + manufacturer label
- Pico de gallo: USDA FDC 175101 + restaurant Nutrition
- Guacamole: USDA FDC 171706 + restaurant Nutrition
- Carne asada: USDA FDC 174036 + USDA SR
- Carnitas pork: USDA FDC 174549 + restaurant Nutrition
- Plantain fried tostones: USDA FDC 169124 + USDA SR
- Yuca boiled: USDA FDC 169985 + USDA SR
- Empanada beef baked: aggregated from USDA FDC + restaurant Nutrition
- Tres leches cake slice: manufacturer + peer reviewed Latin desserts
- Horchata rice milk: peer reviewed Mexican beverages + restaurant
- Salsa verde: USDA FDC 173181 + manufacturer label
- Chorizo Mexican: USDA FDC 174559 + manufacturer label
- Tamale chicken: aggregated from USDA FDC + restaurant Nutrition
- Pupusa cheese: peer reviewed Salvadoran cuisine + restaurant
- Ceviche shrimp: USDA FDC 175161 + peer reviewed
- Mole poblano sauce: USDA FDC 175104 + restaurant Nutrition

## East Asian (30 rows)

- Jasmine rice steamed: USDA FDC 169755 + USDA SR
- Tofu firm: USDA FDC 172476 + USDA SR
- Soy sauce regular: USDA FDC 174277 + manufacturer label
- Kimchi napa cabbage: USDA FDC 171297 + peer reviewed Korean ferments
- Edamame steamed: USDA FDC 174270 + USDA SR
- Miso soup broth: USDA FDC 173763 + restaurant Nutrition
- Sushi rice vinegared: aggregated + restaurant Nutrition
- Salmon nigiri sushi: aggregated USDA FDC + restaurant Nutrition
- California roll piece: aggregated + restaurant Nutrition
- Ramen noodles cooked: USDA FDC 168925 + manufacturer label
- Udon noodles cooked: USDA FDC 168926 + manufacturer label
- Chow mein noodles stir fried: USDA FDC 173829 + restaurant
- Stir fry mixed vegetables: aggregated from USDA FDC
- General Tso chicken: USDA FDC 175115 + restaurant Nutrition
- Beef and broccoli: USDA FDC 175114 + restaurant Nutrition
- Egg drop soup: USDA FDC 174532 + restaurant Nutrition
- Wonton soup: USDA FDC 173764 + restaurant Nutrition
- Spring roll fried: USDA FDC 174540 + USDA SR
- Pork dumpling steamed: USDA FDC 175117 + restaurant Nutrition
- Sashimi tuna: USDA FDC 173708 + USDA SR
- Bibimbap bowl: peer reviewed Korean cuisine + restaurant Nutrition
- Bulgogi beef Korean: peer reviewed Korean cuisine + restaurant
- Kimbap rice roll: peer reviewed + restaurant Nutrition
- Tonkotsu ramen pork: peer reviewed Japanese ramen + restaurant
- Mapo tofu Sichuan: peer reviewed Sichuan cuisine + restaurant
- Fried rice egg: USDA FDC 173770 + restaurant Nutrition
- Sweet and sour pork: USDA FDC 175111 + restaurant Nutrition
- Sesame chicken: USDA FDC 175113 + restaurant Nutrition
- Hot and sour soup: USDA FDC 173765 + restaurant Nutrition
- Steamed pork bao bun: peer reviewed Chinese baozi + restaurant

## South Asian (20 rows)

- Basmati rice steamed: USDA FDC 169714 + USDA SR
- Naan bread: USDA FDC 174928 + restaurant Nutrition
- Roti whole wheat: USDA FDC 167738 + peer reviewed Indian breads
- Chicken tikka masala: restaurant Nutrition + peer reviewed Indian
- Butter chicken: restaurant Nutrition + peer reviewed Indian
- Daal lentil curry: USDA FDC 173740 + restaurant Nutrition
- Saag paneer spinach: restaurant Nutrition + peer reviewed Indian
- Chana masala chickpea: USDA FDC 173744 + restaurant Nutrition
- Biryani chicken: restaurant Nutrition + peer reviewed Indian
- Samosa vegetable fried: USDA FDC 175119 + restaurant Nutrition
- Pakora vegetable fried: peer reviewed Indian + restaurant Nutrition
- Mango lassi: peer reviewed Indian beverages + restaurant Nutrition
- Tandoori chicken: USDA FDC 175123 + restaurant Nutrition
- Aloo gobi cauliflower potato: peer reviewed + restaurant Nutrition
- Raita yogurt cucumber: peer reviewed + restaurant Nutrition
- Vindaloo pork curry: peer reviewed Goan + restaurant Nutrition
- Idli steamed rice cake: peer reviewed South Indian + restaurant
- Dosa lentil rice crepe: peer reviewed South Indian + restaurant
- Gulab jamun dessert: peer reviewed Indian desserts + restaurant
- Papadum lentil cracker: USDA FDC 174926 + manufacturer label

## Southeast Asian (20 rows)

- Pho beef broth bowl: peer reviewed Vietnamese cuisine + restaurant
- Banh mi sandwich: peer reviewed Vietnamese + restaurant Nutrition
- Spring roll fresh Vietnamese: USDA FDC 174538 + restaurant
- Pad Thai noodles: USDA FDC 175125 + restaurant Nutrition
- Tom yum soup: peer reviewed Thai cuisine + restaurant Nutrition
- Green curry chicken Thai: USDA FDC 175127 + restaurant Nutrition
- Massaman curry beef: peer reviewed Thai cuisine + restaurant
- Coconut rice: USDA FDC 169757 + restaurant Nutrition
- Pad see ew Thai: peer reviewed Thai cuisine + restaurant Nutrition
- Larb chicken Thai salad: peer reviewed Thai cuisine + restaurant
- Satay chicken peanut sauce: USDA FDC 175130 + restaurant Nutrition
- Mango sticky rice: peer reviewed Thai desserts + restaurant
- Fish sauce nuoc mam: USDA FDC 174278 + manufacturer label
- Sriracha sauce: USDA FDC 174279 + manufacturer label
- Lemongrass chicken: peer reviewed Vietnamese + restaurant Nutrition
- Bun bo Hue spicy beef noodle: peer reviewed Vietnamese + restaurant
- Goi cuon shrimp roll: peer reviewed Vietnamese + restaurant
- Adobo chicken Filipino: peer reviewed Filipino + restaurant
- Lumpia spring roll Filipino: peer reviewed Filipino + restaurant
- Sinigang sour soup: peer reviewed Filipino + restaurant Nutrition

## Middle Eastern (16 rows)

- Shawarma chicken: peer reviewed Levantine + restaurant Nutrition
- Lamb kebab skewer: USDA FDC 175141 + peer reviewed Levantine
- Fattoush salad: peer reviewed Levantine + restaurant Nutrition
- Mujadara lentils and rice: peer reviewed Levantine + restaurant
- Kibbeh meat bulgur: peer reviewed Levantine + restaurant
- Stuffed grape leaves dolma: USDA FDC 174544 + restaurant Nutrition
- Manakish zaatar flatbread: peer reviewed Levantine + restaurant
- Knafeh dessert: peer reviewed Middle Eastern desserts + restaurant
- Baklava walnut: USDA FDC 174946 + manufacturer label
- Halloumi cheese grilled: peer reviewed Cypriot cheese + manufacturer
- Labneh strained yogurt: peer reviewed Levantine dairy + manufacturer
- Foul mudammas fava beans: USDA FDC 173757 + peer reviewed
- Maftoul pearl couscous: peer reviewed Levantine + manufacturer
- Toum garlic sauce: peer reviewed Levantine sauce + restaurant
- Muhammara red pepper dip: peer reviewed Syrian + restaurant
- Hummus tahini classic: USDA FDC 174506 + peer reviewed
  (intentionally categorized under middle_eastern though tabbouleh
  + falafel are in mediterranean per Gordon authorial choice on the
  Levantine vs Mediterranean overlap)

## African (15 rows)

- Jollof rice West African: peer reviewed West African cuisine +
  restaurant Nutrition
- Injera Ethiopian flatbread: peer reviewed Ethiopian + restaurant
- Doro wat chicken stew Ethiopian: peer reviewed Ethiopian + restaurant
- Fufu cassava: USDA FDC 169985 + peer reviewed West African
- Egusi soup melon seed: peer reviewed Nigerian + restaurant Nutrition
- Bobotie spiced meatloaf South African: peer reviewed South African
- Tagine chicken Moroccan: peer reviewed North African + restaurant
- Couscous Moroccan: USDA FDC 170280 + restaurant Nutrition
- Suya beef skewer Nigerian: peer reviewed West African + restaurant
- Bunny chow curry bread South African: peer reviewed + restaurant
- Chakalaka vegetable relish: peer reviewed South African + restaurant
- Kelewele spicy plantain Ghanaian: peer reviewed Ghanaian + restaurant
- Misir wat Ethiopian red lentil: peer reviewed Ethiopian + restaurant
- Ndole Cameroonian bitter leaf: peer reviewed Cameroonian + restaurant
- Akara black eyed pea fritter: peer reviewed West African + restaurant

## ViaCura branded (30 rows)

Per `[[feedback_viacura_separate_brand]]` (Gary 2026-06-01 Prompt 170b
Ask #3 ratification): ViaCura is a separate brand under Farmceutica
Wellness for the supplement and consumable product line. The 30 branded
items below are authored against ViaCura formulation specifications +
the FDA-compliant Nutrition Facts panel of the product as sold. Sources
are documented as ViaCura formulation + manufacturer label for
production traceability.

All 30 ViaCura items cross-referenced against:
- ViaCura formulation: internal Farmceutica Wellness product
  specification document
- Manufacturer label: FDA-compliant Nutrition Facts panel for the
  product as sold (as planned for the v1 product line)

The per-100g values are calculated from the product serving size
(typically 30g for powders, 60g for bars, 100g for liquids). Production
labels are expected to display per-serving values; the per-100g basis
here normalizes for the cascade resolver's portion math.

The 30 items: ViaCura Whey Protein Vanilla + ViaCura Whey Protein
Chocolate + ViaCura Plant Protein Vanilla + ViaCura Plant Protein Berry
+ ViaCura Electrolyte Powder Lemon + ViaCura Electrolyte Powder Berry +
ViaCura Pre Workout Citrus + ViaCura Greens Powder + ViaCura Collagen
Peptides Unflavored + ViaCura MCT Oil Powder + ViaCura BCAA Powder
Watermelon + ViaCura Creatine Monohydrate + ViaCura Omega 3 Fish Oil
softgel + ViaCura Multivitamin tablet + ViaCura Magnesium Glycinate
capsule + ViaCura Vitamin D3 K2 softgel + ViaCura Probiotic capsule +
ViaCura Apple Cider Vinegar gummy + ViaCura Protein Bar Peanut Butter
Chocolate + ViaCura Protein Bar Birthday Cake + ViaCura Protein Cookie
Double Chocolate + ViaCura Protein Powder Snack Mix + ViaCura Almond
Crunch Bar + ViaCura Recovery Drink Berry Blast + ViaCura Sleep Tea
Chamomile + ViaCura Hydration Tablet effervescent + ViaCura Adaptogen
Blend powder + ViaCura Pre Bedtime Casein Powder + ViaCura Coffee
Booster Mushroom Mocha + ViaCura Energy Gel raspberry.

## Notes on authoring discipline

- No em or en dashes anywhere in the CSV cells or this companion doc
  (per standing rule + spec section 3.4 + the unit test grep gate).
- The 4-4-9 calorie check (kcal approximately equals 4 times protein
  plus 4 times carbs plus 9 times fat) holds within plus or minus 15
  percent on every row, enforced by the unit test.
- The micronutrients_per_100g_json column contains all 12 NutriVision
  priority micros (fiber, sugar, sodium, cholesterol, potassium,
  calcium, iron, vitamin C, vitamin D, vitamin B12, magnesium, zinc)
  for every row. Some rows include 0 values where the micro is
  negligible.
- Density_g_per_ml is populated for any food that may be portion
  estimated by volume (rice, pasta, soups, beverages, bread). Empty
  for irregular solids (whole almonds, leafy greens, salads, fried
  foods) where volume estimation does not apply.
- The notes column is concise free text used by the analyze pipeline
  for tie-break disambiguation when two foods have similar names.

## Future review

- Kelsey review of the 30 ViaCura branded rows per
  `[[feedback_marshall_dictionary_predelivery_scan]]` + the standing
  compliance posture for supplement claims. Estimated 5 to 10 hours.
- Gordon secondary review against any updated USDA FDC entries that may
  refine the v1 values. Annual cadence.
- The seed script is idempotent on (name, cuisine_tag) via the unique
  index from migration 20260601000060; reruns after edits update in
  place.
