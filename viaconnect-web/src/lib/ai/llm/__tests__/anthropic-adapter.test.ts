import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createAnthropicProvider, parseAnthropicSsePayload } from '../anthropic-adapter';
import type { LlmProviderRequest } from '../types';

const FIXTURE = path.join(__dirname, 'fixtures', 'anthropic-message.json');
const SSE = path.join(__dirname, 'fixtures', 'anthropic-sse.txt');

function request(overrides: Partial<LlmProviderRequest> = {}): LlmProviderRequest {
  return {
    featureId: 'admin_health_check',
    dataClass: 'P0',
    anthropicModel: 'claude-sonnet-4-6',
    xaiModel: 'grok-4.7',
    model: 'claude-sonnet-4-6',
    system: 'Rewrite marketing copy.',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'draft' }] }],
    maxOutputTokens: 256,
    timeoutMs: 1000,
    ...overrides,
  };
}

describe('anthropic adapter', () => {
  it('posts to the Messages API and reads the fixture', async () => {
    const body = JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown;
    const fetchImpl = vi.fn(async () => Response.json(body));
    const provider = createAnthropicProvider({ apiKey: 'test-key', fetchImpl });
    const result = await provider.complete(request());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain('proposedRewrite');
    expect(result.usage.inputTokens).toBe(11);
    expect(result.usage.cachedInputTokens).toBe(2);
    expect(result.usage.costUsd).toBeNull();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(String(init.headers && (init.headers as Record<string, string>)['anthropic-version'])).toBe('2023-06-01');
    const sent = JSON.parse(String(init.body)) as { model: string; max_tokens: number; stream: boolean };
    expect(sent.model).toBe('claude-sonnet-4-6');
    expect(sent.max_tokens).toBe(256);
    expect(sent.stream).toBe(false);
  });

  it('parses an SSE fixture split across chunks', async () => {
    const raw = readFileSync(SSE, 'utf8');
    const bytes = new TextEncoder().encode(raw);
    const splitAt = Math.floor(bytes.length / 2);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, splitAt));
        controller.enqueue(bytes.slice(splitAt));
        controller.close();
      },
    });
    const fetchImpl = vi.fn(async () => new Response(stream, { status: 200 }));
    const provider = createAnthropicProvider({ apiKey: 'test-key', fetchImpl });
    const events = [];
    for await (const event of provider.stream(request())) events.push(event);
    const text = events.filter((event) => event.type === 'text_delta').map((event) => event.type === 'text_delta' ? event.text : '').join('');
    expect(text).toBe('Hello');
    const usage = events.find((event) => event.type === 'usage');
    expect(usage && usage.type === 'usage' ? usage.usage.inputTokens : 0).toBe(5);
    expect(usage && usage.type === 'usage' ? usage.usage.outputTokens : 0).toBe(1);
  });

  it('classifies 429 as rate_limited without calling the network again', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 429 }));
    const provider = createAnthropicProvider({ apiKey: 'test-key', fetchImpl });
    const result = await provider.complete(request());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('rate_limited');
    expect(result.retryable).toBe(true);
    expect(result.httpStatus).toBe(429);
  });

  it('returns config_missing when no key is injected', async () => {
    const fetchImpl = vi.fn();
    const provider = createAnthropicProvider({ apiKey: null, fetchImpl });
    const result = await provider.complete(request());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('config_missing');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('parseAnthropicSsePayload', () => {
  it('reads a content_block_delta from the fixture line', () => {
    const line = readFileSync(SSE, 'utf8').split('\n').find((row) => row.includes('"content_block_delta"'));
    expect(line).toBeTruthy();
    const payload = line!.slice(line!.indexOf('{'));
    expect(parseAnthropicSsePayload(payload)?.text).toBe('Hello');
  });
});
