// src/lib/research/__tests__/researchPass.test.ts
// TDD tests for researchPass.ts (Prompt 208, Task 17).
// All external dependencies are mocked; no live DB or network calls.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks - declared before imports so vi.mock hoisting applies.
// ---------------------------------------------------------------------------

vi.mock('@/lib/research/sources/pubmed', () => ({
  searchPubMed: vi.fn(),
}))

vi.mock('@/lib/research/sources/clinicalTrials', () => ({
  searchClinicalTrials: vi.fn(),
}))

vi.mock('@/lib/research/sources/consensus', () => ({
  searchConsensus: vi.fn(),
}))

vi.mock('@/lib/kb/embeddings', () => ({
  embedText: vi.fn(),
}))

vi.mock('@/lib/kb/knowledgeAtoms', () => ({
  upsertAtomDraft: vi.fn(),
}))

vi.mock('@/lib/kb/snpProtocolRules', () => ({
  getPublishedRules: vi.fn(),
}))

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
// Import implementations under test AFTER mocks are declared.
// ---------------------------------------------------------------------------
import {
  tierForAuthority,
  extractRsids,
  cosineSimilarity,
  runResearchPass,
  RESEARCH_DOMAINS,
  DOMAIN_QUERIES,
} from '../researchPass'

import { searchPubMed } from '@/lib/research/sources/pubmed'
import { searchClinicalTrials } from '@/lib/research/sources/clinicalTrials'
import { searchConsensus } from '@/lib/research/sources/consensus'
import { embedText } from '@/lib/kb/embeddings'
import { upsertAtomDraft } from '@/lib/kb/knowledgeAtoms'
import { getPublishedRules } from '@/lib/kb/snpProtocolRules'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAdminMock(
  existingRows: { claim: string; embedding: string | null }[] = [],
  insertError: { message: string } | null = null,
) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'knowledge_atoms') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn(),
        // Return existing rows for the dedup query
        // We use a Promise resolve approach via chaining
        __resolveData: existingRows,
      }
    }
    if (table === 'research_run_log') {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: insertError }),
      }
    }
    return {}
  })

  // More targeted mock: knowledge_atoms queries return existing rows
  const atomsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
  // Make the chain thenable - it resolves when awaited
  const atomsPromise = Promise.resolve({ data: existingRows, error: null })
  Object.assign(atomsChain, {
    then: atomsPromise.then.bind(atomsPromise),
    catch: atomsPromise.catch.bind(atomsPromise),
    finally: atomsPromise.finally.bind(atomsPromise),
  })
  ;(atomsChain.select as ReturnType<typeof vi.fn>).mockReturnValue(atomsChain)
  ;(atomsChain.eq as ReturnType<typeof vi.fn>).mockReturnValue(atomsChain)

  const logInsert = vi.fn().mockResolvedValue({ data: null, error: insertError })
  const logChain = { insert: logInsert }

  const adminClient = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'knowledge_atoms') return atomsChain
      if (table === 'research_run_log') return logChain
      return {}
    }),
  }

  return { adminClient, logInsert, atomsChain }
}

// ---------------------------------------------------------------------------
// Pure function tests
// ---------------------------------------------------------------------------

describe('tierForAuthority', () => {
  it('maps pubmed to 2', () => {
    expect(tierForAuthority('pubmed')).toBe(2)
  })

  it('maps clinicaltrials to 2', () => {
    expect(tierForAuthority('clinicaltrials')).toBe(2)
  })

  it('maps consensus to 2', () => {
    expect(tierForAuthority('consensus')).toBe(2)
  })

  it('maps open_web to 3', () => {
    expect(tierForAuthority('open_web')).toBe(3)
  })

  it('maps unknown to 3', () => {
    expect(tierForAuthority('unknown_source')).toBe(3)
  })

  it('maps empty string to 3', () => {
    expect(tierForAuthority('')).toBe(3)
  })
})

