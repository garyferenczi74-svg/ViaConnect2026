// Tests for src/app/api/bos/worker/route.ts.
//
// The worker is Vercel-cron-triggered every 5 minutes. It drains
// bos_compute_queue, groups events by user, applies the cooldown rules
// (honoring bypass_cooldown), invokes computeBOS once per eligible user,
// and marks the queue rows as processed (or errored, with the error
// message captured).
//
// All external collaborators are mocked at the module level: the
// service-role Supabase client, the queue helpers, the cooldown helper,
// and the compute entry point. This keeps the test hermetic so no
// network or DB I/O fires.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueuedEvent } from '@/lib/scoring/types';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockClient = { __label: 'mock-admin-client' };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockClient),
}));

const mockClaim = vi.fn();
const mockRelease = vi.fn();
const mockMarkProcessed = vi.fn();
const mockMarkErrored = vi.fn();
vi.mock('@/lib/scoring/queue', () => ({
  claimBOSComputeBatch: (...a: unknown[]) => mockClaim(...a),
  releaseClaimedEvents: (...a: unknown[]) => mockRelease(...a),
  markEventsProcessed: (...a: unknown[]) => mockMarkProcessed(...a),
  markEventsErrored: (...a: unknown[]) => mockMarkErrored(...a),
}));

const mockCooldown = vi.fn();
vi.mock('@/lib/scoring/cooldown', () => ({
  isInCooldown: (...a: unknown[]) => mockCooldown(...a),
}));

const mockComputeBOS = vi.fn();
vi.mock('@/lib/scoring/bio-optimization-score', () => ({
  computeBOS: (...a: unknown[]) => mockComputeBOS(...a),
}));

// Import SUT after all vi.mock calls.
import { GET } from '../worker/route';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<QueuedEvent> = {}): QueuedEvent {
  return {
    id: overrides.id ?? 'q-evt-1',
    user_id: overrides.user_id ?? 'user-1',
    source: overrides.source ?? 'daily_log',
    event_id: overrides.event_id ?? null,
    payload: overrides.payload ?? {},
    enqueued_at: overrides.enqueued_at ?? '2026-05-11T10:00:00Z',
    processed_at: overrides.processed_at ?? null,
    processing_error: overrides.processing_error ?? null,
    bypass_cooldown: overrides.bypass_cooldown ?? false,
    retry_count: overrides.retry_count ?? 0,
  };
}

