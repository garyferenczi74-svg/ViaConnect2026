/**
 * Voice operation taxonomy for the NutriVision result review screen.
 * 11 operation kinds per Prompt 170j §5.
 *
 * Voice operates on the meal draft from the analyze response.
 * Each operation maps to an existing tap-edit path so the data layer is unchanged.
 */

export type OperationKind =
  | 'add_item'
  | 'remove_item'
  | 'modify_item_portion'
  | 'modify_item_cooking_method'
  | 'add_cooking_oil'
  | 'remove_cooking_oil'
  | 'change_meal_portion'
  | 'add_modifier'
  | 'remove_modifier'
  | 'modify_chain_customization'
  | 'undo_last';

export type CookingMethod =
  | 'grilled'
  | 'baked'
  | 'raw'
  | 'fried'
  | 'pan_fried'
  | 'steamed'
  | 'boiled'
  | 'roasted';

/**
 * Aligned with the existing CookingOilType enum in
 * src/lib/nutrition/cooking-oil/suggester.ts so voice ops can produce
 * valid CookingOilSelection rows without translation.
 */
export type OilType =
  | 'olive_oil'
  | 'evoo'
  | 'avocado_oil'
  | 'coconut_oil'
  | 'butter'
  | 'ghee'
  | 'vegetable_canola_oil'
  | 'sesame_oil';

/**
 * Aligned with the existing useMealItemEdits chip system.
 * Voice AddModifier and RemoveModifier target these 7 chips.
 * Dietary modifiers (spicy, dairy_free, gluten_free, vegan, vegetarian,
 * paleo, keto) are filed for 170j-supplement; voice users saying those
 * terms trigger the clarification flow per §4.5.
 */
export type ModifierChip =
  | 'butter'
  | 'cream'
  | 'cheese'
  | 'sauce'
  | 'grilled'
  | 'baked'
  | 'raw';

export interface MacroImpactEstimate {
  calories_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

interface BaseOperation {
  op_kind: OperationKind;
  confidence: number;
  natural_language_preview: string;
  macro_impact_estimate?: MacroImpactEstimate;
}

export interface AddItemOperation extends BaseOperation {
  op_kind: 'add_item';
  food_name: string;
  portion_grams: number;
  cooking_method?: CookingMethod;
  nutrient_source_hint?: 'auto' | 'curated' | 'usda';
}

export interface RemoveItemOperation extends BaseOperation {
  op_kind: 'remove_item';
  target_food: string;
}

export interface ModifyItemPortionOperation extends BaseOperation {
  op_kind: 'modify_item_portion';
  target_food: string;
  new_portion_grams: number;
}

export interface ModifyItemCookingMethodOperation extends BaseOperation {
  op_kind: 'modify_item_cooking_method';
  target_food: string;
  new_cooking_method: CookingMethod;
}

export interface AddCookingOilOperation extends BaseOperation {
  op_kind: 'add_cooking_oil';
  target_food: string;
  oil_type: OilType;
  amount_ml: number;
  amount_label: string;
}

export interface RemoveCookingOilOperation extends BaseOperation {
  op_kind: 'remove_cooking_oil';
  target_food: string;
  oil_type: OilType | 'all';
}

export interface ChangeMealPortionOperation extends BaseOperation {
  op_kind: 'change_meal_portion';
  multiplier: number;
}

export interface AddModifierOperation extends BaseOperation {
  op_kind: 'add_modifier';
  target_food: string;
  modifier_chip: ModifierChip;
}

export interface RemoveModifierOperation extends BaseOperation {
  op_kind: 'remove_modifier';
  target_food: string;
  modifier_chip: ModifierChip;
}

export interface ModifyChainCustomizationOperation extends BaseOperation {
  op_kind: 'modify_chain_customization';
  slot_key: string;
  new_option: string;
}

export interface UndoLastOperation extends BaseOperation {
  op_kind: 'undo_last';
}

export type VoiceOperation =
  | AddItemOperation
  | RemoveItemOperation
  | ModifyItemPortionOperation
  | ModifyItemCookingMethodOperation
  | AddCookingOilOperation
  | RemoveCookingOilOperation
  | ChangeMealPortionOperation
  | AddModifierOperation
  | RemoveModifierOperation
  | ModifyChainCustomizationOperation
  | UndoLastOperation;

export interface NLUParseResult {
  operations: VoiceOperation[];
  needs_clarification: boolean;
  clarification_question: string | null;
  ambiguous_targets: string[];
  nlu_latency_ms: number;
  nlu_provider_used: 'claude_haiku_4_5';
}

export type SessionOutcome =
  | 'applied'
  | 'partial_applied'
  | 'cancelled'
  | 'error'
  | 'timeout';

export type OperationOutcome =
  | 'applied'
  | 'rejected'
  | 'clarification_needed'
  | 'disambiguation_resolved'
  | 'failed';

export type VoiceErrorClass =
  | 'no_speech_detected'
  | 'stt_confidence_too_low'
  | 'no_operations_matched'
  | 'nlu_service_unavailable'
  | 'microphone_permission_denied'
  | 'network_error';

export type DeviceKind = 'ios' | 'android' | 'web_desktop' | 'web_mobile';

export type STTProvider =
  | 'web_speech_api'
  | 'capacitor_native'
  | 'gemini_audio'
  | 'claude_audio';

export interface VoiceSessionTelemetry {
  user_hash: string;
  meal_id: string | null;
  stt_provider: STTProvider;
  stt_latency_ms: number | null;
  nlu_latency_ms: number | null;
  operations_count: number;
  operations_applied_count: number;
  operations_rejected_count: number;
  required_clarification: boolean;
  used_quick_apply_mode: boolean;
  session_outcome: SessionOutcome;
  error_class: VoiceErrorClass | null;
  device_kind: DeviceKind;
}

export interface VoiceOperationTelemetry {
  session_id: string;
  op_kind: OperationKind;
  confidence: number;
  outcome: OperationOutcome;
  parse_success: boolean;
  apply_latency_ms: number | null;
  was_undone: boolean;
}

export interface UndoEntry {
  applied_at: number;
  operations: VoiceOperation[];
  applied_count: number;
}
