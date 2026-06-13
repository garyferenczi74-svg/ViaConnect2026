// Gary (2026-06-13): tests for the pending meal deletes registry, the fix for
// the remove then readds bug on the My Nutrition Log Today's meals card. The
// registry holds meal IDs that are optimistically removed but not yet committed
// server side, and useUserMeals filters them out of every result so a refetch
// during the 5 second undo window cannot resurrect a removed meal.
//
// The getSnapshot reference contract is the load bearing part: a NEW reference on
// every change (so useSyncExternalStore re-renders) and a STABLE one between
// changes (so it does not loop). These tests pin both.

import { describe, it, expect, beforeEach } from 'vitest';
import { pendingMealDeletes } from '../pendingMealDeletes';

describe('pendingMealDeletes', () => {
  beforeEach(() => {
    // Module level singleton: clear any residue so tests do not leak into each other.
    for (const id of [...pendingMealDeletes.getSnapshot()]) pendingMealDeletes.remove(id);
  });

  it('add marks a meal pending and has() reports it', () => {
    pendingMealDeletes.add('m1');
    expect(pendingMealDeletes.has('m1')).toBe(true);
  });

  it('remove clears a pending meal', () => {
    pendingMealDeletes.add('m1');
    pendingMealDeletes.remove('m1');
    expect(pendingMealDeletes.has('m1')).toBe(false);
  });

  it('getSnapshot returns a NEW reference on change and a STABLE one between changes', () => {
    const before = pendingMealDeletes.getSnapshot();
    pendingMealDeletes.add('m1');
    const after = pendingMealDeletes.getSnapshot();
    expect(after).not.toBe(before); // changed: new ref so useSyncExternalStore re-renders
    expect(pendingMealDeletes.getSnapshot()).toBe(after); // unchanged: stable ref, no loop
  });

  it('add is idempotent and does not publish when the id is already pending', () => {
    pendingMealDeletes.add('m1');
    const ref = pendingMealDeletes.getSnapshot();
    pendingMealDeletes.add('m1');
    expect(pendingMealDeletes.getSnapshot()).toBe(ref); // no spurious new reference
  });

  it('ignores an empty id', () => {
    pendingMealDeletes.add('');
    expect(pendingMealDeletes.has('')).toBe(false);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    let calls = 0;
    const unsubscribe = pendingMealDeletes.subscribe(() => {
      calls += 1;
    });
    pendingMealDeletes.add('m1');
    pendingMealDeletes.remove('m1');
    expect(calls).toBe(2);
    unsubscribe();
    pendingMealDeletes.add('m2');
    expect(calls).toBe(2); // no more notifications after unsubscribe
  });

  it('tracks several pending ids at once', () => {
    pendingMealDeletes.add('m1');
    pendingMealDeletes.add('m2');
    expect(pendingMealDeletes.getSnapshot().size).toBe(2);
    expect(pendingMealDeletes.has('m1')).toBe(true);
    expect(pendingMealDeletes.has('m2')).toBe(true);
  });
});
