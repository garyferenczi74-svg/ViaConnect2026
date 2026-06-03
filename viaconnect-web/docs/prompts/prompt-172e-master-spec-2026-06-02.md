# Prompt 172e: NutriVision Hydration Beverage Section Engine

**Filed:** 2026-06-02
**Status:** Master spec filed; pending Jeffery ultrathink review + Gary phasing decision
**Consumer brand:** Via Cura (all product, platform, and marketing references use Via Cura)
**Legal and manufacturing entity:** Farmceutica Wellness Ltd (manufacturer only, not a consumer brand)
**Surface:** ViaConnect Consumer Portal, NutriVision hydration experience, detail view at /wellness-analytics/hydration
**Owner agent:** Gordon (nutrition domain, beverage classification, hydration coefficients, hydration insight rules)
**Co-owners:** Arnold (data ecosystem, aggregation views, hydration as Bio Optimization Score input), Kelsey (compliance, disclaimers, clinical claim linter)
**UX:** Hannah. **Build:** Michelangelo (TDD, OBRA). **Orchestrator:** Jeffery.
**Stack:** Next.js 14 or later App Router, TypeScript, Tailwind, Supabase (project nnhkcufyqjojdbvdrpky, us-east-2), Capacitor plus Next.js single code path for mobile.
**Repo:** viaconnect-web. **Workflow:** direct push to main, preview first for any health characterizing copy.
**Spec type:** Additive expansion of the existing Prompt 170o hydration surface. This is not a rebuild and it does not fork the data model.

## Relationship to 170o

Prompt 170o established the hydration foundation that this prompt expands. In 170o, hydration is a hydration_ml value and a hydration_source_kind on the existing meal log, so hydration never forks the single source of truth, and it provides the detail view at /wellness-analytics/hydration, the Conservative versus Adjusted counting toggle, the target personalization formula, the quick log surfaces, and the five minute deduplication window. 172e turns the crude beverage ratio idea in 170o into a real, evidence grounded coefficient model and a full, catalog driven beverage section. If 170o has not fully shipped at build time, 172e composes with it and ships with or after it.

## 1. Intent

Expand the basic hydration tab into a full beverage section engine. Today a user can log water and a small set of beverage kinds. This prompt adds a structured, extensible beverage catalog (water and its variants, coffee, tea, juice, pop, sports and energy drinks, milk and plant milks, functional drinks, and alcohol), an evidence grounded hydration weighting model, per beverage caffeine, calories, sugar, and electrolytes that feed the systems that already own those signals, and a beverage breakdown surface. The engine is catalog driven so new beverages are data, not code.

Three design commitments hold throughout. First, single source of truth: a logged beverage is a meal log row with hydration fields, exactly as 170o defined, so its calories and sugar count in nutrition totals and are never a parallel uncounted source. Second, evidence grounded: the hydration coefficients trace to Maughan et al. 2016 (American Journal of Clinical Nutrition 103, pages 717 to 723), not to invented numbers. Third, safe by construction: no health claims for any beverage, and full compliance with the 170c eating disorder safety mode.

## 2. Hard constraints

- Brand naming follows the master rule: Via Cura is the consumer product brand for all product, platform, and marketing references; Farmceutica Wellness Ltd is the manufacturer entity only and is never used as a brand. The beverage catalog is generic (coffee, juice, pop). Any Via Cura branded product tie in (for example a Via Cura electrolyte product added to water) is named Via Cura and is deferred to its own prompt; do not place products in this engine.
- ARCHITECTURAL EXCEPTION (168c): /api/nutrition/analyze-text and /nutrition/log-meal are permanent legacy paths, untouched.
- No engine changes to Gordon scoring, the vision cascade, Daily Macros, or the meals table schema beyond append only additions.
- Consumer portal only. Practitioners and naturopaths see only the existing aggregate engagement score (170i). No new practitioner visibility.
- Append only Supabase migrations. No edits to existing tables, email templates, or package.json without written approval.
- Score name is exactly "Bio Optimization Score." Client facing identity via getDisplayName(). Gordon slug gordon.
- No em dashes, no en dashes anywhere. No emojis in code or UI strings. Lucide React icons at strokeWidth 1.5 only.
- Tokens: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans. No off token colors. Desktop and mobile in the same build. WCAG 2.2 AA.
- No health claims for any beverage (section 9). The 170c clinical claim linter runs on all beverage labels, descriptions, and insight templates.

