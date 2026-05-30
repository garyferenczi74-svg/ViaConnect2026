// Tests for pending-scan-sync.ts (Prompt #169b, Task 20, spec section 16.3:
// network-failure resilience + capture resume).
//
// These exercise the REAL pure contract behind "a scan captured offline or
// during a network drop is not lost and never duplicated":
//   * isTransient / isPermanent / classifyFailure / shouldRetry  the transient
//     vs permanent classifier. Network / 5xx / 408 / 429 -> transient (retry);
//     the DB finalize-trigger rejections (age_restricted / scan_rate_limited /
//     premium_required) + consent/age + other 4xx -> permanent (NO retry).
//   * computeProcessingKey / serializeCapturePayload  the deterministic key:
//     same payload -> same key; different payload -> different key; key order +
//     omitted optionals do not change the key (idempotency anchor).
//   * nextRetryDelayMs / retryIntervalAtElapsed / isExpired / isDueForRetry  the
//     30s / 5m / 30m backoff tiers + the 24h cap.
//   * the pending-item lifecycle reducers (enqueue idempotent on the key, succeed
//     -and-remove, permanent-fail-and-remove, transient-keep-and-record) +
//     applyProcessingFailure routing.
//   * the in-memory PendingScanStore (the thin mockable seam) upsert/get/delete.
//
// Node environment pure logic tests (project convention). No IndexedDB, no DOM.

import { describe, it, expect } from 'vitest';
import {
  // classifier
  isTransient,
  isPermanent,
  classifyFailure,
  shouldRetry,
  makeOfflineError,
  OFFLINE_SENTINEL_MESSAGE,
  PERMANENT_REJECTION_MARKERS,
  // key
  serializeCapturePayload,
  computeProcessingKey,
  // schedule
  RETRY_SCHEDULE,
  retryIntervalAtElapsed,
  isExpired,
  nextRetryDelayMs,
  isDueForRetry,
  // lifecycle
  makePendingItem,
  enqueueItem,
  removeItem,
  markProcessing,
  recordTransientFailure,
  applyProcessingFailure,
  // store
  createInMemoryPendingScanStore,
  // copy
  CAPTURE_SAVED_OFFLINE_MESSAGE,
  pendingItemStatusLine,
  type CapturePayload,
  type PendingScanItem,
} from '@/lib/body-tracker/pending-scan-sync';
import {
  acquireSessionLock,
  releaseSessionLock,
  isSessionInFlight,
} from '@/lib/body-tracker/pending-scan-store';

// ===========================================================================
// Transient vs permanent classifier (the correctness crux)
// ===========================================================================

describe('isPermanent (DB finalize-trigger rejections are PERMANENT)', () => {
  it('flags every DB trigger rejection prefix as permanent (no retry)', () => {
    // These mirror migration 20260516000080 RAISE messages + mapFinalizeError.
    expect(isPermanent(new Error('age_restricted: Body Scan is available to members who are 18 or older.'))).toBe(true);
    expect(isPermanent(new Error('scan_rate_limited: a Body Scan was already completed within the last 24 hours.'))).toBe(true);
    expect(isPermanent(new Error('premium_required: your free Body Scan has already been used; a premium membership is required for additional scans.'))).toBe(true);
  });

  it('flags consent / age client-gate markers as permanent', () => {
    expect(isPermanent(new Error('consent_required'))).toBe(true);
    expect(isPermanent(new Error('consent_revoked'))).toBe(true);
    expect(isPermanent(new Error('age_required: date of birth needed'))).toBe(true);
  });

  it('matches the prefix anywhere in a wrapped Postgres error message (case-insensitive)', () => {
    expect(isPermanent(new Error('finalize failed: AGE_RESTRICTED: proven minor'))).toBe(true);
    expect(isPermanent({ message: 'duplicate key ... scan_rate_limited ...' })).toBe(true);
  });

  it('treats a generic 4xx (e.g. 400, 403, 404) as permanent', () => {
    expect(isPermanent({ status: 400, message: 'Bad Request' })).toBe(true);
    expect(isPermanent({ status: 403, message: 'Forbidden' })).toBe(true);
    expect(isPermanent({ statusCode: 404 })).toBe(true);
  });

  it('does NOT treat a plain network error or 5xx as permanent', () => {
    expect(isPermanent(new Error('Failed to fetch'))).toBe(false);
    expect(isPermanent({ status: 503 })).toBe(false);
    expect(isPermanent(makeOfflineError())).toBe(false);
  });

  it('every PERMANENT_REJECTION_MARKER is itself classified permanent', () => {
    for (const marker of PERMANENT_REJECTION_MARKERS) {
      expect(isPermanent(new Error(`${marker}: detail`))).toBe(true);
    }
  });
});

