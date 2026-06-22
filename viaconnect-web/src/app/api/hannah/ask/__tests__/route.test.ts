/**
 * src/app/api/hannah/ask/__tests__/route.test.ts
 *
 * TDD tests for POST /api/hannah/ask (Prompt 208, Phase 7, Task 19 + Task I4).
 *
 * Coverage:
 *   - 401 when unauthenticated
 *   - 400 on bad body (missing question or invalid domain)
 *   - 200 with emerging:false when tier-2 atoms returned (coverage well_covered)
 *   - 200 with emerging:true when no atoms (coverage gap), gap_topic captured
 *   - 200 fallback answer when generateGroundedAnswer throws (fail-open)
 *   - captureQuery always called with correct args
 *   - callHannahQaModel receives HANNAH_208_QA_DIRECTIVE as system prompt (T19 review)
 *   Task I4:
 *   - 429 when per-user rate limit exceeded (no model call)
 *   - different user not limited by another user's quota
 *   - jurisdiction forwarded to reviewServerText (CA -> CA)
 *   - BLOCKED verdict replaces answer with FALLBACK
 *   - ESCALATE verdict replaces answer with FALLBACK
 *   - CONDITIONAL with rewrite uses rewrite text
 *   - APPROVED keeps original answer
 *   - reviewServerText throws -> fail-open, 200, original answer kept
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

// Task I4: mock compliance helpers
const mockReviewServerText = vi.fn()
const mockGetUserJurisdictionCode = vi.fn()

vi.mock('@/lib/compliance/review-server-text', () => ({
  reviewServerText: (...args: unknown[]) => mockReviewServerText(...args),
}))

vi.mock('@/lib/compliance/jurisdiction', () => ({
  getUserJurisdictionCode: (...args: unknown[]) => mockGetUserJurisdictionCode(...args),
}))

// Task I4: expose resetAskRateLimit so tests can clear per-user state
import { resetAskRateLimitForTesting } from '../route'

// ---------------------------------------------------------------------------
// Imports under test.
// ---------------------------------------------------------------------------
import { POST, callHannahQaModel } from '../route'
import { getPublishedAtoms } from '@/lib/kb/knowledgeAtoms'
import { scoreCoverage, captureQuery } from '@/lib/kb/knowledgeQueries'
import { safeLog } from '@/lib/utils/safe-log'
import { HANNAH_208_QA_DIRECTIVE } from '@/lib/ai/hannah/ultrathink/prompts/ultrathink-system'

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

/**
 * Build a minimal fetch Response that callHannahQaModel will accept as a
 * successful Anthropic API response returning the given answer text.
 */
function buildAnthropicResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      content: [{ type: 'text', text }],
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

/**
 * Set up compliance mocks to pass through without modifying the answer.
 * Required in any test that allows the route to reach the compliance post-check.
 */
function mockCompliancePassthrough() {
  mockGetUserJurisdictionCode.mockResolvedValue('US')
  mockReviewServerText.mockResolvedValue({
    decision: 'pass_stage_1',
    text: null, // pass_stage_1 keeps the original; text is not used
    sanitized: false,
    stage_1_score: 0,
    stage_1_flag_count: 0,
  })
}

// ---------------------------------------------------------------------------
// Tests - authentication
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAskRateLimitForTesting()
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
    resetAskRateLimitForTesting()
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
// Mocks fetch so callHannahQaModel can be exercised without a network call,
// and so we can assert the system prompt passed to the Anthropic API body.
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - tier-2 atoms (well_covered)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetAskRateLimitForTesting()
    mockAuth(AUTHED_USER)
    mockAtoms([
      { id: 'atom-1', evidence_tier: 2, domain: 'methylation' },
      { id: 'atom-2', evidence_tier: 1, domain: 'methylation' },
    ])
    mockScore({ coverage: 'well_covered', tiersUsed: [1, 2] })
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    mockCompliancePassthrough()
    // Mock global fetch to intercept the Anthropic API call inside
    // callHannahQaModel and return a canned success response.
    process.env.ANTHROPIC_API_KEY = 'test-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildAnthropicResponse('MTHFR affects folate metabolism.'),
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    delete process.env.ANTHROPIC_API_KEY
    resetAskRateLimitForTesting()
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

  it('passes HANNAH_208_QA_DIRECTIVE as the system field in the Anthropic API body', async () => {
    const req = makeRequest({ question: 'What is MTHFR?', domain: 'genomics' })
    await POST(req)
    // fetch must have been called once (the Anthropic API call inside callHannahQaModel).
    expect(fetchSpy).toHaveBeenCalledOnce()
    const [, fetchInit] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const requestBody = JSON.parse(fetchInit.body as string) as Record<string, unknown>
    // The system field in the Anthropic request body must contain the full directive.
    expect(typeof requestBody.system).toBe('string')
    expect(requestBody.system as string).toContain(HANNAH_208_QA_DIRECTIVE)
    // Spot-check a distinctive phrase from the weight-loss guardrail.
    expect(requestBody.system as string).toContain('WEIGHT LOSS GUARDRAIL')
  })
})

