// src/lib/formavision/telemetry/__tests__/avatarTelemetry.test.ts
//
// Prompt 210b P8-T1a: TDD tests for the FormaVision avatar telemetry helper.
// Written BEFORE implementation (RED phase per TDD discipline).
//
// Test plan (from brief):
//   T1. buildAvatarEventPayload: deterministic shape, default page, passthrough
//   T2. Event union is exhaustive: array of all 11 events with length check
//   T3. emitAvatarEvent: never throws when supabase insert rejects (fail-open)
//   T4. emitAvatarEvent: no-op when userId is falsy (insert never called)
//   T5. getAvatarSessionId: returns undefined in SSR/node (no window)
//
// Node harness; no JSX, no DOM. Uses vi.mock for supabase client + safeLog.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks - vi.mock is hoisted to the top of the file by vitest, so any
// variables referenced inside factory functions must also be hoisted via
// vi.hoisted() to avoid temporal dead-zone errors.
// ---------------------------------------------------------------------------

const { mockInsert, mockWarn } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockWarn: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: mockWarn,
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are in place.
// ---------------------------------------------------------------------------

import {
  buildAvatarEventPayload,
  emitAvatarEvent,
  getAvatarSessionId,
  computeDaysDelta,
  recordAvatarView,
} from '../avatarTelemetry';
import type { AvatarTelemetryEvent } from '../avatarTelemetry';

// ---------------------------------------------------------------------------
// T1. buildAvatarEventPayload: deterministic shape
// ---------------------------------------------------------------------------

