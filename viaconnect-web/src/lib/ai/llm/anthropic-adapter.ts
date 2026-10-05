/**
 * Anthropic Messages adapter (LM-02). Fetch only. Unused until the router
 * selects it. Wraps the raw `POST /v1/messages` shape already used by
 * admin and member call sites (anthropic-version 2023-06-01). The
 * Marshall SDK path stays in place while its flag is off.
 */

import { estimateCostUsd } from '@/lib/observability/ai-pricing';
import { safeLog } from '@/lib/utils/safe-log';
import { isTimeoutError, withAbortTimeout } from '@/lib/utils/with-timeout';
import { classifyHttpStatus, drainBody, isAbortError, linkAbortSignals } from './http';
import { finiteNumber, isRecord, readSsePayloads } from './sse';
import {
  emptyUsage,
  type LlmContentPart,
  type LlmMessage,
  type LlmProvider,
  type LlmProviderFailure,
  type LlmProviderRequest,
  type LlmProviderResult,
  type LlmStreamEvent,
  type LlmUsage,
} from './types';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export interface AnthropicAdapterOptions {
  apiKey?: string | null;
  fetchImpl?: typeof fetch;
}

export function createAnthropicProvider(options: AnthropicAdapterOptions = {}): LlmProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    id: 'anthropic',
    complete(req) {
      return completeAnthropic(req, resolveKey(options.apiKey), fetchImpl);
    },
    stream(req) {
      return streamAnthropic(req, resolveKey(options.apiKey), fetchImpl);
    },
  };
}

function resolveKey(explicit: string | null | undefined): string | null {
  if (explicit !== undefined) return explicit || null;
  const key =
    process.env.ANTHROPIC_API_KEY ||
    process.env.PHOTO_AI_ANTHROPIC_API_KEY ||
    process.env.Anthropic_API_Key ||
    '';
  return key || null;
}

async function completeAnthropic(
  req: LlmProviderRequest,
  apiKey: string | null,
  fetchImpl: typeof fetch,
): Promise<LlmProviderResult> {
  const started = Date.now();
  if (!apiKey) return failure(req, 'config_missing', null, false, started);

  try {
    const res = await withAbortTimeout(
      (timeoutSignal) =>
        fetchImpl(ANTHROPIC_URL, {
          method: 'POST',
          headers: anthropicHeaders(apiKey),
          body: JSON.stringify(buildAnthropicBody(req, false)),
          signal: linkAbortSignals(timeoutSignal, req.signal),
        }),
      clampTimeout(req.timeoutMs),
      'ai.llm.anthropic.complete',
    );
    if (!res.ok) {
      await drainBody(res);
      const classified = classifyHttpStatus(res.status);
      safeLog.warn('ai.llm.anthropic', 'non-2xx', { status: res.status, code: classified.code });
      return failure(req, classified.code, res.status, classified.retryable, started);
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      return failure(req, 'parse_failed', res.status, true, started);
    }
    const text = extractAnthropicText(parsed);
    if (text == null) return failure(req, 'parse_failed', res.status, true, started);
    const usage = usageFromAnthropic(parsed, req.model);
    return {
      ok: true,
      text,
      provider: 'anthropic',
      model: req.model,
      usage,
      latencyMs: Date.now() - started,
      finishReason: finishReasonFrom(parsed),
    };
  } catch (error) {
    return failureFromThrow(req, error, req.signal, started);
  }
}

async function* streamAnthropic(
  req: LlmProviderRequest,
  apiKey: string | null,
  fetchImpl: typeof fetch,
): AsyncGenerator<LlmStreamEvent> {
  const started = Date.now();
  if (!apiKey) {
    yield { type: 'error', error: failure(req, 'config_missing', null, false, started) };
    return;
  }
  let res: Response;
  try {
    res = await withAbortTimeout(
      (timeoutSignal) =>
        fetchImpl(ANTHROPIC_URL, {
          method: 'POST',
          headers: anthropicHeaders(apiKey),
          body: JSON.stringify(buildAnthropicBody(req, true)),
          signal: linkAbortSignals(timeoutSignal, req.signal),
        }),
      clampTimeout(req.timeoutMs),
      'ai.llm.anthropic.stream',
    );
  } catch (error) {
    yield { type: 'error', error: failureFromThrow(req, error, req.signal, started) };
    return;
  }
  if (!res.ok || !res.body) {
    await drainBody(res);
    const classified = classifyHttpStatus(res.status);
    yield {
      type: 'error',
      error: failure(req, classified.code, res.status, classified.retryable, started),
    };
    return;
  }

  let inputTokens = 0;
  let outputTokens = 0;
  let finishReason: string | null = null;
  for await (const payload of readSsePayloads(res.body)) {
    if (payload === '[DONE]') break;
    const event = parseAnthropicSsePayload(payload);
    if (!event) continue;
    if (event.text) yield { type: 'text_delta', text: event.text };
    if (event.inputTokens != null) inputTokens = event.inputTokens;
    if (event.outputTokens != null) outputTokens = event.outputTokens;
    if (event.finishReason) finishReason = event.finishReason;
  }
  const usage = pricedUsage(req.model, {
    ...emptyUsage(),
    inputTokens,
    outputTokens,
  });
  yield { type: 'usage', usage };
  yield { type: 'done', finishReason };
}

