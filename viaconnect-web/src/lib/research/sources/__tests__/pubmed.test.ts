// src/lib/research/sources/__tests__/pubmed.test.ts
// TDD tests for the PubMed E-utilities client (Prompt 208, Task 16).
// Mocks global fetch; withAbortTimeout is called with the real fn so tests
// remain deterministic and fast (no real network).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock safeLog - must use vi.fn() inline (hoisting rule: no outer vars in factory)
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock withAbortTimeout to call fn directly for deterministic tests
vi.mock('@/lib/utils/with-timeout', () => ({
  withAbortTimeout: async (fn: (signal: AbortSignal) => Promise<unknown>) => {
    const ctrl = new AbortController()
    return fn(ctrl.signal)
  },
}))

const fetchMock = vi.fn()
globalThis.fetch = fetchMock as unknown as typeof fetch

import { safeLog } from '@/lib/utils/safe-log'

beforeEach(() => {
  fetchMock.mockReset()
  vi.mocked(safeLog.error).mockReset()
})

import { searchPubMed } from '../pubmed'

const esearchResponse = {
  esearchresult: { idlist: ['111', '222'] },
}

const esummaryResponse = {
  result: {
    '111': { title: 'A' },
    '222': { title: 'B' },
  },
}

describe('searchPubMed', () => {
  it('returns 2 RawSources with correct urls, identifiers, and sourceAuthority', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(esearchResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(esummaryResponse), { status: 200 }),
      )

    const results = await searchPubMed('MTHFR methylation')

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      title: 'A',
      url: 'https://pubmed.ncbi.nlm.nih.gov/111/',
      sourceAuthority: 'pubmed',
      identifier: '111',
    })
    expect(results[1]).toMatchObject({
      title: 'B',
      url: 'https://pubmed.ncbi.nlm.nih.gov/222/',
      sourceAuthority: 'pubmed',
      identifier: '222',
    })
  })

  it('returns [] and calls safeLog.error when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network failure'))

    const results = await searchPubMed('COMT dopamine')

    expect(results).toEqual([])
    expect(vi.mocked(safeLog.error)).toHaveBeenCalledWith(
      'research.pubmed',
      expect.any(String),
      expect.objectContaining({ error: expect.any(String) }),
    )
  })

  it('returns [] when idlist is empty', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ esearchresult: { idlist: [] } }), { status: 200 }),
    )

    const results = await searchPubMed('zxqwerty nothing')

    expect(results).toEqual([])
    // No esummary fetch should be made
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns [] and calls safeLog.error when esearch returns non-ok', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Server Error', { status: 500 }))

    const results = await searchPubMed('VDR vitamin D')

    expect(results).toEqual([])
    expect(vi.mocked(safeLog.error)).toHaveBeenCalledWith(
      'research.pubmed',
      expect.any(String),
      expect.objectContaining({ status: 500 }),
    )
  })

  it('returns [] and calls safeLog.error when esummary returns non-ok', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(esearchResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }))

    const results = await searchPubMed('MTRR folate')

    expect(results).toEqual([])
    expect(vi.mocked(safeLog.error)).toHaveBeenCalledWith(
      'research.pubmed',
      expect.any(String),
      expect.objectContaining({ status: 502 }),
    )
  })

  it('respects retmax option', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ esearchresult: { idlist: [] } }), { status: 200 }),
    )

    await searchPubMed('folate', { retmax: 5 })

    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('retmax=5')
  })
})
