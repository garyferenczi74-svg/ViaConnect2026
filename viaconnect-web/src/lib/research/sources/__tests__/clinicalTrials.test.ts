// src/lib/research/sources/__tests__/clinicalTrials.test.ts
// TDD tests for the ClinicalTrials.gov v2 client (Prompt 208, Task 16).

import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { searchClinicalTrials } from '../clinicalTrials'

const studiesResponse = {
  studies: [
    {
      protocolSection: {
        identificationModule: {
          nctId: 'NCT12345678',
          briefTitle: 'Study of Folate Supplementation',
        },
      },
    },
    {
      protocolSection: {
        identificationModule: {
          nctId: 'NCT87654321',
          briefTitle: 'Methylation and Cardiovascular Risk',
        },
      },
    },
  ],
}

describe('searchClinicalTrials', () => {
  it('returns RawSources with nctId-based urls and correct sourceAuthority', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(studiesResponse), { status: 200 }),
    )

    const results = await searchClinicalTrials('MTHFR folate supplementation')

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      title: 'Study of Folate Supplementation',
      url: 'https://clinicaltrials.gov/study/NCT12345678',
      sourceAuthority: 'clinicaltrials',
      identifier: 'NCT12345678',
    })
    expect(results[1]).toMatchObject({
      title: 'Methylation and Cardiovascular Risk',
      url: 'https://clinicaltrials.gov/study/NCT87654321',
      sourceAuthority: 'clinicaltrials',
      identifier: 'NCT87654321',
    })
  })

  it('skips studies with no nctId', async () => {
    const responseWithMissing = {
      studies: [
        {
          protocolSection: {
            identificationModule: {
              nctId: 'NCT11111111',
              briefTitle: 'Valid Study',
            },
          },
        },
        {
          // missing nctId entirely
          protocolSection: {
            identificationModule: {
              briefTitle: 'No ID Study',
            },
          },
        },
        {
          // completely missing identificationModule
          protocolSection: {},
        },
      ],
    }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responseWithMissing), { status: 200 }),
    )

    const results = await searchClinicalTrials('vitamin D')

    expect(results).toHaveLength(1)
    expect(results[0].identifier).toBe('NCT11111111')
  })

  it('returns [] and calls safeLog.error when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('connection refused'))

    const results = await searchClinicalTrials('comt dopamine')

    expect(results).toEqual([])
    expect(vi.mocked(safeLog.error)).toHaveBeenCalledWith(
      'research.clinicaltrials',
      expect.any(String),
      expect.objectContaining({ error: expect.any(String) }),
    )
  })

  it('returns [] and calls safeLog.error when response is non-ok', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }))

    const results = await searchClinicalTrials('NOS3 nitric oxide')

    expect(results).toEqual([])
    expect(vi.mocked(safeLog.error)).toHaveBeenCalledWith(
      'research.clinicaltrials',
      expect.any(String),
      expect.objectContaining({ status: 503 }),
    )
  })

  it('returns [] when studies array is empty', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ studies: [] }), { status: 200 }),
    )

    const results = await searchClinicalTrials('rare condition xyz')

    expect(results).toEqual([])
  })

  it('respects pageSize option in the request URL', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ studies: [] }), { status: 200 }),
    )

    await searchClinicalTrials('folate', { pageSize: 5 })

    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('pageSize=5')
  })
})