describe('isTransient (network / availability failures are TRANSIENT)', () => {
  it('classifies common browser network errors as transient', () => {
    expect(isTransient(new Error('Failed to fetch'))).toBe(true);       // Chrome
    expect(isTransient(new Error('NetworkError when attempting to fetch resource'))).toBe(true); // Firefox
    expect(isTransient(new Error('Load failed'))).toBe(true);            // Safari
    expect(isTransient(new Error('Network request failed'))).toBe(true);
  });

  it('classifies the offline sentinel as transient', () => {
    expect(isTransient(makeOfflineError())).toBe(true);
    expect(makeOfflineError().message).toBe(OFFLINE_SENTINEL_MESSAGE);
  });

  it('classifies timeouts / aborts (message or name) as transient', () => {
    expect(isTransient(new Error('The operation was aborted'))).toBe(true);
    expect(isTransient(new Error('request timed out'))).toBe(true);
    expect(isTransient({ name: 'AbortError', message: '' })).toBe(true);
    expect(isTransient({ name: 'TimeoutError', message: '' })).toBe(true);
  });

  it('classifies 5xx + 408 + 429 as transient', () => {
    expect(isTransient({ status: 500 })).toBe(true);
    expect(isTransient({ status: 502 })).toBe(true);
    expect(isTransient({ status: 503 })).toBe(true);
    expect(isTransient({ status: 408 })).toBe(true); // Request Timeout
    expect(isTransient({ status: 429 })).toBe(true); // Too Many Requests
  });

  it('PERMANENCE WINS: a permanent rejection that also contains a transient-looking word is NOT transient', () => {
    // A contrived message containing both a permanent marker and "timeout":
    const err = new Error('scan_rate_limited: please wait, request timeout window of 24 hours');
    expect(isPermanent(err)).toBe(true);
    expect(isTransient(err)).toBe(false); // permanence wins; never retried
  });

  it('does NOT classify a permanent business rejection as transient', () => {
    expect(isTransient(new Error('premium_required: upgrade needed'))).toBe(false);
    expect(isTransient({ status: 403 })).toBe(false);
  });

  it('an unrecognized error is neither transient nor permanent', () => {
    expect(isTransient(new Error('something weird happened'))).toBe(false);
    expect(isPermanent(new Error('something weird happened'))).toBe(false);
  });
});

describe('classifier unwraps a wrapped error via `cause` (ScanFinalizeError shape)', () => {
  // runScanAnalysis throws a ScanFinalizeError whose .message is the USER-FACING
  // mapped copy and whose .cause is the ORIGINAL trigger / network error. The
  // classifier must decide by the ORIGINAL signal, not the friendly copy.
  function wrap(userCopy: string, cause: unknown): Error {
    const e = new Error(userCopy);
    (e as Error & { cause?: unknown }).cause = cause;
    return e;
  }

  it('a wrapped PERMANENT trigger rejection is permanent even though the outer copy is generic', () => {
    // mapFinalizeError turns scan_rate_limited into a friendly "already completed
    // today" line with NO marker; the marker survives only on the cause.
    const wrapped = wrap(
      'You have already completed a Body Scan today. Your body changes gradually, so the next scan will be available in about 24 hours.',
      new Error('scan_rate_limited: a Body Scan was already completed within the last 24 hours.'),
    );
    expect(isPermanent(wrapped)).toBe(true);
    expect(isTransient(wrapped)).toBe(false);
    expect(classifyFailure(wrapped)).toBe('permanent');
  });

  it('a wrapped TRANSIENT network error is transient even though the outer copy is generic', () => {
    // mapFinalizeError's fallback copy ("We could not save your scan...") has no
    // network words; the network signal survives only on the cause.
    const wrapped = wrap('We could not save your scan. Please try again in a moment.', new Error('Failed to fetch'));
    expect(isPermanent(wrapped)).toBe(false);
    expect(isTransient(wrapped)).toBe(true);
    expect(classifyFailure(wrapped)).toBe('transient');
  });

  it('a wrapped 5xx (status on the cause) is transient', () => {
    const wrapped = wrap('We could not save your scan. Please try again in a moment.', { status: 503, message: 'Service Unavailable' });
    expect(isTransient(wrapped)).toBe(true);
  });

  it('a wrapped 4xx (status on the cause) is permanent', () => {
    const wrapped = wrap('We could not save your scan. Please try again in a moment.', { status: 403 });
    expect(isPermanent(wrapped)).toBe(true);
  });

  it('a self-referential cause chain does not loop forever', () => {
    const e = new Error('Failed to fetch') as Error & { cause?: unknown };
    e.cause = e; // pathological self-reference
    expect(isTransient(e)).toBe(true);
  });
});

