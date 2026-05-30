/**
 * Voice apply hook per Prompt 170j §11.4 Apply All + §6.6 Undo.
 *
 * Wraps the operation applicator + undo stack + voice-correction tracking.
 * Captures a snapshot of the items array BEFORE applying so undo can
 * restore via the restoreSnapshot mutator.
 *
 * Composes with useMealItemEdits mutators which the caller provides.
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  MealDraft,
  MealItemDraft,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { VoiceOperation } from '../types';
import {
  applyVoiceOperations,
  type ApplyError,
  type VoiceMutatorHandles,
} from '../apply/operation-applicator';
import { VoiceUndoStack } from '../apply/undo-stack';

export interface VoiceCorrectedFields {
  items: boolean;
  cooking_oils: boolean;
  portions: boolean;
  modifiers: boolean;
}

export interface VoiceApplyState {
  operations_applied: number;
  operations_rejected: number;
  last_apply_at: number | null;
  voice_operation_count: number;
  voice_corrected_fields: VoiceCorrectedFields;
  errors: ApplyError[];
  undo_window_active: boolean;
}

export interface UseVoiceApplyArgs {
  mutators: VoiceMutatorHandles;
  restoreSnapshot: (items: ReadonlyArray<MealItemDraft>) => void;
}

export interface UseVoiceApplyReturn {
  state: VoiceApplyState;
  applyOperations: (operations: VoiceOperation[], draft: MealDraft) => void;
  undoLast: () => boolean;
  reset: () => void;
}

const ZERO_FIELDS: VoiceCorrectedFields = {
  items: false,
  cooking_oils: false,
  portions: false,
  modifiers: false,
};

const INITIAL_STATE: VoiceApplyState = {
  operations_applied: 0,
  operations_rejected: 0,
  last_apply_at: null,
  voice_operation_count: 0,
  voice_corrected_fields: ZERO_FIELDS,
  errors: [],
  undo_window_active: false,
};

export function useVoiceApply({
  mutators,
  restoreSnapshot,
}: UseVoiceApplyArgs): UseVoiceApplyReturn {
  const [state, setState] = useState<VoiceApplyState>(INITIAL_STATE);
  const undoStackRef = useRef<VoiceUndoStack>(new VoiceUndoStack());

  const applyOperations = useCallback(
    (operations: VoiceOperation[], draft: MealDraft): void => {
      const snapshot = [...draft.items];
      const result = applyVoiceOperations(operations, draft, mutators);
      const now = Date.now();

      const appliedOps = operations.slice(0, result.applied);
      undoStackRef.current.push(operations, result.applied, now, snapshot);

      setState((s) => ({
        operations_applied: s.operations_applied + result.applied,
        operations_rejected: s.operations_rejected + result.rejected,
        last_apply_at: now,
        voice_operation_count: s.voice_operation_count + result.applied,
        voice_corrected_fields: mergeCorrectedFields(s.voice_corrected_fields, appliedOps),
        errors: result.errors,
        undo_window_active: result.applied > 0,
      }));
    },
    [mutators]
  );

  const undoLast = useCallback((): boolean => {
    const entry = undoStackRef.current.popWithinWindow();
    if (!entry?.snapshot) return false;
    restoreSnapshot(entry.snapshot);
    setState((s) => ({
      ...s,
      undo_window_active: false,
      voice_operation_count: Math.max(0, s.voice_operation_count - entry.applied_count),
    }));
    return true;
  }, [restoreSnapshot]);

  const reset = useCallback((): void => {
    undoStackRef.current.clear();
    setState(INITIAL_STATE);
  }, []);

  return useMemo(
    () => ({ state, applyOperations, undoLast, reset }),
    [state, applyOperations, undoLast, reset]
  );
}

function mergeCorrectedFields(
  current: VoiceCorrectedFields,
  ops: VoiceOperation[]
): VoiceCorrectedFields {
  const next = { ...current };
  for (const op of ops) {
    switch (op.op_kind) {
      case 'add_item':
      case 'remove_item':
        next.items = true;
        break;
      case 'modify_item_portion':
      case 'change_meal_portion':
        next.portions = true;
        break;
      case 'modify_item_cooking_method':
      case 'add_modifier':
      case 'remove_modifier':
        next.modifiers = true;
        break;
      case 'add_cooking_oil':
      case 'remove_cooking_oil':
        next.cooking_oils = true;
        break;
      case 'modify_chain_customization':
        next.items = true;
        break;
      case 'undo_last':
        break;
    }
  }
  return next;
}
