# Prompt 184 Divergence Report

Targets: fdc_derived provisional targets pending five-app medians. Engine inputs are seed pins; regenerate from live AI for the authoritative run.

## Aggregate: text

| metric | MAPE % | mean signed % | n |
|---|---|---|---|
| calories_kcal | 418.17 | 380.08 | 30 |
| protein_g | 245.35 | 195.38 | 30 |
| carbs_g | 136.38 | 101.75 | 29 |
| fat_g | 384.07 | 364.16 | 28 |
| fiber_g | 92.34 | 38.93 | 29 |
| sugar_g | 263.38 | 182.4 | 29 |
| sodium_mg | n/a | n/a | 0 |

Items over 5 percent on calories: black-coffee (7350), broccoli-steamed-156g (1583.64), cheerios-1cup (793), avocado-half (452.5), apple-medium (386.32), whole-milk-cup (381.88), salmon-grilled-100g (337.86), banana-medium (288.57), chicken-breast-raw-100g (-100), almonds-1oz (-100), peanut-butter-2tbsp (-100), chicken-pad-thai (-94.86), quest-bar-cookies-cream (83.16), chicken-rice-broccoli (74.68), clif-bar-choc-chip (66.4), burrito-bowl (66), greek-yogurt-berries-granola (-43.89), spaghetti-cooked-140g (41.18), chobani-nonfat-plain (-40), sweet-potato-baked-150g (28.15), white-rice-cooked-150g (-25.13), french-fries-medium (-24.11), scrambled-eggs-2 (-18.13), coca-cola-can (16.43), chicken-caesar-salad (15.32), cheeseburger (-13.2), chicken-breast-grilled-100g (-8.48), pepperoni-pizza-slice (7.05)

## Aggregate: photo

| metric | MAPE % | mean signed % | n |
|---|---|---|---|
| calories_kcal | 130.87 | 98.07 | 5 |
| protein_g | 108.37 | 72.1 | 5 |
| carbs_g | 141.8 | 113.2 | 5 |
| fat_g | 199.25 | 164.45 | 5 |
| fiber_g | 88.84 | 38.04 | 5 |
| sugar_g | 107.03 | 13.03 | 5 |
| sodium_mg | n/a | n/a | 0 |

Items over 5 percent on calories: banana-medium (295.24), white-rice-cooked-150g (194.36), chicken-pad-thai (-82), chicken-rice-broccoli (78.48)

## Dual-engine agreement (photo vs text calories)

| id | photo vs text % | within 3 percent |
|---|---|---|
| banana-medium | 1.72 | true |
| white-rice-cooked-150g | 293.15 | false |
| chicken-rice-broccoli | 2.17 | true |
| chicken-pad-thai | 250 | false |
| cheeseburger | 20.15 | false |

## Per-item detail