describe('classifyFailure + shouldRetry (three-way routing)', () => {
  it('maps to transient / permanent / unknown', () => {
    expect(classifyFailure(new Error('Failed to fetch'))).toBe('transient');
    expect(classifyFailure(new Error('age_restricted: minor'))).toBe('permanent');
    expect(classifyFailure(new Error('unexpected'))).toBe('unknown');
  });

  it('shouldRetry is true for transient AND unknown, false only for permanent', () => {
    expect(shouldRetry(new Error('Failed to fetch'))).toBe(true);      // transient
    expect(shouldRetry(new Error('unexpected DB blip'))).toBe(true);   // unknown -> conservative retry
    expect(shouldRetry(new Error('premium_required'))).toBe(false);    // permanent -> drop
    expect(shouldRetry({ status: 401 })).toBe(false);                  // permanent 4xx
  });
});

// ===========================================================================
// Deterministic processing key (idempotency anchor)
// ===========================================================================

describe('computeProcessingKey / serializeCapturePayload (deterministic)', () => {
  const base: CapturePayload = {
    sessionId: 'sess-123',
    posePaths: { front: 'u/sess-123/front.jpg', back: 'u/sess-123/back.jpg', left: null, right: null },
    weightKgAtScan: 80,
    heightCmAtScan: 180,
    tier: 1,
  };

  it('same payload -> same key (a retry reconciles to the same record)', () => {
    expect(computeProcessingKey(base)).toBe(computeProcessingKey({ ...base }));
  });

  it('key order of the input object does not change the key', () => {
    const reordered: CapturePayload = {
      tier: 1,
      heightCmAtScan: 180,
      weightKgAtScan: 80,
      posePaths: { right: null, left: null, back: 'u/sess-123/back.jpg', front: 'u/sess-123/front.jpg' },
      sessionId: 'sess-123',
    };
    expect(computeProcessingKey(reordered)).toBe(computeProcessingKey(base));
  });

  it('omitted optional == explicit null (so an unconfirmed stat hashes the same as null)', () => {
    const omitted: CapturePayload = {
      sessionId: 'sess-xyz',
      posePaths: { front: 'p.jpg' },
    };
    const explicitNull: CapturePayload = {
      sessionId: 'sess-xyz',
      posePaths: { front: 'p.jpg', back: null, left: null, right: null },
      weightKgAtScan: null,
      heightCmAtScan: null,
      tier: null,
    };
    expect(serializeCapturePayload(omitted)).toBe(serializeCapturePayload(explicitNull));
    expect(computeProcessingKey(omitted)).toBe(computeProcessingKey(explicitNull));
  });

  it('different session -> different key', () => {
    expect(computeProcessingKey({ ...base, sessionId: 'other' })).not.toBe(computeProcessingKey(base));
  });

  it('different captured inputs -> different key (a genuinely new capture)', () => {
    expect(computeProcessingKey({ ...base, posePaths: { ...base.posePaths, left: 'u/sess-123/left.jpg' } }))
      .not.toBe(computeProcessingKey(base));
    expect(computeProcessingKey({ ...base, weightKgAtScan: 82 })).not.toBe(computeProcessingKey(base));
    expect(computeProcessingKey({ ...base, heightCmAtScan: 181 })).not.toBe(computeProcessingKey(base));
    expect(computeProcessingKey({ ...base, tier: 2 })).not.toBe(computeProcessingKey(base));
  });

  it('the key is prefixed with the session id (debuggable + cross-session safe)', () => {
    expect(computeProcessingKey(base).startsWith('sess-123:')).toBe(true);
  });

  it('the key is stable across many calls (no time / randomness)', () => {
    const keys = new Set(Array.from({ length: 50 }, () => computeProcessingKey(base)));
    expect(keys.size).toBe(1);
  });
});

