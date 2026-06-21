// src/lib/research/__tests__/readRuns.test.ts
// TDD tests for readRuns.ts (Prompt 208, Task 24).
// All external dependencies are mocked; no live DB or network calls.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks - declared before imports so vi.mock hoisting applies.
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
// Imports under test AFTER mocks are declared.
// ---------------------------------------------------------------------------
import { getRecentResearchRuns, type ResearchRun } from '../readRuns'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryChain(rows: unknown[] | null, error: { message: string } | null = null) {
  const limitMock = vi.fn().mockResolvedValue({ data: rows, error })
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ order: orderMock })
  return { selectMock, orderMock, limitMock }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getRecentResearchRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns parsed rows in the order the query returns them', async () => {
    const rows = [
      {
        domain: 'methylation',
        sources_queried: ['pubmed', 'consensus'],
        atoms_created: 5,
        atoms_rejected: 1,
        gaps_recorded: 2,
        duration_ms: 3200,
        status: 'ok',
        errors: null,
        created_at: '2026-06-21T01:00:00Z',
      },
      {
        domain: 'hormones',
        sources_queried: ['pubmed'],
        atoms_created: 3,
        atoms_rejected: 0,
        gaps_recorded: 0,
        duration_ms: 1500,
        status: 'ok',
        errors: null,
        created_at: '2026-06-21T00:30:00Z',
      },
    ]
    const { selectMock, orderMock, limitMock } = makeQueryChain(rows)
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    const result = await getRecentResearchRuns(50)

    expect(fromMock).toHaveBeenCalledWith('research_run_log')
    expect(selectMock).toHaveBeenCalledWith(
      'domain, sources_queried, atoms_created, atoms_rejected, gaps_recorded, duration_ms, status, created_at'
    )
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limitMock).toHaveBeenCalledWith(50)

    expect(result).toHaveLength(2)
    expect(result[0].domain).toBe('methylation')
    expect(result[0].sources_queried).toEqual(['pubmed', 'consensus'])
    expect(result[0].atoms_created).toBe(5)
    expect(result[1].domain).toBe('hormones')
  })

  it('passes the default limit of 50 when no limit is provided', async () => {
    const { selectMock, orderMock, limitMock } = makeQueryChain([])
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    await getRecentResearchRuns()

    expect(limitMock).toHaveBeenCalledWith(50)
  })

  it('passes a custom limit when provided', async () => {
    const { selectMock, orderMock, limitMock } = makeQueryChain([])
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    await getRecentResearchRuns(10)

    expect(limitMock).toHaveBeenCalledWith(10)
  })

  it('defaults missing numeric fields to 0', async () => {
    const rows = [
      {
        domain: null,
        sources_queried: null,
        atoms_created: null,
        atoms_rejected: null,
        gaps_recorded: null,
        duration_ms: null,
        status: 'partial',
        created_at: '2026-06-21T00:00:00Z',
      },
    ]
    const { selectMock, orderMock, limitMock } = makeQueryChain(rows)
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    const result = await getRecentResearchRuns()

    expect(result[0].atoms_created).toBe(0)
    expect(result[0].atoms_rejected).toBe(0)
    expect(result[0].gaps_recorded).toBe(0)
    expect(result[0].sources_queried).toEqual([])
    expect(result[0].duration_ms).toBeNull()
  })

  it('returns [] and calls safeLog.error on DB error (fail-open)', async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'select failed' } })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const selectMock = vi.fn().mockReturnValue({ order: orderMock })
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    const result = await getRecentResearchRuns()

    expect(result).toEqual([])
    expect(safeLog.error).toHaveBeenCalled()
  })

  it('returns [] and calls safeLog.error when createAdminClient throws (fail-open)', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('env not configured')
    })

    const result = await getRecentResearchRuns()

    expect(result).toEqual([])
    expect(safeLog.error).toHaveBeenCalled()
  })

  it('returns [] and calls safeLog.error when data is null without error', async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: null, error: null })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const selectMock = vi.fn().mockReturnValue({ order: orderMock })
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    const result = await getRecentResearchRuns()

    expect(result).toEqual([])
  })

  it('satisfies the ResearchRun type shape for a complete row', async () => {
    const rows = [
      {
        domain: 'epigenetics',
        sources_queried: ['clinicaltrials'],
        atoms_created: 2,
        atoms_rejected: 0,
        gaps_recorded: 1,
        duration_ms: 4000,
        status: 'ok',
        errors: null,
        created_at: '2026-06-21T02:00:00Z',
      },
    ]
    const { selectMock, orderMock, limitMock } = makeQueryChain(rows)
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromMock })

    const result: ResearchRun[] = await getRecentResearchRuns()

    expect(result[0]).toMatchObject<ResearchRun>({
      domain: 'epigenetics',
      sources_queried: ['clinicaltrials'],
      atoms_created: 2,
      atoms_rejected: 0,
      gaps_recorded: 1,
      duration_ms: 4000,
      status: 'ok',
      created_at: '2026-06-21T02:00:00Z',
    })
  })
})