## 3. Standing Spec Inheritance

- **Prompt 170o:** the hydration_ml column and hydration_source_kind on the meal log, the Conservative versus Adjusted counting toggle, the daily target formula and adjustment multipliers, the quick log surfaces (Dashboard widget, NutriVision card, FAB), the detail view layout at /wellness-analytics/hydration (Today timeline, week bar chart, month heatmap), the edit panel, the five minute deduplication window (HYDRATION_DEDUP_WINDOW_SECONDS), and the FDA adapted hydration disclaimer. 172e extends these; it does not replace them.
- **Prompt 171b:** the caffeine model (caffeine treated with a five hour half life, the circadian penalty remaining = caffeine_mg * (0.5 ^ (hours_to_sleep / half_life_hours)), the parsed caffeine_mg, and the portion_display_unit and portion_display_value columns). Caffeinated beverages feed this model; they do not create a second caffeine path.
- **Prompt 170c:** the eating disorder safety mode behavioral contract, the standardized FDA disclaimer, and the clinical claim linter. The hydration surface is added to the 170c downstream contract (section 8).
- **Prompt 170h:** hydration and beverage breakdown feed the symptom and supplement crossover engine as co variates.
- **Prompt 17a:** beverage derived signals feed the Nutrient Profile and Metabolic Health analytics categories (electrolytes, sugar from beverages).
- **Prompt 170 and Gordon:** beverages with calories or sugar log as meal items and flow through Daily Macros. Hydration is a property of those rows, never a separate calorie store.

## 4. The beverage catalog (engine core)

A new append only table beverage_catalog is the single, extensible source of beverage definitions. The UI and the logging flow are driven entirely by this table so new beverages are seed data.

```sql
-- Append only. Illustrative columns; align types to repo conventions during discovery.
create table if not exists beverage_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- e.g. 'coffee_drip', 'water_sparkling'
  category text not null,                    -- water, coffee, tea, juice, soft_drink, sports_energy, milk, functional, alcohol
  display_name text not null,
  default_volume_ml integer not null,        -- per 170o defaults: glass 240, cup 240, bottle 500, can 355, pint 473
  hydration_coefficient numeric(4,2) not null default 1.00,  -- see section 5, evidence grounded
  caffeine_mg_per_serving integer not null default 0,        -- feeds 171b
  kcal_per_serving integer not null default 0,               -- feeds Gordon and Daily Macros
  sugar_g numeric(5,1) not null default 0,
  sodium_mg integer not null default 0,                      -- electrolytes feed 17a Nutrient Profile
  potassium_mg integer not null default 0,
  magnesium_mg integer not null default 0,
  is_alcoholic boolean not null default false,
  abv numeric(4,1),                                          -- when alcoholic
  evidence_source text,                                      -- citation tag for coefficient provenance
  requires_claim_review boolean not null default false,      -- true for hydrogen, alkaline, ORS, kombucha, electrolyte
  is_active boolean not null default true,
  sort_order integer not null default 0
);
```

Extend the existing hydration_source_kind enum with append only values so each catalog category maps cleanly. Never edit or remove existing enum values.

Seed categories and representative beverages (extend freely; this is data):

