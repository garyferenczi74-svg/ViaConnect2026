// src/lib/formavision/telemetry/__tests__/useAvatarTelemetry.test.ts
//
// Prompt 210b P8-T1b: TDD tests for the useAvatarTelemetry helpers.
//
// Node environment (no jsdom, no @testing-library/react). Tests target the
// pure createAvatarTelemetryActions factory and the createScrubSettleEmitter
// helper directly; the React hook wraps these with stable refs and the same
// behavior is guaranteed by the factory tests.
//
// Test plan:
//   T1. createAvatarTelemetryActions.emit -- fires on every call, no-op when null
//   T2. createAvatarTelemetryActions.emitOnce -- once-per-session guard
//   T3. createScrubSettleEmitter -- fires once per burst, cancel prevents fire
//
// No em-dashes. No en-dashes.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks (hoisted so factory functions reference the same vi.fn())
// ---------------------------------------------------------------------------

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  createAvatarTelemetryActions,
  createScrubSettleEmitter,
} from '../useAvatarTelemetry';

// ---------------------------------------------------------------------------
// T1. createAvatarTelemetryActions: emit
// ---------------------------------------------------------------------------

describe('createAvatarTelemetryActions: emit fires on every call', () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockInsert.mockResolvedValue({ error: null });
  });

  it('fires insert on every call for a valid userId', async () => {
    const actions = createAvatarTelemetryActions();
    actions.emit('user-1', 'formavision.avatar_rotated');
    actions.emit('user-1', 'formavision.avatar_rotated');
    await Promise.resolve();
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('is a no-op and does not throw when userId is null', async () => {
    const actions = createAvatarTelemetryActions();
    expect(() => actions.emit(null, 'formavision.avatar_rotated')).not.toThrow();
    await Promise.resolve();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('is a no-op and does not throw when userId is undefined', async () => {
    const actions = createAvatarTelemetryActions();
    expect(() => actions.emit(undefined, 'formavision.avatar_viewed')).not.toThrow();
    await Promise.resolve();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('passes event and properties through to the insert payload', async () => {
    const actions = createAvatarTelemetryActions();
    actions.emit('user-1', 'formavision.region_selected', { region: 'trunk' });
    await Promise.resolve();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'formavision.region_selected',
        properties: { region: 'trunk' },
        user_id: 'user-1',
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// T2. createAvatarTelemetryActions: emitOnce -- once-per-session guard
// ---------------------------------------------------------------------------

describe('createAvatarTelemetryActions: emitOnce once-per-session guard', () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockInsert.mockResolvedValue({ error: null });
  });

  it('fires exactly once for the same event across repeated calls', async () => {
    const actions = createAvatarTelemetryActions();
    actions.emitOnce('user-1', 'formavision.avatar_viewed');
    actions.emitOnce('user-1', 'formavision.avatar_viewed');
    actions.emitOnce('user-1', 'formavision.avatar_viewed');
    await Promise.resolve();
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('fires once per distinct event -- different events each get one insert', async () => {
    const actions = createAvatarTelemetryActions();
    actions.emitOnce('user-1', 'formavision.avatar_viewed');
    actions.emitOnce('user-1', 'formavision.genetics_overlay_viewed');
    actions.emitOnce('user-1', 'formavision.avatar_viewed');
    await Promise.resolve();
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('separate factory instances have independent once-guards', async () => {
    const a = createAvatarTelemetryActions();
    const b = createAvatarTelemetryActions();
    a.emitOnce('user-1', 'formavision.avatar_viewed');
    b.emitOnce('user-1', 'formavision.avatar_viewed');
    await Promise.resolve();
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('is a no-op and does not throw when userId is null', async () => {
    const actions = createAvatarTelemetryActions();
    expect(() => actions.emitOnce(null, 'formavision.avatar_viewed')).not.toThrow();
    await Promise.resolve();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('is a no-op and does not throw when userId is undefined', async () => {
    const actions = createAvatarTelemetryActions();
    expect(() => actions.emitOnce(undefined, 'formavision.protocol_opened')).not.toThrow();
    await Promise.resolve();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('guard does not permanently block: fresh factory fires after null-userId session', async () => {
    // Simulate: user not yet loaded -> emitOnce with null (no insert).
    const nullActions = createAvatarTelemetryActions();
    nullActions.emitOnce(null, 'formavision.avatar_viewed');
    await Promise.resolve();
    expect(mockInsert).not.toHaveBeenCalled();

    // Simulate: page remounts after auth resolves -> fresh factory fires.
    const authedActions = createAvatarTelemetryActions();
    authedActions.emitOnce('user-1', 'formavision.avatar_viewed');
    await Promise.resolve();
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// T3. createScrubSettleEmitter: debounce fires once per burst
// ---------------------------------------------------------------------------

describe('createScrubSettleEmitter: debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires settle callback exactly once after a burst of rapid notify calls', () => {
    const onSettle = vi.fn();
    const emitter = createScrubSettleEmitter(onSettle, 400);

    emitter.notify();
    emitter.notify();
    emitter.notify();

    // Callback should not fire before the debounce window expires.
    expect(onSettle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);

    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it('cancel prevents the settle callback from firing', () => {
    const onSettle = vi.fn();
    const emitter = createScrubSettleEmitter(onSettle, 400);

    emitter.notify();
    emitter.cancel();

    vi.advanceTimersByTime(400);

    expect(onSettle).not.toHaveBeenCalled();
  });

  it('resets the window on each notify -- fires once at the end of merged burst', () => {
    const onSettle = vi.fn();
    const emitter = createScrubSettleEmitter(onSettle, 400);

    emitter.notify(); // t=0
    emitter.notify(); // t=0 (reset)
    vi.advanceTimersByTime(200); // t=200ms -- still pending
    emitter.notify(); // t=200ms (reset again)
    vi.advanceTimersByTime(200); // t=400ms -- only 200ms since last notify

    expect(onSettle).not.toHaveBeenCalled(); // timer reset at 200ms

    vi.advanceTimersByTime(200); // t=600ms -- 400ms since last notify

    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it('fires again after a settled burst if notify is called again', () => {
    const onSettle = vi.fn();
    const emitter = createScrubSettleEmitter(onSettle, 400);

    // First burst
    emitter.notify();
    vi.advanceTimersByTime(400);
    expect(onSettle).toHaveBeenCalledTimes(1);

    // Second burst
    emitter.notify();
    vi.advanceTimersByTime(400);
    expect(onSettle).toHaveBeenCalledTimes(2);
  });
});