export function buildAnthropicBody(req: LlmProviderRequest, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: req.model,
    max_tokens: positiveInt(req.maxOutputTokens, 1024),
    messages: toAnthropicMessages(req.messages),
    stream,
  };
  const system = collectSystem(req.system, req.messages);
  if (system) body.system = system;
  if (typeof req.temperature === 'number' && Number.isFinite(req.temperature)) {
    body.temperature = req.temperature;
  }
  return body;
}

function anthropicHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  };
}

function collectSystem(system: string | undefined, messages: readonly LlmMessage[]): string {
  const parts: string[] = [];
  if (system && system.trim()) parts.push(system);
  for (const message of messages) {
    if (message.role !== 'system') continue;
    const text = textOf(message.content);
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}

function toAnthropicMessages(messages: readonly LlmMessage[]) {
  const out: Array<{ role: 'user' | 'assistant'; content: unknown[] }> = [];
  for (const message of messages) {
    if (message.role === 'system') continue;
    out.push({
      role: message.role,
      content: message.content.map(toAnthropicPart),
    });
  }
  return out;
}

function toAnthropicPart(part: LlmContentPart): Record<string, unknown> {
  if (part.type === 'text') return { type: 'text', text: part.text };
  return {
    type: 'image',
    source: { type: 'base64', media_type: part.mediaType, data: part.dataBase64 },
  };
}

export function extractAnthropicText(body: unknown): string | null {
  if (!isRecord(body) || !Array.isArray(body.content)) return null;
  const chunks: string[] = [];
  for (const block of body.content) {
    if (!isRecord(block)) continue;
    if (block.type === 'text' && typeof block.text === 'string') chunks.push(block.text);
  }
  if (chunks.length === 0) return null;
  return chunks.join('');
}

function finishReasonFrom(body: unknown): string | null {
  if (!isRecord(body)) return null;
  return typeof body.stop_reason === 'string' ? body.stop_reason : null;
}

function usageFromAnthropic(body: unknown, model: string): LlmUsage {
  const usage = isRecord(body) && isRecord(body.usage) ? body.usage : {};
  return pricedUsage(model, {
    inputTokens: finiteNumber(usage.input_tokens) ?? 0,
    outputTokens: finiteNumber(usage.output_tokens) ?? 0,
    cachedInputTokens: finiteNumber(usage.cache_read_input_tokens) ?? 0,
    reasoningTokens: 0,
    costInUsdTicks: null,
    costUsd: null,
  });
}

export interface AnthropicSseDelta {
  text?: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
}

export function parseAnthropicSsePayload(payload: string): AnthropicSseDelta | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') return null;
  if (parsed.type === 'content_block_delta' && isRecord(parsed.delta)) {
    const text = typeof parsed.delta.text === 'string' ? parsed.delta.text : undefined;
    return text ? { text } : null;
  }
  if (parsed.type === 'message_start' && isRecord(parsed.message) && isRecord(parsed.message.usage)) {
    const inputTokens = finiteNumber(parsed.message.usage.input_tokens);
    return inputTokens == null ? null : { inputTokens };
  }
  if (parsed.type === 'message_delta') {
    const usage = isRecord(parsed.usage) ? parsed.usage : {};
    const outputTokens = finiteNumber(usage.output_tokens);
    const delta = isRecord(parsed.delta) ? parsed.delta : {};
    const finishReason = typeof delta.stop_reason === 'string' ? delta.stop_reason : undefined;
    if (outputTokens == null && !finishReason) return null;
    return {
      ...(outputTokens == null ? {} : { outputTokens }),
      ...(finishReason ? { finishReason } : {}),
    };
  }
  return null;
}

function textOf(parts: readonly LlmContentPart[]): string {
  return parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function pricedUsage(model: string, usage: LlmUsage): LlmUsage {
  return {
    ...usage,
    costUsd: estimateCostUsd(model, usage.inputTokens, usage.outputTokens, usage.cachedInputTokens),
  };
}

function clampTimeout(timeoutMs: number): number {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return 30_000;
  return Math.min(timeoutMs, 180_000);
}

function positiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function failure(
  req: LlmProviderRequest,
  code: LlmProviderFailure['code'],
  httpStatus: number | null,
  retryable: boolean,
  started: number,
): LlmProviderFailure {
  return {
    ok: false,
    code,
    provider: 'anthropic',
    model: req.model,
    httpStatus,
    retryable,
    latencyMs: Date.now() - started,
  };
}

function failureFromThrow(
  req: LlmProviderRequest,
  error: unknown,
  callerSignal: AbortSignal | undefined,
  started: number,
): LlmProviderFailure {
  if (callerSignal?.aborted && !isTimeoutError(error)) {
    return failure(req, 'aborted', null, false, started);
  }
  if (isTimeoutError(error) || isAbortError(error)) {
    return failure(req, 'timeout', null, true, started);
  }
  safeLog.warn('ai.llm.anthropic', 'request failed', { name: error instanceof Error ? error.name : 'unknown' });
  return failure(req, 'upstream_error', null, true, started);
}