- **Water:** still, sparkling, mineral, electrolyte enhanced, coconut water, hydrogen water, alkaline water, flavored water. All water variants have coefficient 1.00 unless they carry electrolytes (see ORS and electrolyte below). Hydrogen and alkaline water are treated as still water for hydration with neutral labels and requires_claim_review = true (section 9).
- **Coffee:** drip, espresso, americano, latte, cappuccino, cold brew, iced coffee, decaf. Coefficient 1.00. Caffeine defaults below.
- **Tea:** black, green, oolong, white, matcha, chai, herbal or rooibos (caffeine free), iced tea. Coefficient 1.00.
- **Juice:** orange, apple, grape, cranberry, vegetable or green, smoothie. Coefficient 1.10 to 1.20 (orange juice is the evidence anchor near 1.39 unadjusted; use a conservative 1.20 default pending Gordon validation).
- **Soft drinks (pop):** cola, diet cola, lemon lime, ginger ale, root beer, tonic. Coefficient 1.00.
- **Sports and energy:** sports drink, electrolyte mix, oral rehydration solution, energy drink. Sports drink 1.00; oral rehydration solution and electrolyte mix 1.40 (evidence anchor near 1.54 for ORS); energy drink 1.00.
- **Milk and plant milk:** whole milk, skim milk, kefir, oat, almond, soy. Dairy milk 1.30 (evidence anchors 1.50 full fat and 1.58 skim unadjusted; use a conservative 1.30 default). Plant milks 1.00 to 1.10 pending Gordon validation.
- **Functional and other:** kombucha, broth or bone broth, ORS (also above). Coefficient 1.00 to 1.20. Kombucha requires_claim_review = true.
- **Alcohol:** beer, wine, spirits, cocktail. See section 5.3 for the dose aware diuretic handling and section 9 for the wellbeing framing.

**Caffeine defaults to seed** (validate against the existing 171b and 170g caffeine corpus; values are per the listed serving): drip coffee 95 mg per 240 ml, espresso 63 mg per 30 ml shot, latte or cappuccino 63 to 126 mg, cold brew 150 to 200 mg per 355 ml, decaf 2 to 5 mg, black tea 47 mg per 240 ml, green tea 28 mg per 240 ml, matcha 70 mg per 240 ml, herbal 0 mg, cola 34 mg per 355 ml, diet cola 46 mg per 355 ml, energy drink 80 mg per 240 ml.

## 5. The hydration model (evidence grounded)

### 5.1 Effective hydration volume

For each logged beverage:

```
effective_hydration_ml = volume_ml * hydration_coefficient
```

The day total surfaces two numbers: gross fluid (sum of volume_ml) and effective hydration (sum of effective_hydration_ml). The progress ring tracks effective hydration against the 170o target.

### 5.2 Coefficient provenance

Coefficients trace to Maughan et al. 2016 (American Journal of Clinical Nutrition 103, pages 717 to 723), which measured short term fluid retention relative to water in euhydrated adults. The defensible reading: most everyday beverages, including coffee, tea, cola, diet cola, sparkling water, sports drink, and lager at a single serving, retain fluid comparably to water, so they default to 1.00. Milk, oral rehydration solution, and orange juice retain more, so they carry coefficients above 1.00. This is a short term retention proxy, not a clinical hydration guarantee; the disclaimer in section 9 states this. Store the citation in evidence_source so Gordon and Kelsey can audit each value.

### 5.3 Alcohol diuretic handling (conservative, Kelsey reviewed)

A single standard drink retains fluid comparably to water in the study, so the base coefficient for alcohol is 1.00. Alcohol is a dose dependent diuretic, so apply a conservative reduction only above a daily threshold of cumulative alcohol, configurable via ALCOHOL_DIURETIC_THRESHOLD_DRINKS, and never below an effective floor. Do not invent a steep penalty curve beyond the evidence. Kelsey reviews the threshold and the copy. The engine never encourages alcohol intake (section 9).

### 5.4 Counting modes (extends 170o)

The 170o Conservative versus Adjusted toggle now uses real coefficients. Conservative counts only water category beverages toward the target. Adjusted counts all beverages at their coefficients. The helper text stays factual: "Adjusted includes coffee, juice, and other beverages at evidence based hydration ratios."

## 6. Caffeine integration (171b)

