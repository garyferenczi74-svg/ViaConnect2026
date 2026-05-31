# Prompt 170n OQ3: Hannah Collective Quantifier Validation Memo

Date: 2026-05-31
Reviewer: Hannah (Nutrition + Genomics + UX agent)
Source under review: `docs/prompts/prompt-170n-haiku-system-prompt-draft-2026-05-31.md` §4.5
Inherited canonical: `src/lib/nutrition/quick-log/haiku-system-prompt.ts` §3.4 + §4.1
Dispatch reference: Gary signed off on OQ1 + OQ2 + OQ4 + OQ5; OQ3 explicitly routed to Hannah for validation.

## §0 Critical drift flag (raise before §1)

Gordon's 170n §4.5 silently changes the 170m text-native behavior for "a few". 170m §4.1 treats "a few" as a hard clarification trigger (no default). 170n maps it to count=3 at 0.75. The geometric-mean math then keeps it Medium-chip-shippable for any STT span >= 0.36, so the user will never see a clarification chip for "a few crackers" on voice. That is a real product divergence between text-Quick-Log and voice-native, not a normalization detail.

I do not object to the divergence in principle: voice users hate clarification interrupts, and the Medium chip is a legitimate softer surface. But Gary should explicitly bless that the voice-native parser is more permissive on collective quantifiers than the typed parser. If Gary wants symmetry, every quantifier below should clarify instead of default.

Recommendations in §1-§5 below assume Gary blesses the divergence.

## §1 Validation verdict per quantifier

| Quantifier | Gordon | Verdict | Reason |
|---|---|---|---|
| "a couple of" | 2 @ 0.90 | KEEP | "Couple" anchors to integer 2. High-confidence ship appropriate. |
| "a few" | 3 @ 0.75 | KEEP count, RAISE conf to 0.78 | User mental model centers on 3 (range 2-4); 0.75 under-confident, 0.78 moves away from clarification floor. |
| "several" | 4 @ 0.65 | REVISE -> 5 @ 0.60 | "Several" skews higher than "a few"; modal mental-model anchor is 5 (range 4-7). |
| "a bunch of" | 5 @ 0.55 | REVISE -> CLARIFY (no default) | Food-dependent variance too wide: "bunch of grapes" 80g vs "bunch of fries" 300g. Clarify with chips. |
| "a handful of" nuts 28g + berries 40g + popcorn 8g | inherit | REVISE - see §1.1 | Nuts 28g correct; berries 70g not 40g; popcorn 14g not 8g; extend list. |
| "lots of", "a ton of", "loads of" | clarify | KEEP | Correct posture; hyperbolic not quantitative. |

### §1.1 Handful calibration

- **Nuts 28g**: KEEP. FDA labeling-standard 1 oz handful.
- **Berries 40g**: REVISE to 70g. A small handful of blueberries is ~60-80g (about 1/2 cup); 40g is measuring-cup output, not hand output.
- **Popcorn 8g**: REVISE to 14g. 8g is half a cup air-popped; a real handful is closer to 1 cup (14g air-popped or 25g if buttered movie-style).

### §1.2 Foods to ADD to the handful map

The 170m list is too short. Voice users grab handfuls of many things typed users do not type as "a handful":

| Food | Handful default | Rationale |
|---|---|---|
| chips (potato/tortilla) | 14g | Half-ounce, ~7-10 chips |
| pretzels | 14g | ~7 small twist pretzels |
| crackers | 14g | Matches "a few crackers" default |
| grapes | 80g | One small cluster, ~15 grapes |
| trail mix | 30g | Slightly heavier than nuts due to fruit + chocolate |
| dried fruit (raisins, cranberries) | 20g | Calorie-dense; portion controls matter |
| cereal (dry, eaten dry) | 18g | Voice users do say "a handful of Cheerios" |
| M&Ms / chocolate chips / small candy | 20g | One mini-bag worth, ~14 pieces |
| Goldfish / Cheez-Its / Pirate's Booty | 14g | Same as crackers |
| spinach / arugula (raw greens, eaten by hand off a salad) | 15g | Edge case but valid for "a handful of greens" |

## §2 Recommended final §4.5 table for Gordon's draft

```
4.5 Approximation handling for collective quantifiers. Spoken collective
    quantifiers map to default counts at reduced confidence:

  "a couple of" -> 2 at confidence 0.90 (high)
  "a few" -> 3 at confidence 0.78 (medium-high)
  "several" -> 5 at confidence 0.60 (low-medium)
  "a bunch of" -> clarify; no default (food-dependent variance too wide)
  "a handful of" -> food-dependent default per the canonical handful map:
      nuts 28g, trail mix 30g, grapes 80g, berries 70g, popcorn 14g,
      chips 14g, pretzels 14g, crackers 14g, dried fruit 20g,
      small candy 20g, dry cereal 18g, raw greens 15g;
      otherwise clarify with portion chips.
  "lots of", "a ton of", "loads of" -> clarify; no default

  All collective-quantifier defaults DROP per-item NLU confidence by an
  additional 0.05 when the source food does not appear in the handful map
  even if the quantifier itself has a default count.
```

## §3 Voice-specific quantifiers to ADD beyond Gordon's list

