import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '../hash';
import {
  buildXaiRequestBody,
  createXaiProvider,
  parseXaiSsePayload,
  resolveXaiBaseUrl,
  US_XAI_BASE_URL,
} from '../xai-client';
import type { LlmProviderRequest } from '../types';

const FIXTURE = path.join(__dirname, 'fixtures', 'xai-response.json');
const SSE = path.join(__dirname, 'fixtures', 'xai-sse.txt');
const SECRET = 'MEMBER-SECRET-not-a-hash';

function request(overrides: Partial<LlmProviderRequest> = {}): LlmProviderRequest {
  return {
    featureId: 'admin_marshall_remediate',
    dataClass: 'P0',
    anthropicModel: 'claude-sonnet-4-6',
    xaiModel: 'grok-4.7',
    model: 'grok-4.7',
    system: 'Rewrite marketing copy.',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'draft text' }] }],
    maxOutputTokens: 256,
    timeoutMs: 1000,
    reasoningEffort: 'low',
    ...overrides,
  };
}

describe('xAI Responses client', () => {
  it('posts store:false to /v1/responses and prices ticks from the fixture', async () => {
    const body = JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown;
    const hash = await sha256Hex(SECRET);
    const fetchImpl = vi.fn(async () => Response.json(body));
    const provider = createXaiProvider({ apiKey: 'test-key', fetchImpl });
    const result = await provider.complete(request({ safetyIdentifierHash: hash }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain('proposedRewrite');
    expect(result.usage.inputTokens).toBe(20);
    expect(result.usage.cachedInputTokens).toBe(4);
    expect(result.usage.reasoningTokens).toBe(3);
    expect(result.usage.costInUsdTicks).toBe(5_000_000_000);
    expect(result.usage.costUsd).toBeCloseTo(0.5);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.x.ai/v1/responses');
    expect(url).not.toContain('chat/completions');
    expect(url).not.toContain('/v1/messages');
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent.store).toBe(false);
    expect(sent.safety_identifier).toBe(hash);
    expect(JSON.stringify(sent)).not.toContain(SECRET);
    expect(sent.previous_response_id).toBeUndefined();
    expect(sent.model).toBe('grok-4.7');
    expect(sent.max_output_tokens).toBe(256);
    expect(sent.reasoning).toEqual({ effort: 'low' });
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
  });

  it('does not fetch webp images', async () => {
    const fetchImpl = vi.fn();
    const provider = createXaiProvider({ apiKey: 'test-key', fetchImpl });
    const result = await provider.complete(request({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'label' },
          { type: 'image', mediaType: 'image/webp', dataBase64: 'abc' },
        ],
      }],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('unsupported_image');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('classifies timeout, rate limit, and missing key', async () => {
    const rateLimited = createXaiProvider({
      apiKey: 'test-key',
      fetchImpl: vi.fn(async () => new Response('', { status: 429 })),
    });
    const limited = await rateLimited.complete(request());
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.code).toBe('rate_limited');

    const missing = createXaiProvider({
      apiKey: null,
      fetchImpl: vi.fn(),
    });
    const config = await missing.complete(request());
    expect(config.ok).toBe(false);
    if (!config.ok) expect(config.code).toBe('config_missing');

    const aborting = createXaiProvider({
      apiKey: 'test-key',
      fetchImpl: vi.fn(async () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      }),
    });
    const timed = await aborting.complete(request());
    expect(timed.ok).toBe(false);
    if (!timed.ok) {
      expect(timed.code).toBe('timeout');
      expect(timed.retryable).toBe(true);
    }
  });

  it('parses a Responses SSE fixture and ignores a disallowed base URL', async () => {
    expect(resolveXaiBaseUrl('https://evil.example/v1', {})).toBe('https://api.x.ai/v1');
    expect(resolveXaiBaseUrl(US_XAI_BASE_URL, {})).toBe(US_XAI_BASE_URL);

    const raw = readFileSync(SSE, 'utf8');
    const bytes = new TextEncoder().encode(raw);
    const splitAt = 40;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, splitAt));
        controller.enqueue(bytes.slice(splitAt));
        controller.close();
      },
    });
    const fetchImpl = vi.fn(async (url: string) => {
      expect(String(url)).toBe(`${US_XAI_BASE_URL}/responses`);
      return new Response(stream, { status: 200 });
    });
    const provider = createXaiProvider({ apiKey: 'test-key', baseUrl: US_XAI_BASE_URL, fetchImpl });
    const events = [];
    for await (const event of provider.stream(request())) events.push(event);
    const text = events.filter((event) => event.type === 'text_delta').map((event) => (event.type === 'text_delta' ? event.text : '')).join('');
    expect(text).toBe('Hello');
    const usage = events.find((event) => event.type === 'usage');
    expect(usage && usage.type === 'usage' ? usage.usage.costUsd : null).toBeCloseTo(1);
    expect(usage && usage.type === 'usage' ? usage.usage.reasoningTokens : 0).toBe(2);
  });

  it('accepts a chat-shaped delta only as a stream parse, not as the request URL', () => {
    const delta = parseXaiSsePayload(JSON.stringify({
      choices: [{ delta: { content: 'Hi' } }],
    }));
    expect(delta?.text).toBe('Hi');
    const built = buildXaiRequestBody(request(), false);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(JSON.stringify(built.body)).not.toContain('chat/completions');
    expect(JSON.stringify(built.body)).not.toContain('/v1/messages');
  });
});
