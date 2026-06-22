/**
 * src/lib/eval/__tests__/costLedger.test.ts
 *
 * Unit tests for costLedger -- Prompt 208a Module L Task L4 (2026-06-21).
 *
 * Covers:
 *   - budgetState thresholds (exact per brief)
 *   - recordPassCost inserts the right row and returns the state
 *   - recordPassCost logs warn on 'approaching' or 'over'
 *   - recordPassCost fails open on DB error (no throw)
 *   - recordPassCost fails open when createAdminClient throws (no throw)
 *
 * No em/en-dashes. No emojis. No package.json changes. No live DB writes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks -- declared before any imports that pull the mocked modules.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after vi.mock declarations)
// ---------------------------------------------------------------------------

import { budgetState, recordPassCost, DEFAULT_PASS_BUDGET, type BudgetState } from '../costLedger'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// Helper: build a minimal admin mock that accepts cost_ledger inserts
// ---------------------------------------------------------------------------

function buildAdminMock(insertResult: { data: null; error: { message: string } | null }) {
  const mockInsert = vi.fn().mockResolvedValue(insertResult)
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'cost_ledger') {
      return { insert: mockInsert }
    }
    return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
  })
  return { from: mockFrom, _mockInsert: mockInsert }
}

// ---------------------------------------------------------------------------
// beforeEach: clear all mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// budgetState -- pure function threshold tests
// ---------------------------------------------------------------------------

describe('budgetState', () => {
  it('returns ok when estimatedCost is well below budget', () => {
    expect(budgetState(0.4, 0.5)).toBe<BudgetState>('ok')
  })

  it('returns approaching when estimatedCost >= 0.8 * budget (0.45 >= 0.40)', () => {
    // 0.8 * 0.5 = 0.40; 0.45 >= 0.40
    expect(budgetState(0.45, 0.5)).toBe<BudgetState>('approaching')
  })

  it('returns over when estimatedCost equals budget exactly', () => {
    expect(budgetState(0.5, 0.5)).toBe<BudgetState>('over')
  })

  it('returns over when estimatedCost exceeds budget', () => {
    expect(budgetState(0.6, 0.5)).toBe<BudgetState>('over')
  })

  it('returns ok when budget is 0 (unbounded)', () => {
    expect(budgetState(1, 0)).toBe<BudgetState>('ok')
  })

  it('returns ok when budget is negative (unbounded)', () => {
    expect(budgetState(999, -1)).toBe<BudgetState>('ok')
  })

  it('returns ok at exactly 0.8 * budget (boundary is exclusive)', () => {
    // 0.8 * 0.5 = 0.40; exact boundary is ok per brief example (0.4, 0.5) -> 'ok'
    expect(budgetState(0.40, 0.5)).toBe<BudgetState>('ok')
  })

  it('returns ok just below the approaching threshold', () => {
    // 0.399 < 0.40
    expect(budgetState(0.399, 0.5)).toBe<BudgetState>('ok')
  })
})

// ---------------------------------------------------------------------------
// DEFAULT_PASS_BUDGET
// ---------------------------------------------------------------------------

describe('DEFAULT_PASS_BUDGET', () => {
  it('is 0.5', () => {
    expect(DEFAULT_PASS_BUDGET).toBe(0.5)
  })
})

// ---------------------------------------------------------------------------
// recordPassCost -- integration behavior (mocked DB)
// ---------------------------------------------------------------------------

describe('recordPassCost', () => {
  it('inserts a cost_ledger row with the correct budget_state on ok', async () => {
    const { from: mockFrom, _mockInsert } = buildAdminMock({ data: null, error: null })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom })

    const state = await recordPassCost({
      passRef: 'research:methylation',
      tokens: 256,
      apiCalls: 3,
      estimatedCost: 0.0006,
    })

    expect(state).toBe<BudgetState>('ok')
    expect(_mockInsert).toHaveBeenCalledOnce()
    expect(_mockInsert).toHaveBeenCalledWith([
      {
        pass_ref: 'research:methylation',
        tokens: 256,
        api_calls: 3,
        estimated_cost: 0.0006,
        budget_state: 'ok',
      },
    ])
  })

  it('returns approaching and inserts the right budget_state', async () => {
    const { from: mockFrom, _mockInsert } = buildAdminMock({ data: null, error: null })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom })

    // 0.45 >= 0.8 * 0.5 = 0.40 -> approaching
    const state = await recordPassCost({
      passRef: 'research:nutrition',
      tokens: 512,
      apiCalls: 5,
      estimatedCost: 0.45,
      budget: 0.5,
    })

    expect(state).toBe<BudgetState>('approaching')
    expect(_mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ budget_state: 'approaching' }),
    ])
  })

  it('calls safeLog.warn on approaching', async () => {
    const { from: mockFrom } = buildAdminMock({ data: null, error: null })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom })

    await recordPassCost({
      passRef: 'research:nutrition',
      tokens: 512,
      apiCalls: 5,
      estimatedCost: 0.45,
      budget: 0.5,
    })

    expect(safeLog.warn).toHaveBeenCalled()
  })

  it('returns over and calls safeLog.warn when estimatedCost >= budget', async () => {
    const { from: mockFrom } = buildAdminMock({ data: null, error: null })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom })

    const state = await recordPassCost({
      passRef: 'research:hormones',
      tokens: 1024,
      apiCalls: 10,
      estimatedCost: 0.55,
      budget: 0.5,
    })

    expect(state).toBe<BudgetState>('over')
    expect(safeLog.warn).toHaveBeenCalled()
  })

  it('does NOT call safeLog.warn when state is ok', async () => {
    const { from: mockFrom } = buildAdminMock({ data: null, error: null })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom })

    await recordPassCost({
      passRef: 'research:methylation',
      tokens: 256,
      apiCalls: 3,
      estimatedCost: 0.001,
    })

    expect(safeLog.warn).not.toHaveBeenCalled()
  })

  it('uses DEFAULT_PASS_BUDGET when budget is not provided', async () => {
    const { from: mockFrom, _mockInsert } = buildAdminMock({ data: null, error: null })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom })

    // With DEFAULT_PASS_BUDGET = 0.5, 0.45 is approaching
    const state = await recordPassCost({
      passRef: 'research:longevity',
      tokens: 512,
      apiCalls: 5,
      estimatedCost: 0.45,
    })

    expect(state).toBe<BudgetState>('approaching')
  })

  it('fails open when DB insert returns an error -- returns state without throwing', async () => {
    const { from: mockFrom } = buildAdminMock({ data: null, error: { message: 'DB down' } })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom })

    // Must not throw; must return the computed state
    const state = await recordPassCost({
      passRef: 'research:peptides',
      tokens: 256,
      apiCalls: 3,
      estimatedCost: 0.001,
    })

    expect(state).toBe<BudgetState>('ok')
    expect(safeLog.error).toHaveBeenCalled()
  })

  it('fails open when createAdminClient throws -- returns state without throwing', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('no DB credentials')
    })

    const state = await recordPassCost({
      passRef: 'research:cannabinoid',
      tokens: 256,
      apiCalls: 3,
      estimatedCost: 0.001,
    })

    expect(state).toBe<BudgetState>('ok')
    expect(safeLog.error).toHaveBeenCalled()
  })

  it('fails open when insert rejects (throws) -- returns state without throwing', async () => {
    const mockFrom = vi.fn().mockImplementation(() => ({
      insert: vi.fn().mockRejectedValue(new Error('network error')),
    }))
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom })

    const state = await recordPassCost({
      passRef: 'research:epigenetics',
      tokens: 256,
      apiCalls: 3,
      estimatedCost: 0.001,
    })

    expect(state).toBe<BudgetState>('ok')
    expect(safeLog.error).toHaveBeenCalled()
  })
})
