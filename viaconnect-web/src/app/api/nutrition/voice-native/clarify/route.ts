/**
 * Prompt 170n Phase B: Voice-Native clarification re-parse endpoint.
 *
 * User resolved one or more clarification chips (or spoke a clarification
 * answer). Re-parse with the disambiguation applied. Max 2 rounds per
 * spec; UI enforces (third round falls to error state).
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
  original_transcript: z.string().min(1).max(2000),
  stt_provider: z.enum(STT_PROVIDERS),
  stt_confidence_avg: z.number().min(0).max(1),
  clarifications: z.array(z.object({
    question_text: z.string().min(1).max(200),
    answer: z.string().min(1).max(200),
    linked_meal_item_index: z.number().int().min(0),
  })).min(1).max(3),
  additional_transcript: z.string().max(500).nullable().optional(),
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

  const supabase = await createClient();
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

  const systemPrompt = buildVoiceNativeSystemPrompt({
    locale: parsed.data.locale,
    safetyMode: parsed.data.safety_mode === true,
  });

  // Compose transcript with any additional voice-retry input concatenated.
  const composedTranscript = parsed.data.additional_transcript
    ? `${parsed.data.original_transcript} (clarification: ${parsed.data.additional_transcript})`
    : parsed.data.original_transcript;

  const userMessage = buildVoiceNativeUserMessage(
    composedTranscript,
    parsed.data.stt_provider,
    parsed.data.stt_confidence_avg,
    parsed.data.clarifications,
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
      { timeoutMs: NLU_TIMEOUT_MS, op: 'voice_native_nlu_clarify' },
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
      parser_version: VOICE_NATIVE_PARSER_VERSION,
    };

    const validated = voiceNativeParseResultSchema.safeParse(enriched);
    if (!validated.success) {
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
    safeLog.error('api.voice_native.clarify', 'unexpected error', { error: err });
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