Each caffeinated beverage contributes its caffeine_mg_per_serving, scaled by the logged volume, to the existing 171b caffeine and circadian model. There is no second caffeine path and no recomputation of the model here; this engine supplies an input. Reconcile against double counting: when a coffee is logged both via the hydration quick add and as a meal item within the 170o five minute deduplication window for the same beverage kind, count its caffeine once. The hydration detail view may surface the existing 171b caffeine relative to sleep signal as a read only overlay; it does not redefine the circadian penalty.

## 7. Nutrition integration (Gordon, single source of truth)

Beverages with calories or sugar log as meal item rows exactly as 170o specified, so their kcal, carbs, and sugar count in Daily Macros automatically. This engine adds no parallel calorie store. Electrolytes (sodium, potassium, magnesium) from the catalog feed the 17a Nutrient Profile category. A neutral sugar from beverages signal is available to Gordon and 170h as a co variate; it is descriptive, never moralizing, and it is suppressed or qualitative in safety mode (section 8).

## 8. Safety mode contract (170c, non negotiable)

When the existing 170c eating disorder safety mode is active, with no visible indicator that it is active:

- Hide absolute calories, sugar grams, and caffeine milligrams for beverages. Show hydration progress as the ring and qualitative trend, and beverage breakdown as composition only, never as a calorie or sugar tally.
- The sugar from beverages signal and any insight that names calories or sugar is suppressed or rendered qualitatively and non prescriptively (170h framing).
- Copy uses the food positive, non optimization register. No scarcity, no streak pressure, no body framing.
- The FDA adapted hydration disclaimer remains present.

The hydration surface is one more row in the 170c downstream behavioral contract table, alongside 170 base, 170h, 170i, 170j, 170l, and 170m. It reads the existing safety mode state and implements no detection of its own.

## 9. Health claim guardrails (Kelsey)

No beverage in this engine carries a health claim. This matters most for hydrogen water, alkaline water, oral rehydration solution, electrolyte water, and kombucha, which are logged as ordinary beverages with neutral, descriptive labels. The app never asserts antioxidant, detox, anti inflammatory, pH balancing, immune, gut, metabolic, or disease related benefits for any beverage. Beverages with requires_claim_review = true and every insight template that characterizes a beverage pass the 170c clinical claim linter and a Kelsey review before shipping. Alcohol is handled factually and never encouraged, gamified, or framed as a hydration strategy; the engine surfaces it neutrally and applies the section 5.3 diuretic handling. The standardized FDA adapted disclaimer states that hydration coefficients are a short term retention proxy and not medical advice.

## 10. UI: the beverage section engine

On /wellness-analytics/hydration, extend the existing 170o detail view rather than replacing it.

- **Beverage add flow (catalog driven):** a sectioned picker. Top level is the category list (Water, Coffee, Tea, Juice, Pop, Sports and Energy, Milk, Functional, Alcohol), each with a neutral Lucide icon at strokeWidth 1.5. Selecting a category reveals its beverages from beverage_catalog. Selecting a beverage opens a compact volume step (default volume preselected from the catalog, adjustable in 50 ml or 1 oz increments) and a Log action. A search field filters across all active beverages. A Favorites row and a Recents row sit above the categories for one tap re logging.
- **Beverage breakdown (new section):** a today view showing composition of intake by category (for example a stacked bar or ring segment split such as water, coffee, juice), with gross fluid and effective hydration both shown. In safety mode this is composition only, no calorie or sugar tally.
- **Caffeine overlay (read only, from 171b):** an optional timeline marker set showing caffeine relative to the user's sleep window, sourced from the existing model.
- **Electrolyte summary (from the catalog and 17a):** a quiet line summarizing sodium, potassium, and magnesium from beverages for the day. Suppressed numerically in safety mode.
- The existing 170o Today timeline, week bar chart, month heatmap, target ring, edit panel, and disclaimer footer remain. The edit panel beverage selector now draws from the full catalog.

All surfaces are responsive on the single Capacitor plus Next.js code path, token correct, WCAG 2.2 AA, with all strings sourced from a microcopy layer (no hardcoded user facing literals), and no dashes or emojis.