| id | engine | category | grams % | calories % | stage | note |
|---|---|---|---|---|---|---|
| banana-medium | text | raw_whole | 0 | 288.57 | reference | grams roughly correct; per-100g reference values diverge from consensus |
| banana-medium | photo | raw_whole | 1.69 | 295.24 | reference | grams roughly correct; per-100g reference values diverge from consensus |
| egg-large-raw | text | raw_whole | n/a | n/a | no_reference | engine matched no reference for this item |
| chicken-breast-raw-100g | text | raw_whole | 0 | -100 | atwater_reconciliation | macro-derived to stored kcal ratio 0 outside the 0.8 to 1.2 band |
| apple-medium | text | raw_whole | 0 | 386.32 | reference | grams roughly correct; per-100g reference values diverge from consensus |
| avocado-half | text | raw_whole | 0 | 452.5 | reference | grams roughly correct; per-100g reference values diverge from consensus |
| almonds-1oz | text | raw_whole | 1.07 | -100 | atwater_reconciliation | macro-derived to stored kcal ratio 0 outside the 0.8 to 1.2 band |
| white-rice-cooked-150g | text | cooked_whole | 0 | -25.13 | raw_vs_cooked | grams roughly correct but energy off on a cooked-basis item; likely a raw reference applied to a cooked portion |
| white-rice-cooked-150g | photo | cooked_whole | 6.67 | 194.36 | raw_vs_cooked | grams roughly correct but energy off on a cooked-basis item; likely a raw reference applied to a cooked portion |
| chicken-breast-grilled-100g | text | cooked_whole | 0 | -8.48 | raw_vs_cooked | grams roughly correct but energy off on a cooked-basis item; likely a raw reference applied to a cooked portion |
| scrambled-eggs-2 | text | cooked_whole | -18.03 | -18.13 | quantity | grams off by -18.03 percent |
| salmon-grilled-100g | text | cooked_whole | 0 | 337.86 | raw_vs_cooked | grams roughly correct but energy off on a cooked-basis item; likely a raw reference applied to a cooked portion |
| spaghetti-cooked-140g | text | cooked_whole | 71.43 | 41.18 | quantity | grams off by 71.43 percent |
| broccoli-steamed-156g | text | cooked_whole | 53.85 | 1583.64 | quantity | grams off by 53.85 percent |
| sweet-potato-baked-150g | text | cooked_whole | 15.33 | 28.15 | quantity | grams off by 15.33 percent |
| chicken-rice-broccoli | text | mixed_plate | -28.57 | 74.68 | quantity | grams off by -28.57 percent |
| chicken-rice-broccoli | photo | mixed_plate | 0 | 78.48 | reference | grams roughly correct; per-100g reference values diverge from consensus |
| burrito-bowl | text | mixed_plate | -23.53 | 66 | quantity | grams off by -23.53 percent |
| greek-yogurt-berries-granola | text | mixed_plate | -68 | -43.89 | atwater_reconciliation | macro-derived to stored kcal ratio 1.221 outside the 0.8 to 1.2 band |
| turkey-cheese-sandwich | text | mixed_plate | -18 | 1.67 | null_handling | sodium_mg present in consensus but not produced by the engine |
| chicken-caesar-salad | text | mixed_plate | -71.43 | 15.32 | unit_conversion | unit did not convert to grams; fell back to a default serving size |
| clif-bar-choc-chip | text | packaged_barcoded | 47.06 | 66.4 | unit_conversion | unit did not convert to grams; fell back to a default serving size |
| chobani-nonfat-plain | text | packaged_barcoded | -33.33 | -40 | unit_conversion | unit did not convert to grams; fell back to a default serving size |
| quest-bar-cookies-cream | text | packaged_barcoded | 66.67 | 83.16 | unit_conversion | unit did not convert to grams; fell back to a default serving size |
| cheerios-1cup | text | packaged_barcoded | 757.14 | 793 | quantity | grams off by 757.14 percent |
| peanut-butter-2tbsp | text | packaged_barcoded | -7.5 | -100 | atwater_reconciliation | macro-derived to stored kcal ratio 0 outside the 0.8 to 1.2 band |
| chicken-pad-thai | text | restaurant_hidden_fat | -75 | -94.86 | unit_conversion | unit did not convert to grams; fell back to a default serving size |
| chicken-pad-thai | photo | restaurant_hidden_fat | -12.5 | -82 | quantity | grams off by -12.5 percent |
| cheeseburger | text | restaurant_hidden_fat | -13.04 | -13.2 | unit_conversion | unit did not convert to grams; fell back to a default serving size |
| cheeseburger | photo | restaurant_hidden_fat | 4.35 | 4.29 | null_handling | sodium_mg present in consensus but not produced by the engine |
| vegetable-fried-rice | text | restaurant_hidden_fat | n/a | n/a | no_reference | engine matched no reference for this item |
| french-fries-medium | text | restaurant_hidden_fat | -14.53 | -24.11 | unit_conversion | unit did not convert to grams; fell back to a default serving size |
| pepperoni-pizza-slice | text | restaurant_hidden_fat | 0 | 7.05 | reference | grams roughly correct; per-100g reference values diverge from consensus |
| coca-cola-can | text | beverage | 0 | 16.43 | reference | grams roughly correct; per-100g reference values diverge from consensus |
| orange-juice-cup | text | beverage | -3.23 | -3.57 | null_handling | sodium_mg present in consensus but not produced by the engine |
| black-coffee | text | beverage | 0 | 7350 | reference | grams roughly correct; per-100g reference values diverge from consensus |
| whole-milk-cup | text | beverage | -1.64 | 381.88 | reference | grams roughly correct; per-100g reference values diverge from consensus |
