/**
 * Prompt 170n Phase B: Voice-Native parse client wrapper.
 *
 * Posts STT transcript + per-span confidence to /api/nutrition/voice-native/parse
 * which wraps Claude Haiku 4.5 with the voice-native system prompt. Validates
 * the response via Zod so the UI never receives malformed AI output.
 */

'use client';

import {
  voiceNativeParseResultSchema,
  type VoiceNativeParseResult,
  type SttProvider,
} from './types';

export interface ParseVoiceNativeArgs {
  transcript: string;
  stt_provider: SttProvider;
  stt_confidence_avg: number;
  locale?: string;
  safety_mode?: boolean;
  signal?: AbortSignal;
}

export interface ParseVoiceNativeError {
  kind:
    | 'network_error'
    | 'service_unavailable'
    | 'malformed_response'
    | 'aborted'
    | 'rate_limited'
    | 'feature_disabled'
    | 'invalid_input';
  message: string;
}

export async function parseVoiceNative(
  args: ParseVoiceNativeArgs,
): Promise<VoiceNativeParseResult | ParseVoiceNativeError> {
  try {
    const resp = await fetch('/api/nutrition/voice-native/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: args.transcript,
        stt_provider: args.stt_provider,
        stt_confidence_avg: args.stt_confidence_avg,
        locale: args.locale ?? 'en-US',
        safety_mode: args.safety_mode ?? false,
      }),
      signal: args.signal,
    });

    if (resp.status === 429) {
      return { kind: 'rate_limited', message: 'Rate limit reached for today' };
    }
    if (resp.status === 503) {
      return { kind: 'feature_disabled', message: 'Voice entry is temporarily unavailable' };
    }
    if (resp.status === 400) {
      const body = await resp.json().catch(() => ({}));
      return { kind: 'invalid_input', message: typeof body?.error === 'string' ? body.error : 'Invalid input' };
    }
    if (!resp.ok) {
      return { kind: 'service_unavailable', message: `Parse endpoint returned ${resp.status}` };
    }

    const json = (await resp.json()) as unknown;
    const parsed = voiceNativeParseResultSchema.safeParse(json);
    if (!parsed.success) {
      return {
        kind: 'malformed_response',
        message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      };
    }
    return parsed.data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { kind: 'aborted', message: 'Parse aborted' };
    }
    return {
      kind: 'network_error',
      message: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export interface ClarifyVoiceNativeArgs {
  original_transcript: string;
  stt_provider: SttProvider;
  stt_confidence_avg: number;
  clarifications: Array<{
    question_text: string;
    answer: string;
    linked_meal_item_index: number;
  }>;
  additional_transcript?: string;
  locale?: string;
  safety_mode?: boolean;
  signal?: AbortSignal;
}

export async function clarifyVoiceNative(
  args: ClarifyVoiceNativeArgs,
): Promise<VoiceNativeParseResult | ParseVoiceNativeError> {
  try {
    const resp = await fetch('/api/nutrition/voice-native/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_transcript: args.original_transcript,
        stt_provider: args.stt_provider,
        stt_confidence_avg: args.stt_confidence_avg,
        clarifications: args.clarifications,
        additional_transcript: args.additional_transcript ?? null,
        locale: args.locale ?? 'en-US',
        safety_mode: args.safety_mode ?? false,
      }),
      signal: args.signal,
    });

    if (resp.status === 429) {
      return { kind: 'rate_limited', message: 'Rate limit reached for today' };
    }
    if (!resp.ok) {
      return { kind: 'service_unavailable', message: `Clarify endpoint returned ${resp.status}` };
    }

    const json = (await resp.json()) as unknown;
    const parsed = voiceNativeParseResultSchema.safeParse(json);
    if (!parsed.success) {
      return {
        kind: 'malformed_response',
        message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      };
    }
    return parsed.data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { kind: 'aborted', message: 'Clarify aborted' };
    }
    return {
      kind: 'network_error',
      message: err instanceof Error ? err.message : 'Network error',
    };
  }
}
