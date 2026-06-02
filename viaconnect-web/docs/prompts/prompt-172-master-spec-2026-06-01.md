# Prompt 172: NutriVision Conversational Meal Card, Voice, and BOS Personalization Layer (Master Spec)

**Filed:** 2026-06-01
**Status:** Phase 0 in progress. Eight gates ratified by Gary 2026-06-01; Phase 0 primitives + spec rewrite + 171a memorialization in flight.
**Company:** Farmceutica Wellness Ltd
**Consumer brand:** Via Cura ("Built For Your Biology")
**Surface:** ViaConnect Consumer Portal, NutriVision nutrition experience (Gordon powered)
**Spec type:** Additive upgrade to the existing NutriVision result surface. This is not a rebuild and it replaces nothing in the pipeline.
**Orchestrator:** Jeffery. TDD and OBRA enforcement: Michelangelo. Regulatory gate: Marshall (dictionary scan) plus Hannah (clinical framing) plus Kelsey (regulatory framing).

**Revision note (v2):** Reconciled against the live 170a through 170s build and the 171 series. Key corrections from v1: the card now obeys the 170c eating disorder safety mode behavioral contract, maps onto the existing MealAnalysisResult schema and result components rather than a new shape, carries the standardized 170c FDA disclaimer and degraded service messaging, consumes the 171a signed URL thumbnail mechanism and the 171b portion_display fields, and defers all genetic and bioavailability personalization to the future 170u and 170w prompts. Naming standardized to NutriVision.

**Revision note (v3, 2026-06-01):** Eight gates ratified by Gary after Jeffery dual-audit (agent ids adf82f2b18eabac77 and a93e027692ef139bc). Key corrections from v2: (1) 170c canonical master spec filed at `docs/prompts/prompt-170c-master-spec-2026-06-01.md`; (2) data shape corrected from the legacy `MealAnalysisResult` to the production `MealDraft` (at `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts`) plus `SaveResponse.gordon` post-save; (3) temporal contract clarified as a pre-save plus post-save state machine; (4) mount strategy clarified as compose, not swap (`AnalysisResult.tsx` delegates to `MealCard` subtree, retaining voice hooks, plate selector, corpus opt-in banner, and confidence badge); (5) regulatory pipeline clarified as Marshall plus Hannah plus Kelsey; (6) `partial` state struck from section 5.4 (no upstream signal exists); (7) 172b BOS line source pinned to a new read endpoint `/api/nutrition/bos-line/[mealId]`; (8) 171a retroactive memorialization scheduled. `BosLine` type home pinned to `src/lib/nutrition/bos-line/types.ts`. Route name corrected from `/api/nutrition/photo-ai/analyze` to the live `/api/nutrition/photo/analyze`.

## 0. How to read this prompt set

Prompt 172 is the spine. It defines scope, inheritance, guardrails, the upgraded meal card, and the file plan. The four sub prompts each own one workstream and depend on this document:

- **Prompt 172a:** Voice and Microcopy System (the words and tone, as a typed string layer, with safety mode variants).
- **Prompt 172b:** Bio Optimization Score Hook (one qualitative, read only BOS line per meal; no genetics, no bioavailability).
- **Prompt 172c:** Conversational Acknowledgement and Thread Presentation (the responsive logged moment and the light thread over existing entry paths).
- **Prompt 172d:** Wellbeing Guardrails, Regulatory Gate, QA, and Acceptance (composes with 170c; holds the test matrix and rollout).

**Build order:** 172 sets up the card shell, the schema mapping, and tokens; then 172a (microcopy must exist before the card renders real strings); then 172b; then 172c; then 172d, which gates all of them.

## 1. Intent

Upgrade how NutriVision presents a logged meal. Today the result of a Gordon analysis renders through the existing result components. We are refining that presentation into a cleaner confirmation card that itemizes the meal, shows a compact macro summary, carries a short credible acknowledgement line, and surfaces at most one Bio Optimization Score aware line where data allows. We take three things from the benchmark competitor we studied: the itemized confirmation card, the brief responsive acknowledgement, and the option to split a combined plate. We deliberately do not take its calorie scarcity framing, its streak pressure, or its hype voice. Our differentiator is that the card can react in the context of the user's own biology, which a generic macro tracker cannot do.

The result must feel like a knowledgeable coach who is glad you logged, grounded in "Built For Your Biology," not a gym buddy. And it must do all of this without ever breaking the safety contract that 170c established.

## 2. Hard constraints (apply to 172 and all sub prompts)

