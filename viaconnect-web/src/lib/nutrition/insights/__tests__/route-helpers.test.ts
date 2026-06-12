// Prompt 192 Task 3 (TDD): manual refresh rate limit window math, the
// PATCH field whitelist, and the GET param clamps.

import { describe, expect, it } from 'vitest';
import {
  GET_DEFAULT_LIMIT,
  GET_MAX_LIMIT,
  HORIZON_VALUES,
  MANUAL_REFRESH_WINDOW_MS,
  clampLimitParam,
  manualRefreshGate,
  oneOf,
  parseInsightPatchBody,
  parseOffsetParam,
} from '../route-helpers';

const NOW = '2026-06-12T12:00:00.000Z';

function minutesBefore(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) - minutes * 60_000).toISOString();
}

describe('manualRefreshGate', () => {
  it('allows when there is no prior manual run', () => {
    expect(manualRefreshGate(null, NOW)).toEqual({ limited: false });
  });

  it('limits inside the 10 minute window with the remaining seconds', () => {
    const gate = manualRefreshGate(minutesBefore(NOW, 4), NOW);
    expect(gate).toEqual({ limited: true, retryAfterSeconds: 360 });
  });

  it('returns at least 1 second at the very edge of the window', () => {
    const newest = new Date(Date.parse(NOW) - (MANUAL_REFRESH_WINDOW_MS - 200)).toISOString();
    const gate = manualRefreshGate(newest, NOW);
    expect(gate).toEqual({ limited: true, retryAfterSeconds: 1 });
  });

  it('allows at exactly the window boundary', () => {
    expect(manualRefreshGate(minutesBefore(NOW, 10), NOW)).toEqual({ limited: false });
  });

  it('allows past the window', () => {
    expect(manualRefreshGate(minutesBefore(NOW, 11), NOW)).toEqual({ limited: false });
  });

  it('fails open on an unparseable timestamp', () => {
    expect(manualRefreshGate('not a date', NOW)).toEqual({ limited: false });
  });
});

describe('parseInsightPatchBody', () => {
  it('rejects non object bodies', () => {
    expect(parseInsightPatchBody(null).ok).toBe(false);
    expect(parseInsightPatchBody('read').ok).toBe(false);
    expect(parseInsightPatchBody([{ status: 'read' }]).ok).toBe(false);
  });

  it('rejects arbitrary fields outright', () => {
    const parsed = parseInsightPatchBody({ status: 'read', compliance_passed: true });
    expect(parsed).toEqual({ ok: false, reason: 'unknown_field:compliance_passed' });
    expect(parseInsightPatchBody({ user_id: 'someone-else' }).ok).toBe(false);
    expect(parseInsightPatchBody({ title: 'rewritten' }).ok).toBe(false);
  });

  it('accepts the four patchable statuses including active for dismiss-undo', () => {
    for (const status of ['read', 'dismissed', 'saved', 'active']) {
      expect(parseInsightPatchBody({ status })).toEqual({ ok: true, patch: { status } });
    }
  });

  it('rejects expired and unknown statuses', () => {
    expect(parseInsightPatchBody({ status: 'expired' })).toEqual({
      ok: false,
      reason: 'invalid_status',
    });
    expect(parseInsightPatchBody({ status: 'archived' }).ok).toBe(false);
    expect(parseInsightPatchBody({ status: 7 }).ok).toBe(false);
  });

  it('accepts feedback with exactly { helpful: boolean }', () => {
    expect(parseInsightPatchBody({ feedback: { helpful: true } })).toEqual({
      ok: true,
      patch: { feedback: { helpful: true } },
    });
    expect(parseInsightPatchBody({ feedback: { helpful: false } })).toEqual({
      ok: true,
      patch: { feedback: { helpful: false } },
    });
  });

  it('rejects malformed feedback shapes', () => {
    expect(parseInsightPatchBody({ feedback: { helpful: 'yes' } }).ok).toBe(false);
    expect(parseInsightPatchBody({ feedback: { helpful: true, note: 'hi' } }).ok).toBe(false);
    expect(parseInsightPatchBody({ feedback: {} }).ok).toBe(false);
    expect(parseInsightPatchBody({ feedback: null }).ok).toBe(false);
  });

  it('accepts status and feedback together and rejects an empty patch', () => {
    expect(
      parseInsightPatchBody({ status: 'saved', feedback: { helpful: true } }),
    ).toEqual({ ok: true, patch: { status: 'saved', feedback: { helpful: true } } });
    expect(parseInsightPatchBody({})).toEqual({ ok: false, reason: 'empty_patch' });
  });
});

describe('GET param clamps', () => {
  it('limit defaults to 20 and caps at 50', () => {
    expect(GET_DEFAULT_LIMIT).toBe(20);
    expect(GET_MAX_LIMIT).toBe(50);
    expect(clampLimitParam(null)).toBe(20);
    expect(clampLimitParam('')).toBe(20);
    expect(clampLimitParam('abc')).toBe(20);
    expect(clampLimitParam('50')).toBe(50);
    expect(clampLimitParam('51')).toBe(50);
    expect(clampLimitParam('999')).toBe(50);
    expect(clampLimitParam('0')).toBe(1);
    expect(clampLimitParam('-5')).toBe(1);
    expect(clampLimitParam('5.9')).toBe(5);
  });

  it('offset defaults to 0 and never goes negative', () => {
    expect(parseOffsetParam(null)).toBe(0);
    expect(parseOffsetParam('x')).toBe(0);
    expect(parseOffsetParam('-3')).toBe(0);
    expect(parseOffsetParam('40')).toBe(40);
  });

  it('oneOf narrows to the allowed set', () => {
    expect(oneOf('daily', HORIZON_VALUES)).toBe('daily');
    expect(oneOf('hourly', HORIZON_VALUES)).toBeNull();
    expect(oneOf(null, HORIZON_VALUES)).toBeNull();
  });
});
