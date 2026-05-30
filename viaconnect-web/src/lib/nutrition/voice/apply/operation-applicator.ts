/**
 * Operation applicator for Prompt 170j voice edits per §11.4 Apply All.
 *
 * Takes a parsed array of voice operations + the current meal draft + a set
 * of mutator handles, and applies operations in array order. Operations
 * that fail to find their target are reported but do not block subsequent
 * operations.
 *
 * Phase 1b handles 8 of 11 operation kinds inline:
 *   remove_item, modify_item_portion, modify_item_cooking_method,
 *   add_cooking_oil, remove_cooking_oil, change_meal_portion,
 *   add_modifier, remove_modifier
 *
 * Deferred:
 *   add_item: needs /api/nutrition/foods/search round trip (Phase 1c)
 *   modify_chain_customization: needs Prompt 170e shipped
 *   undo_last: handled by VoiceUndoStack at orchestration layer
 */

import type {
  MealDraft,
  MealItemDraft,
  ModifierChip as DraftModifierChip,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { CookingOilSelection } from '@/lib/nutrition/cooking-oil/types';
import type { VoiceOperation, ModifierChip, OilType } from '../types';

export interface VoiceMutatorHandles {
  setPortion: (itemId: string, grams: number) => void;
  setCookingOil: (itemId: string, selection: CookingOilSelection) => void;
  applyChip: (itemId: string | 'meal', chip: DraftModifierChip) => void;
  removeChip: (itemId: string | 'meal', chip: DraftModifierChip) => void;
  removeItem: (itemId: string) => void;
}

export interface ApplyResult {
  applied: number;
  rejected: number;
  errors: ApplyError[];
}

export interface ApplyError {
  op: VoiceOperation;
  reason: 'target_not_found' | 'unsupported_op' | 'invalid_input' | 'mutator_threw';
  message: string;
}

const KNOWN_CHIP_VALUES = new Set<ModifierChip>([
  'butter',
  'cream',
  'cheese',
  'sauce',
  'grilled',
  'baked',
  'raw',
]);

export function applyVoiceOperations(
  operations: VoiceOperation[],
  draft: MealDraft,
  mutators: VoiceMutatorHandles
): ApplyResult {
  let applied = 0;
  let rejected = 0;
  const errors: ApplyError[] = [];

  for (const op of operations) {
    try {
      const handled = applyOne(op, draft, mutators);
      if (handled === 'applied') {
        applied++;
      } else if (handled === 'skipped') {
        rejected++;
      } else {
        errors.push({ op, reason: handled.reason, message: handled.message });
        rejected++;
      }
    } catch (err) {
      errors.push({
        op,
        reason: 'mutator_threw',
        message: err instanceof Error ? err.message : String(err),
      });
      rejected++;
    }
  }

  return { applied, rejected, errors };
}

type ApplyOneResult =
  | 'applied'
  | 'skipped'
  | { reason: ApplyError['reason']; message: string };

function applyOne(
  op: VoiceOperation,
  draft: MealDraft,
  m: VoiceMutatorHandles
): ApplyOneResult {
  switch (op.op_kind) {
    case 'remove_item': {
      const item = findItemByName(draft.items, op.target_food);
      if (!item) {
        return { reason: 'target_not_found', message: `No item matching "${op.target_food}"` };
      }
      m.removeItem(item.id);
      return 'applied';
    }
    case 'modify_item_portion': {
      const item = findItemByName(draft.items, op.target_food);
      if (!item) {
        return { reason: 'target_not_found', message: `No item matching "${op.target_food}"` };
      }
      m.setPortion(item.id, op.new_portion_grams);
      return 'applied';
    }
    case 'modify_item_cooking_method': {
      const item = findItemByName(draft.items, op.target_food);
      if (!item) {
        return { reason: 'target_not_found', message: `No item matching "${op.target_food}"` };
      }
      const chipMethod = mapCookingMethodToChip(op.new_cooking_method);
      if (!chipMethod) {
        return {
          reason: 'unsupported_op',
          message: `Cooking method "${op.new_cooking_method}" not in v1 chip system`,
        };
      }
      m.applyChip(item.id, chipMethod);
      return 'applied';
    }
    case 'add_cooking_oil': {
      const item = findItemByName(draft.items, op.target_food);
      if (!item) {
        return { reason: 'target_not_found', message: `No item matching "${op.target_food}"` };
      }
      m.setCookingOil(item.id, buildCookingOilSelection(op.oil_type, op.amount_ml));
      return 'applied';
    }
    case 'remove_cooking_oil': {
      const item = findItemByName(draft.items, op.target_food);
      if (!item) {
        return { reason: 'target_not_found', message: `No item matching "${op.target_food}"` };
      }
      m.setCookingOil(item.id, buildCookingOilSelection('none', 0));
      return 'applied';
    }
    case 'change_meal_portion': {
      if (op.multiplier <= 0) {
        return { reason: 'invalid_input', message: 'Multiplier must be positive' };
      }
      for (const item of draft.items) {
        m.setPortion(item.id, Math.round(item.portion_grams * op.multiplier));
      }
      return 'applied';
    }
    case 'add_modifier': {
      if (!isKnownChip(op.modifier_chip)) {
        return {
          reason: 'unsupported_op',
          message: `Modifier "${op.modifier_chip}" not in v1 chip system; dietary modifiers filed for 170j-supplement`,
        };
      }
      const target = resolveChipTarget(op.target_food, draft.items);
      if (target === null) {
        return { reason: 'target_not_found', message: `No item matching "${op.target_food}"` };
      }
      m.applyChip(target, op.modifier_chip as DraftModifierChip);
      return 'applied';
    }
    case 'remove_modifier': {
      if (!isKnownChip(op.modifier_chip)) {
        return {
          reason: 'unsupported_op',
          message: `Modifier "${op.modifier_chip}" not in v1 chip system`,
        };
      }
      const target = resolveChipTarget(op.target_food, draft.items);
      if (target === null) {
        return { reason: 'target_not_found', message: `No item matching "${op.target_food}"` };
      }
      m.removeChip(target, op.modifier_chip as DraftModifierChip);
      return 'applied';
    }
    case 'add_item':
      return {
        reason: 'unsupported_op',
        message: 'add_item handled at orchestration layer (Phase 1c food search integration)',
      };
    case 'modify_chain_customization':
      return {
        reason: 'unsupported_op',
        message: 'modify_chain_customization requires Prompt 170e (not yet shipped)',
      };
    case 'undo_last':
      return 'skipped';
    default: {
      const _exhaustive: never = op;
      void _exhaustive;
      return { reason: 'unsupported_op', message: 'unknown op_kind' };
    }
  }
}

function findItemByName(
  items: ReadonlyArray<MealItemDraft>,
  needle: string
): MealItemDraft | undefined {
  const normalized = needle.trim().toLowerCase();
  if (!normalized) return undefined;
  const exact = items.find((it) => it.food_name.toLowerCase() === normalized);
  if (exact) return exact;
  return items.find((it) => {
    const itemName = it.food_name.toLowerCase();
    return itemName.includes(normalized) || normalized.includes(itemName);
  });
}

function mapCookingMethodToChip(method: string): DraftModifierChip | null {
  if (method === 'grilled') return 'grilled';
  if (method === 'baked') return 'baked';
  if (method === 'raw') return 'raw';
  return null;
}

function isKnownChip(value: string): value is ModifierChip {
  return KNOWN_CHIP_VALUES.has(value as ModifierChip);
}

function resolveChipTarget(
  target: string,
  items: ReadonlyArray<MealItemDraft>
): string | 'meal' | null {
  const trimmed = target.trim().toLowerCase();
  if (trimmed === 'meal' || trimmed === 'whole meal' || trimmed === 'overall') {
    return 'meal';
  }
  const item = findItemByName(items, target);
  return item ? item.id : null;
}

function buildCookingOilSelection(
  type: OilType | 'none',
  amount_ml: number
): CookingOilSelection {
  return {
    type,
    amount_ml,
    was_suggested_default: false,
    suggested_default_type: 'none',
    suggested_default_amount_ml: 0,
  };
}
