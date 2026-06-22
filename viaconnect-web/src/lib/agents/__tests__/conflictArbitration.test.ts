/**
 * src/lib/agents/__tests__/conflictArbitration.test.ts
 *
 * TDD tests for arbitrateConflict + logAgentConflict (Prompt 208a Task K2).
 * arbitrateConflict is pure/deterministic - no mocks needed for it.
 * logAgentConflict mocks the admin client.
 *
 * No em/en-dashes. No emojis. No new dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock admin client for logAgentConflict DB tests
// ---------------------------------------------------------------------------

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  arbitrateConflict,
  logAgentConflict,
} from '@/lib/agents/conflictArbitration';
import type { AgentConflict } from '@/lib/agents/conflictArbitration';

// ---------------------------------------------------------------------------
// arbitrateConflict (pure, no I/O)
// ---------------------------------------------------------------------------

describe('arbitrateConflict - safety-grounded wins', () => {
  it('safetyGrounded side a beats non-grounded side b regardless of stance', () => {
    const conflict: AgentConflict = {
      topic: 'iron-supplementation',
      a: { agent: 'hannah', stance: 'recommend', safetyGrounded: true },
      b: { agent: 'gordon', stance: 'avoid' },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('a');
    expect(result.resolvedBy).toBe('jeffery');
    expect(result.rationale).toContain('safety');
  });

  it('safetyGrounded side b beats non-grounded side a', () => {
    const conflict: AgentConflict = {
      topic: 'iron-supplementation',
      a: { agent: 'gordon', stance: 'avoid' },
      b: { agent: 'hannah', stance: 'recommend', safetyGrounded: true },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('b');
    expect(result.resolvedBy).toBe('jeffery');
    expect(result.rationale).toContain('safety');
  });

  it('resolvedBy is always jeffery when safetyGrounded decides', () => {
    const conflict: AgentConflict = {
      topic: 'dose',
      a: { agent: 'hannah', stance: 'caution', safetyGrounded: true },
      b: { agent: 'arnold', stance: 'recommend' },
    };
    expect(arbitrateConflict(conflict).resolvedBy).toBe('jeffery');
  });
});

describe('arbitrateConflict - conservative stance wins (neither uniquely safetyGrounded)', () => {
  it('avoid beats recommend', () => {
    const conflict: AgentConflict = {
      topic: 'folate-dose',
      a: { agent: 'gordon', stance: 'avoid' },
      b: { agent: 'hannah', stance: 'recommend' },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('a');
    expect(result.resolvedBy).toBe('jeffery');
  });

  it('avoid beats caution (b wins when b is more conservative)', () => {
    const conflict: AgentConflict = {
      topic: 'b12',
      a: { agent: 'hannah', stance: 'caution' },
      b: { agent: 'gordon', stance: 'avoid' },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('b');
    expect(result.resolvedBy).toBe('jeffery');
  });

  it('caution beats recommend', () => {
    const conflict: AgentConflict = {
      topic: 'zinc',
      a: { agent: 'arnold', stance: 'recommend' },
      b: { agent: 'hannah', stance: 'caution' },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('b');
    expect(result.resolvedBy).toBe('jeffery');
  });

  it('withholding is the safe default: avoid wins over recommend', () => {
    const conflict: AgentConflict = {
      topic: 'omega3',
      a: { agent: 'gordon', stance: 'recommend' },
      b: { agent: 'hannah', stance: 'avoid' },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('b');
  });
});

describe('arbitrateConflict - escalate on equipoise', () => {
  it('same stance + neither uniquely safetyGrounded -> escalate', () => {
    const conflict: AgentConflict = {
      topic: 'magnesium',
      a: { agent: 'gordon', stance: 'caution' },
      b: { agent: 'hannah', stance: 'caution' },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('escalate');
    expect(result.resolvedBy).toBe('jeffery');
    expect(result.rationale).toContain('equipoise');
  });

  it('both safetyGrounded + same stance -> escalate', () => {
    const conflict: AgentConflict = {
      topic: 'iron',
      a: { agent: 'gordon', stance: 'avoid', safetyGrounded: true },
      b: { agent: 'hannah', stance: 'avoid', safetyGrounded: true },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('escalate');
    expect(result.resolvedBy).toBe('jeffery');
  });

  it('resolvedBy is always jeffery on escalate', () => {
    const conflict: AgentConflict = {
      topic: 'x',
      a: { agent: 'a1', stance: 'recommend' },
      b: { agent: 'b1', stance: 'recommend' },
    };
    expect(arbitrateConflict(conflict).resolvedBy).toBe('jeffery');
  });
});

describe('arbitrateConflict - both safetyGrounded but different stances -> conservative wins', () => {
  it('both safetyGrounded: avoid beats recommend', () => {
    const conflict: AgentConflict = {
      topic: 'hfe-iron',
      a: { agent: 'hannah', stance: 'recommend', safetyGrounded: true },
      b: { agent: 'gordon', stance: 'avoid', safetyGrounded: true },
    };
    const result = arbitrateConflict(conflict);
    expect(result.winner).toBe('b');
    expect(result.resolvedBy).toBe('jeffery');
  });
});

// ---------------------------------------------------------------------------
// logAgentConflict (async, DB write)
// ---------------------------------------------------------------------------

describe('logAgentConflict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const conflict: AgentConflict = {
    topic: 'iron-supplementation',
    detail: 'HFE C282Y conflict',
    a: { agent: 'hannah', stance: 'avoid', safetyGrounded: true },
    b: { agent: 'gordon', stance: 'recommend' },
  };

  it('inserts the mapped row and returns true on success', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const arbitration = arbitrateConflict(conflict);
    const result = await logAgentConflict('user-abc', conflict, arbitration);

    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('agent_conflict_log');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-abc',
        agent_a: 'hannah',
        agent_b: 'gordon',
        topic: 'iron-supplementation',
        conflict_detail: 'HFE C282Y conflict',
        resolution: arbitration.winner,
        resolved_by: 'jeffery',
      }),
    );
  });

  it('returns false and does not throw when DB insert errors (fail-open)', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'unique violation' } });

    const arbitration = arbitrateConflict(conflict);
    await expect(logAgentConflict('user-abc', conflict, arbitration)).resolves.toBe(false);
  });

  it('returns false and does not throw when DB insert throws (fail-open)', async () => {
    mockInsert.mockRejectedValue(new Error('network error'));

    const arbitration = arbitrateConflict(conflict);
    await expect(logAgentConflict('user-abc', conflict, arbitration)).resolves.toBe(false);
  });

  it('accepts null userId (system-level conflict)', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const arbitration = arbitrateConflict(conflict);
    const result = await logAgentConflict(null, conflict, arbitration);

    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null }),
    );
  });

  it('maps null conflict.detail to null in the row', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const noDetailConflict: AgentConflict = {
      topic: 'b12',
      a: { agent: 'gordon', stance: 'caution' },
      b: { agent: 'hannah', stance: 'recommend' },
    };
    const arbitration = arbitrateConflict(noDetailConflict);
    await logAgentConflict('u1', noDetailConflict, arbitration);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ conflict_detail: null }),
    );
  });
});