// ---------------------------------------------------------------------------
// Tests - gap path (no atoms)
// ---------------------------------------------------------------------------

describe('POST /api/hannah/ask - no atoms (gap)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetAskRateLimitForTesting()
    mockAuth(AUTHED_USER)
    mockAtoms([])
    mockScore({ coverage: 'gap', tiersUsed: [] })
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    mockCompliancePassthrough()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildAnthropicResponse('I do not have grounded information on that topic yet.'),
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    delete process.env.ANTHROPIC_API_KEY
    resetAskRateLimitForTesting()
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
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetAskRateLimitForTesting()
    mockAuth(AUTHED_USER)
    mockAtoms([{ id: 'atom-3', evidence_tier: 2, domain: 'methylation' }])
    mockScore({ coverage: 'well_covered', tiersUsed: [2] })
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    // No compliance mock needed: answerFailed=true skips the compliance post-check.
    // Make fetch throw so callHannahQaModel propagates the error through
    // generateGroundedAnswer up to the POST handler's fail-open catch block.
    process.env.ANTHROPIC_API_KEY = 'test-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('AI service unavailable'))
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    delete process.env.ANTHROPIC_API_KEY
    resetAskRateLimitForTesting()
  })

  it('still returns 200 when callHannahQaModel throws', async () => {
    const req = makeRequest({ question: 'Tell me about COMT', domain: 'genomics' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns a fallback answer with emerging:true when callHannahQaModel throws', async () => {
    const req = makeRequest({ question: 'Tell me about COMT', domain: 'genomics' })
    const res = await POST(req)
    const body = await res.json()
    expect(body.emerging).toBe(true)
    expect(typeof body.answer).toBe('string')
    expect(body.answer.length).toBeGreaterThan(0)
  })

  it('still attempts captureQuery when callHannahQaModel throws', async () => {
    const req = makeRequest({ question: 'Tell me about COMT', domain: 'genomics' })
    await POST(req)
    expect(captureQuery).toHaveBeenCalledOnce()
  })

  it('calls safeLog.error when callHannahQaModel throws', async () => {
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
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetAskRateLimitForTesting()
    mockAuth(AUTHED_USER)
    mockAtoms([])
    mockScore({ coverage: 'gap', tiersUsed: [] })
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    mockCompliancePassthrough()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildAnthropicResponse('Educational response.'),
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    delete process.env.ANTHROPIC_API_KEY
    resetAskRateLimitForTesting()
  })

  for (const domain of validDomains) {
    it(`accepts domain: ${domain}`, async () => {
      const req = makeRequest({ question: 'Tell me something', domain })
      const res = await POST(req)
      expect(res.status).toBe(200)
    })
  }
})

// ---------------------------------------------------------------------------
// Tests - callHannahQaModel unit tests (exported helper)
// ---------------------------------------------------------------------------