- **Stack:** Next.js 14 or later App Router, TypeScript, Tailwind, Supabase (project nnhkcufyqjojdbvdrpky, region us-east-2). Mobile is the Capacitor plus Next.js unified code path (not Expo, not React Native). One code path serves web, iOS, and Android. There is no separate mobile build step.
- **ARCHITECTURAL EXCEPTION (Prompt 168c):** /api/nutrition/analyze-text and /nutrition/log-meal are permanent legacy paths. Do not migrate, change, or deprecate them. This work consumes their output and the standard pipeline output. It never alters engine behavior.
- **No engine changes.** Gordon scoring, the vision cascade, Photo AI recognition, Daily Macros computation, and the unified meals table are upstream and untouched. We render their results.
- **Consumer portal only.** Helix Rewards remains consumer only. Practitioners and naturopaths see only the aggregate engagement score and never see this card surface. Practitioner data access continues to follow the 170i consent architecture.
- **Append only Supabase migrations.** No edits to existing tables. No edits to Supabase email templates. No edits to package.json without Gary's written approval.
- **Score name is exactly "Bio Optimization Score."** Never "Vitality Score," never "Genetic Optimization."
- All client facing identity references use getDisplayName().
- Gordon slug is exactly gordon.
- **No em dashes (U+2014) and no en dashes (U+2013)** anywhere, including code comments, UI strings, and commit messages.
- **No emojis** in code or UI strings. Iconography is Lucide React only, at strokeWidth 1.5.
- **Design tokens:** Deep Navy #1A2744 (page), Card #1E3054 (card surface), Teal #2DA5A0, Orange #B75E18, typeface Instrument Sans. No off token colors.
- **Accessibility target is WCAG 2.2 AA**, per the 170j precedent already binding on NutriVision surfaces.
- **Delivery:** direct push to main. Exception: any change that renders Bio Optimization Score aware copy ships preview first (see 172d).

## 3. Standing Spec Inheritance (read before writing code)

This prompt set inherits every architectural decision from the live NutriVision build and must compose with it, never around it.

- **Prompt 170 (base):** the meal_items shape, the production `MealDraft` schema at `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts`, the nutrient cascade, and the meal save flow. Post-save, Gordon scoring is delivered on `SaveResponse.gordon.quality_score`. The card renders these; it does not redefine them. The result screen already exists at `AnalysisResult.tsx`. The card is an upgrade to the card-body subtree of that screen, not a replacement of the pipeline behind it.
- **Prompts 170a and 170a-supplement:** the nutrition_photo_jobs job model and its analyze_kind and nutrient_source enums, the practitioner portal redaction matrix, and the error retry UX pattern. The card reuses the retry pattern for its error state.
- **Prompt 170c (Trust, Safety, Compliance):** three inheritances that are non negotiable. (1) The eating disorder safety mode behavioral contract (see section 5.7). (2) The standardized FDA disclaimer placement, which this card surface must carry. (3) Degraded service messaging, which the card error and low confidence states must use rather than inventing new copy. The 170c clinical claim linter also runs on all 172 copy.
- **Prompt 170f (recipe library and match short circuit):** the card must render recipe matched meals and re logged meals (zero analysis call) the same as any other source.
- **Prompt 170i (practitioner consent based review):** unchanged. The card is consumer side; any data it reads honors the existing default deny, per practitioner, time bound consent model. The card adds no new practitioner visibility.
- **Prompt 171a:** the signed URL mechanism for meal images (delivered by `/api/nutrition/photo/analyze`, images in the `nutrivision-meals` Supabase Storage bucket, 1-hour TTL on the signed URL, returned on `MealDraft.thumbnail_url`). Memorialized at `docs/prompts/prompt-171a-filed-2026-06-01.md`. The card photo thumbnail uses this mechanism; it does not build its own.
- **Prompt 171b:** the portion_display_unit and portion_display_value columns and the recipe_match_hint behavior gated behind QUICK_LOG_RECIPE_SHORT_CIRCUIT_ENABLED. The card item rows render portions from these fields.

**Reserved for future prompts, do not implement here:** GENEX360 SNP aware nutrition (170u), pharmacogenomic food and medication safety (170v), bioavailability threaded coaching (170w). The 172 BOS line stays strictly within existing Bio Optimization analytics (Prompt 17a) and must not foreshadow or partially implement any of these.

## 4. Architecture: a presentation and microcopy layer

