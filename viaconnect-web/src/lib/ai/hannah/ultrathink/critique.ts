import Anthropic from '@anthropic-ai/sdk';
import { getCritiqueSystemPrompt } from './prompts/critique-system';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CritiqueInput {
  query: string;
  answer: string;
  guardrails: readonly string[];
}

export interface CritiqueResult {
  passed: boolean;
  notes: string;
  violatedGuardrails: string[];
}

export async function runSelfCritique(input: CritiqueInput): Promise<CritiqueResult> {
  const result = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: getCritiqueSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          query: input.query,
          answer: input.answer,
          guardrails: input.guardrails,
        }),
      },
    ],
  });

  const text = result.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as CritiqueResult;
    return parsed;
  } catch {
    return { passed: false, notes: 'critique_parse_error', violatedGuardrails: [] };
  }
}