| Quantifier | Default behavior | Confidence | Notes |
|---|---|---|---|
| "a smidge of", "a smidgen", "a tad", "a tad bit" | spices 0.5g, spreads 5g, sauces 8g, dressings 5g | 0.65 | Very small portions. Food-class lookup, not single number. |
| "a touch of", "a hint of", "a splash of" | spreads 3g, dressings 8g, sauces 6g, liquids 15g | 0.65 | "Splash" routes specifically to liquids. |
| "a tiny bit of", "a little bit of", "a little" | spreads 8g, sauces 10g, otherwise 0.5x of Rule 3.4 default | 0.70 | "A little chicken" -> half the 3oz portion (~42g). |
| "a big plate of", "a big bowl of", "a big serving of" | 1.5x of Rule 3.4 default | 0.70 | Cap absolute at 4000g under the 5000g hard ceiling. |
| "the whole thing", "the entire X" | Package context: full OFF serving x portion count if available; otherwise clarify | 0.55 | Pair with branded_product_hints. |
| "a portion of", "a serving of" | FDA standard serving per food class (= Rule 3.4 default, no scaling) | 0.85 | These are FDA labeling primitives; treat as explicit, not approximate. |
| "half of a", "half a" | 0.5x of Rule 3.4 default | 0.90 | Already covered by §4.6 numeral map; verify food-portion interpretation. |
| "a slice of" (non-bread) | Rule 3.4 default for that food's slice (pizza 107g, pie 125g, cake 80g, melon 152g) | 0.85 | Confirm 170m has all of these. |

NOT adding "a piece of" - too ambiguous; defer to 170m §3.4 piece logic.

## §4 170c safety mode quantifier downshift recommendation

When `QUICK_LOG_SAFETY_MODE_ENABLED=true` (post-170c ratification), defaults that lean over-portion should shift DOWN. Clinical rationale: in eating-disorder recovery, the parser erring small lets the user upward-correct (smaller distress event than under-correcting a parser that erred large). Over-portion estimates also feed false-alarm flags downstream and risk reinforcing restrictive behavior.

Recommended safety-mode shifts (only apply when flag is on):

| Quantifier | Default count | Safety-mode count | Reason |
|---|---|---|---|
| "a couple of" | 2 | 2 | No change; already the floor. |
| "a few" | 3 | 2 | Shift to the low end of the user-mental-model band. |
| "several" | 5 | 3 | Substantive downshift. |
| "a bunch of" | clarify | clarify | No change; already clarifying. |
| "a handful of" nuts | 28g | 20g | Nut handful safety floor. |
| "a handful of" chips/crackers/pretzels | 14g | 10g | Snack-food safety floor. |
| "a big plate of" / "big bowl of" | 1.5x | 1.0x | Disable upscale entirely. Treat as standard portion. |
| "the whole thing" | full package | clarify | Disable package-eaten default; force chip interaction. |
| "lots of", "a ton of" | clarify | clarify (no change) | Already clarifying. |

Safety mode shifts should NOT change confidence scores - only the count. Lower confidence on a smaller default would over-clarify, defeating the purpose. Do not surface to the user that safety mode is changing the math; downshift is invisible and the clarification UI stays the same.

Implementation note: 170c not yet ratified. Gate the safety-mode table behind a typed feature flag the system prompt references conditionally, e.g.:

```
If the runtime flag QUICK_LOG_SAFETY_MODE_ENABLED is true, override Section 4.5
with the safety-mode quantifier table at the system prompt construction step.
```

This means `buildVoiceNativeSystemPrompt({ safetyMode: boolean })` builds two prompt variants from one source - same pattern as `buildQuickLogSystemPrompt` uses for `appliedClarifications`.

## §5 Open follow-up questions for Phase 1b / post-launch monitoring

1. **Empirical recalibration of "several" -> 5.** Field-experience-grounded but not data-validated. Phase 1b A/B "several -> 4" vs "several -> 5" on the 1,000-recording test set.

2. **Handful map completeness.** Phase 1b should mine the 170j voice-edit transcript corpus for "handful" mentions and surface any food I missed at frequency >=0.5% of handful occurrences.

3. **Safety-mode shift validation.** Monitor edit-after-parse rate specifically for safety-mode users to confirm "big plate of" 1.0x doesn't create the opposite problem.

4. **STT-collision audit on "a few" vs "a view" / "of you".** STT engines occasionally transcribe "a few" as "a view" or "of you" or "for you" depending on speaker pace. Phase 1b add edit-distance-1 normalization pass on these three.

5. **"A portion of" / "a serving of" FDA anchor precedence.** Confirm: OFF wins for branded products, Rule 3.4 wins for generic foods. Make precedence explicit in the prompt.

6. **Cross-language "handful" calibration.** ESL Spanish-first "un punado" similar size; Mandarin "yi ba" somewhat smaller. Monitor per-speaker portion-error skew; link to Gordon's speaker-fairness 8-percentage-point target.

## Phase 1a clearance

**NOT CLEAR for Phase 1a TypeScript conversion as-drafted.** Gordon's draft is solid on every other axis (Sections 1-3, 5-12 inherit cleanly, Section 9 calibration is well-reasoned, the 12 few-shot examples are well-chosen), but OQ3 §4.5 needs the revisions in §2 above plus the additions in §3, the §0 divergence needs Gary's blessing, and the §4 safety-mode variant needs to be designed in BEFORE TS conversion so we don't bolt it on later.

Estimated rework: 1-2 hours for Gordon to integrate; clearance contingent on those changes landing in the draft and Gary explicitly ratifying §0.
