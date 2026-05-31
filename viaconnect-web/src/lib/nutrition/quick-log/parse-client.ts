/**
 * Prompt 170m Phase B: Quick Log parse client wrapper.
 *
 * Posts user-typed text to /api/nutrition/quick-log/parse which wraps
 * Claude Haiku 4.5. Validates the response via Zod so the UI never sees
 * malformed AI output.
 *
 * Cold-start NLU (no meal_draft context). Mirrors the 170j voice
 * parse-client pattern with a different request shape.
 */

'use client';

import { quickLogParseResultSchema, type QuickLogParseResult } from './types';

export interface ParseQuickLogArgs {
  text: string;
  locale?: string;
  signal?: AbortSignal;
}

export interface ParseQuickLogError {
  kind: 'network_error' | 'service_unavailable' | 'malformed_response' | 'aborted' | 'rate_limited' | 'feature_disabled' | 'invalid_input';
  message: string;
}

export async function parseQuickLog(
  args: ParseQuickLogArgs,
): Promise<QuickLogParseResult | ParseQuickLogError> {
  try {
    const resp = await fetch('/api/nutrition/quick-log/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: args.text,
        locale: args.locale ?? 'en-US',
      }),
      signal: args.signal,
    });

    if (resp.status === 429) {
      return { kind: 'rate_limited', message: 'Rate limit reached for today' };
    }
    if (resp.status === 503) {
      return { kind: 'feature_disabled', message: 'Quick Log is temporarily unavailable' };
    }
    if (resp.status === 400) {
      const body = await resp.json().catch(() => ({}));
      return { kind: 'invalid_input', message: typeof body?.error === 'string' ? body.error : 'Invalid input' };
    }
    if (!resp.ok) {
      return {
        kind: 'service_unavailable',
        message: `Parse endpoint returned ${resp.status}`,
      };
    }

    const json = (await resp.json()) as unknown;
    const parsed = quickLogParseResultSchema.safeParse(json);
    if (!parsed.success) {
      return {
        kind: 'malformed_response',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
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

export interface ClarifyQuickLogArgs {
  original_text: string;
  clarifications: Array<{
    question_text: string;
    answer: string;
    linked_meal_item_index: number;
  }>;
  locale?: string;
  signal?: AbortSignal;
}

export async function clarifyQuickLog(
  args: ClarifyQuickLogArgs,
): Promise<QuickLogParseResult | ParseQuickLogError> {
  try {
    const resp = await fetch('/api/nutrition/quick-log/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_text: args.original_text,
        clarifications: args.clarifications,
        locale: args.locale ?? 'en-US',
      }),
      signal: args.signal,
    });

    if (resp.status === 429) {
      return { kind: 'rate_limited', message: 'Rate limit reached for today' };
    }
    if (!resp.ok) {
      return {
        kind: 'service_unavailable',
        message: `Clarify endpoint returned ${resp.status}`,
      };
    }

    const json = (await resp.json()) as unknown;
    const parsed = quickLogParseResultSchema.safeParse(json);
    if (!parsed.success) {
      return {
        kind: 'malformed_response',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
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