describe('callHannahQaModel - unit', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    fetchSpy?.mockRestore()
    delete process.env.ANTHROPIC_API_KEY
  })

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    await expect(callHannahQaModel('system', 'user')).rejects.toThrow('ANTHROPIC_API_KEY is not configured')
  })

  it('throws when the Anthropic API returns a non-ok status', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 }),
    )
    await expect(callHannahQaModel('system', 'user')).rejects.toThrow('Anthropic API error 400')
  })

  it('returns the text from the first text content block', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildAnthropicResponse('Hello world'),
    )
    const result = await callHannahQaModel('my system prompt', 'my user text')
    expect(result).toBe('Hello world')
  })

  it('sends the system argument as the system field in the request body', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildAnthropicResponse('ok'),
    )
    await callHannahQaModel('DIRECTIVE TEXT', 'user question')
    const [, fetchInit] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(fetchInit.body as string) as Record<string, unknown>
    expect(body.system).toBe('DIRECTIVE TEXT')
    expect((body.messages as Array<{ role: string; content: string }>)[0].content).toBe('user question')
  })
})

// ---------------------------------------------------------------------------
// Task I4 - per-user rate limit
// ---------------------------------------------------------------------------

const RATE_USER = { id: 'rate-user-001' }
const RATE_USER_2 = { id: 'rate-user-002' }

// Default mock setup shared by rate-limit describe blocks.
function setupRateLimitDefaults(fetchSpy: { mockResolvedValue: (v: Response) => unknown }) {
  mockAtoms([])
  mockScore({ coverage: 'gap', tiersUsed: [] })
  ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  mockGetUserJurisdictionCode.mockResolvedValue('US')
  mockReviewServerText.mockResolvedValue({ decision: 'pass_stage_1', text: 'Educational response.', sanitized: false, stage_1_score: 0, stage_1_flag_count: 0 })
  process.env.ANTHROPIC_API_KEY = 'test-key'
  fetchSpy.mockResolvedValue(buildAnthropicResponse('Educational response.'))
}

