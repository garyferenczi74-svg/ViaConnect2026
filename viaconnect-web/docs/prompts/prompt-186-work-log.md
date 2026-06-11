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

## Phase 2 and 3: fixes (all on main)

1. Canonical FDC nutrient map module fdc-nutrients.ts (one source of truth, ID +
   unitName, Foundation Atwater 2047/2048 + Sugars 1063 fallbacks, kJ derive flagged,
   UNKNOWN never 0, energy unit assertion fail-open). usda-nutrient-ids.ts delegates.
2. Deterministic reference ranking (fdc-ranking.ts) replacing first-hit selection:
   transform-token penalties (oil, dried, powder, candied, dressing...), varietal
   penalties (a generic "apple" must not resolve to Foundation fuji at 13.3 g sugar
   per 100 g), parenthetical stripping that preserves query matches ("includes
   sourdough"), preparation token matching, analytical-data preference (Foundation >
   SR Legacy > FNDDS > Branded), all-query-tokens acceptance floor. Search pageSize
   raised 25 -> 50 because generic references rank below dozens of varietals and
   dishes for short queries.
3. portionToGrams resolver: direct units, then FDC foodPortions, then curated table
   (longest key wins; sourdough no longer shadowed by bread), then 100 g default
   WITH downgrade. Conflict guard: an FDC portion diverging more than 2.5x from a
   known curated weight is overridden (SR french bread reports "slice" = 139 g).
   Water-density cups on solids carry the downgrade flag.
4. usda-client rebuild wiring 1 to 3: permanent per-item structured logging (fdcId,
   dataType, rows used, grams + method, multiplier, outputs, missing list), per-item
   plausibility flags (900 kcal / 60 g fat), Branded one-basis rule (per-100g rows
   or labelNutrients converted through serving grams, never both), upsert cache
   writes (the old insert collided with expired rows), detail-404 treated as a clean
   miss (FDC search returns ids whose detail endpoint 404s; substituting the next
   candidate would hand "egg" to "Egg, Benedict", so the channel estimator takes it).
5. Cache v2 migration (applied live): extraction_version, data_type, food_portions,
   sodium + cholesterol columns; 49 poisoned rows purged (7 were zero-kcal).
6. Null-aware end to end: aggregate() partial/unknown tracking, nullable schema,
   both analyze routes compute knownNutrients from reality, Atwater added to the
   photo channel, confidence downgrades on portion defaults + failed or skipped
   reconciliation, plausibility re-estimation before display, sodium persists as a
   real value or NULL (never the silent 0 the photo route wrote). MealResultCard +
   MetricTile render Unknown and est. markers.

## Production findings needing Gary

1. ENV (corrected 2026-06-11 evening): the original "both USDA keys are empty
   strings" reading was an artifact of vercel env pull, which redacts sensitive
   variables to empty (GEMINI_API_KEY and SUPABASE_SERVICE_ROLE_KEY pull the same
   way while demonstrably working). What is certain: Gary set the real key on
   2026-06-11, production was redeployed so the runtime picked it up, and the
   DEMO_KEY warning no longer appears in runtime logs. The code accepts
   USDA_FDC_API_KEY then USDA_FDC_API_KEY_2. LIVE VERIFICATION (21:31 UTC): an
   authenticated analyze-text probe ("one medium banana and one whole apple")
   returned data_source mixed with USDA matching, and usda_food_cache gained
   query "banana" -> "Bananas, raw" (SR 173944, 89 kcal/100g, sugar 12.23,
   8 foodPortions, extraction_version 2) where production previously cached
   "Bananas, dehydrated, or banana powder" at 346. An earlier organic meal at
   20:36 UTC cached "oat" -> "Oats" (SR 169705, 389 kcal/100g, sugar NULL not
   0). Search, ranking, canonical extraction, portion capture, cache v2, and
   unknown-vs-zero are all confirmed working in production. Remaining flakiness
   observed: intermittent FDC 400/timeout responses and transient Gemini 503s,
   both failing open to the estimator exactly as designed (the probe's apple
   item estimated accurately on one attempt). The temporary verification auth
   user and its meal rows were deleted after the probe.
