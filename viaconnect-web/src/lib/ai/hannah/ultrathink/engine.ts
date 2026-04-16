import { TIER_CONFIGS } from './tiers';
import { redactPHI } from './redaction';
import { runSelfCritique } from './critique';
import { rankEvidence } from './evidence';
import { getUltrathinkSystemPrompt } from './prompts/ultrathink-system';
import { buildHannahContext } from '@/lib/ai/unified-context';
import { validateRecommendationText } from '@/lib/agents/jeffery/guardrails';
import type { UltrathinkRequest, UltrathinkResponse } from './types';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const HANNAH_GUARDRAILS = [
  'farmceutica_only_products',
  'peptide_sharing_protocol',
  'mandatory_medical_disclaimer',
] as const;

interface AnthropicContentBlock {
  type: string;
  text?: string;
  thinking?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  usage: { input_tokens: number; output_tokens: number };
}

export async function runUltrathink(
  req: UltrathinkRequest,
): Promise<UltrathinkResponse> {
  const config = TIER_CONFIGS[req.tier];
  const startTime = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      answer: 'Hannah Ultrathink is not configured yet. Please set ANTHROPIC_API_KEY.',
      tier: req.tier,
      citations: [],
      confidence: 0,
      critiquePassed: true,
      critiqueNotes: 'no_api_key',
      latencyMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  // 1. Build context from Unified AI Data Ecosystem
  const context = await buildHannahContext(req.userId, {
    includePHI: req.phiAllowed,
    ragPasses: config.ragPasses,
  });

  // 2. Compose system prompt with Hannah persona + the three guardrails
  const systemPrompt = getUltrathinkSystemPrompt({
    context: context.summary,
    guardrails: true,
  });

  // 3. Invoke Claude via raw fetch (matching project convention)
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.maxOutputTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: req.query }],
  };

  if (config.thinkingEnabled && config.thinkingBudget) {
    body.thinking = { type: 'enabled', budget_tokens: config.thinkingBudget };
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000), // 45s timeout for Ultrathink reasoning
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      answer: 'Hannah encountered an issue processing your question. Please try again.',
      tier: req.tier,
      citations: [],
      confidence: 0,
      critiquePassed: true,
      critiqueNotes: `api_error_${res.status}`,
      latencyMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  const message = (await res.json()) as AnthropicResponse;

  // 4. Extract answer + thinking
  const answer = message.content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('\n');

  const thinking = message.content
    .filter((b) => b.type === 'thinking' && b.thinking)
    .map((b) => b.thinking!)
    .join('\n');

  // 5. Deterministic guardrail enforcement (runs BEFORE self-critique)
  const guardrailCheck = validateRecommendationText(answer);
  const guardrailViolations = guardrailCheck.violations.map((v) => v.code);

  // 6. Self-critique (Ultrathink only)
  let critiqueResult: { passed: boolean; notes: string } = { passed: true, notes: '' };
  if (config.selfCritique) {
    critiqueResult = await runSelfCritique({
      query: req.query,
      answer,
      guardrails: HANNAH_GUARDRAILS,
    });
  }

  // 7. Block answer if guardrails failed OR critique failed
  const blocked = !guardrailCheck.ok || !critiqueResult.passed;
  const safeAnswer = blocked
    ? 'I want to make sure I give you the most accurate information. Let me rephrase that with a focus on what FarmCeutica offers for your situation. Could you ask your question again, or let me know which specific area you\'d like me to focus on?\n\n*This is not medical advice. Always consult your healthcare provider before making changes to your wellness routine.*'
    : answer;

  // 8. Evidence ranking (Ultrathink only)
  const citations = config.evidenceFooter && !blocked
    ? await rankEvidence({ query: req.query, answer, sources: context.sources })
    : [];

  return {
    answer: safeAnswer,
    tier: req.tier,
    thinkingSummary: thinking ? condenseThinking(thinking) : undefined,
    citations,
    confidence: blocked ? 0 : 0.9,
    critiquePassed: !blocked,
    critiqueNotes: blocked
      ? [critiqueResult.notes, ...guardrailViolations].filter(Boolean).join('; ')
      : critiqueResult.notes,
    latencyMs: Date.now() - startTime,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    thinkingTokens: undefined,
  };
}

function condenseThinking(raw: string): string {
  const redacted = redactPHI(raw);
  return redacted.slice(0, 4000);
}
