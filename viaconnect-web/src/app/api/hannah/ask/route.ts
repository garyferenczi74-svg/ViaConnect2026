/**
 * src/app/api/hannah/ask/route.ts
 *
 * POST /api/hannah/ask -- conversational Q&A front door for ViaConnect.
 *
 * Answers are grounded ONLY in PUBLISHED knowledge atoms. Coverage is scored
 * deterministically from the retrieved atoms' tiers. Every exchange is captured
 * to knowledge_queries (user-scoped, fail-open). The HANNAH_208_QA_DIRECTIVE
 * enforces plain language, emerging labels, structure-function framing,
 * practitioner referral, APOE guardrail, and weight-loss guardrail.
 *
 * Prompt 208 Phase 7 (Task 19). Task I4 additive guards:
 *   - Per-user in-memory rate limit (15 req/60s). Returns 429 before model call.
 *   - Jurisdiction-aware compliance post-check via reviewServerText. Fail-open.
 *
 * No em/en-dashes. No emojis.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublishedAtoms, type KnowledgeAtomDomain } from '@/lib/kb/knowledgeAtoms';
import { scoreCoverage, captureQuery } from '@/lib/kb/knowledgeQueries';
import { HANNAH_208_QA_DIRECTIVE } from '@/lib/ai/hannah/ultrathink/prompts/ultrathink-system';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { reviewServerText } from '@/lib/compliance/review-server-text';
import { getUserJurisdictionCode } from '@/lib/compliance/jurisdiction';

// ---------------------------------------------------------------------------
// Per-user in-memory rate limiter (mirrors /api/ai/[provider] pattern).
// 15 requests per 60 s per user. No external dependency.
// ---------------------------------------------------------------------------

const ASK_RATE_LIMIT = 15;
const ASK_RATE_WINDOW_MS = 60_000;
const askRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkAskRateLimit(userId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = askRateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    askRateLimitMap.set(userId, { count: 1, resetAt: now + ASK_RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= ASK_RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Test-only export: resets the rate-limit map between test cases so
 * per-user state does not bleed across tests.
 */
export function resetAskRateLimitForTesting(): void {
  askRateLimitMap.clear();
}

// ---------------------------------------------------------------------------
// Anthropic API constants (mirrors engine.ts values exactly).
// ---------------------------------------------------------------------------

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Use the same fast-tier model as engine.ts tier "fast".
const QA_MODEL = 'claude-haiku-4-5-20251001';
const QA_MAX_TOKENS = 1024;
const QA_TIMEOUT_MS = 5000;

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

// ---------------------------------------------------------------------------
// Conversational domain union accepted at the endpoint.
// ---------------------------------------------------------------------------

const VALID_DOMAINS = [
  'genomics',
  'nutraceuticals',
  'biohacking',
  'athletics',
  'weightloss',
  'longevity',
] as const;

type ConversationalDomain = (typeof VALID_DOMAINS)[number];

function isValidDomain(v: unknown): v is ConversationalDomain {
  return typeof v === 'string' && (VALID_DOMAINS as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Domain mapping: conversational domain -> knowledge atom scientific domain.
// ---------------------------------------------------------------------------

const DOMAIN_MAP: Record<ConversationalDomain, KnowledgeAtomDomain> = {
  genomics: 'methylation',
  nutraceuticals: 'nutrition',
  biohacking: 'epigenetics',
  athletics: 'hormones',
  weightloss: 'nutrition',
  longevity: 'longevity',
};

// ---------------------------------------------------------------------------
// Fallback answer used when the AI generation fails (fail-open).
// ---------------------------------------------------------------------------

const FALLBACK_ANSWER =
  'I was unable to generate a full answer right now. For personalized guidance, please consult a qualified healthcare practitioner. ' +
  'This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. ' +
  'Consult a qualified healthcare practitioner before making changes to your health regimen.';

// ---------------------------------------------------------------------------
// callHannahQaModel
//
// Thin wrapper around the Anthropic API. Exported so tests can mock it
// independently of generateGroundedAnswer. Mirrors the fetch pattern used in
// engine.ts (same env var, same ANTHROPIC_VERSION header, same content
// extraction) but calls the API directly so the system prompt is not
// replaced by the engine's own getUltrathinkSystemPrompt.
// ---------------------------------------------------------------------------

export async function callHannahQaModel(
  system: string,
  userText: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: QA_MODEL,
      max_tokens: QA_MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: userText }],
    }),
    signal: AbortSignal.timeout(QA_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }

  const message = (await res.json()) as AnthropicResponse;
  const text = message.content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('\n');

  if (!text) {
    throw new Error('Anthropic API returned no text content');
  }

  return text;
}

// ---------------------------------------------------------------------------
// generateGroundedAnswer
//
// Builds the full system prompt (HANNAH_208_QA_DIRECTIVE + grounding atoms)
// and delegates to callHannahQaModel so the directive reaches the model as
// the actual system prompt -- not as a field the engine would ignore.
// Exported to allow testing the route while mocking callHannahQaModel.
// ---------------------------------------------------------------------------