describe('POST /api/hannah/ask - rate limit (Task I4)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  const ASK_RATE_LIMIT = 15 // must match the constant in the route

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    resetAskRateLimitForTesting()
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    delete process.env.ANTHROPIC_API_KEY
    resetAskRateLimitForTesting()
  })

  it('returns 200 for requests within the rate limit', async () => {
    mockAuth(RATE_USER)
    setupRateLimitDefaults(fetchSpy)
    const req = makeRequest({ question: 'Tell me something', domain: 'genomics' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 429 on the (limit+1)th request from the same user', async () => {
    mockAuth(RATE_USER)
    setupRateLimitDefaults(fetchSpy)

    for (let i = 0; i < ASK_RATE_LIMIT; i++) {
      const req = makeRequest({ question: 'Tell me something', domain: 'genomics' })
      const res = await POST(req)
      expect(res.status).toBe(200)
    }

    const req = makeRequest({ question: 'One more', domain: 'genomics' })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('does not call the model when rate-limited', async () => {
    mockAuth(RATE_USER)
    setupRateLimitDefaults(fetchSpy)
    fetchSpy.mockClear()

    for (let i = 0; i < ASK_RATE_LIMIT; i++) {
      const req = makeRequest({ question: 'Tell me something', domain: 'genomics' })
      await POST(req)
    }
    fetchSpy.mockClear()

    const req = makeRequest({ question: 'Blocked', domain: 'genomics' })
    await POST(req)
    // fetch (Anthropic API) must NOT have been called for the blocked request
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('429 response body contains error and retryAfter fields', async () => {
    mockAuth(RATE_USER)
    setupRateLimitDefaults(fetchSpy)

    for (let i = 0; i < ASK_RATE_LIMIT; i++) {
      await POST(makeRequest({ question: 'q', domain: 'genomics' }))
    }
    const res = await POST(makeRequest({ question: 'q', domain: 'genomics' }))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(typeof body.error).toBe('string')
    expect(typeof body.retryAfter).toBe('number')
  })

  it('a different user is NOT rate-limited by the first user hitting the limit', async () => {
    // Exhaust user 1
    mockGetUser.mockResolvedValue({ data: { user: RATE_USER } })
    setupRateLimitDefaults(fetchSpy)
    for (let i = 0; i < ASK_RATE_LIMIT; i++) {
      await POST(makeRequest({ question: 'q', domain: 'genomics' }))
    }

    // Switch to user 2 - must not be limited
    mockGetUser.mockResolvedValue({ data: { user: RATE_USER_2 } })
    const res = await POST(makeRequest({ question: 'Am I blocked?', domain: 'genomics' }))
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Task I4 - jurisdiction-aware compliance post-check
// ---------------------------------------------------------------------------

const FALLBACK_SUBSTRING = 'qualified healthcare practitioner'

describe('POST /api/hannah/ask - jurisdiction compliance post-check (Task I4)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth(AUTHED_USER)
    mockAtoms([])
    mockScore({ coverage: 'gap', tiersUsed: [] })
    ;(captureQuery as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    process.env.ANTHROPIC_API_KEY = 'test-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildAnthropicResponse('Raw model answer about MTHFR.'),
    )
    resetAskRateLimitForTesting()
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    delete process.env.ANTHROPIC_API_KEY
    resetAskRateLimitForTesting()
  })

  it('calls getUserJurisdictionCode to resolve the user jurisdiction', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockResolvedValue({ decision: 'pass_stage_1', text: 'Raw model answer about MTHFR.', sanitized: false, stage_1_score: 0, stage_1_flag_count: 0 })
    await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(mockGetUserJurisdictionCode).toHaveBeenCalledOnce()
  })

  it('passes the resolved jurisdiction code to reviewServerText', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('CA')
    mockReviewServerText.mockResolvedValue({ decision: 'pass_stage_1', text: 'Raw model answer about MTHFR.', sanitized: false, stage_1_score: 0, stage_1_flag_count: 0 })
    await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(mockReviewServerText).toHaveBeenCalledOnce()
    const callArg = mockReviewServerText.mock.calls[0][0] as { jurisdiction: string }
    expect(callArg.jurisdiction).toBe('CA')
  })

  it('BLOCKED verdict: response answer is the FALLBACK, not the raw model answer', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockResolvedValue({ decision: 'BLOCKED', text: null, sanitized: false, stage_1_score: 5, stage_1_flag_count: 2 })
    const res = await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).not.toContain('Raw model answer')
    expect(body.answer).toContain(FALLBACK_SUBSTRING)
  })

  it('ESCALATE verdict: response answer is the FALLBACK, not the raw model answer', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockResolvedValue({ decision: 'ESCALATE', text: null, sanitized: false, stage_1_score: 5, stage_1_flag_count: 2 })
    const res = await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).not.toContain('Raw model answer')
    expect(body.answer).toContain(FALLBACK_SUBSTRING)
  })

  it('CONDITIONAL with rewrite: response uses the rewrite text', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockResolvedValue({ decision: 'CONDITIONAL', text: 'Rewritten safe answer.', sanitized: true, stage_1_score: 3, stage_1_flag_count: 1 })
    const res = await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).toBe('Rewritten safe answer.')
  })

  it('APPROVED keeps the original model answer', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockResolvedValue({ decision: 'APPROVED', text: 'Raw model answer about MTHFR.', sanitized: false, stage_1_score: 0, stage_1_flag_count: 0 })
    const res = await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).toBe('Raw model answer about MTHFR.')
  })

  it('pass_stage_1 keeps the original model answer', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockResolvedValue({ decision: 'pass_stage_1', text: 'Raw model answer about MTHFR.', sanitized: false, stage_1_score: 0, stage_1_flag_count: 0 })
    const res = await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).toBe('Raw model answer about MTHFR.')
  })

  it('reviewServerText throws: fail-open returns 200 with original answer', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockRejectedValue(new Error('Compliance service unreachable'))
    const res = await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).toBe('Raw model answer about MTHFR.')
  })

  it('reviewServerText throws: safeLog.warn is called for the compliance error', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockRejectedValue(new Error('Compliance service unreachable'))
    await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(safeLog.warn).toHaveBeenCalled()
  })

  it('captureQuery receives the compliance-adjusted answer (BLOCKED -> FALLBACK)', async () => {
    mockGetUserJurisdictionCode.mockResolvedValue('US')
    mockReviewServerText.mockResolvedValue({ decision: 'BLOCKED', text: null, sanitized: false, stage_1_score: 5, stage_1_flag_count: 2 })
    await POST(makeRequest({ question: 'What is MTHFR?', domain: 'genomics' }))
    expect(captureQuery).toHaveBeenCalledOnce()
    const args = (captureQuery as ReturnType<typeof vi.fn>).mock.calls[0][0] as { answerSummary: string }
    expect(args.answerSummary).toContain(FALLBACK_SUBSTRING)
  })
})
