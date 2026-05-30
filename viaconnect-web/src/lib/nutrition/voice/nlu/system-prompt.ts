/**
 * Construction of the Claude Haiku 4.5 system prompt for NLU parsing
 * of voice transcripts into structured operations per Prompt 170j §4.2.
 *
 * The system prompt embeds:
 *  - The 11-operation taxonomy
 *  - The current meal draft state
 *  - Cooking oil context resolution rules (§4.4)
 *  - Disambiguation rules (§4.5)
 *  - Strict JSON output schema
 */

import type { OperationKind } from '../types';

interface MealDraftSnapshotItem {
  food_name: string;
  portion_grams: number;
  cooking_method?: string;
  cooking_oil?: { oil_type: string; amount_ml: number } | null;
}

interface MealDraftSnapshot {
  items: MealDraftSnapshotItem[];
  restaurant_context: { chain_slug: string; chain_name: string } | null;
  modifiers: string[];
  total_kcal: number;
}

const OPERATION_TAXONOMY_GUIDE = `
You parse short English voice utterances from a user editing a logged meal.
You output JSON only, with no prose and no markdown code fences.

The 11 supported operation kinds:
  add_item: user adds a food item to the meal
  remove_item: user removes a food item from the meal
  modify_item_portion: user changes portion grams of a specific item (absolute "150 grams" or relative "double", "half")
  modify_item_cooking_method: user changes how an item was cooked
  add_cooking_oil: user adds a cooking oil context to one or more items
  remove_cooking_oil: user removes a cooking oil context
  change_meal_portion: user scales the entire meal by a multiplier ("half a portion", "twice as much")
  add_modifier: user adds a meal modifier chip (spicy, dairy_free, gluten_free, etc.)
  remove_modifier: user removes a meal modifier chip
  modify_chain_customization: user changes a chain restaurant customization slot (chain meal only)
  undo_last: user says "undo that" or "never mind"
`.trim();

const COOKING_OIL_CONTEXT_RULES = `
Cooking oil context resolution (load-bearing):
  "Add 2 tablespoons olive oil" with no specific target = add_cooking_oil targeting the most plausibly-cooked item in the meal (the chicken if cooked, the salad if dressed). If multiple plausible targets, return needs_clarification=true with ambiguous_targets array.
  "Add olive oil to the chicken" = add_cooking_oil with target_food="chicken".
  "Add a serving of olive oil as a separate food" = add_item with food_name="olive oil" (rare).
  amount_label is the exact spoken phrase: "2 tablespoons", "a drizzle", "1 teaspoon".
  amount_ml is the numeric conversion: 2 tablespoons = 30 ml, 1 tablespoon = 15 ml, 1 teaspoon = 5 ml, drizzle = 10 ml, splash = 5 ml.
`.trim();

const DISAMBIGUATION_RULES = `
When ambiguous, do NOT guess. Set needs_clarification=true with a clear clarification_question:
  "Remove the meat" with both chicken and beef present: question="There's both chicken and beef. Which should I remove?", ambiguous_targets=["chicken","beef"].
  "Add the bread" when no bread is in the meal: question="I didn't see bread in the meal. Should I add it?".
  If the food name does not match any item in the meal_draft AND the operation requires a target, ask.
  If amount is unclear ("more olive oil"): question="How much olive oil should I add?".
`.trim();

const CONFIDENCE_GUIDE = `
Set confidence per operation in the range 0 to 1:
  0.95 or higher: explicit, unambiguous (e.g., "remove the bread" with bread present).
  0.80 to 0.95: clear intent but minor ambiguity (vague portion, generic food name matched specifically).
  0.50 to 0.80: interpretation possible but not certain.
  Below 0.50: do NOT emit the operation; set needs_clarification=true instead.

confidence is your self-assessment of parse certainty, not the user's certainty.
`.trim();

const OUTPUT_SCHEMA_GUIDE = `
Output JSON shape (strict):
{
  "operations": [
    {
      "op_kind": "<one of the 11 kinds above>",
      "confidence": 0.92,
      "natural_language_preview": "Add 2 tablespoons of olive oil to the chicken",
      "macro_impact_estimate": { "calories_kcal": 240, "fat_g": 27 },
      "...op-specific fields..."
    }
  ],
  "needs_clarification": false,
  "clarification_question": null,
  "ambiguous_targets": []
}

When needs_clarification is true, operations should be an empty array.
Maximum 5 operations per utterance. If more, set needs_clarification=true asking the user to break it up.
`.trim();

export interface BuildSystemPromptOptions {
  mealDraft: MealDraftSnapshot;
  locale?: string;
}

export function buildHaikuSystemPrompt({
  mealDraft,
  locale = 'en-US',
}: BuildSystemPromptOptions): string {
  const draftSummary = renderMealDraftForPrompt(mealDraft);
  return [
    OPERATION_TAXONOMY_GUIDE,
    '',
    'CURRENT MEAL DRAFT:',
    draftSummary,
    '',
    COOKING_OIL_CONTEXT_RULES,
    '',
    DISAMBIGUATION_RULES,
    '',
    CONFIDENCE_GUIDE,
    '',
    OUTPUT_SCHEMA_GUIDE,
    '',
    `LOCALE: ${locale}. Interpret amount and food names in that locale.`,
  ].join('\n');
}

function renderMealDraftForPrompt(draft: MealDraftSnapshot): string {
  const itemLines = draft.items
    .map((item, index) => {
      const oil = item.cooking_oil
        ? ` (cooked with ${item.cooking_oil.oil_type} ${item.cooking_oil.amount_ml}ml)`
        : '';
      const method = item.cooking_method ? `, ${item.cooking_method}` : '';
      return `  ${index + 1}. ${item.food_name}: ${item.portion_grams}g${method}${oil}`;
    })
    .join('\n');

  const restaurant = draft.restaurant_context
    ? `\nRestaurant: ${draft.restaurant_context.chain_name} (chain)`
    : '';

  const modifiers = draft.modifiers.length
    ? `\nMeal modifiers: ${draft.modifiers.join(', ')}`
    : '';

  return `Total: ${draft.total_kcal} kcal${restaurant}${modifiers}\nItems:\n${itemLines}`;
}

export function buildHaikuUserMessage(transcript: string): string {
  return `User said: "${transcript}"\n\nParse into structured operations per the system prompt.`;
}

export const SUPPORTED_OPERATION_KINDS: ReadonlyArray<OperationKind> = [
  'add_item',
  'remove_item',
  'modify_item_portion',
  'modify_item_cooking_method',
  'add_cooking_oil',
  'remove_cooking_oil',
  'change_meal_portion',
  'add_modifier',
  'remove_modifier',
  'modify_chain_customization',
  'undo_last',
] as const;