// ===========================================================================
// Backoff schedule (section 16.3): 30s for 5m, then 5m to 30m, then 30m to 24h
// ===========================================================================

describe('retryIntervalAtElapsed (the 30s / 5m / 30m tiers)', () => {
  it('first 5 minutes -> every 30s', () => {
    expect(retryIntervalAtElapsed(0)).toBe(30_000);
    expect(retryIntervalAtElapsed(60_000)).toBe(30_000);
    expect(retryIntervalAtElapsed(4 * 60_000)).toBe(30_000);
    // just before the 5-minute boundary
    expect(retryIntervalAtElapsed(5 * 60_000 - 1)).toBe(30_000);
  });

  it('at exactly 5 minutes -> tier 2 (every 5 minutes); the 30s phase is the strict first 5m', () => {
    expect(retryIntervalAtElapsed(5 * 60_000)).toBe(5 * 60_000);
  });

  it('5 to 30 minutes -> every 5 minutes', () => {
    expect(retryIntervalAtElapsed(10 * 60_000)).toBe(5 * 60_000);
    expect(retryIntervalAtElapsed(29 * 60_000)).toBe(5 * 60_000);
    expect(retryIntervalAtElapsed(30 * 60_000 - 1)).toBe(5 * 60_000);
  });

  it('at exactly 30 minutes -> tier 3 (every 30 minutes)', () => {
    expect(retryIntervalAtElapsed(30 * 60_000)).toBe(30 * 60_000);
  });

  it('beyond 30 minutes -> every 30 minutes', () => {
    expect(retryIntervalAtElapsed(2 * 60 * 60_000)).toBe(30 * 60_000);
    expect(retryIntervalAtElapsed(23 * 60 * 60_000)).toBe(30 * 60_000);
  });

  it('clamps a negative / non-finite elapsed to tier 1', () => {
    expect(retryIntervalAtElapsed(-100)).toBe(30_000);
    expect(retryIntervalAtElapsed(Number.NaN)).toBe(30_000);
  });
});

describe('isExpired (the 24h cap)', () => {
  const t0 = 1_000_000_000_000;
  it('is not expired within 24 hours', () => {
    expect(isExpired(t0, t0)).toBe(false);
    expect(isExpired(t0, t0 + 23 * 60 * 60_000)).toBe(false);
    expect(isExpired(t0, t0 + RETRY_SCHEDULE.maxAgeMs - 1)).toBe(false);
  });

  it('is expired at exactly 24 hours and beyond', () => {
    expect(isExpired(t0, t0 + RETRY_SCHEDULE.maxAgeMs)).toBe(true);
    expect(isExpired(t0, t0 + 25 * 60 * 60_000)).toBe(true);
  });

  it('non-finite inputs are not expired (treated as still safe)', () => {
    expect(isExpired(Number.NaN, t0)).toBe(false);
    expect(isExpired(t0, Number.NaN)).toBe(false);
  });
});