```
Any existing entry path (photo, multi photo, restaurant, recipe match,
  barcode, voice edit, Quick Log text, manual, receipt, photo library)
  -> existing vision cascade / analyze-text (168c) / recipe short circuit (170f)
  -> MealDraft from the analyze response (pre-save state)
  -> [NEW] MealCard presentation  (172, 172a)   <-- obeys 170c safety mode
        +- pre-save: renders MealDraft, mealQualityScore null, onSaveResponse pending
        +- [NEW] BOS line resolver (172b, read only via /api/nutrition/bos-line/[mealId])
        +- [NEW] Acknowledgement beat and light thread view (172c)
  -> existing /nutrition/log-meal -> unified meals table                 (168c, untouched)
  -> SaveResponse.gordon.quality_score lifted via onSaveResponse (post-save state)
  -> [NEW] Wellbeing + 170c safety mode + Marshall plus Hannah plus Kelsey gate + QA (172d) wrap all of the above
```

Everything new is read side and presentation side. The only write this work may introduce is the optional append only telemetry row in 172d, and only if existing telemetry cannot capture it.

## 5. The MealCard component (owned by this prompt)

### 5.1 Purpose

One presentational React component that consumes a normalized view of `MealDraft` pre-save and `SaveResponse.gordon` post-save, and renders the itemized confirmation. It fetches nothing, scores nothing, and accesses Supabase directly nowhere. It is a pre-save plus post-save state machine: pre-save it renders the analyze result without a quality score; on `onSaveResponse` it lifts the post-save state and reveals the score. It emits intent events.

### 5.2 Data contract (normalized from MealDraft and SaveResponse)

Do not invent a new result shape. Map the production `MealDraft` (pre-save) and `SaveResponse.gordon` (post-save) into a thin `MealCardModel` at the boundary so the component stays decoupled from engine evolution. The canonical types live at `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts`.

```ts
// Field names map from MealDraft (pre-save) and SaveResponse.gordon (post-save).
// Source of truth: src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts
export interface MealCardItem {
  id: string;
  name: string;                 // specific name from recognition
  portionLabel: string;         // built from 171b portion_display_unit + portion_display_value
  kcal: number | null;          // per item; null when not split or when safety mode hides it
  confidence: number;           // 0 to 1, from MealItemDraft.confidence
}

export interface MealMacros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  // ratios derived for safety mode rendering (composition, not absolutes)
  proteinPct: number;
  carbsPct: number;
  fatsPct: number;
}

export type MealSource =
  | "photo" | "multi_photo" | "restaurant" | "recipe_match"
  | "barcode" | "voice_edit" | "quicklog_text" | "manual"
  | "receipt" | "photo_library";

export interface MealCardModel {
  mealId: string | null;           // null pre-save; populated from SaveResponse.meal_id
  title: string;
  items: MealCardItem[];
  macros: MealMacros;
  mealQualityScore: number | null; // null pre-save; from SaveResponse.gordon.quality_score
  source: MealSource;
  analyzeKind: string;             // existing analyze_kind enum value
  photoUrl: string | null;         // from MealDraft.thumbnail_url (171a signed URL, 1-hour TTL)
  recognitionConfidence: "high" | "medium" | "low";
  degradedService: boolean;        // from 170c degraded service signal
  safetyMode: boolean;             // from useSafetyMode() reading 170c safety mode state
  bosLine: BosLine | null;         // resolved by 172b via /api/nutrition/bos-line/[mealId], null when unavailable
}
```

`BosLine` is defined at `src/lib/nutrition/bos-line/types.ts` (owned by 172b).

### 5.3 Anatomy and tokens (normal mode)

- Card surface Card #1E3054 on Deep Navy #1A2744 page, Instrument Sans, WCAG 2.2 AA contrast verified including small chip labels.
- Order: (1) photo thumbnail when source is image based, via the 171a signed URL; (2) title row with optional neutral Lucide icon; (3) item list, one row per item, name left, portionLabel right, per item kcal in a muted weight when present; (4) macro chip row, four chips in fixed order Calories, Protein, Carbs, Fats; (5) BOS line when present (172b); (6) acknowledgement line plus actions Confirm, Edit, Split; (7) the standardized 170c FDA disclaimer in the existing disclaimer slot and styling.
- Macro chip palette, derived only from tokens: Calories Teal #2DA5A0, Protein Orange #B75E18, Carbs a lighter desaturated Teal step, Fats a neutral derived from Deep Navy lightened toward the card. No imported competitor palette.

### 5.4 States

analyzing, success, low_confidence, error. Four states only. Microcopy from 172a. The low_confidence and error states use the 170c degraded service messaging when `degradedService` is true. No state ever implies user fault. (Note: a `partial` state was considered and struck in v3 because no upstream signal for "macros without itemization" exists on the analyze response today; if a future analyzer revision adds the signal, a 172 supplement will reintroduce the state.)

