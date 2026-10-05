/**
 * xAI Responses API client (LM-03). Fetch only. No SDK.
 *
 * POST {base}/responses with store:false. Chat Completions and the
 * Anthropic-compatible /v1/messages path are not used.
 *
 * Default base URL is https://api.x.ai/v1. https://us.api.x.ai/v1 is
 * accepted when XAI_BASE_URL is set to that exact origin. Other values
 * are ignored.
 *
 * Reads XAI_API_KEY. Does not invent a key.
 */

import { usdFromXaiTicks } from '@/lib/observability/ai-pricing';
import { safeLog } from '@/lib/utils/safe-log';
import { isTimeoutError, withAbortTimeout } from '@/lib/utils/with-timeout';
import { classifyHttpStatus, drainBody, isAbortError, linkAbortSignals } from './http';
import { finiteNumber, isRecord, readSsePayloads } from './sse';
import {
  emptyUsage,
  type LlmContentPart,
  type LlmProvider,
  type LlmProviderFailure,
  type LlmProviderRequest,
  type LlmProviderResult,
  type LlmReasoningEffort,
  type LlmStreamEvent,
  type LlmUsage,
} from './types';

export const DEFAULT_XAI_BASE_URL = 'https://api.x.ai/v1';
export const US_XAI_BASE_URL = 'https://us.api.x.ai/v1';

const ALLOWED_BASE_URLS = new Set([DEFAULT_XAI_BASE_URL, US_XAI_BASE_URL]);
const XAI_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

export interface XaiClientOptions {
  apiKey?: string | null;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}

export function createXaiProvider(options: XaiClientOptions = {}): LlmProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    id: 'xai',
    complete(req) {
      return completeXai(req, options, fetchImpl);
    },
    stream(req) {
      return streamXai(req, options, fetchImpl);
    },
  };
}

export function resolveXaiBaseUrl(
  explicit: string | undefined,
  env: Record<string, string | undefined> = process.env,
): string {
  const candidate = (explicit ?? env.XAI_BASE_URL ?? DEFAULT_XAI_BASE_URL).replace(/\/+$/, '');
  if (ALLOWED_BASE_URLS.has(candidate)) return candidate;
  safeLog.warn('ai.llm.xai', 'ignored base url outside the allowed hosts', {});
  return DEFAULT_XAI_BASE_URL;
}

async function completeXai(
  req: LlmProviderRequest,
  options: XaiClientOptions,
  fetchImpl: typeof fetch,
): Promise<LlmProviderResult> {
  const started = Date.now();
  const apiKey = resolveKey(options);
  if (!apiKey) return failure(req, 'config_missing', null, false, started);
  const built = buildXaiRequestBody(req, false);
  if (!built.ok) return failure(req, built.code, null, false, started);

  const url = `${resolveXaiBaseUrl(options.baseUrl, options.env)}/responses`;
  try {
    const res = await withAbortTimeout(
      (timeoutSignal) =>
        fetchImpl(url, {
          method: 'POST',
          headers: xaiHeaders(apiKey),
          body: JSON.stringify(built.body),
          signal: linkAbortSignals(timeoutSignal, req.signal),
        }),
      clampTimeout(req.timeoutMs),
      'ai.llm.xai.complete',
    );
    if (!res.ok) {
      await drainBody(res);
      const classified = classifyHttpStatus(res.status);
      safeLog.warn('ai.llm.xai', 'non-2xx', { status: res.status, code: classified.code });
      return failure(req, classified.code, res.status, classified.retryable, started);
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      return failure(req, 'parse_failed', res.status, true, started);
    }
    return resultFromXaiBody(req, parsed, started, res.status);
  } catch (error) {
    return failureFromThrow(req, error, req.signal, started);
  }
}

