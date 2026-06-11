# Prompt 186 Work Log: Nutrition Engine Macro Accuracy Root Cause Audit and Repair

Owner agent: gordon (display via getDisplayName). Date: 2026-06-11.

## Phase 1: Diagnosis (completed before any fix commits)

### How the golden meal was reproduced

The production Supabase table `usda_food_cache` stores the exact reference rows the engine
used (the engine caches every USDA match for 30 days, and `raw_payload` keeps the full FDC
detail response). Combining those live rows with the gram weights `typical-weights.ts`
produces for the parsed units reconstructs the displayed meal card to within rounding.
The selection behavior was then re-reproduced live against the FDC API (same query, same
dataType filter, same first-hit rule).

### Per-item computed vs expected (golden reference meal)

| Item | Grams used | Reference the engine used (live cache row) | Computed kcal / fat / protein / sugar | Expected (USDA correct) |
|---|---|---|---|---|
| 2 whole egg | 100 (2 x 50) | USDA miss, Gemini fallback estimate | 156 / 10.6 / 12.6 / 1.2 (remainder) | 156 / 10.6 / 12.6 / 1.1 |
| 0.5 whole avocado | 100 (0.5 x 200) | Oil, avocado (SR Legacy 173573): 884 kcal, 100 g fat per 100 g | 884 / 100.0 / 0.0 / 0.0 | ~120 / ~11 / 1.0 / 0.3 |
| 1 slice sourdough bread | 28 (see note) | Bread, french or vienna (includes sourdough) (SR 172675) | 76 / 0.7 / 3.0 / 1.3 | ~75 / 0.7 / 3.0 / 1.3 (correct by accident) |
| 1 whole apple | 182 | Croissants, apple (SR 174988): 254 kcal per 100 g, sugar missing in source | 462 / 15.8 / 13.5 / 0.0 | ~95 / 0.3 / 0.5 / ~17 |
| Meal total | | | 1578 / 127.1 / 29.1 / 2.5 | 376 to ~460 / 16 to 22 / 15 to 16 / 16 to 19 |

The reconstruction reproduces the displayed card exactly (1578 kcal, 127.1 g fat,
29.1 g protein, 2.5 g sugar), and the egg remainder lands on textbook 2-egg values,
confirming the Gemini fallback was accurate and ALL damage came from the USDA layer.

Sourdough note: the curated table had a 36 g sourdough entry, but matchPrefix in
typical-weights.ts returned the FIRST table key contained in the hint, so the generic
"bread" entry (28 g) shadowed "sourdough bread" for every bread variant. Two errors
then cancelled: a light 28 g slice times the higher french-bread reference landed on
the correct ~75 kcal. Fixed by longest-key-wins matching plus the 55 g spec value.

### The four error classes, root cause, and exact code path

E1. Reference selection takes the first search hit with no ranking.
`src/lib/nutrition/usda-client.ts:144` (`const first = json.foods?.[0]`).
Live reproduction (FDC API, dataType Foundation,SR Legacy): query "avocado" returns
"Oil, avocado" first (884 kcal, 100 g fat per 100 g); query "apple" returns
"Croissants, apple" first; query "egg" returns "Eggs, Grade A, Large, egg white" first.
Production cache also held banana -> dehydrated banana powder, bread -> cheese bread,
white rice -> rice flour, chocolate milk -> milk chocolate candy.
This one defect produces THREE of the four ratios:
  calories 4.20x (884 oil + 462 croissants of phantom energy; the 4.184 kJ
  coincidence was a red herring), fat 6 to 8x (avocado matched pure oil: 100 g fat),
  protein 1.9x (croissants carry 7.4 g protein per 100 g where apple has 0.26).

E2. Foundation data type foods are silently zeroed by the ID-only extractor.
`src/lib/nutrition/usda-nutrient-ids.ts:56` (energy only via id 1008) and `:63`
(sugar only via id 2000). Foundation detail payloads carry energy ONLY as
id 2047 / 2048 (Atwater, kcal) and sugars ONLY as id 1063. Production proof:
"Pineapple, raw" (Foundation 2346398) cached with calories_per_100g = 0.00 and
sugar 0.00; 7 of 49 live cache rows have zero kcal.

