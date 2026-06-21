// src/lib/research/__tests__/gapScheduler.test.ts
// TDD tests for gapScheduler.ts (Prompt 208, Task 17).
// All external dependencies are mocked; no live DB or network calls.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks - before imports so vi.mock hoisting applies.
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
// Imports under test.
// ---------------------------------------------------------------------------
import { nextDomains } from '../gapScheduler'
import { RESEARCH_DOMAINS } from '../researchPass'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GapRow = { domain: string }

function makeAdminMockWithGaps(rows: GapRow[], error: { message: string } | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
  const promise = Promise.resolve({ data: error ? null : rows, error })
  Object.assign(chain, {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  })
  ;(chain.select as ReturnType<typeof vi.fn>).mockReturnValue(chain)
  ;(chain.eq as ReturnType<typeof vi.fn>).mockReturnValue(chain)

  return {
    from: vi.fn().mockReturnValue(chain),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('nextDomains', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all 7 research domains in the result', async () => {
    const adminClient = makeAdminMockWithGaps([])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await nextDomains()
    expect(result.length).toBe(RESEARCH_DOMAINS.length)
    for (const domain of RESEARCH_DOMAINS) {
      expect(result).toContain(domain)
    }
  })

  it('puts a domain with more gaps first', async () => {
    // genomics maps to methylation (3 gaps), nutraceuticals maps to nutrition (1 gap)
    const rows: GapRow[] = [
      { domain: 'genomics' },
      { domain: 'genomics' },
      { domain: 'genomics' },
      { domain: 'nutraceuticals' },
    ]
    const adminClient = makeAdminMockWithGaps(rows)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await nextDomains()
    expect(result[0]).toBe('methylation')
    // 'nutrition' also has a gap (from nutraceuticals); it should appear before no-gap domains
    expect(result.indexOf('nutrition')).toBeLessThan(result.indexOf('hormones'))
  })

  it('returns natural order when DB errors', async () => {
    const adminClient = makeAdminMockWithGaps([], { message: 'DB down' })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await nextDomains()
    expect(result).toEqual([...RESEARCH_DOMAINS])
  })

  it('maps all 6 conversational domains to research domains correctly', async () => {
    // Each of the 6 conversational domains should map without error
    const rows: GapRow[] = [
      { domain: 'genomics' },      // -> methylation
      { domain: 'nutraceuticals' }, // -> nutrition
      { domain: 'biohacking' },    // -> epigenetics
      { domain: 'athletics' },     // -> hormones
      { domain: 'weightloss' },    // -> nutrition
      { domain: 'longevity' },     // -> longevity
    ]
    const adminClient = makeAdminMockWithGaps(rows)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await nextDomains()
    // All 7 research domains must still appear
    expect(result.length).toBe(7)
    // nutrition has 2 gaps (nutraceuticals + weightloss), methylation=1, hormones=1, epigenetics=1, longevity=1
    // So nutrition should be first
    expect(result[0]).toBe('nutrition')
  })

  it('domains with no gaps are still included, appended in natural order', async () => {
    const rows: GapRow[] = [
      { domain: 'genomics' }, // -> methylation
    ]
    const adminClient = makeAdminMockWithGaps(rows)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await nextDomains()
    // methylation should be first (has gap)
    expect(result[0]).toBe('methylation')
    // All 7 must be present
    expect(result.length).toBe(7)
    // No-gap domains appear after methylation in their natural order
    const noGapDomains = RESEARCH_DOMAINS.filter((d) => d !== 'methylation')
    const resultAfterFirst = result.slice(1)
    // Each no-gap domain should appear in the same relative order as RESEARCH_DOMAINS
    let lastIdx = -1
    for (const d of noGapDomains) {
      const idx = resultAfterFirst.indexOf(d)
      expect(idx).toBeGreaterThan(lastIdx)
      lastIdx = idx
    }
  })
})