describe('nextRetryDelayMs (delay-from-last-attempt, by tier, capped at 24h)', () => {
  const t0 = 1_000_000_000_000;

  it('never attempted -> due immediately (0)', () => {
    expect(nextRetryDelayMs({ firstCapturedAtMs: t0, lastAttemptAtMs: null, nowMs: t0 })).toBe(0);
  });

  it('tier 1: 30s after the last attempt, counting down', () => {
    // last attempt 10s ago, in the first 5 minutes: 30s interval, 20s remain.
    expect(nextRetryDelayMs({ firstCapturedAtMs: t0, lastAttemptAtMs: t0 + 10_000, nowMs: t0 + 20_000 })).toBe(20_000);
  });

  it('tier 1: an overdue item returns 0 (retry now)', () => {
    // last attempt 40s ago > 30s interval -> overdue.
    expect(nextRetryDelayMs({ firstCapturedAtMs: t0, lastAttemptAtMs: t0 + 0, nowMs: t0 + 40_000 })).toBe(0);
  });

  it('tier 2: 5-minute interval once past 5 minutes elapsed', () => {
    const now = t0 + 6 * 60_000;            // 6 minutes elapsed -> tier 2
    const last = now - 60_000;              // attempted 1 minute ago
    expect(nextRetryDelayMs({ firstCapturedAtMs: t0, lastAttemptAtMs: last, nowMs: now }))
      .toBe(5 * 60_000 - 60_000);           // 4 minutes remain
  });

  it('tier 3: 30-minute interval once past 30 minutes elapsed', () => {
    const now = t0 + 40 * 60_000;           // 40 minutes elapsed -> tier 3
    const last = now - 10 * 60_000;         // attempted 10 minutes ago
    expect(nextRetryDelayMs({ firstCapturedAtMs: t0, lastAttemptAtMs: last, nowMs: now }))
      .toBe(30 * 60_000 - 10 * 60_000);     // 20 minutes remain
  });

  it('returns null once the 24h window is exhausted (give up)', () => {
    const now = t0 + RETRY_SCHEDULE.maxAgeMs + 1;
    expect(nextRetryDelayMs({ firstCapturedAtMs: t0, lastAttemptAtMs: now - 1000, nowMs: now })).toBeNull();
  });
});

describe('isDueForRetry', () => {
  const t0 = 1_000_000_000_000;
  it('due when never attempted', () => {
    expect(isDueForRetry({ firstCapturedAtMs: t0, lastAttemptAtMs: null, nowMs: t0 })).toBe(true);
  });
  it('due when the interval has elapsed since the last attempt', () => {
    expect(isDueForRetry({ firstCapturedAtMs: t0, lastAttemptAtMs: t0, nowMs: t0 + 31_000 })).toBe(true);
  });
  it('not due mid-interval', () => {
    expect(isDueForRetry({ firstCapturedAtMs: t0, lastAttemptAtMs: t0, nowMs: t0 + 10_000 })).toBe(false);
  });
  it('not due once expired (null delay)', () => {
    const now = t0 + RETRY_SCHEDULE.maxAgeMs + 1;
    expect(isDueForRetry({ firstCapturedAtMs: t0, lastAttemptAtMs: now - 1000, nowMs: now })).toBe(false);
  });
});

// ===========================================================================
// Pending-item lifecycle reducers
// ===========================================================================

const samplePayload: CapturePayload = {
  sessionId: 'sess-1',
  posePaths: { front: 'a.jpg', back: 'b.jpg' },
  weightKgAtScan: 75,
  heightCmAtScan: 175,
  tier: 1,
};

describe('makePendingItem', () => {
  it('seeds a pending item with the deterministic key + zeroed attempt state', () => {
    const it = makePendingItem(samplePayload, 1000);
    expect(it.processingKey).toBe(computeProcessingKey(samplePayload));
    expect(it.sessionId).toBe('sess-1');
    expect(it.firstCapturedAtMs).toBe(1000);
    expect(it.lastAttemptAtMs).toBeNull();
    expect(it.attemptCount).toBe(0);
    expect(it.lastError).toBeNull();
    expect(it.status).toBe('pending');
  });
});

describe('enqueueItem (idempotent on the deterministic key)', () => {
  it('adds a new capture', () => {
    const next = enqueueItem([], samplePayload, 1000);
    expect(next).toHaveLength(1);
    expect(next[0].processingKey).toBe(computeProcessingKey(samplePayload));
  });

  it('does NOT duplicate when the same capture is enqueued again (preserves the first)', () => {
    const first = enqueueItem([], samplePayload, 1000);
    const second = enqueueItem(first, { ...samplePayload }, 9999); // later time, same payload
    expect(second).toHaveLength(1);
    // The original capture time is preserved (not reset by the re-enqueue).
    expect(second[0].firstCapturedAtMs).toBe(1000);
  });

  it('adds a genuinely different capture alongside', () => {
    const first = enqueueItem([], samplePayload, 1000);
    const second = enqueueItem(first, { ...samplePayload, sessionId: 'sess-2' }, 2000);
    expect(second).toHaveLength(2);
  });
});

