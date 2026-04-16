import { getCritiqueSystemPrompt } from './prompts/critique-system';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { passed: true, notes: 'no_api_key_skipped', violatedGuardrails: [] };
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
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
    }),
  });

  if (!res.ok) {
    return { passed: false, notes: `critique_api_error_${res.status}`, violatedGuardrails: [] };
  }

  const result = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = result.content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('');

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as CritiqueResult;
    return parsed;
  } catch {
    return { passed: false, notes: 'critique_parse_error', violatedGuardrails: [] };
  }
}
