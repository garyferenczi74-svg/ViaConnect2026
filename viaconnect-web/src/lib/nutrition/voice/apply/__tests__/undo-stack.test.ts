/**
 * Unit tests for the voice undo stack per Prompt 170j §6.6.
 */

import { describe, it, expect } from 'vitest';
import { VoiceUndoStack } from '../undo-stack';
import { UNDO_WINDOW_MS } from '../../feature-flags';
import type { VoiceOperation } from '../../types';

function makeOp(): VoiceOperation {
  return {
    op_kind: 'remove_item',
    confidence: 0.95,
    natural_language_preview: 'remove bread',
    target_food: 'bread',
  };
}

describe('VoiceUndoStack', () => {
  it('starts empty', () => {
    const stack = new VoiceUndoStack();
    expect(stack.size).toBe(0);
    expect(stack.peek()).toBeNull();
    expect(stack.popWithinWindow()).toBeNull();
  });

  it('returns the most recent entry within the window', () => {
    const stack = new VoiceUndoStack();
    const now = Date.now();
    stack.push([makeOp()], 1, now);
    const entry = stack.popWithinWindow(now + 100);
    expect(entry).not.toBeNull();
    expect(entry?.applied_count).toBe(1);
  });

  it('returns null after the window has elapsed', () => {
    const stack = new VoiceUndoStack();
    const now = Date.now();
    stack.push([makeOp()], 1, now);
    const entry = stack.popWithinWindow(now + UNDO_WINDOW_MS + 1);
    expect(entry).toBeNull();
  });

  it('pops the entry even when outside the window so stale entries do not accumulate', () => {
    const stack = new VoiceUndoStack();
    const now = Date.now();
    stack.push([makeOp()], 1, now);
    expect(stack.size).toBe(1);
    stack.popWithinWindow(now + UNDO_WINDOW_MS + 1);
    expect(stack.size).toBe(0);
  });

  it('preserves the snapshot across push and pop', () => {
    const stack = new VoiceUndoStack();
    const now = Date.now();
    const snapshot = [
      {
        id: 'a',
        food_name: 'rice',
        portion_grams: 100,
        nutrient_source: 'usda_fdc' as const,
        per_100g: { calories_kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 },
        calories_kcal: 130,
        protein_g: 2.7,
        carbs_g: 28,
        fat_g: 0.3,
        user_modified: false,
        confidence_band: 'medium' as const,
      },
    ];
    stack.push([makeOp()], 1, now, snapshot);
    const entry = stack.popWithinWindow(now);
    expect(entry?.snapshot).toEqual(snapshot);
  });

  it('reports remaining window time', () => {
    const stack = new VoiceUndoStack();
    const now = Date.now();
    stack.push([makeOp()], 1, now);
    const remaining = stack.remainingMsInWindow(now + 3000);
    expect(remaining).toBe(UNDO_WINDOW_MS - 3000);
  });

  it('returns zero remaining when stack is empty', () => {
    const stack = new VoiceUndoStack();
    expect(stack.remainingMsInWindow()).toBe(0);
  });

  it('returns zero remaining after window elapses', () => {
    const stack = new VoiceUndoStack();
    const now = Date.now();
    stack.push([makeOp()], 1, now);
    expect(stack.remainingMsInWindow(now + UNDO_WINDOW_MS + 5000)).toBe(0);
  });

  it('isWithinUndoWindow reports correctly', () => {
    const stack = new VoiceUndoStack();
    const now = Date.now();
    stack.push([makeOp()], 1, now);
    expect(stack.isWithinUndoWindow(now + 1000)).toBe(true);
    expect(stack.isWithinUndoWindow(now + UNDO_WINDOW_MS + 1)).toBe(false);
  });

  it('clear empties the stack', () => {
    const stack = new VoiceUndoStack();
    stack.push([makeOp()], 1);
    stack.push([makeOp()], 1);
    expect(stack.size).toBe(2);
    stack.clear();
    expect(stack.size).toBe(0);
  });
});
