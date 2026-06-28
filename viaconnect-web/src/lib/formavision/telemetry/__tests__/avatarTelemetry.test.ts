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

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
// T2. Event union is exhaustive: all 11 events, typed as AvatarTelemetryEvent[]
// ---------------------------------------------------------------------------

describe('AvatarTelemetryEvent union: exhaustive 11-event catalog', () => {
  it('the full event catalog contains exactly 11 events', () => {
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
    ];
    expect(ALL_EVENTS.length).toBe(11);
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
    ];
    for (const e of ALL_EVENTS) {
      expect(e.startsWith('formavision.')).toBe(true);
    }
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