describe('removeItem (succeed-and-remove / permanent-fail-and-remove)', () => {
  it('removes the matching key and leaves others', () => {
    const a = makePendingItem(samplePayload, 1);
    const b = makePendingItem({ ...samplePayload, sessionId: 'sess-2' }, 2);
    const next = removeItem([a, b], a.processingKey);
    expect(next).toHaveLength(1);
    expect(next[0].processingKey).toBe(b.processingKey);
  });

  it('is a no-op for a missing key', () => {
    const a = makePendingItem(samplePayload, 1);
    expect(removeItem([a], 'nope')).toHaveLength(1);
  });
});

describe('markProcessing', () => {
  it('flags the in-flight item processing without touching others', () => {
    const a = makePendingItem(samplePayload, 1);
    const b = makePendingItem({ ...samplePayload, sessionId: 'sess-2' }, 2);
    const next = markProcessing([a, b], a.processingKey);
    expect(next.find((x) => x.processingKey === a.processingKey)!.status).toBe('processing');
    expect(next.find((x) => x.processingKey === b.processingKey)!.status).toBe('pending');
  });
});

describe('recordTransientFailure (keep the scan, record the attempt)', () => {
  const t0 = 1_000_000_000_000;
  it('keeps the item, bumps attemptCount, stamps lastAttempt, stores the error, status -> pending', () => {
    const a = makePendingItem(samplePayload, t0);
    const next = recordTransientFailure([a], a.processingKey, t0 + 30_000, 'Failed to fetch');
    const item = next[0];
    expect(next).toHaveLength(1); // not lost
    expect(item.attemptCount).toBe(1);
    expect(item.lastAttemptAtMs).toBe(t0 + 30_000);
    expect(item.lastError).toBe('Failed to fetch');
    expect(item.status).toBe('pending'); // still within window -> eligible for retry
  });

  it('flips status to expired once the 24h window has lapsed', () => {
    const a = makePendingItem(samplePayload, t0);
    const next = recordTransientFailure([a], a.processingKey, t0 + RETRY_SCHEDULE.maxAgeMs, 'still offline');
    expect(next[0].status).toBe('expired');
  });
});

describe('applyProcessingFailure (the routing the hook relies on)', () => {
  const t0 = 1_000_000_000_000;

  it('transient -> RETAIN the item (scan not lost) and record the attempt', () => {
    const a = makePendingItem(samplePayload, t0);
    const res = applyProcessingFailure([a], a.processingKey, new Error('Failed to fetch'), t0 + 30_000);
    expect(res.outcome).toBe('retained_transient');
    expect(res.failureClass).toBe('transient');
    expect(res.items).toHaveLength(1);
    expect(res.items[0].attemptCount).toBe(1);
  });

  it('unknown -> also RETAIN (conservative: an unexpected error must not drop a capture)', () => {
    const a = makePendingItem(samplePayload, t0);
    const res = applyProcessingFailure([a], a.processingKey, new Error('weird'), t0 + 30_000);
    expect(res.outcome).toBe('retained_transient');
    expect(res.failureClass).toBe('unknown');
    expect(res.items).toHaveLength(1);
  });

  it('permanent (DB trigger rejection) -> REMOVE the item (surface + drop, never retried)', () => {
    const a = makePendingItem(samplePayload, t0);
    const res = applyProcessingFailure(
      [a],
      a.processingKey,
      new Error('age_restricted: Body Scan is available to members who are 18 or older.'),
      t0 + 30_000,
    );
    expect(res.outcome).toBe('removed_permanent');
    expect(res.failureClass).toBe('permanent');
    expect(res.items).toHaveLength(0);
  });

  it('permanent (4xx) -> REMOVE the item', () => {
    const a = makePendingItem(samplePayload, t0);
    const res = applyProcessingFailure([a], a.processingKey, { status: 403, message: 'Forbidden' }, t0 + 30_000);
    expect(res.outcome).toBe('removed_permanent');
    expect(res.items).toHaveLength(0);
  });
});

// A full lifecycle walk: enqueue -> transient fail (retain) -> succeed (remove).
describe('lifecycle end-to-end', () => {
  const t0 = 1_000_000_000_000;
  it('enqueue, fail transiently (kept), then succeed-and-remove', () => {
    let items: PendingScanItem[] = [];
    items = enqueueItem(items, samplePayload, t0);
    expect(items).toHaveLength(1);

    const fail = applyProcessingFailure(items, items[0].processingKey, makeOfflineError(), t0 + 30_000);
    items = fail.items;
    expect(items).toHaveLength(1);          // not lost
    expect(items[0].attemptCount).toBe(1);

    // reconnect + success removes it
    items = removeItem(items, items[0].processingKey);
    expect(items).toHaveLength(0);
  });

  it('enqueue then permanent rejection removes it without ever retaining', () => {
    let items: PendingScanItem[] = enqueueItem([], samplePayload, t0);
    const res = applyProcessingFailure(items, items[0].processingKey, new Error('premium_required: upgrade'), t0 + 1000);
    items = res.items;
    expect(res.outcome).toBe('removed_permanent');
    expect(items).toHaveLength(0);
  });
});

