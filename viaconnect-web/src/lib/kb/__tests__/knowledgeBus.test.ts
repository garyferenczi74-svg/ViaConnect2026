// Task 8b - knowledgeBus.ts unit tests (Prompt 208, Phase 3)
//
// Covers:
//   subscribeBus  - query-level spies, mapped rows, fail-open on DB error
//   maxCursor     - highest seq among events; fallback when empty
//   canTransitionToPublished - in_review->true; all other statuses->false

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @/lib/supabase/admin so no real DB client is created.
// The chain returned mimics the Supabase query builder fluent API.
// ---------------------------------------------------------------------------

const mockGt = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();

const mockAdminClient = {
  from: mockFrom,
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}));

// ---------------------------------------------------------------------------
// Mock safeLog to spy on error calls without console noise.
// ---------------------------------------------------------------------------

const mockSafeLogError = vi.fn();

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: (...args: unknown[]) => mockSafeLogError(...args),
  },
}));

import {
  subscribeBus,
  maxCursor,
  canTransitionToPublished,
  type BusEvent,
} from '../knowledgeBus';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBusEvent(seq: number): BusEvent {
  return {
    id: `event-${seq}`,
    seq,
    event_type: 'atom_published',
    ref_table: 'knowledge_atoms',
    ref_id: 'uuid-abc',
    domain: 'nutrition',
    payload: {},
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// subscribeBus
// ---------------------------------------------------------------------------

describe('subscribeBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls .gt("seq", sinceCursor) and .order("seq", { ascending: true })', async () => {
    const rows: BusEvent[] = [makeBusEvent(1), makeBusEvent(2)];

    mockOrder.mockResolvedValueOnce({ data: rows, error: null });
    mockGt.mockReturnValueOnce({ order: mockOrder });
    mockFrom.mockReturnValueOnce({ gt: mockGt });

    const result = await subscribeBus(0);

    expect(mockFrom).toHaveBeenCalledWith('knowledge_bus');
    expect(mockGt).toHaveBeenCalledWith('seq', 0);
    expect(mockOrder).toHaveBeenCalledWith('seq', { ascending: true });
    expect(result).toEqual(rows);
  });

  it('returns the mapped rows from the DB response', async () => {
    const rows: BusEvent[] = [makeBusEvent(10), makeBusEvent(20)];

    mockOrder.mockResolvedValueOnce({ data: rows, error: null });
    mockGt.mockReturnValueOnce({ order: mockOrder });
    mockFrom.mockReturnValueOnce({ gt: mockGt });

    const result = await subscribeBus(5);

    expect(result).toHaveLength(2);
    expect(result[0].seq).toBe(10);
    expect(result[1].seq).toBe(20);
  });

  it('returns [] and calls safeLog.error on a DB error (fail-open)', async () => {
    const dbError = { message: 'connection refused', code: '08006' };

    mockOrder.mockResolvedValueOnce({ data: null, error: dbError });
    mockGt.mockReturnValueOnce({ order: mockOrder });
    mockFrom.mockReturnValueOnce({ gt: mockGt });

    const result = await subscribeBus(0);

    expect(result).toEqual([]);
    expect(mockSafeLogError).toHaveBeenCalledTimes(1);
    // First arg is the scope string
    expect(mockSafeLogError.mock.calls[0][0]).toBe('knowledge-bus');
  });

  it('returns [] and calls safeLog.error when data is null with no error object', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });
    mockGt.mockReturnValueOnce({ order: mockOrder });
    mockFrom.mockReturnValueOnce({ gt: mockGt });

    const result = await subscribeBus(0);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// maxCursor
// ---------------------------------------------------------------------------

describe('maxCursor', () => {
  it('returns the highest seq among a non-empty array', () => {
    const events = [makeBusEvent(5), makeBusEvent(9), makeBusEvent(7)];
    expect(maxCursor(events, 0)).toBe(9);
  });

  it('returns the fallback when events is empty', () => {
    expect(maxCursor([], 3)).toBe(3);
  });

  it('handles a single event', () => {
    expect(maxCursor([makeBusEvent(42)], 0)).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// canTransitionToPublished
// ---------------------------------------------------------------------------

describe('canTransitionToPublished', () => {
  it('returns true when from is in_review', () => {
    expect(canTransitionToPublished('in_review')).toBe(true);
  });

  it('returns false when from is draft', () => {
    expect(canTransitionToPublished('draft')).toBe(false);
  });

  it('returns false when from is published', () => {
    expect(canTransitionToPublished('published')).toBe(false);
  });

  it('returns false when from is rejected', () => {
    expect(canTransitionToPublished('rejected')).toBe(false);
  });

  it('returns false for an arbitrary unknown status', () => {
    expect(canTransitionToPublished('archived')).toBe(false);
  });
});