function makeRequest(authHeader: string | null = 'Bearer test-secret'): Request {
  const headers = new Headers();
  if (authHeader !== null) headers.set('authorization', authHeader);
  return new Request('https://example.com/api/bos/worker', { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'test-secret';
  mockClaim.mockResolvedValue([]);
  mockRelease.mockResolvedValue(undefined);
  mockCooldown.mockResolvedValue({ in_cooldown: false, last_compute_at: null, minutes_remaining: 0 });
  mockMarkProcessed.mockResolvedValue(undefined);
  mockMarkErrored.mockResolvedValue(undefined);
  mockComputeBOS.mockResolvedValue({ id: 'history-row-1', score: 75 });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('worker auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header does not match CRON_SECRET', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('accepts a correct Bearer token and returns 200', async () => {
    const res = await GET(makeRequest('Bearer test-secret'));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Empty queue
// ---------------------------------------------------------------------------

describe('worker empty queue', () => {
  it('returns 200 with processed_users=0 when no events are pending', async () => {
    mockClaim.mockResolvedValue([]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.processed_users).toBe(0);
    expect(body.results).toEqual([]);
    expect(mockComputeBOS).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Single user, single event, happy path
// ---------------------------------------------------------------------------

describe('worker single-user happy path', () => {
  it('runs computeBOS once and marks the event processed', async () => {
    const event = makeEvent({ id: 'q-1', user_id: 'user-1', source: 'daily_log' });
    mockClaim.mockResolvedValue([event]);
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockComputeBOS).toHaveBeenCalledTimes(1);
    const [calledUserId, calledTrigger] = mockComputeBOS.mock.calls[0];
    expect(calledUserId).toBe('user-1');
    expect(calledTrigger.source).toBe('daily_log');
    expect(calledTrigger.bypassCooldown).toBe(false);

    expect(mockMarkProcessed).toHaveBeenCalledTimes(1);
    expect(mockMarkProcessed).toHaveBeenCalledWith(['q-1'], mockClient);

    expect(body.processed_users).toBe(1);
    expect(body.results[0]).toEqual({
      userId: 'user-1',
      status: 'computed',
      event_count: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// Cooldown enforcement
// ---------------------------------------------------------------------------

describe('worker cooldown enforcement', () => {
  it('skips when user is in cooldown and no event has bypass_cooldown', async () => {
    mockCooldown.mockResolvedValue({
      in_cooldown: true,
      last_compute_at: '2026-05-11T11:50:00Z',
      minutes_remaining: 22,
    });
    const events = [
      makeEvent({ id: 'q-1', user_id: 'user-1' }),
      makeEvent({ id: 'q-2', user_id: 'user-1' }),
      makeEvent({ id: 'q-3', user_id: 'user-1' }),
      makeEvent({ id: 'q-4', user_id: 'user-1' }),
      makeEvent({ id: 'q-5', user_id: 'user-1' }),
    ];
    mockClaim.mockResolvedValue(events);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockComputeBOS).not.toHaveBeenCalled();
    expect(mockMarkProcessed).not.toHaveBeenCalled();
    expect(mockMarkErrored).not.toHaveBeenCalled();
    // Cooldown-skipped batches release the claimed rows back to the queue.
    expect(mockRelease).toHaveBeenCalledWith(
      expect.arrayContaining(['q-1', 'q-2', 'q-3', 'q-4', 'q-5']),
      mockClient,
    );
    expect(body.results[0]).toEqual({
      userId: 'user-1',
      status: 'skipped_cooldown',
      minutes_remaining: 22,
    });
  });

  it('bypasses cooldown when any event in the batch carries bypass_cooldown=true', async () => {
    mockCooldown.mockResolvedValue({
      in_cooldown: true,
      last_compute_at: '2026-05-11T11:50:00Z',
      minutes_remaining: 22,
    });
    const event = makeEvent({
      id: 'q-bypass',
      user_id: 'user-1',
      source: 'caq_completed',
      bypass_cooldown: true,
    });
    mockClaim.mockResolvedValue([event]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockComputeBOS).toHaveBeenCalledTimes(1);
    const [, calledTrigger] = mockComputeBOS.mock.calls[0];
    expect(calledTrigger.bypassCooldown).toBe(true);
    expect(mockCooldown).not.toHaveBeenCalled();
    expect(mockMarkProcessed).toHaveBeenCalledWith(['q-bypass'], mockClient);
    expect(body.results[0].status).toBe('computed');
  });
});

// ---------------------------------------------------------------------------
// Per-user error isolation
// ---------------------------------------------------------------------------

describe('worker error handling', () => {
  it('marks events errored and continues when computeBOS throws', async () => {
    const event = makeEvent({ id: 'q-err', user_id: 'user-1' });
    mockClaim.mockResolvedValue([event]);
    mockComputeBOS.mockRejectedValue(new Error('Hannah API timeout'));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockMarkErrored).toHaveBeenCalledWith(['q-err'], 'Hannah API timeout', mockClient);
    expect(mockMarkProcessed).not.toHaveBeenCalled();
    expect(body.results[0]).toEqual({
      userId: 'user-1',
      status: 'error',
      error: 'Hannah API timeout',
    });
  });

  it('continues to the next user when one user errors', async () => {
    const eventA = makeEvent({ id: 'q-a', user_id: 'user-a' });
    const eventB = makeEvent({ id: 'q-b', user_id: 'user-b' });
    mockClaim.mockResolvedValue([eventA, eventB]);
    mockComputeBOS.mockImplementation(async (userId: string) => {
      if (userId === 'user-a') throw new Error('compute exploded');
      return { id: 'history-row-b', score: 80 };
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed_users).toBe(2);
    const userA = body.results.find((r: { userId: string }) => r.userId === 'user-a');
    const userB = body.results.find((r: { userId: string }) => r.userId === 'user-b');
    expect(userA.status).toBe('error');
    expect(userA.error).toBe('compute exploded');
    expect(userB.status).toBe('computed');
    expect(mockMarkErrored).toHaveBeenCalledWith(['q-a'], 'compute exploded', mockClient);
    expect(mockMarkProcessed).toHaveBeenCalledWith(['q-b'], mockClient);
  });
});

// ---------------------------------------------------------------------------
// Trigger derivation from latest event in batch
// ---------------------------------------------------------------------------

describe('worker trigger derivation', () => {
  it('uses the latest event (by enqueued_at) as the trigger', async () => {
    const older = makeEvent({
      id: 'q-old',
      user_id: 'user-1',
      source: 'daily_log',
      enqueued_at: '2026-05-11T10:00:00Z',
    });
    const newer = makeEvent({
      id: 'q-new',
      user_id: 'user-1',
      source: 'nutrition_log',
      event_id: 'meal-evt-99',
      enqueued_at: '2026-05-11T10:05:00Z',
    });
    mockClaim.mockResolvedValue([older, newer]);

    await GET(makeRequest());

    const [, calledTrigger] = mockComputeBOS.mock.calls[0];
    expect(calledTrigger.source).toBe('nutrition_log');
    expect(calledTrigger.eventId).toBe('meal-evt-99');
    // Both events marked processed.
    expect(mockMarkProcessed).toHaveBeenCalledWith(
      expect.arrayContaining(['q-old', 'q-new']),
      mockClient,
    );
  });

  it('emits event_count reflecting the full batch size, not just the trigger event', async () => {
    const events = [
      makeEvent({ id: 'q-1', user_id: 'user-1', enqueued_at: '2026-05-11T10:00:00Z' }),
      makeEvent({ id: 'q-2', user_id: 'user-1', enqueued_at: '2026-05-11T10:01:00Z' }),
      makeEvent({ id: 'q-3', user_id: 'user-1', enqueued_at: '2026-05-11T10:02:00Z' }),
    ];
    mockClaim.mockResolvedValue(events);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.results[0]).toEqual({
      userId: 'user-1',
      status: 'computed',
      event_count: 3,
    });
  });
});

// ---------------------------------------------------------------------------
// Phase F-patch: per-drain cap (Fix 1) + release-on-error behavior
// ---------------------------------------------------------------------------

describe('worker per-drain cap', () => {
  it('processes at most MAX_USERS_PER_DRAIN users and releases the over-claim', async () => {
    // Generate 60 distinct users with one event each. The cap is 50.
    const events = Array.from({ length: 60 }, (_, i) =>
      makeEvent({
        id: `q-${i}`,
        user_id: `user-${i}`,
        enqueued_at: `2026-05-11T10:${String(i).padStart(2, '0')}:00Z`,
      }),
    );
    mockClaim.mockResolvedValue(events);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed_users).toBe(50);
    expect(mockComputeBOS).toHaveBeenCalledTimes(50);

    // The remaining 10 user-event ids must be released back to the queue.
    expect(mockRelease).toHaveBeenCalledTimes(1);
    const releasedIds = mockRelease.mock.calls[0][0] as string[];
    expect(releasedIds).toHaveLength(10);
    expect(releasedIds).toEqual(
      expect.arrayContaining(['q-50', 'q-51', 'q-52', 'q-53', 'q-54', 'q-55', 'q-56', 'q-57', 'q-58', 'q-59']),
    );
  });

  it('does not call release when claimed users fit within the cap', async () => {
    const event = makeEvent({ id: 'q-1', user_id: 'user-1' });
    mockClaim.mockResolvedValue([event]);
    await GET(makeRequest());
    expect(mockRelease).not.toHaveBeenCalled();
  });
});

describe('worker release on compute error', () => {
  it('on compute error, markEventsErrored is called so the row is released for retry', async () => {
    // Phase F-patch: markEventsErrored is the unified release-and-bump path.
    // The worker hands off to it; the helper sets processed_at = NULL and
    // increments retry_count under the §8b RPC's retry_count < 5 ceiling.
    const event = makeEvent({ id: 'q-err-release', user_id: 'user-x' });
    mockClaim.mockResolvedValue([event]);
    mockComputeBOS.mockRejectedValue(new Error('downstream failure'));

    await GET(makeRequest());

    expect(mockMarkErrored).toHaveBeenCalledTimes(1);
    expect(mockMarkErrored).toHaveBeenCalledWith(
      ['q-err-release'],
      'downstream failure',
      mockClient,
    );
    expect(mockMarkProcessed).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Phase F-patch: timing-safe CRON_SECRET (Fix 4)
// ---------------------------------------------------------------------------

describe('worker auth edge cases', () => {
  it('returns 401 when CRON_SECRET is unset (empty string) even with Bearer prefix', async () => {
    process.env.CRON_SECRET = '';
    const res = await GET(makeRequest('Bearer '));
    expect(res.status).toBe(401);
    expect(mockComputeBOS).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET is undefined even with Bearer prefix', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest('Bearer '));
    expect(res.status).toBe(401);
    expect(mockComputeBOS).not.toHaveBeenCalled();
  });

  it('returns 401 when header length differs from expected (partial match attempt)', async () => {
    process.env.CRON_SECRET = 'test-secret';
    // Same prefix, different total length -> timing-safe path returns false
    // without invoking timingSafeEqual (which would have thrown on unequal
    // lengths anyway).
    const res = await GET(makeRequest('Bearer test-secret-extra'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when header is the same length as expected but differs by one byte', async () => {
    process.env.CRON_SECRET = 'test-secret';
    // 'Bearer test-secret' is 18 chars; substitute the final char so the
    // length matches and timingSafeEqual is exercised.
    const res = await GET(makeRequest('Bearer test-secrex'));
    expect(res.status).toBe(401);
  });
});