## 11. Analytics and insights (170h, 17a)

Beverage breakdown trends over week and month, caffeine versus sleep patterns (read only from 171b), a neutral sugar from beverages pattern (Gordon, suppressed or qualitative in safety mode), electrolyte intake from beverages (17a Nutrient Profile), and hydration source diversity. All insight templates are non prescriptive, structure function safe, and Kelsey reviewed. Practitioners see only the existing aggregate engagement score; this is consumer portal only.

## 12. Data model and services

- beverage_catalog table plus seed (section 4), append only.
- Append only additions to hydration_source_kind enum to map categories.
- Electrolyte fields: prefer reading from the catalog at log time and storing on the existing meal item via an append only column or a beverage_attributes JSONB if not already present; do not edit existing columns.
- A read only catalog endpoint feeds the picker. Logging routes through the existing 170o hydration log and meal log paths. No new write path forks the meals table.
- getHydrationForDay extends to return gross fluid, effective hydration, and the category breakdown, honoring the counting mode and safety mode.
- Telemetry is append only and privacy respecting: beverage category logged, effective volume bucket, caffeine contributed flag, never the safety mode clinical inference and never raw health data beyond what hydration logging already stores.

## 13. Tests (TDD, Michelangelo, OBRA)

Write tests first.

- Coefficient math: effective_hydration_ml equals volume times coefficient for every catalog category; gross and effective totals correct.
- Counting modes: Conservative counts only water categories; Adjusted counts all at coefficients.
- Caffeine: a caffeinated beverage contributes the correct caffeine_mg to the 171b model and is counted once across the 170o dedup window.
- Nutrition: a calorie beverage increments Daily Macros via the existing meal path; no parallel calorie store exists.
- Safety mode: absolute kcal, sugar, and caffeine are hidden; breakdown is composition only; no mode indicator; disclaimer present; copy in the food positive register.
- Claim safety: the clinical claim linter is green across all catalog labels and insight templates; hydrogen water, alkaline water, ORS, electrolyte, and kombucha carry no health claim; alcohol copy carries no encouragement.
- Catalog integrity: seed loads, slugs unique, enum mappings valid, evidence_source present for every non default coefficient.
- Responsive at mobile and desktop in the same suite; WCAG 2.2 AA; no dashes, no emoji; Lucide strokeWidth 1.5; tokens only.

## 14. Rollout and sequencing

172e composes with 170o, which is post launch Q4 2026 priority and depends on the entry paths and the 170h insights engine. If 170o has shipped, 172e ships on top of it. If not, 172e bundles with the 170o build. The catalog and the picker UI ship via direct push to main once green. Any beverage label or insight that characterizes a beverage, and anything touching alcohol or the claim review beverages, ships preview first with Kelsey and Marshall sign off on record. Rollback is reverting the catalog driven picker and the breakdown section to the prior 170o surface; the meals schema, the 171b model, and the 170c safety mode are untouched, so rollback carries no data risk.

## 15. Acceptance criteria

- A catalog driven beverage section on /wellness-analytics/hydration covering water and its variants, coffee, tea, juice, pop, sports and energy, milk and plant milk, functional drinks, and alcohol, extensible by seed data.
- Evidence grounded hydration coefficients with citations in evidence_source; gross fluid and effective hydration both surfaced; counting modes use real coefficients.
- Caffeinated beverages feed the 171b model with no double count; calorie beverages feed Daily Macros with no parallel store; electrolytes feed the 17a Nutrient Profile.
- Full 170c safety mode compliance with no visible indicator; FDA adapted disclaimer present.
- No health claims for any beverage; clinical claim linter green; alcohol handled factually and never encouraged.
- Single source of truth preserved; append only migrations; no engine, schema, email, or package.json edits beyond append only additions.
- Tokens, Lucide strokeWidth 1.5, no dashes, no emoji, getDisplayName, Bio Optimization Score exact, WCAG 2.2 AA, desktop and mobile in the same build.