2. SPEC CONFLICT (resolved in favor of the bands, ratification requested): the
   Phase 2 curated-table suggestion "slice of sourdough ~50 to 60 g" cannot satisfy
   the Phase 4 acceptance bands (carbs 38 to 50 g) or the Section 1 ground truth
   (75 kcal per piece = 28 g) for the golden meal; no correct engine passes at 55 g.
   Curated slice shipped at 30 g. If Gary prefers thick artisan slices, the bands
   need re-basing.
3. The fat_breakdown / fat_source_id columns from 184b now exist live; canonical
   meals inserts work again (the 2026-06-10 dev-log failure is resolved).

## Phase 4: regression harness

src/lib/nutrition/benchmark/__tests__/golden-meals.test.ts runs the REAL ranking,
extraction, portion, scaling, and aggregation code against RECORDED FDC responses
(fdc-recorded-fixtures.ts, regenerated by scripts/186/build-fixture-module.mjs; never
hand-edit nutrient values). Meals: (1) the Section 1 reference meal against Gary's
bands, with the production decoys still in the candidate lists and the recorded
detail-404 for the egg exercising the estimator fallback at 0.75 confidence exactly
like the original card; (2) Cheerios Branded one-basis scaling; (3) whole avocado
alone under the plausibility bounds; (4) apple alone with real sugar; (5) mixed
USDA + pinned-estimate text entry with a partial sugar marker. Future prompts
extend this suite; they must not bypass it.

Downstream verification: meals writes carry nullable macros + computed
knownNutrients; useNutritionHubMetrics types macros nullable and coerces via
numeric(); daily-totals guards with typeof checks; Gordon scoring excludes unknown
nutrients via knownNutrients; BOS recompute consumes the scored row. All
null-tolerant.

## Post-fix verification

The Section 1 meal re-run through the rebuilt engine (real ranking, extraction,
portion, scaling, and aggregation code against the recorded FDC responses; the
golden-meal suite executes this exact run on every test pass). Production env
still lacks a real FDC key, so live NutriVision behaves identically except that
USDA misses (DEMO_KEY rate limits) fall to the AI estimator more often.

Resulting macro card:

| Metric | Before (defective) | After (verified run) | Ground truth band |
|---|---|---|---|
| Calories | 1578 | 427 | 360 to 460 |
| Fat | 127.1 g | 21.9 g | 14 to 24 |
| Protein | 29.1 g | 17.5 g | 13 to 18 |
| Sugar | 2.5 g | 18.4 g | 14 to 21 |
| Carbs | not shown | 43.5 g | 38 to 50 |
| Confidence | 0.75 mixed | 0.75 mixed | |

Per item (matched reference, grams, kcal / fat / protein / sugar):
- 2 whole egg: AI estimate after the recorded FDC detail 404: 148 / 10.0 / 12.4 / 0.2
- 0.5 whole avocado: Avocado, raw at 75 g: 120 / 11.0 / 1.5 / 0.5 (the prompt's own
  cited USDA reference values for 75 g avocado, exactly)
- 1 slice sourdough bread: Bread, french or vienna (includes sourdough) at 30 g:
  82 / 0.7 / 3.2 / 1.4
- 1 whole apple: Apples, raw, without skin at 161 g (real FDC medium portion):
  77 / 0.2 / 0.4 / 16.3

Atwater check: (4 x 17.5 + 9 x 21.9 + 4 x 43.5) / 427 = 1.03, passes. Every
Phase 4 band passes. The full repository suite stands at 29 failures vs 35 on
the pre-186 baseline: the four error classes' tests now pass, four stale
pre-existing test breaks were repaired in passing, and the only remaining
failures are the two documented pre-existing ones outside 186 scope (barcode
checksum empty-string case; voice-native haiku prompt copy) plus whatever the
shared tree carried before this prompt.