async function* streamXai(
  req: LlmProviderRequest,
  options: XaiClientOptions,
  fetchImpl: typeof fetch,
): AsyncGenerator<LlmStreamEvent> {
  const started = Date.now();
  const apiKey = resolveKey(options);
  if (!apiKey) {
    yield { type: 'error', error: failure(req, 'config_missing', null, false, started) };
    return;
  }
  const built = buildXaiRequestBody(req, true);
  if (!built.ok) {
    yield { type: 'error', error: failure(req, built.code, null, false, started) };
    return;
  }
  const url = `${resolveXaiBaseUrl(options.baseUrl, options.env)}/responses`;
  let res: Response;
  try {
    res = await withAbortTimeout(
      (timeoutSignal) =>
        fetchImpl(url, {
          method: 'POST',
          headers: xaiHeaders(apiKey),
          body: JSON.stringify(built.body),
          signal: linkAbortSignals(timeoutSignal, req.signal),
        }),
      clampTimeout(req.timeoutMs),
      'ai.llm.xai.stream',
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

  let usage = emptyUsage();
  let finishReason: string | null = null;
  let sawUsage = false;
  for await (const payload of readSsePayloads(res.body)) {
    if (payload === '[DONE]') break;
    const event = parseXaiSsePayload(payload);
    if (!event) continue;
    if (event.text) yield { type: 'text_delta', text: event.text };
    if (event.usage) {
      usage = event.usage;
      sawUsage = true;
    }
    if (event.finishReason) finishReason = event.finishReason;
    if (event.errorCode) {
      yield {
        type: 'error',
        error: failure(req, event.errorCode, null, event.errorCode === 'timeout', started),
      };
      return;
    }
  }
  if (sawUsage) yield { type: 'usage', usage: applyTickCost(usage) };
  yield { type: 'done', finishReason };
}

export type XaiBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; code: 'unsupported_image' | 'bad_request' };

/**
 * Responses API body. `store` is always false. `safety_identifier` is the
 * already-hashed value when the caller supplied one.
 */
export function buildXaiRequestBody(req: LlmProviderRequest, stream: boolean): XaiBodyResult {
  if (!req.model.trim()) return { ok: false, code: 'bad_request' };
  const input: Array<Record<string, unknown>> = [];
  for (const message of req.messages) {
    if (message.role === 'system') continue;
    const content = toXaiContent(message.content);
    if (!content.ok) return content;
    input.push({ role: message.role, content: content.value });
  }
  if (input.length === 0) return { ok: false, code: 'bad_request' };

  const body: Record<string, unknown> = {
    model: req.model,
    input,
    max_output_tokens: positiveInt(req.maxOutputTokens, 1024),
    store: false,
    stream,
  };
  const instructions = collectInstructions(req);
  if (instructions) body.instructions = instructions;
  if (req.safetyIdentifierHash) body.safety_identifier = req.safetyIdentifierHash;
  const effort = normalizeEffort(req.reasoningEffort);
  if (effort) body.reasoning = { effort };
  if (typeof req.temperature === 'number' && Number.isFinite(req.temperature)) {
    body.temperature = req.temperature;
  }
  return { ok: true, body };
}

function toXaiContent(
  parts: readonly LlmContentPart[],
): { ok: true; value: string | Array<Record<string, string>> } | { ok: false; code: 'unsupported_image' } {
  const hasImage = parts.some((part) => part.type === 'image');
  if (!hasImage) {
    const text = parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
    return { ok: true, value: text };
  }
  const content: Array<Record<string, string>> = [];
  for (const part of parts) {
    if (part.type === 'text') {
      content.push({ type: 'input_text', text: part.text });
      continue;
    }
    if (!XAI_IMAGE_TYPES.has(part.mediaType)) return { ok: false, code: 'unsupported_image' };
    content.push({
      type: 'input_image',
      image_url: `data:${part.mediaType};base64,${part.dataBase64}`,
    });
  }
  return { ok: true, value: content };
}

function collectInstructions(req: LlmProviderRequest): string {
  const parts: string[] = [];
  if (req.system && req.system.trim()) parts.push(req.system);
  for (const message of req.messages) {
    if (message.role !== 'system') continue;
    for (const part of message.content) {
      if (part.type === 'text' && part.text.trim()) parts.push(part.text);
    }
  }
  return parts.join('\n\n');
}

function normalizeEffort(effort: LlmReasoningEffort | undefined): LlmReasoningEffort | null {
  if (effort === 'none' || effort === 'low' || effort === 'medium' || effort === 'high' || effort === 'xhigh') {
    return effort;
  }
  return null;
}

export function resultFromXaiBody(
  req: LlmProviderRequest,
  body: unknown,
  started: number,
  httpStatus: number,
): LlmProviderResult {
  if (!isRecord(body)) return failure(req, 'parse_failed', httpStatus, true, started);
  if (body.error != null && extractXaiText(body) == null) {
    return failure(req, 'upstream_error', httpStatus, true, started);
  }
  const text = extractXaiText(body);
  if (text == null) return failure(req, 'parse_failed', httpStatus, true, started);
  return {
    ok: true,
    text,
    provider: 'xai',
    model: typeof body.model === 'string' ? body.model : req.model,
    usage: usageFromXai(body),
    latencyMs: Date.now() - started,
    finishReason: typeof body.status === 'string' ? body.status : null,
  };
}

export function extractXaiText(body: Record<string, unknown>): string | null {
  if (!Array.isArray(body.output)) return null;
  const chunks: string[] = [];
  for (const item of body.output) {
    if (!isRecord(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (!isRecord(part)) continue;
      if (part.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
    }
  }
  if (chunks.length === 0) return null;
  return chunks.join('');
}

export function usageFromXai(body: unknown): LlmUsage {
  const usage = isRecord(body) && isRecord(body.usage) ? body.usage : {};
  const inputDetails = isRecord(usage.input_tokens_details) ? usage.input_tokens_details : {};
  const outputDetails = isRecord(usage.output_tokens_details) ? usage.output_tokens_details : {};
  return applyTickCost({
    inputTokens: finiteNumber(usage.input_tokens) ?? 0,
    outputTokens: finiteNumber(usage.output_tokens) ?? 0,
    cachedInputTokens: finiteNumber(inputDetails.cached_tokens) ?? 0,
    reasoningTokens: finiteNumber(outputDetails.reasoning_tokens) ?? 0,
    costInUsdTicks: finiteNumber(usage.cost_in_usd_ticks),
    costUsd: null,
  });
}

export interface XaiSseDelta {
  text?: string;
  usage?: LlmUsage;
  finishReason?: string;
  errorCode?: LlmProviderFailure['code'];
}

/**
 * Responses API stream events (`response.output_text.delta`,
 * `response.completed`). Also accepts a `choices[].delta.content` chunk
 * if the responses stream emits that shape. The request URL stays
 * `/responses`.
 */
export function parseXaiSsePayload(payload: string): XaiSseDelta | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.type === 'response.output_text.delta' && typeof parsed.delta === 'string') {
    return parsed.delta ? { text: parsed.delta } : null;
  }
  if (parsed.type === 'response.completed' && isRecord(parsed.response)) {
    return {
      usage: usageFromXai(parsed.response),
      finishReason: typeof parsed.response.status === 'string' ? parsed.response.status : 'completed',
    };
  }
  if (parsed.type === 'error' || parsed.error != null) {
    return { errorCode: 'upstream_error' };
  }
  if (Array.isArray(parsed.choices) && isRecord(parsed.choices[0])) {
    const choice = parsed.choices[0];
    const delta = isRecord(choice.delta) ? choice.delta : {};
    const text = typeof delta.content === 'string' ? delta.content : '';
    const usage = isRecord(parsed.usage) ? usageFromXai(parsed) : undefined;
    if (!text && !usage) return null;
    return {
      ...(text ? { text } : {}),
      ...(usage ? { usage } : {}),
    };
  }
  return null;
}

function applyTickCost(usage: LlmUsage): LlmUsage {
  if (usage.costInUsdTicks == null) return usage;
  return { ...usage, costUsd: usdFromXaiTicks(usage.costInUsdTicks) };
}

function resolveKey(options: XaiClientOptions): string | null {
  if (options.apiKey !== undefined) return options.apiKey || null;
  const env = options.env ?? process.env;
  const key = env.XAI_API_KEY ?? '';
  return key || null;
}

function xaiHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
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
    provider: 'xai',
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
  if (callerSignal?.aborted) return failure(req, 'aborted', null, false, started);
  if (isTimeoutError(error) || isAbortError(error)) return failure(req, 'timeout', null, true, started);
  safeLog.warn('ai.llm.xai', 'request failed', { name: error instanceof Error ? error.name : 'unknown' });
  return failure(req, 'upstream_error', null, true, started);
}
