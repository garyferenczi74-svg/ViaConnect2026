// src/lib/research/sources/__tests__/consensus.test.ts
// TDD tests for the Consensus search client (Prompt 208, Task 16).
// Key invariant: when CONSENSUS_API_KEY is absent, fetch is NEVER called
// and NO error is logged (absence is expected, not an error).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

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

afterEach(() => {
  delete process.env.CONSENSUS_API_KEY
})

import { searchConsensus } from '../consensus'

describe('searchConsensus', () => {
  it('returns [] and does NOT call fetch when CONSENSUS_API_KEY is absent', async () => {
    delete process.env.CONSENSUS_API_KEY

    const results = await searchConsensus('folate methylation')

    expect(results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(vi.mocked(safeLog.error)).not.toHaveBeenCalled()
  })

  it('calls fetch with Authorization header when key is present', async () => {
    process.env.CONSENSUS_API_KEY = 'test-key-abc'

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 'c001',
              title: 'Consensus Paper Alpha',
              url: 'https://consensus.app/papers/c001',
              snippet: 'An excerpt.',
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const results = await searchConsensus('MTHFR health')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toContain('query=')
    expect((calledInit?.headers as Record<string, string>)?.Authorization).toBe(
      'Bearer test-key-abc',
    )

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      title: 'Consensus Paper Alpha',
      url: 'https://consensus.app/papers/c001',
      sourceAuthority: 'consensus',
      identifier: 'c001',
      snippet: 'An excerpt.',
    })
  })

  it('returns [] and calls safeLog.error when fetch throws (key present)', async () => {
    process.env.CONSENSUS_API_KEY = 'test-key-abc'
    fetchMock.mockRejectedValueOnce(new Error('network error'))

    const results = await searchConsensus('COMT')

    expect(results).toEqual([])
    expect(vi.mocked(safeLog.error)).toHaveBeenCalledWith(
      'research.consensus',
      expect.any(String),
      expect.objectContaining({ error: expect.any(String) }),
    )
  })

  it('returns [] and calls safeLog.error when response is non-ok (key present)', async () => {
    process.env.CONSENSUS_API_KEY = 'test-key-abc'
    fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

    const results = await searchConsensus('VDR')

    expect(results).toEqual([])
    expect(vi.mocked(safeLog.error)).toHaveBeenCalledWith(
      'research.consensus',
      expect.any(String),
      expect.objectContaining({ status: 401 }),
    )
  })

  it('skips results missing required fields (id, title, url)', async () => {
    process.env.CONSENSUS_API_KEY = 'test-key-abc'

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            { id: 'ok1', title: 'Complete Paper', url: 'https://consensus.app/papers/ok1' },
            { id: 'bad1', title: 'Missing URL' }, // no url
            { title: 'Missing ID', url: 'https://consensus.app/papers/bad2' }, // no id
            { id: 'bad3', url: 'https://consensus.app/papers/bad3' }, // no title
          ],
        }),
        { status: 200 },
      ),
    )

    const results = await searchConsensus('NOS3')

    expect(results).toHaveLength(1)
    expect(results[0].identifier).toBe('ok1')
  })

  it('returns [] when results array is missing from response (key present)', async () => {
    process.env.CONSENSUS_API_KEY = 'test-key-abc'
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    )

    const results = await searchConsensus('nothing')

    expect(results).toEqual([])
  })
})
