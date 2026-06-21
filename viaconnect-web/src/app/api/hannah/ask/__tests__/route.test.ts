/**
 * src/app/api/hannah/ask/__tests__/route.test.ts
 *
 * TDD tests for POST /api/hannah/ask (Prompt 208, Phase 7, Task 19).
 *
 * Coverage:
 *   - 401 when unauthenticated
 *   - 400 on bad body (missing question or invalid domain)
 *   - 200 with emerging:false when tier-2 atoms returned (coverage well_covered)
 *   - 200 with emerging:true when no atoms (coverage gap), gap_topic captured
 *   - 200 fallback answer when generateGroundedAnswer throws (fail-open)
 *   - captureQuery always called with correct args
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks - all hoisted before imports.
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/kb/knowledgeAtoms', () => ({
  getPublishedAtoms: vi.fn(),
}))

vi.mock('@/app/api/hannah/ask/route', async (importOriginal) => {
  // We need to mock generateGroundedAnswer which lives inside the module.
  // Instead we mock the module at the engine level used by generateGroundedAnswer.
  return importOriginal()
})

// Mock the engine used by generateGroundedAnswer inside the route.
vi.mock('@/lib/ai/hannah/ultrathink/engine', () => ({
  runUltrathink: vi.fn(),
}))

vi.mock('@/lib/kb/knowledgeQueries', () => ({
  scoreCoverage: vi.fn(),
  captureQuery: vi.fn().mockResolvedValue(undefined),
  stripPII: vi.fn((t: string) => t),
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
import { POST } from '../route'
import { getPublishedAtoms } from '@/lib/kb/knowledgeAtoms'
import { scoreCoverage, captureQuery } from '@/lib/kb/knowledgeQueries'
import { runUltrathink } from '@/lib/ai/hannah/ultrathink/engine'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/hannah/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const AUTHED_USER = { id: 'user-abc-123' }

function mockAuth(user: typeof AUTHED_USER | null) {
  mockGetUser.mockResolvedValue({ data: { user } })
}

function mockAtoms(atoms: Array<{ id: string; evidence_tier: number; domain: string }>) {
  ;(getPublishedAtoms as ReturnType<typeof vi.fn>).mockResolvedValue(atoms)
}

function mockScore(result: { coverage: string; tiersUsed: number[] }) {
  ;(scoreCoverage as ReturnType<typeof vi.fn>).mockReturnValue(result)
}

function mockEngine(answer: string) {
  ;(runUltrathink as ReturnType<typeof vi.fn>).mockResolvedValue({
    answer,
    tier: 'fast',
    citations: [],
    confidence: 0.9,
    critiquePassed: true,
    critiqueNotes: '',
    latencyMs: 100,
    inputTokens: 10,
    outputTokens: 20,
  })
}

// ---------------------------------------------------------------------------
// Tests - authentication
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session user', async () => {
    mockAuth(null)

    const req = makeRequest({ question: 'What is MTHFR?', domain: 'genomics' })
    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(captureQuery).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tests - body validation
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - body validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth(AUTHED_USER)
  })

  it('returns 400 when question is missing', async () => {
    const req = makeRequest({ domain: 'genomics' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when question is empty string', async () => {
    const req = makeRequest({ question: '   ', domain: 'genomics' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when domain is invalid', async () => {
    const req = makeRequest({ question: 'What is MTHFR?', domain: 'astrology' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when domain is missing', async () => {
    const req = makeRequest({ question: 'What is MTHFR?' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Tests - happy path: well_covered
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - tier-2 atoms (well_covered)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth(AUTHED_USER)
    mockAtoms([
      { id: 'atom-1', evidence_tier: 2, domain: 'methylation' },
      { id: 'atom-2', evidence_tier: 1, domain: 'methylation' },
    ])
    mockScore({ coverage: 'well_covered', tiersUsed: [1, 2] })
    mockEngine('MTHFR affects folate metabolism.')
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  it('returns 200 with emerging:false', async () => {
    const req = makeRequest({ question: 'What is MTHFR?', domain: 'genomics' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.emerging).toBe(false)
  })

  it('returns coverage well_covered in response', async () => {
    const req = makeRequest({ question: 'What is MTHFR?', domain: 'genomics' })
    const res = await POST(req)
    const body = await res.json()
    expect(body.coverage).toBe('well_covered')
  })

  it('returns citedAtomIds in response', async () => {
    const req = makeRequest({ question: 'What is MTHFR?', domain: 'genomics' })
    const res = await POST(req)
    const body = await res.json()
    expect(body.citedAtomIds).toEqual(['atom-1', 'atom-2'])
  })

  it('calls captureQuery with coverage well_covered', async () => {
    const req = makeRequest({ question: 'What is MTHFR?', domain: 'genomics' })
    await POST(req)
    expect(captureQuery).toHaveBeenCalledOnce()
    const args = (captureQuery as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(args.coverage).toBe('well_covered')
    expect(args.userId).toBe(AUTHED_USER.id)
    expect(args.domain).toBe('genomics')
  })

  it('maps genomics domain to methylation for getPublishedAtoms', async () => {
    const req = makeRequest({ question: 'What is MTHFR?', domain: 'genomics' })
    await POST(req)
    expect(getPublishedAtoms).toHaveBeenCalledWith({ domain: 'methylation' })
  })
})

// ---------------------------------------------------------------------------
// Tests - gap path (no atoms)
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - no atoms (gap)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth(AUTHED_USER)
    mockAtoms([])
    mockScore({ coverage: 'gap', tiersUsed: [] })
    mockEngine('I do not have grounded information on that topic yet.')
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  it('returns 200 with emerging:true when no atoms', async () => {
    const req = makeRequest({ question: 'Will NAD+ reverse aging?', domain: 'longevity' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.emerging).toBe(true)
  })

  it('calls captureQuery with coverage gap', async () => {
    const req = makeRequest({ question: 'Will NAD+ reverse aging?', domain: 'longevity' })
    await POST(req)
    expect(captureQuery).toHaveBeenCalledOnce()
    const args = (captureQuery as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(args.coverage).toBe('gap')
  })

  it('maps longevity domain to longevity for getPublishedAtoms', async () => {
    const req = makeRequest({ question: 'Will NAD+ reverse aging?', domain: 'longevity' })
    await POST(req)
    expect(getPublishedAtoms).toHaveBeenCalledWith({ domain: 'longevity' })
  })

  it('maps weightloss domain to nutrition for getPublishedAtoms', async () => {
    const req = makeRequest({ question: 'What helps weight loss?', domain: 'weightloss' })
    await POST(req)
    expect(getPublishedAtoms).toHaveBeenCalledWith({ domain: 'nutrition' })
  })

  it('maps biohacking domain to epigenetics for getPublishedAtoms', async () => {
    const req = makeRequest({ question: 'What is autophagy?', domain: 'biohacking' })
    await POST(req)
    expect(getPublishedAtoms).toHaveBeenCalledWith({ domain: 'epigenetics' })
  })

  it('maps athletics domain to hormones for getPublishedAtoms', async () => {
    const req = makeRequest({ question: 'How does testosterone affect recovery?', domain: 'athletics' })
    await POST(req)
    expect(getPublishedAtoms).toHaveBeenCalledWith({ domain: 'hormones' })
  })

  it('maps nutraceuticals domain to nutrition for getPublishedAtoms', async () => {
    const req = makeRequest({ question: 'What does omega-3 do?', domain: 'nutraceuticals' })
    await POST(req)
    expect(getPublishedAtoms).toHaveBeenCalledWith({ domain: 'nutrition' })
  })
})

// ---------------------------------------------------------------------------
// Tests - fail-open: generateGroundedAnswer throws
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - generateGroundedAnswer throws (fail-open)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth(AUTHED_USER)
    mockAtoms([{ id: 'atom-3', evidence_tier: 2, domain: 'methylation' }])
    mockScore({ coverage: 'well_covered', tiersUsed: [2] })
    ;(runUltrathink as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('AI service unavailable'))
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  it('still returns 200 when engine throws', async () => {
    const req = makeRequest({ question: 'Tell me about COMT', domain: 'genomics' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns a fallback answer with emerging:true when engine throws', async () => {
    const req = makeRequest({ question: 'Tell me about COMT', domain: 'genomics' })
    const res = await POST(req)
    const body = await res.json()
    expect(body.emerging).toBe(true)
    expect(typeof body.answer).toBe('string')
    expect(body.answer.length).toBeGreaterThan(0)
  })

  it('still attempts captureQuery when engine throws', async () => {
    const req = makeRequest({ question: 'Tell me about COMT', domain: 'genomics' })
    await POST(req)
    expect(captureQuery).toHaveBeenCalledOnce()
  })

  it('calls safeLog.error when engine throws', async () => {
    const req = makeRequest({ question: 'Tell me about COMT', domain: 'genomics' })
    await POST(req)
    expect(safeLog.error).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tests - domain mapping edge cases
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - all valid domains accepted', () => {
  const validDomains = ['genomics', 'nutraceuticals', 'biohacking', 'athletics', 'weightloss', 'longevity']

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth(AUTHED_USER)
    mockAtoms([])
    mockScore({ coverage: 'gap', tiersUsed: [] })
    mockEngine('Educational response.')
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  for (const domain of validDomains) {
    it(`accepts domain: ${domain}`, async () => {
      const req = makeRequest({ question: 'Tell me something', domain })
      const res = await POST(req)
      expect(res.status).toBe(200)
    })
  }
})
