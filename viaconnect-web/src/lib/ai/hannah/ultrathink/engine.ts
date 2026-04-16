import Anthropic from '@anthropic-ai/sdk';
import { TIER_CONFIGS, type HannahTier } from './tiers';
import { redactPHI } from './redaction';
import { runSelfCritique } from './critique';
import { rankEvidence } from './evidence';
import { getUltrathinkSystemPrompt } from './prompts/ultrathink-system';
import { buildHannahContext } from '@/lib/ai/unified-context';
import type { UltrathinkRequest, UltrathinkResponse } from './types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HANNAH_GUARDRAILS = [
  'farmceutica_only_products',
  'peptide_sharing_protocol',
  'mandatory_medical_disclaimer',
] as const;

export async function runUltrathink(
  req: UltrathinkRequest,
): Promise<UltrathinkResponse> {
  const config = TIER_CONFIGS[req.tier];
  const startTime = Date.now();

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

  // 3. Invoke Claude with thinking enabled for Ultrathink tier
  const message = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxOutputTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: req.query }],
    ...(config.thinkingEnabled && config.thinkingBudget
      ? { thinking: { type: 'enabled', budget_tokens: config.thinkingBudget } }
      : {}),
  });

  // 4. Extract answer + thinking
  const answer = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');

  const thinking = message.content
    .filter((b) => b.type === 'thinking')
    .map((b) => (b as { type: 'thinking'; thinking: string }).thinking)
    .join('\n');

  // 5. Self-critique (Ultrathink only)
  let critiqueResult: { passed: boolean; notes: string } = { passed: true, notes: '' };
  if (config.selfCritique) {
    critiqueResult = await runSelfCritique({
      query: req.query,
      answer,
      guardrails: HANNAH_GUARDRAILS,
    });
  }

  // 6. Evidence ranking (Ultrathink only)
  const citations = config.evidenceFooter
    ? await rankEvidence({ query: req.query, answer, sources: context.sources })
    : [];

  return {
    answer,
    tier: req.tier,
    thinkingSummary: thinking ? condenseThinking(thinking) : undefined,
    citations,
    confidence: critiqueResult.passed ? 0.9 : 0.5,
    critiquePassed: critiqueResult.passed,
    critiqueNotes: critiqueResult.notes,
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