// ===========================================================================
// In-memory store (the thin mockable seam) — upsert on the deterministic key
// ===========================================================================

describe('createInMemoryPendingScanStore', () => {
  it('put is an UPSERT on processingKey (re-put overwrites, no duplicate)', async () => {
    const store = createInMemoryPendingScanStore();
    const a = makePendingItem(samplePayload, 1000);
    await store.put(a);
    await store.put({ ...a, attemptCount: 5 }); // same key
    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].attemptCount).toBe(5);
  });

  it('get returns the item or null', async () => {
    const store = createInMemoryPendingScanStore();
    const a = makePendingItem(samplePayload, 1000);
    await store.put(a);
    expect((await store.get(a.processingKey))?.processingKey).toBe(a.processingKey);
    expect(await store.get('missing')).toBeNull();
  });

  it('delete removes by key', async () => {
    const store = createInMemoryPendingScanStore([makePendingItem(samplePayload, 1000)]);
    const key = computeProcessingKey(samplePayload);
    await store.delete(key);
    expect(await store.getAll()).toHaveLength(0);
  });

  it('seeds from an initial array', async () => {
    const store = createInMemoryPendingScanStore([
      makePendingItem(samplePayload, 1),
      makePendingItem({ ...samplePayload, sessionId: 'sess-2' }, 2),
    ]);
    expect(await store.getAll()).toHaveLength(2);
  });
});

// ===========================================================================
// Product copy (no dashes; reassuring; status lines)
// ===========================================================================

// ===========================================================================
// Cross-component in-flight lock (the NO-DUPLICATE concurrency guard)
// ===========================================================================

describe('session in-flight lock (no concurrent analysis of one session)', () => {
  it('the first acquire wins; a second acquire of the same session fails', () => {
    expect(acquireSessionLock('sess-lock-1')).toBe(true);
    expect(isSessionInFlight('sess-lock-1')).toBe(true);
    // A parallel caller (e.g. the retry loop vs the live button) is locked out.
    expect(acquireSessionLock('sess-lock-1')).toBe(false);
    releaseSessionLock('sess-lock-1');
    expect(isSessionInFlight('sess-lock-1')).toBe(false);
  });

  it('a different session is independently lockable', () => {
    expect(acquireSessionLock('sess-lock-a')).toBe(true);
    expect(acquireSessionLock('sess-lock-b')).toBe(true); // different session, allowed
    releaseSessionLock('sess-lock-a');
    releaseSessionLock('sess-lock-b');
  });

  it('release is idempotent (safe to call when not held)', () => {
    releaseSessionLock('never-held');
    expect(isSessionInFlight('never-held')).toBe(false);
    // re-acquire works after release
    expect(acquireSessionLock('sess-lock-2')).toBe(true);
    releaseSessionLock('sess-lock-2');
    expect(acquireSessionLock('sess-lock-2')).toBe(true);
    releaseSessionLock('sess-lock-2');
  });
});

describe('product copy (section 16.3, no dashes / no emojis)', () => {
  it('the capture-saved-offline message is the spec copy and contains no dash', () => {
    expect(CAPTURE_SAVED_OFFLINE_MESSAGE).toBe(
      'Your scan was captured successfully. We will finish processing when you have a connection.',
    );
    expect(CAPTURE_SAVED_OFFLINE_MESSAGE).not.toMatch(/[‒-―−-]/);
  });

  it('the status line reflects the lifecycle status', () => {
    expect(pendingItemStatusLine({ status: 'pending' })).toMatch(/reconnect/i);
    expect(pendingItemStatusLine({ status: 'processing' })).toMatch(/finishing/i);
    expect(pendingItemStatusLine({ status: 'expired' })).toMatch(/finish processing/i);
  });
});
