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
 * Prompt 208 Phase 7 (Task 19). No em/en-dashes. No emojis.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublishedAtoms, type KnowledgeAtomDomain } from '@/lib/kb/knowledgeAtoms';
import { scoreCoverage, captureQuery } from '@/lib/kb/knowledgeQueries';
import { runUltrathink } from '@/lib/ai/hannah/ultrathink/engine';
import { HANNAH_208_QA_DIRECTIVE } from '@/lib/ai/hannah/ultrathink/prompts/ultrathink-system';
import { safeLog } from '@/lib/utils/safe-log';

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
// generateGroundedAnswer
//
// Runs the Hannah ultrathink engine with the QA directive as system guidance
// and the retrieved atom claims injected as grounding context.
// Exported to allow testing the route while mocking the engine separately.
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

  const systemPrompt =
    HANNAH_208_QA_DIRECTIVE +
    '\n\nGROUNDING CONTEXT (published knowledge atoms):\n' +
    groundingContext;

  const response = await runUltrathink({
    userId: 'system',
    query: `[Domain: ${domain}]\n\n${question}`,
    tier: 'fast',
    modality: 'text',
    phiAllowed: false,
    _systemPromptOverride: systemPrompt,
  } as Parameters<typeof runUltrathink>[0]);

  return response.answer;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse> {
  // Auth: resolve the user from the server session.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  const atomDomain = DOMAIN_MAP[domain];
  const atoms = await getPublishedAtoms({ domain: atomDomain });

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