describe('extractRsids', () => {
  it('extracts multiple rsIDs', () => {
    const result = extractRsids('MTHFR rs1801133 and rs1801131')
    expect(result).toContain('rs1801133')
    expect(result).toContain('rs1801131')
    expect(result.length).toBe(2)
  })

  it('deduplicates rsIDs', () => {
    const result = extractRsids('rs1801133 repeated rs1801133 again')
    expect(result).toEqual(['rs1801133'])
  })

  it('is case-insensitive (lowercases)', () => {
    const result = extractRsids('RS1801133 and RS9939609')
    expect(result).toContain('rs1801133')
    expect(result).toContain('rs9939609')
  })

  it('returns empty array for text with no rsIDs', () => {
    expect(extractRsids('No SNPs here')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(extractRsids('')).toEqual([])
  })
})

describe('cosineSimilarity', () => {
  it('returns ~1 for identical vectors', () => {
    const v = [1, 0, 0]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5)
  })

  it('returns ~0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 5)
  })

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0)
  })

  it('handles non-unit vectors correctly', () => {
    const a = [3, 0, 0]
    const b = [5, 0, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5)
  })
})

describe('RESEARCH_DOMAINS and DOMAIN_QUERIES', () => {
  it('has 7 domains', () => {
    expect(RESEARCH_DOMAINS.length).toBe(7)
  })

  it('has a query for every domain', () => {
    for (const domain of RESEARCH_DOMAINS) {
      expect(typeof DOMAIN_QUERIES[domain]).toBe('string')
      expect(DOMAIN_QUERIES[domain].length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// runResearchPass integration tests (fully mocked)
// ---------------------------------------------------------------------------

describe('runResearchPass', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates atoms for 2 mocked sources with no existing atoms', async () => {
    // Two orthogonal vectors so neither is a near-duplicate of the other
    const vecA = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0))
    const vecB = Array.from({ length: 768 }, (_, i) => (i === 1 ? 1 : 0))

    ;(searchPubMed as ReturnType<typeof vi.fn>).mockResolvedValue([
      { title: 'Study A', url: 'https://pubmed/1', sourceAuthority: 'pubmed', identifier: '1' },
    ])
    ;(searchClinicalTrials as ReturnType<typeof vi.fn>).mockResolvedValue([
      { title: 'Trial B', url: 'https://ct/1', sourceAuthority: 'clinicaltrials', identifier: 'NCT001' },
    ])
    ;(searchConsensus as ReturnType<typeof vi.fn>).mockResolvedValue([])
    // Return different vectors per call so sources are not deduped against each other
    ;(embedText as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(vecA)
      .mockResolvedValueOnce(vecB)
    ;(upsertAtomDraft as ReturnType<typeof vi.fn>).mockResolvedValue({ inserted: true })
    ;(getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const { adminClient, logInsert } = makeAdminMock([])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await runResearchPass('methylation')

    expect(result.atomsCreated).toBe(2)
    expect(result.atomsRejected).toBe(0)
    expect(result.sourcesQueried).toEqual(['pubmed', 'clinicaltrials', 'consensus'])
    expect(result.status).toBe('ok')
    expect(result.domain).toBe('methylation')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(upsertAtomDraft).toHaveBeenCalledTimes(2)
    expect(logInsert).toHaveBeenCalledTimes(1)
  })

  it('rejects a candidate whose embedding is near-identical to an existing atom (cosine > 0.92)', async () => {
    const fixedVec = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0))
    const existingVecStr = JSON.stringify(fixedVec)

    ;(searchPubMed as ReturnType<typeof vi.fn>).mockResolvedValue([
      { title: 'Duplicate Study', url: 'https://pubmed/2', sourceAuthority: 'pubmed', identifier: '2' },
    ])
    ;(searchClinicalTrials as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(searchConsensus as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(embedText as ReturnType<typeof vi.fn>).mockResolvedValue(fixedVec)
    ;(upsertAtomDraft as ReturnType<typeof vi.fn>).mockResolvedValue({ inserted: true })
    ;(getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([])

    // Existing atom with same embedding vector
    const { adminClient } = makeAdminMock([
      { claim: 'Existing atom', embedding: existingVecStr },
    ])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await runResearchPass('methylation')

    expect(result.atomsCreated).toBe(0)
    expect(result.atomsRejected).toBe(1)
    expect(upsertAtomDraft).not.toHaveBeenCalled()
  })

  it('promotes a source to in_review when title contains an rsid matching a published rule', async () => {
    const fixedVec = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0))

    ;(searchPubMed as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        title: 'MTHFR rs1801133 methylation study',
        url: 'https://pubmed/3',
        sourceAuthority: 'pubmed',
        identifier: '3',
      },
    ])
    ;(searchClinicalTrials as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(searchConsensus as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(embedText as ReturnType<typeof vi.fn>).mockResolvedValue(fixedVec)
    ;(upsertAtomDraft as ReturnType<typeof vi.fn>).mockResolvedValue({ inserted: true })
    ;(getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'rule-1', rsid: 'rs1801133', genotype_match: 'TT', action_type: 'prefer_form', review_status: 'published' },
    ])

    const { adminClient } = makeAdminMock([])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    await runResearchPass('methylation')

    const callArg = (upsertAtomDraft as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArg.review_status).toBe('in_review')
  })

  it('never throws to caller - resolves even when sources throw', async () => {
    ;(searchPubMed as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'))
    ;(searchClinicalTrials as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('CT error'))
    ;(searchConsensus as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Consensus error'))
    ;(embedText as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const { adminClient } = makeAdminMock([])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    // Must not throw
    const result = await runResearchPass('nutrition')
    expect(result).toBeDefined()
    expect(['ok', 'partial', 'error']).toContain(result.status)
  })

  it('never throws to caller - resolves even when embedText throws unexpectedly', async () => {
    ;(searchPubMed as ReturnType<typeof vi.fn>).mockResolvedValue([
      { title: 'A study', url: 'https://pubmed/5', sourceAuthority: 'pubmed', identifier: '5' },
    ])
    ;(searchClinicalTrials as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(searchConsensus as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(embedText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Embed crash'))
    ;(getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(upsertAtomDraft as ReturnType<typeof vi.fn>).mockResolvedValue({ inserted: true })

    const { adminClient } = makeAdminMock([])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await runResearchPass('hormones')
    expect(result).toBeDefined()
    expect(['ok', 'partial', 'error']).toContain(result.status)
  })

  it('within-pass dedup: second identical source does not create a second atom', async () => {
    const fixedVec = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0))

    // Two sources with different titles but same embedding vector
    ;(searchPubMed as ReturnType<typeof vi.fn>).mockResolvedValue([
      { title: 'Study X', url: 'https://pubmed/10', sourceAuthority: 'pubmed', identifier: '10' },
      { title: 'Study Y (duplicate embedding)', url: 'https://pubmed/11', sourceAuthority: 'pubmed', identifier: '11' },
    ])
    ;(searchClinicalTrials as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(searchConsensus as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(embedText as ReturnType<typeof vi.fn>).mockResolvedValue(fixedVec)
    ;(upsertAtomDraft as ReturnType<typeof vi.fn>).mockResolvedValue({ inserted: true })
    ;(getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const { adminClient } = makeAdminMock([])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await runResearchPass('methylation')

    // First atom created, second rejected by within-pass dedup
    expect(result.atomsCreated).toBe(1)
    expect(result.atomsRejected).toBe(1)
  })

  it('counts as atomsRejected (not atomsCreated) when upsertAtomDraft returns { inserted: false } (DB-level skip)', async () => {
    // Use orthogonal vectors so cosine dedup does not trigger -- the skip comes from the DB.
    const vecA = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0))

    ;(searchPubMed as ReturnType<typeof vi.fn>).mockResolvedValue([
      { title: 'Fresh Study', url: 'https://pubmed/20', sourceAuthority: 'pubmed', identifier: '20' },
    ])
    ;(searchClinicalTrials as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(searchConsensus as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(embedText as ReturnType<typeof vi.fn>).mockResolvedValue(vecA)
    // DB already has this row (e.g. inserted in a prior pass) -- upsert skips it.
    ;(upsertAtomDraft as ReturnType<typeof vi.fn>).mockResolvedValue({ inserted: false })
    ;(getPublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const { adminClient } = makeAdminMock([])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await runResearchPass('methylation')

    expect(result.atomsCreated).toBe(0)
    expect(result.atomsRejected).toBe(1)
  })
})
