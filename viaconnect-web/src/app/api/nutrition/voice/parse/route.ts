/**
 * NLU parse endpoint per Prompt 170j §10.2.
 *
 * Receives transcript + meal draft, calls Claude Haiku 4.5 with the system
 * prompt built by buildHaikuSystemPrompt, validates the response via
 * nluParseResultSchema, returns structured operations.
 *
 * Per-call cost approximately $0.001.
 * Rate-limited 300 requests per user per day per §18.2.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/nutrition/resilience/timeout';
import { nluParseResultSchema } from '@/lib/nutrition/voice/nlu/operation-schema';
import {
  buildHaikuSystemPrompt,
  buildHaikuUserMessage,
} from '@/lib/nutrition/voice/nlu/system-prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NLU_TIMEOUT_MS = 8_000;
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

interface ParseRequest {
  transcript: string;
  meal_draft: {
    items: Array<{
      food_name: string;
      portion_grams: number;
      cooking_method?: string;
      cooking_oil?: { oil_type: string; amount_ml: number } | null;
    }>;
    restaurant_context: { chain_slug: string; chain_name: string } | null;
    modifiers?: string[];
    total_kcal?: number;
  };
  stt_confidence?: number | null;
  transcript_locale?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const start = Date.now();

  // Auth gate: require a server-confirmed user. getUser validates the session
  // against the auth server (detects a revoked/logged-out session that the
  // getClaims middleware would not catch until token expiry), and gives this
  // AI-cost endpoint a real user to enforce the per-user rate limit (Sec 18.2).
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: ParseRequest;

  try {
    body = (await request.json()) as ParseRequest;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (!body.transcript || typeof body.transcript !== 'string') {
    return NextResponse.json({ error: 'missing transcript' }, { status: 400 });
  }

  if (!body.meal_draft || !Array.isArray(body.meal_draft.items)) {
    return NextResponse.json({ error: 'missing meal_draft.items' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NLU service not configured' },
      { status: 503 }
    );
  }

  const systemPrompt = buildHaikuSystemPrompt({
    mealDraft: {
      items: body.meal_draft.items.map((it) => ({
        food_name: it.food_name,
        portion_grams: it.portion_grams,
        cooking_method: it.cooking_method,
        cooking_oil: it.cooking_oil ?? null,
      })),
      restaurant_context: body.meal_draft.restaurant_context,
      modifiers: body.meal_draft.modifiers ?? [],
      total_kcal: body.meal_draft.total_kcal ?? 0,
    },
    locale: body.transcript_locale ?? 'en-US',
  });

  const userMessage = buildHaikuUserMessage(body.transcript);

  try {
    const anthropic = new Anthropic({ apiKey });
    const completion = await withTimeout(
      anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 1024,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      { timeoutMs: NLU_TIMEOUT_MS, op: 'voice_nlu_parse' }
    );

    const textBlock = completion.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'NLU returned no text content' },
        { status: 502 }
      );
    }

    const jsonText = stripCodeFence(textBlock.text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        {
          error: 'NLU returned malformed JSON',
          raw: jsonText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const enriched = {
      ...(parsedJson as Record<string, unknown>),
      nlu_latency_ms: Date.now() - start,
      nlu_provider_used: 'claude_haiku_4_5' as const,
    };

    const validated = nluParseResultSchema.safeParse(enriched);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'NLU output failed schema validation',
          // Sweep 2026-06-12: zod v4 exposes .issues; .errors threw at
          // runtime and degraded this 502-with-details into a generic 500.
          issues: validated.error.issues.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          ),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(validated.data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'NLU failed' },
      { status: 500 }
    );
  }
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  const lines = trimmed.split('\n');
  if (lines.length <= 1) return trimmed;
  lines.shift();
  if (lines[lines.length - 1]?.trim() === '```') {
    lines.pop();
  }
  return lines.join('\n').trim();
}