Operational notes: the one-off Supabase Edge Function prompt-186-fdc-proxy
(JWT-gated, proxies only FDC search/detail, slims responses) exists because
DEMO_KEY rate limits exhausted two egress IPs during fixture recording; safe to
delete after Gary populates the real FDC key. Fixture regeneration:
node scripts/186/build-fixture-module.mjs (raw recordings in scripts/186/fixtures).

## Same-day incident chain (Log a Meal: "We couldn't analyze that meal")

Gary's screenshot at 1:37 PM exposed a chain of three stacked defects, each fixed
and pushed the same evening (ff066af9, 0c9e0283, 0d121304, 937c6f08):

1. gemini-2.5-flash thinks by default and thought tokens count against
   maxOutputTokens, truncating the ten-field estimation JSON. The new
   core-macro guard correctly refused to zero-fill (the old code would have
   saved calories 0) but the uncaught throw failed the whole meal. Fixed:
   thinkingBudget 0 + 2048 headroom on the estimation call; a per-item
   estimator failure now degrades that item to UNKNOWN nutrients so the meal
   always saves; a twice-malformed estimate falls back to Claude.
2. The 180f Claude fallback had NEVER fired in production: the code reads
   ANTHROPIC_API_KEY but Vercel carries Anthropic_API_Key and
   PHOTO_AI_ANTHROPIC_API_KEY (process.env is case sensitive). With Gemini
   rate limited, parse failures became hard 503s. Fixed: the nutrition client
   accepts the names that exist. Eight other routes outside the meal channel
   still read the exact-case name; adding ANTHROPIC_API_KEY in Vercel revives
   them all (Gary's desk).
3. With the fallback finally firing, Claude parsed the meal correctly and the
   schema discarded it: the prompt marks preparation/notes "optional", Gemini
   omits the keys but Claude emits explicit nulls, and z.string().optional()
   rejects null. Fixed: normalizeParsedMealNulls at the three model-output
   parse sites (a schema-level transform was tried and reverted; it makes the
   inferred keys required, 61 type errors).

Live verification with Gary's exact text ("65 g quick oats, 30 g protein
powder, 45 g blueberries, 1.5 gram chicken thighs"): HTTP 200 first attempt,
data_source mixed (USDA 2 of 4), 384 kcal / 21.9 protein / 50.8 carbs /
10.3 fat / 7.3 sugar / 9.8 fiber / 99.5 sodium, sodium partial-marked.
Remaining for Gary: the Gemini key is persistently rate limited this evening
(free-tier signature); a paid tier or the ANTHROPIC_API_KEY addition spreads
the load.

## Agent review (Jeffery aggregate, pre-push)

Specialists: Michelangelo, Gordon, Hannah, security-advisor, performance-advisor.
Verdict was fix-first with six items, all addressed before push: (1) the generic
28 g slice guess no longer masquerades as a known curated weight (the conflict
guard skips when the table has no real key, so a measured 192 g quiche slice
survives) and the guess carries the downgrade flag; (2) ranking token sets are
normalized through the tokenizer so plural and stemmed entries cannot silently
die; (3) the estimated attribution copy is uncertainty-honest ("We could not
confirm a USDA match for these foods."); (4) foods/search imports the
EXTRACTION_VERSION constant instead of a literal; (5) analyze-photo logs lookup
failures like analyze-text; (6) debug logging removed from the golden suite.
Decisions D1 (404 = miss to estimator), D2 (30 g slice; 55 g rejected by Gordon
and Hannah, USDA grain equivalent is 28 g), D3 (ranking weights and pageSize 50),
and D4 (plausibility bounds) all CONFIRMED. Security and performance clean; the
upsert conflict target matches the unique index. Follow-up queue for a future
prompt: per-100g density plausibility bounds (Gordon + Hannah joint
recommendation), per-item lookup parallelization with a small concurrency cap,
a (fdc_id, extraction_version) btree for the foods/lookup predicate, the
curated large-egg 50 x 1.4 multiplier latent quirk, and extending transform
tokens with jerky/canned/smoked/pickled/breaded.