describe('buildAvatarEventPayload: produces deterministic shape', () => {
  it('sets event to the union value passed in', () => {
    const payload = buildAvatarEventPayload('formavision.avatar_viewed');
    expect(payload.event).toBe('formavision.avatar_viewed');
  });

  it('defaults page to the composition route string when no context provided', () => {
    const payload = buildAvatarEventPayload('formavision.avatar_viewed');
    expect(payload.page).toBe('/body-tracker/composition');
  });

  it('passes properties through unchanged', () => {
    const props = { duration: 42, tierServed: 'cinematic' as const };
    const payload = buildAvatarEventPayload('formavision.region_selected', props);
    expect(payload.properties).toEqual(props);
  });

  it('defaults properties to empty object when not provided', () => {
    const payload = buildAvatarEventPayload('formavision.avatar_rotated');
    expect(payload.properties).toEqual({});
  });

  it('passes device from context', () => {
    const payload = buildAvatarEventPayload(
      'formavision.tab_switched',
      {},
      { device: 'iPhone 15' },
    );
    expect(payload.device).toBe('iPhone 15');
  });

  it('passes session_id from context.sessionId', () => {
    const payload = buildAvatarEventPayload(
      'formavision.tab_switched',
      {},
      { sessionId: 'sess-abc-123' },
    );
    expect(payload.session_id).toBe('sess-abc-123');
  });

  it('uses context.page when provided, overriding default', () => {
    const payload = buildAvatarEventPayload(
      'formavision.genetics_overlay_viewed',
      {},
      { page: '/body-tracker/composition?tab=genetics' },
    );
    expect(payload.page).toBe('/body-tracker/composition?tab=genetics');
  });

  it('device is undefined when not provided', () => {
    const payload = buildAvatarEventPayload('formavision.avatar_viewed');
    expect(payload.device).toBeUndefined();
  });

  it('session_id is undefined when not provided', () => {
    const payload = buildAvatarEventPayload('formavision.avatar_viewed');
    expect(payload.session_id).toBeUndefined();
  });

  it('is a pure function: same args -> same output, no side effects', () => {
    const a = buildAvatarEventPayload('formavision.future_self_toggled', { on: true });
    const b = buildAvatarEventPayload('formavision.future_self_toggled', { on: true });
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// T2. Event union is exhaustive: all 12 events, typed as AvatarTelemetryEvent[]
// P8-T2a: 12th event 'formavision.avatar_session_ended' added for dwell tracking.
// A dropped or renamed event MUST cause a TypeScript compile error in this array.
// ---------------------------------------------------------------------------

describe('AvatarTelemetryEvent union: exhaustive 12-event catalog', () => {
  it('the full event catalog contains exactly 12 events', () => {
    const ALL_EVENTS: AvatarTelemetryEvent[] = [
      'formavision.avatar_viewed',
      'formavision.avatar_rotated',
      'formavision.region_selected',
      'formavision.tab_switched',
      'formavision.timeline_scrubbed',
      'formavision.journey_played',
      'formavision.genetics_overlay_viewed',
      'formavision.future_self_toggled',
      'formavision.protocol_opened',
      'formavision.milestone_celebrated',
      'formavision.fallback_tier_served',
      'formavision.avatar_session_ended',
    ];
    expect(ALL_EVENTS.length).toBe(12);
  });

  it('each event string carries the formavision. prefix', () => {
    const ALL_EVENTS: AvatarTelemetryEvent[] = [
      'formavision.avatar_viewed',
      'formavision.avatar_rotated',
      'formavision.region_selected',
      'formavision.tab_switched',
      'formavision.timeline_scrubbed',
      'formavision.journey_played',
      'formavision.genetics_overlay_viewed',
      'formavision.future_self_toggled',
      'formavision.protocol_opened',
      'formavision.milestone_celebrated',
      'formavision.fallback_tier_served',
      'formavision.avatar_session_ended',
    ];
    for (const e of ALL_EVENTS) {
      expect(e.startsWith('formavision.')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// T6. computeDaysDelta: pure math, injected clock values
// ---------------------------------------------------------------------------

describe('computeDaysDelta: pure days-since calculation', () => {
  const DAY_MS = 1000 * 60 * 60 * 24;

  it('returns 0 when lastViewMs is 0 (no prior view)', () => {
    expect(computeDaysDelta(1_000_000, 0)).toBe(0);
  });

  it('returns 0 when lastViewMs is negative', () => {
    expect(computeDaysDelta(1_000_000, -1)).toBe(0);
  });

  it('returns 0 when nowMs and lastViewMs are the same (same-instant view)', () => {
    expect(computeDaysDelta(1_000_000, 1_000_000)).toBe(0);
  });

  it('returns 0 when previous view was under 1 full day ago (sub-day delta)', () => {
    const now = 1_000_000 + DAY_MS - 1;
    expect(computeDaysDelta(now, 1_000_000)).toBe(0);
  });

  it('returns 1 when previous view was exactly 1 day ago', () => {
    const now = 1_000_000 + DAY_MS;
    expect(computeDaysDelta(now, 1_000_000)).toBe(1);
  });

  it('returns 2 when previous view was exactly 2 days ago', () => {
    const now = 1_000_000 + 2 * DAY_MS;
    expect(computeDaysDelta(now, 1_000_000)).toBe(2);
  });

  it('returns 0 when nowMs < lastViewMs (clock drift guard)', () => {
    expect(computeDaysDelta(500, 1000)).toBe(0);
  });

  it('floors fractional days (e.g., 1.9 days is still 1)', () => {
    const now = 1_000_000 + Math.floor(1.9 * DAY_MS);
    expect(computeDaysDelta(now, 1_000_000)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// T7. recordAvatarView: count-increment + days-delta with injected clock
//     Uses vi.stubGlobal to inject a fake localStorage so the math is testable
//     in the Node harness without touching a real browser storage.
// ---------------------------------------------------------------------------

describe('recordAvatarView: count-increment and days-since persistence', () => {
  const DAY_MS = 1000 * 60 * 60 * 24;

  // Build a minimal fake Storage that survives across calls in one test
  function makeFakeStorage(): Storage {
    const store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() { return Object.keys(store).length; },
    };
  }

  let fakeStorage: Storage;

  beforeEach(() => {
    fakeStorage = makeFakeStorage();
    // Stub window + localStorage so the SSR guard sees a window object
    vi.stubGlobal('localStorage', fakeStorage);
    vi.stubGlobal('window', { localStorage: fakeStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns repeatViewCount=1 and daysSinceLastView=0 on the very first view', () => {
    const result = recordAvatarView(1_000_000);
    expect(result.repeatViewCount).toBe(1);
    expect(result.daysSinceLastView).toBe(0);
  });

  it('returns repeatViewCount=2 on the second view the same day', () => {
    recordAvatarView(1_000_000);
    const result = recordAvatarView(1_000_000 + 100);
    expect(result.repeatViewCount).toBe(2);
    expect(result.daysSinceLastView).toBe(0);
  });

  it('returns daysSinceLastView=1 when returning the next day', () => {
    recordAvatarView(1_000_000);
    const result = recordAvatarView(1_000_000 + DAY_MS);
    expect(result.daysSinceLastView).toBe(1);
  });

  it('returns daysSinceLastView=7 when returning after a week', () => {
    recordAvatarView(1_000_000);
    const result = recordAvatarView(1_000_000 + 7 * DAY_MS);
    expect(result.daysSinceLastView).toBe(7);
  });

  it('increments the count correctly across multiple sequential views', () => {
    recordAvatarView(1_000_000);           // count -> 1
    recordAvatarView(1_000_000 + 1000);    // count -> 2
    const result = recordAvatarView(1_000_000 + 2000); // count -> 3
    expect(result.repeatViewCount).toBe(3);
  });

  it('persists the timestamp so a later call computes the correct delta', () => {
    const t0 = 1_720_000_000_000; // arbitrary ms epoch
    recordAvatarView(t0);
    const t1 = t0 + 3 * DAY_MS;
    const result = recordAvatarView(t1);
    expect(result.daysSinceLastView).toBe(3);
    expect(result.repeatViewCount).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Drift guard (review IMPORTANT #1): the page.tsx avatar_viewed effect gates
  // recordAvatarView behind a resolved userId and a single-fire ref, so the
  // persisted view count must NOT advance while userId is null. This models
  // that exact mount lifecycle against the real recordAvatarView + fake storage
  // to prove the first emitted repeatViewCount is 1 (not 2+).
  //
  // Mirrors the effect body precisely:
  //   if (!userId || ref.current) return;
  //   ref.current = true;
  //   const info = recordAvatarView();
  //   telEmit('formavision.avatar_viewed', info);
  // -------------------------------------------------------------------------
  it('does NOT increment the count while userId is null, then emits repeatViewCount=1 once auth resolves', () => {
    const emitted: Array<{ repeatViewCount: number; daysSinceLastView: number }> = [];
    const guard = { fired: false };

    function runAvatarViewEffect(userId: string | null, nowMs: number): void {
      // Exact replica of the page.tsx userId-gated, ref-guarded effect block.
      if (!userId || guard.fired) return;
      guard.fired = true;
      const info = recordAvatarView(nowMs);
      emitted.push(info);
    }

    // Several mount renders while auth is unresolved: NO storage write, NO emit.
    runAvatarViewEffect(null, 1_000_000);
    runAvatarViewEffect(null, 1_000_050);
    expect(emitted).toHaveLength(0);
    // Count key must be untouched: a read of the raw storage still yields null.
    expect(fakeStorage.getItem('vc_formavision_view_count')).toBeNull();

    // Auth resolves: the effect fires exactly once and the FIRST emitted count is 1.
    runAvatarViewEffect('user-1', 1_000_100);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.repeatViewCount).toBe(1);
    expect(emitted[0]?.daysSinceLastView).toBe(0);
    expect(fakeStorage.getItem('vc_formavision_view_count')).toBe('1');

    // Further renders after the single-fire are no-ops (no double increment).
    runAvatarViewEffect('user-1', 1_000_200);
    expect(emitted).toHaveLength(1);
    expect(fakeStorage.getItem('vc_formavision_view_count')).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// T3. emitAvatarEvent: fail-open - never throws when supabase insert rejects
// ---------------------------------------------------------------------------

describe('emitAvatarEvent: fail-open when supabase insert rejects', () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockWarn.mockReset();
  });

  it('resolves (does not reject) when insert rejects', async () => {
    mockInsert.mockReturnValue(Promise.reject(new Error('boom')));
    await expect(
      emitAvatarEvent('user-1', 'formavision.avatar_viewed'),
    ).resolves.toBeUndefined();
  });

  it('calls safeLog.warn when insert rejects', async () => {
    mockInsert.mockReturnValue(Promise.reject(new Error('boom')));
    await emitAvatarEvent('user-1', 'formavision.avatar_viewed');
    expect(mockWarn).toHaveBeenCalledOnce();
    const [scope, message] = mockWarn.mock.calls[0] as [string, string, unknown];
    expect(scope).toBe('formavision.telemetry');
    expect(message).toContain('emit failed');
  });

  it('passes the event name in the warn context so failures are observable', async () => {
    mockInsert.mockReturnValue(Promise.reject(new Error('boom')));
    await emitAvatarEvent('user-1', 'formavision.region_selected');
    const context = mockWarn.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(context?.event).toBe('formavision.region_selected');
  });
});

// ---------------------------------------------------------------------------
// T4. emitAvatarEvent: no-op when userId is falsy (insert never called)
// ---------------------------------------------------------------------------

describe('emitAvatarEvent: no-op when userId is falsy', () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockWarn.mockReset();
  });

  it('does not call insert when userId is an empty string', async () => {
    mockInsert.mockResolvedValue({ error: null });
    await emitAvatarEvent('', 'formavision.avatar_viewed');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('resolves cleanly (does not throw) when userId is empty', async () => {
    await expect(
      emitAvatarEvent('', 'formavision.avatar_rotated'),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T5. getAvatarSessionId: returns undefined in SSR/node (no window), never throws
// ---------------------------------------------------------------------------

describe('getAvatarSessionId: SSR-safe, never throws', () => {
  it('returns undefined when window is not defined (node/SSR environment)', () => {
    // In the node test runner, typeof window === 'undefined', so the SSR guard
    // must fire and return undefined without touching sessionStorage.
    const result = getAvatarSessionId();
    expect(result).toBeUndefined();
  });

  it('never throws in node/SSR environment', () => {
    expect(() => getAvatarSessionId()).not.toThrow();
  });
});