export async function generateGroundedAnswer(
  question: string,
  domain: ConversationalDomain,
  atoms: Array<{ claim: string }>,
): Promise<string> {
  const groundingContext =
    atoms.length > 0
      ? atoms
          .slice(0, 10)
          .map((a, i) => `[${i + 1}] ${a.claim}`)
          .join('\n')
      : 'No published knowledge atoms are available for this domain yet.';

  const system =
    HANNAH_208_QA_DIRECTIVE +
    '\n\nGROUNDING CONTEXT (published knowledge atoms):\n' +
    groundingContext;

  return callHannahQaModel(system, `[Domain: ${domain}]\n\n${question}`);
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse> {
  // Auth: resolve the user from the server session.
  // Auth timeout fails CLOSED: a timeout is treated as unauthenticated (401).
  const supabase = createClient();
  let user: { id: string } | null = null;
  try {
    const { data } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'api.hannah.ask.auth',
    );
    user = data.user;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hannah.ask', 'auth.getUser timed out; returning 401', {
        error: (err as Error).message,
      });
    } else {
      safeLog.error('api.hannah.ask', 'auth.getUser threw; returning 401', { err });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: per-user in-memory guard. Returns 429 without calling the model.
  const rateCheck = checkAskRateLimit(user.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter },
      { status: 429 },
    );
  }

  // Body validation.
  let body: { question?: unknown; domain?: unknown };
  try {
    body = (await request.json()) as { question?: unknown; domain?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { question, domain } = body;

  if (typeof question !== 'string' || question.trim().length === 0) {
    return NextResponse.json({ error: 'question is required and must be a non-empty string' }, { status: 400 });
  }

  if (!isValidDomain(domain)) {
    return NextResponse.json(
      {
        error:
          'domain must be one of: genomics, nutraceuticals, biohacking, athletics, weightloss, longevity',
      },
      { status: 400 },
    );
  }

  // Retrieve published atoms for the mapped scientific domain.
  // Timeout fails OPEN: on timeout or error, proceed with an empty atom list
  // so the fallback answer is still returned rather than blocking the user.
  const atomDomain = DOMAIN_MAP[domain];
  let atoms: Array<{ id: string; claim: string; evidence_tier: number }> = [];
  try {
    atoms = await withTimeout(
      getPublishedAtoms({ domain: atomDomain }),
      5000,
      'api.hannah.ask.getPublishedAtoms',
    );
  } catch (err) {
    safeLog.warn('api.hannah.ask', 'getPublishedAtoms timed out or threw; proceeding with empty atoms', {
      userId: user.id,
      domain,
      error: err instanceof Error ? err.message : String(err),
    });
    atoms = [];
  }

  // Score coverage deterministically.
  const { coverage, tiersUsed } = scoreCoverage(atoms);
  const emerging = coverage !== 'well_covered';

  // Generate grounded answer. Fail-open: on error use fallback.
  let answer: string;
  let answerFailed = false;

  try {
    answer = await generateGroundedAnswer(question, domain, atoms);
  } catch (err) {
    safeLog.error('api.hannah.ask', 'generateGroundedAnswer failed, returning fallback', {
      userId: user.id,
      domain,
      error: err instanceof Error ? err.message : String(err),
    });
    answer = FALLBACK_ANSWER;
    answerFailed = true;
  }

  // Jurisdiction-aware compliance post-check. Fail-open: if reviewServerText
  // throws, keep the original answer and never return a 500.
  if (!answerFailed) {
    try {
      const jurisdiction = await getUserJurisdictionCode();
      const review = await reviewServerText({
        text: answer,
        jurisdiction,
        subject_type: 'protocol',
        actor_role: 'system',
      });
      if (review.decision === 'BLOCKED' || review.decision === 'ESCALATE') {
        // Verdict requires the raw answer to be dropped. Use the educational fallback.
        answer = FALLBACK_ANSWER;
      } else if (review.decision === 'CONDITIONAL' && review.text != null && review.text.trim().length > 0) {
        // Kelsey provided a safe rewrite. Use it.
        answer = review.text;
      }
      // APPROVED and pass_stage_1: keep the answer unchanged.
    } catch (err) {
      // Fail-open: compliance check failure must never block the response.
      safeLog.warn('api.hannah.ask', 'reviewServerText threw; keeping original answer (fail-open)', {
        userId: user.id,
        domain,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Capture the exchange (fail-open: captureQuery never throws).
  await captureQuery({
    userId: user.id,
    domain,
    questionText: question,
    answerSummary: answer,
    citedAtomIds: atoms.map((a) => a.id),
    coverage,
    tiersUsed,
  });

  return NextResponse.json(
    {
      answer,
      emerging: answerFailed ? true : emerging,
      coverage,
      citedAtomIds: atoms.map((a) => a.id),
    },
    { status: 200 },
  );
}