### 5.5 Events out

Controlled component:

- `onConfirm()` triggers the save through the existing `/nutrition/log-meal` route.
- `onEdit()` routes to the existing `MealItemEditor` flow.
- `onSplit()` routes through the existing edit and log path; see 172c.
- `onSaveResponse(resp: SaveResponse)` lifts the post-save state machine when `/nutrition/log-meal` returns; the card reactively reveals `mealQualityScore` and the post-save BOS line.

No new write path. The card does not call any mutation directly; it bubbles intent to the orchestrator (`AnalysisResult.tsx`).

### 5.6 Accessibility

WCAG 2.2 AA. Semantic headings, list semantics for items, labelled chips, logical focus, minimum target sizes, color never the sole carrier of meaning. The acknowledgement is announced politely (172c).

### 5.7 Safety mode contract (170c, non negotiable)

When safetyMode is true, the card changes behavior with no visible indicator that the mode is active (no banner, no badge, no different color, per 170c section 8.4):

- Absolute calories and absolute macros are hidden. The macro chip row renders composition ratios (proteinPct, carbsPct, fatsPct) instead of absolute grams and kcal. Per item kcal is suppressed.
- The meal quality score is not shown.
- The BOS line, if any, is the qualitative Bio Optimization delta variant only, non prescriptive (172b).
- The acknowledgement and all state notes use the food positive, non optimization safety mode variants (172a).
- The FDA disclaimer remains present.

The card reads the existing 170c safety mode state. It does not implement its own detection and it does not duplicate the 170c settings or consent flow. It is one more row in the 170c downstream behavioral contract table, alongside 170 base, 170h, 170i, 170j, 170l, 170m.

## 6. File plan

**New, under the existing nutrition surface src/components/nutrition/:**

- `src/components/nutrition/meal-card/MealCard.tsx`
- `src/components/nutrition/meal-card/MealCard.types.ts`
- `src/components/nutrition/meal-card/MacroChips.tsx` (normal and safety mode ratio variants)
- `src/components/nutrition/meal-card/mealCardModel.ts` (maps `MealDraft` pre-save and `SaveResponse.gordon` post-save to the view model)
- `src/lib/nutrition/microcopy/` (172a)
- `src/lib/nutrition/bos-line/` (172b, includes `types.ts` for `BosLine`)
- `src/app/api/nutrition/bos-line/[mealId]/route.ts` (172b read endpoint)
- `src/components/nutrition/thread/` (172c)
- colocated tests per the repo convention

**Touched (integration only):** `AnalysisResult.tsx` (the existing orchestrator that renders the Gordon result) extracts the card body subtree (item list, totals, macro chips, action row) into `MealCard`. `AnalysisResult.tsx` remains the outer orchestrator and continues to own the voice hooks, the plate selector, the corpus opt-in banner, and the confidence badge. No fetch logic moves. The existing `MealItemEditor` remains the edit surface.

**Do not touch:** analyze-text, log-meal, Gordon scoring, the vision cascade, Photo AI, Daily Macros, the meals schema, the 170c safety mode implementation (consumed via `useSafetyMode()`), email templates, or `package.json`.

## 7. Acceptance criteria (master level; 172d holds the full matrix)

- The card renders all four states on mobile and desktop in the same build, token correct, WCAG 2.2 AA.
- Safety mode hides absolutes and shows ratios with no visible mode indicator; verified for every state.
- The standardized 170c FDA disclaimer is present on the card surface, rendered through `<FdaDisclaimer slot="card-footer" />`.
- The card maps from `MealDraft` pre-save and `SaveResponse.gordon` post-save, and reuses the 171a thumbnail (`MealDraft.thumbnail_url`) and 171b portion fields.
- The pre-save plus post-save state machine renders no quality score pre-save and reactively reveals the score on `onSaveResponse`.
- The component is purely presentational. All strings come from 172a. Zero hardcoded user facing strings.
- analyze-text and log-meal contracts are unchanged. No genetic or bioavailability logic is present.
- Tests first and green: each state, pre-save and post-save, normal and safety mode, token and contrast checks, and a string source check.

## 8. Sequencing against the July 1, 2026 launch

172 plus 172a and the visual card (with safety mode honored) are the launch scoped slice and ship via direct push once green. 172b (BOS line) and 172c (thread and acknowledgement) layer on next and ship preview first per 172d. If runway tightens against Arnold body scanning, 172 plus 172a alone deliver the upgraded card and the credible voice without rework, because the card already reserves the bosLine slot and the controlled events.
