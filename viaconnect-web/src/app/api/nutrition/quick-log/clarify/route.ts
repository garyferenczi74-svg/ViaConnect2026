/**
 * Prompt 170m Phase B: Quick Log clarification re-parse endpoint.
 *
 * The user resolved one or more clarification chips. Re-parse with the
 * disambiguation applied. Max 2 rounds of clarification per parse;
 * the UI enforces this (third round falls through to error state).
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/nutrition/resilience/timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  buildQuickLogSystemPrompt,
  buildQuickLogUserMessage,
} from '@/lib/nutrition/quick-log/haiku-system-prompt';
import {
  quickLogParseResultSchema,
  QUICK_LOG_HAIKU_MODEL,
  QUICK_LOG_PARSER_VERSION,
} from '@/lib/nutrition/quick-log/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NLU_TIMEOUT_MS = 12_000;

const RequestSchema = z.object({
  original_text: z.string().min(1).max(500),
  clarifications: z.array(z.object({
    question_text: z.string().min(1).max(200),
    answer: z.string().min(1).max(200),
    linked_meal_item_index: z.number().int().min(0),
  })).min(1).max(3),
  locale: z.string().max(20).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const start = Date.now();

  if (process.env.QUICK_LOG_TEXT_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Quick Log is temporarily unavailable.' },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NLU service not configured' },
      { status: 503 },
    );
  }

  const systemPrompt = buildQuickLogSystemPrompt({ locale: parsed.data.locale });
  const userMessage = buildQuickLogUserMessage(
    parsed.data.original_text,
    parsed.data.clarifications,
  );

  try {
    const anthropic = new Anthropic({ apiKey });
    const completion = await withTimeout(
      anthropic.messages.create({
        model: QUICK_LOG_HAIKU_MODEL,
        max_tokens: 2048,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      { timeoutMs: NLU_TIMEOUT_MS, op: 'quick_log_nlu_clarify' },
    );

    const textBlock = completion.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'NLU returned no text content' },
        { status: 502 },
      );
    }

    const jsonText = stripCodeFence(textBlock.text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: 'NLU returned malformed JSON', raw: jsonText.slice(0, 500) },
        { status: 502 },
      );
    }

    const enriched = {
      ...(parsedJson as Record<string, unknown>),
      nlu_latency_ms: Date.now() - start,
      nlu_provider_used: 'claude_haiku_4_5' as const,
      parser_version: QUICK_LOG_PARSER_VERSION,
    };

    const validated = quickLogParseResultSchema.safeParse(enriched);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'NLU output failed schema validation',
          issues: validated.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 502 },
      );
    }

    return NextResponse.json(validated.data);
  } catch (err) {
    safeLog.error('api.quick_log.clarify', 'unexpected error', { error: err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Clarify failed' },
      { status: 500 },
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
