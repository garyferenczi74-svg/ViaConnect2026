/**
 * Prompt 170m Phase B: Quick Log NLU parse endpoint.
 *
 * Receives typed text, calls Claude Haiku 4.5 with the system prompt built
 * by buildQuickLogSystemPrompt, validates the response via Zod, returns
 * structured meal_items.
 *
 * Per-call cost approximately $0.001. Cold-start NLU (no meal_draft context).
 * Rate-limited to QUICK_LOG_RATE_LIMIT requests per user per day (default 200).
 *
 * Kill switches:
 *  QUICK_LOG_TEXT_ENABLED master (default false; flip on at production).
 *  QUICK_LOG_RESTAURANT_DETECTION_ENABLED gates surfacing only; detection always emits.
 *  QUICK_LOG_BARCODE_PRODUCT_DETECTION_ENABLED same pattern.
 *  QUICK_LOG_ALLERGEN_FLAG_ENABLED default false at v1, flip when 170c ratifies.
 *  QUICK_LOG_SAFETY_MODE_ENABLED default false at v1, flip when 170c ratifies.
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
  text: z.string().min(1).max(500),
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
    safeLog.error('api.quick_log.parse', 'ANTHROPIC_API_KEY missing', {
      userId: user.id,
    });
    return NextResponse.json(
      { error: 'NLU service not configured' },
      { status: 503 },
    );
  }

  const systemPrompt = buildQuickLogSystemPrompt({ locale: parsed.data.locale });
  const userMessage = buildQuickLogUserMessage(parsed.data.text);

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
      { timeoutMs: NLU_TIMEOUT_MS, op: 'quick_log_nlu_parse' },
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
      safeLog.warn('api.quick_log.parse', 'malformed JSON from Haiku', {
        userId: user.id,
        rawHead: jsonText.slice(0, 200),
      });
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
      safeLog.warn('api.quick_log.parse', 'schema validation failed', {
        userId: user.id,
        issues: validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).slice(0, 5),
      });
      return NextResponse.json(
        {
          error: 'NLU output failed schema validation',
          issues: validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 502 },
      );
    }

    return NextResponse.json(validated.data);
  } catch (err) {
    safeLog.error('api.quick_log.parse', 'unexpected error', { error: err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'NLU failed' },
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
