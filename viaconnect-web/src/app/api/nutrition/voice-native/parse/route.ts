/**
 * Prompt 170n Phase B: Voice-Native NLU parse endpoint.
 *
 * Receives STT transcript + per-span confidence, calls Claude Haiku 4.5
 * with the voice-native system prompt (Gordon Blueprint draft 2026-05-31,
 * Hannah-revised quantifier section per OQ3 resolution, Gary blessed
 * voice/text divergence). Validates response via Zod. Returns structured
 * meal_items with stt_confidence_for_span + combined_voice_confidence per
 * Section 9 calibration framework.
 *
 * Cold-start NLU (no meal_draft context). Sibling of 170m Quick Log
 * text-native; same role with voice modality input.
 *
 * Per-call cost approximately $0.001. Rate-limited 200 requests/user/day.
 *
 * Kill switches:
 *  VOICE_NATIVE_ENABLED master (default false; flip on at Phase E).
 *  VOICE_NATIVE_TRANSCRIPT_RETENTION_ENABLED gates save-path retention.
 *  VOICE_NATIVE_SERVER_STT_ENABLED gates Gemini Audio fallback.
 *  VOICE_NATIVE_QUICK_APPLY_MODE_ENABLED gates Quick Apply.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/nutrition/resilience/timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  buildVoiceNativeSystemPrompt,
  buildVoiceNativeUserMessage,
} from '@/lib/nutrition/voice-native/haiku-system-prompt';
import {
  voiceNativeParseResultSchema,
  VOICE_NATIVE_HAIKU_MODEL,
  VOICE_NATIVE_PARSER_VERSION,
  STT_PROVIDERS,
} from '@/lib/nutrition/voice-native/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NLU_TIMEOUT_MS = 12_000;

const RequestSchema = z.object({
  transcript: z.string().min(1).max(2000),
  stt_provider: z.enum(STT_PROVIDERS),
  stt_confidence_avg: z.number().min(0).max(1),
  locale: z.string().max(20).optional(),
  safety_mode: z.boolean().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const start = Date.now();

  if (process.env.VOICE_NATIVE_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Voice entry is temporarily unavailable.' },
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
    safeLog.error('api.voice_native.parse', 'ANTHROPIC_API_KEY missing', {
      userId: user.id,
    });
    return NextResponse.json(
      { error: 'NLU service not configured' },
      { status: 503 },
    );
  }

  const systemPrompt = buildVoiceNativeSystemPrompt({
    locale: parsed.data.locale,
    safetyMode: parsed.data.safety_mode === true,
  });
  const userMessage = buildVoiceNativeUserMessage(
    parsed.data.transcript,
    parsed.data.stt_provider,
    parsed.data.stt_confidence_avg,
  );

  try {
    const anthropic = new Anthropic({ apiKey });
    const completion = await withTimeout(
      anthropic.messages.create({
        model: VOICE_NATIVE_HAIKU_MODEL,
        max_tokens: 2048,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      { timeoutMs: NLU_TIMEOUT_MS, op: 'voice_native_nlu_parse' },
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
      safeLog.warn('api.voice_native.parse', 'malformed JSON from Haiku', {
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
      parser_version: VOICE_NATIVE_PARSER_VERSION,
    };

    const validated = voiceNativeParseResultSchema.safeParse(enriched);
    if (!validated.success) {
      safeLog.warn('api.voice_native.parse', 'schema validation failed', {
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
    safeLog.error('api.voice_native.parse', 'unexpected error', { error: err });
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
