import { describe, it, expect } from 'vitest';
import {
  genSupplementId,
  transitionPendingTo,
  markRowPending,
  type SupplementSaveState,
} from '@/lib/caq/supplement-save-state';

describe('genSupplementId', () => {
  it('returns a non-empty string', () => {
    const id = genSupplementId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('produces unique values across rapid calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) ids.add(genSupplementId());
    expect(ids.size).toBe(200);
  });
});

describe('transitionPendingTo', () => {
  it('promotes every pending row to saved on success', () => {
    const prev: Record<string, SupplementSaveState> = {
      a: 'pending',
      b: 'pending',
      c: 'pending',
    };
    const next = transitionPendingTo(prev, 'saved');
    expect(next).toEqual({ a: 'saved', b: 'saved', c: 'saved' });
  });

  it('promotes every pending row to failed on error', () => {
    const prev: Record<string, SupplementSaveState> = {
      a: 'pending',
      b: 'pending',
    };
    const next = transitionPendingTo(prev, 'failed');
    expect(next).toEqual({ a: 'failed', b: 'failed' });
  });

  it('leaves non-pending rows untouched', () => {
    const prev: Record<string, SupplementSaveState> = {
      a: 'saved',
      b: 'pending',
      c: 'failed',
      d: 'saved',
    };
    const next = transitionPendingTo(prev, 'saved');
    expect(next).toEqual({ a: 'saved', b: 'saved', c: 'failed', d: 'saved' });
  });

  it('returns a new object reference (immutability for React state)', () => {
    const prev: Record<string, SupplementSaveState> = { a: 'pending' };
    const next = transitionPendingTo(prev, 'saved');
    expect(next).not.toBe(prev);
  });

  it('handles empty state gracefully', () => {
    const next = transitionPendingTo({}, 'saved');
    expect(next).toEqual({});
  });
});

describe('markRowPending', () => {
  it('flips a failed row back to pending for retry', () => {
    const prev: Record<string, SupplementSaveState> = {
      a: 'failed',
      b: 'saved',
    };
    const next = markRowPending(prev, 'a');
    expect(next).toEqual({ a: 'pending', b: 'saved' });
  });

  it('adds a new pending row when id was not present', () => {
    const next = markRowPending({}, 'fresh');
    expect(next).toEqual({ fresh: 'pending' });
  });

  it('returns a new object reference', () => {
    const prev: Record<string, SupplementSaveState> = { a: 'failed' };
    const next = markRowPending(prev, 'a');
    expect(next).not.toBe(prev);
  });

  it('does not mutate sibling rows', () => {
    const prev: Record<string, SupplementSaveState> = {
      a: 'failed',
      b: 'saved',
      c: 'pending',
    };
    const next = markRowPending(prev, 'a');
    expect(next.b).toBe('saved');
    expect(next.c).toBe('pending');
  });
});
