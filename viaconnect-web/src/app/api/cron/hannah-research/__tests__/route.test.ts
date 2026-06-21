// src/app/api/cron/hannah-research/__tests__/route.test.ts
// TDD tests for the hannah-research cron route (Prompt 208, Task 18b).
// All external dependencies are mocked; no live DB or network calls.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks - before imports so vi.mock hoisting applies.
// ---------------------------------------------------------------------------

vi.mock('@/lib/research/gapScheduler', () => ({
  nextDomains: vi.fn(),
}))

vi.mock('@/lib/research/researchPass', () => ({
  runResearchPass: vi.fn(),
}))

vi.mock('@/lib/research/heartbeat', () => ({
  writeHeartbeat: vi.fn(),
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
import { GET } from '../route'
import { nextDomains } from '@/lib/research/gapScheduler'
import { runResearchPass } from '@/lib/research/researchPass'
import { writeHeartbeat } from '@/lib/research/heartbeat'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SECRET = 'test-cron-secret-abc123'

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new Request('http://localhost/api/cron/hannah-research', { headers })
}

function makeRunResult(overrides: Partial<{
  domain: string
  atomsCreated: number
  atomsRejected: number
  sourcesQueried: string[]
  status: 'ok' | 'partial' | 'error'
  durationMs: number
}> = {}) {
  return {
    domain: 'methylation',
    atomsCreated: 2,
    atomsRejected: 0,
    sourcesQueried: ['pubmed', 'clinicaltrials', 'consensus'],
    status: 'ok' as const,
    durationMs: 450,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/cron/hannah-research - auth', () => {
  let origSecret: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    origSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = VALID_SECRET
  })

  afterEach(() => {
    if (origSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = origSecret
    }
  })

  it('returns 401 when Authorization header is absent', async () => {
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(runResearchPass).not.toHaveBeenCalled()
  })

  it('returns 401 when token is wrong', async () => {
    const req = makeRequest('Bearer wrong-token')
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(runResearchPass).not.toHaveBeenCalled()
  })

  it('returns 401 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET
    const req = makeRequest(`Bearer ${VALID_SECRET}`)
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(runResearchPass).not.toHaveBeenCalled()
  })

  it('returns 401 even when Bearer is empty string (CRON_SECRET unset)', async () => {
    delete process.env.CRON_SECRET
    const req = makeRequest('Bearer ')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/cron/hannah-research - success path', () => {
  let origSecret: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    origSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = VALID_SECRET
    ;(nextDomains as ReturnType<typeof vi.fn>).mockResolvedValue(['methylation', 'nutrition'])
    ;(runResearchPass as ReturnType<typeof vi.fn>).mockResolvedValue(makeRunResult())
    ;(writeHeartbeat as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (origSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = origSecret
    }
  })

  it('returns 200 with ok:true and calls runResearchPass with first domain', async () => {
    const req = makeRequest(`Bearer ${VALID_SECRET}`)
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.domain).toBe('methylation')
    expect(body.result).toBeDefined()
    expect(runResearchPass).toHaveBeenCalledWith('methylation')
  })

  it('calls writeHeartbeat with hannah, ok, and pass details', async () => {
    const req = makeRequest(`Bearer ${VALID_SECRET}`)
    await GET(req)

    expect(writeHeartbeat).toHaveBeenCalledOnce()
    const [agent, status, detail] = (writeHeartbeat as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(agent).toBe('hannah')
    expect(status).toBe('ok')
    expect(detail).toMatchObject({ domain: 'methylation', atomsCreated: 2 })
  })

  it('falls back to methylation domain when nextDomains returns empty', async () => {
    ;(nextDomains as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const req = makeRequest(`Bearer ${VALID_SECRET}`)
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(runResearchPass).toHaveBeenCalledWith('methylation')
  })

  it('calls writeHeartbeat with error status when runResearchPass returns status error', async () => {
    ;(runResearchPass as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeRunResult({ status: 'error', atomsCreated: 0 })
    )

    const req = makeRequest(`Bearer ${VALID_SECRET}`)
    const res = await GET(req)

    expect(res.status).toBe(200)
    const [, status] = (writeHeartbeat as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(status).toBe('error')
  })
})

describe('GET /api/cron/hannah-research - fail-open on pass error', () => {
  let origSecret: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    origSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = VALID_SECRET
    ;(nextDomains as ReturnType<typeof vi.fn>).mockResolvedValue(['methylation'])
    ;(writeHeartbeat as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (origSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = origSecret
    }
  })

  it('returns 200 with ok:false when runResearchPass throws (fail-open)', async () => {
    ;(runResearchPass as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network failure'))

    const req = makeRequest(`Bearer ${VALID_SECRET}`)
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  it('calls writeHeartbeat with error when runResearchPass throws', async () => {
    ;(runResearchPass as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network failure'))

    const req = makeRequest(`Bearer ${VALID_SECRET}`)
    await GET(req)

    expect(writeHeartbeat).toHaveBeenCalledOnce()
    const [agent, status] = (writeHeartbeat as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(agent).toBe('hannah')
    expect(status).toBe('error')
  })

  it('calls safeLog.error when runResearchPass throws', async () => {
    ;(runResearchPass as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'))

    const req = makeRequest(`Bearer ${VALID_SECRET}`)
    await GET(req)

    expect(safeLog.error).toHaveBeenCalled()
  })
})
