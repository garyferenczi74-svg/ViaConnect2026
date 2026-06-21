/**
 * src/lib/kb/__tests__/knowledgeQueries.test.ts
 *
 * TDD tests for knowledgeQueries.ts (Prompt 208, Phase 7, Task 19).
 *
 * Coverage:
 *   - stripPII: redacts email, phone-like run, standalone 6-digit run; keeps rsIDs
 *   - scoreCoverage: well_covered (tier 1 or 2), partial (only tier 3), gap (empty)
 *   - captureQuery: inserts with normalized = stripped; gap_topic=domain on gap;
 *     gap_topic=null on well_covered; fails open on DB error (no throw)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks hoisted before any module import.
// ---------------------------------------------------------------------------

const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockAdminClient = { from: mockFrom }

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

vi.mock('@/lib/kb/embeddings', () => ({
  embedText: vi.fn().mockResolvedValue(null),
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
import { stripPII, scoreCoverage, captureQuery } from '../knowledgeQueries'
import { embedText } from '@/lib/kb/embeddings'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// stripPII
// ---------------------------------------------------------------------------

describe('stripPII', () => {
  it('redacts an email address', () => {
    const result = stripPII('My email is user@example.com please reply')
    expect(result).not.toContain('user@example.com')
    expect(result).toContain('[redacted]')
  })

  it('redacts a US-style phone number run', () => {
    const result = stripPII('Call me at +1 (555) 867-5309 anytime')
    expect(result).not.toContain('867-5309')
    expect(result).toContain('[redacted]')
  })

  it('redacts a standalone 6-digit run', () => {
    const result = stripPII('My patient ID is 123456 and I need help')
    expect(result).not.toContain('123456')
    expect(result).toContain('[redacted]')
  })

  it('keeps rsIDs intact because they are not purely digit strings', () => {
    const result = stripPII('What does rs1801133 mean for my MTHFR status?')
    expect(result).toContain('rs1801133')
    expect(result).not.toContain('[redacted]')
  })

  it('keeps short digit runs under 5 digits', () => {
    const result = stripPII('I take 400 mg of magnesium')
    expect(result).not.toContain('[redacted]')
  })

  it('redacts multiple patterns in a single string', () => {
    const result = stripPII('Email me at pat@clinic.org or call 555-867-5309, ID=999999')
    expect(result).not.toContain('pat@clinic.org')
    expect(result).not.toContain('867-5309')
    expect(result).not.toContain('999999')
    const count = (result.match(/\[redacted\]/g) ?? []).length
    expect(count).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// scoreCoverage
// ---------------------------------------------------------------------------

describe('scoreCoverage', () => {
  it('returns well_covered when at least one atom is tier 1', () => {
    const atoms = [{ evidence_tier: 1 }, { evidence_tier: 3 }]
    const { coverage, tiersUsed } = scoreCoverage(atoms)
    expect(coverage).toBe('well_covered')
    expect(tiersUsed).toEqual([1, 3])
  })

  it('returns well_covered when at least one atom is tier 2', () => {
    const atoms = [{ evidence_tier: 2 }, { evidence_tier: 3 }]
    const { coverage, tiersUsed } = scoreCoverage(atoms)
    expect(coverage).toBe('well_covered')
    expect(tiersUsed).toEqual([2, 3])
  })

  it('returns partial when all atoms are tier 3', () => {
    const atoms = [{ evidence_tier: 3 }, { evidence_tier: 3 }]
    const { coverage, tiersUsed } = scoreCoverage(atoms)
    expect(coverage).toBe('partial')
    expect(tiersUsed).toEqual([3])
  })

  it('returns gap when atoms array is empty', () => {
    const { coverage, tiersUsed } = scoreCoverage([])
    expect(coverage).toBe('gap')
    expect(tiersUsed).toEqual([])
  })

  it('returns sorted unique tiersUsed', () => {
    const atoms = [{ evidence_tier: 3 }, { evidence_tier: 1 }, { evidence_tier: 3 }, { evidence_tier: 2 }]
    const { tiersUsed } = scoreCoverage(atoms)
    expect(tiersUsed).toEqual([1, 2, 3])
  })
})

// ---------------------------------------------------------------------------
// captureQuery
// ---------------------------------------------------------------------------

describe('captureQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('inserts with question_normalized = stripPII(questionText)', async () => {
    await captureQuery({
      userId: 'u-1',
      domain: 'genomics',
      questionText: 'My email user@test.com wants to know about MTHFR',
      answerSummary: 'MTHFR summary',
      citedAtomIds: ['atom-1'],
      coverage: 'well_covered',
      tiersUsed: [1],
    })

    expect(mockInsert).toHaveBeenCalledOnce()
    const [rows] = mockInsert.mock.calls[0]
    const row = Array.isArray(rows) ? rows[0] : rows
    expect(row.question_normalized).not.toContain('user@test.com')
    expect(row.question_normalized).toContain('[redacted]')
    // Original text preserved in question_text
    expect(row.question_text).toContain('user@test.com')
  })

  it('sets gap_topic to domain when coverage is gap', async () => {
    await captureQuery({
      userId: 'u-1',
      domain: 'longevity',
      questionText: 'What supplements extend lifespan?',
      answerSummary: 'No grounded answer.',
      citedAtomIds: [],
      coverage: 'gap',
      tiersUsed: [],
    })

    expect(mockInsert).toHaveBeenCalledOnce()
    const [rows] = mockInsert.mock.calls[0]
    const row = Array.isArray(rows) ? rows[0] : rows
    expect(row.gap_topic).toBe('longevity')
  })

  it('sets gap_topic to domain when coverage is partial', async () => {
    await captureQuery({
      userId: 'u-2',
      domain: 'nutraceuticals',
      questionText: 'Does resveratrol help?',
      answerSummary: 'Emerging evidence only.',
      citedAtomIds: ['atom-9'],
      coverage: 'partial',
      tiersUsed: [3],
    })

    const [rows] = mockInsert.mock.calls[0]
    const row = Array.isArray(rows) ? rows[0] : rows
    expect(row.gap_topic).toBe('nutraceuticals')
  })

  it('sets gap_topic to null when coverage is well_covered', async () => {
    await captureQuery({
      userId: 'u-3',
      domain: 'genomics',
      questionText: 'rs1801133 interpretation',
      answerSummary: 'Full answer grounded in tier-1 evidence.',
      citedAtomIds: ['atom-5', 'atom-6'],
      coverage: 'well_covered',
      tiersUsed: [1],
    })

    const [rows] = mockInsert.mock.calls[0]
    const row = Array.isArray(rows) ? rows[0] : rows
    expect(row.gap_topic).toBeNull()
  })

  it('uses explicit gapTopic override when provided', async () => {
    await captureQuery({
      userId: 'u-4',
      domain: 'genomics',
      questionText: 'COMT question',
      answerSummary: 'Partial.',
      citedAtomIds: [],
      coverage: 'partial',
      tiersUsed: [3],
      gapTopic: 'COMT_methylation',
    })

    const [rows] = mockInsert.mock.calls[0]
    const row = Array.isArray(rows) ? rows[0] : rows
    expect(row.gap_topic).toBe('COMT_methylation')
  })

  it('calls embedText with the normalized question', async () => {
    await captureQuery({
      userId: 'u-5',
      domain: 'genomics',
      questionText: 'What is MTHFR?',
      answerSummary: 'A gene.',
      citedAtomIds: [],
      coverage: 'gap',
      tiersUsed: [],
    })

    expect(embedText).toHaveBeenCalledWith('What is MTHFR?')
  })

  it('fails open on DB error - does not throw', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB connection refused' } })

    await expect(
      captureQuery({
        userId: 'u-6',
        domain: 'genomics',
        questionText: 'What is COMT?',
        answerSummary: 'An enzyme.',
        citedAtomIds: [],
        coverage: 'gap',
        tiersUsed: [],
      }),
    ).resolves.toBeUndefined()

    expect(safeLog.error).toHaveBeenCalled()
  })

  it('fails open when embedText throws - does not propagate the error', async () => {
    ;(embedText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('embed failure'))

    await expect(
      captureQuery({
        userId: 'u-7',
        domain: 'genomics',
        questionText: 'What is VDR?',
        answerSummary: 'Vitamin D receptor.',
        citedAtomIds: [],
        coverage: 'gap',
        tiersUsed: [],
      }),
    ).resolves.toBeUndefined()
  })
})