E3. Missing nutrients coerced to 0 instead of UNKNOWN.
`src/lib/nutrition/usda-nutrient-ids.ts:49` (`map.get(id) ?? 0`).
"Croissants, apple" has no sugar value in SR; the engine wrote sugar 0.00 and the
meal displayed 2.5 g sugar as if known. This is the sugar 0.14x ratio combined with
E1 (the real apple sugar never entered the sum). Violates the 177d unknown-vs-zero
contract.

E4. Unit conversion uses water density and silent defaults.
`src/lib/nutrition/typical-weights.ts:34` (cup = 240 g water for solids; 184 report:
cheerios grams +757 percent) and `src/lib/nutrition/usda-client.ts:162` (unresolved
units silently fall back to a flat 100 g). "serving" resolves to null then 100 g with
no confidence downgrade. Sourdough slice table value 36 g vs spec 50 to 60 g.

### Hypothesis verdicts (Section 2 of the prompt)

| Hypothesis | Verdict | Evidence |
|---|---|---|
| A: kJ labeled kcal | Disproven as the live defect; guarded anyway | Extraction is by id 1008 which is always kcal. The 4.20x ratio is the sum of E1 phantom references. The kJ row (1062) IS the first Energy entry in the FDC search-response nutrient arrays, so any name-based or first-match energy read would hit it; the canonical map + unit assertion now make that impossible. Foundation foods carry NO 1008 at all (E2), the sibling defect this hypothesis pointed at. |
| B: fat double-counting or scaling | Disproven | Extractor reads only id 1004 for total fat; resolveFatBreakdown adds user-attributed added fat (0 on these channels), never sums sub-fractions. Gram scaling was correct. The 127.1 g is 100 g of "Oil, avocado" + 15.8 g croissant fat + 0.9 bread + 10.4 egg estimate, reproduced exactly. |
| C: sugar mapped to wrong nutrient | Confirmed, different mechanism | Not sucrose/added sugars: id 2000 is correct for SR but Foundation uses 1063 (E2), and missing values coerce to 0 (E3). Full ID map audited per the prompt. |
| D: quantity x 100 g basis on count items | Disproven for the golden meal | unitToGrams resolved 2 whole egg = 100 g, 0.5 avocado = 100 g, 1 apple = 182 g correctly. Protein 1.9x came from E1 phantom protein. The quantity defect class DOES exist for cup/serving units (E4) per the 184 divergence report. |

### Why no guardrail caught it

The 177d meal-level Atwater check passed (ratio approximately 0.93) because E1 inflates
calories and macros together consistently. Per-item plausibility bounds (Phase 3) are the
missing defense: a single parsed half-avocado carrying 884 kcal and 100 g fat must flag.

### Adjacent finding

meals.fat_breakdown and fat_source_id now exist live (the 184b B1 migration reached
production after the 2026-06-10 dev-log observation), so canonical meals inserts work.

## Phase 2 and 3: fixes (commits follow)

Planned and delivered in this order, every commit on main:
1. Canonical FDC nutrient map module (one source of truth, ID + unitName, Foundation
   Atwater + 1063 fallbacks, kJ derive-with-flag, UNKNOWN never 0).
2. Deterministic reference ranking replacing first-hit selection.
3. portionToGrams resolver: FDC foodPortions, then curated unit weights, then 100 g
   with confidence downgrade. All channels routed through it.
4. usda-client rewrite wiring 1 to 3 + permanent per-item structured logging + cache
   schema v2 (append-only migration; poisoned cache purged).
5. Null-aware aggregation + schema + routes; knownNutrients computed from reality.
6. Guardrails: per-item plausibility bounds with re-estimation, Atwater on the photo
   route, energy unit assertion.
7. Golden-meal regression harness on recorded FDC fixtures.

## Post-fix verification

(appended after fixes ship)
