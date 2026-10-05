import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { sha256Hex } from '../hash';
import { routeLlm, routeLlmStream } from '../router';
import { createXaiProvider } from '../xai-client';
import {
  emptyUsage,
  type LlmAuditEvent,
  type LlmProvider,
  type LlmProviderResult,
  type LlmRouteRequest,
  type LlmStreamEvent,
} from '../types';

const XAI_FIXTURE = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures', 'xai-response.json'), 'utf8'),
) as { output: Array<{ content: Array<{ text: string }> }> };

const SECRET = 'MEMBER-SECRET-not-a-hash';
const PROMPT = 'SENTINEL_PROMPT_DO_NOT_LOG';

function request(overrides: Partial<LlmRouteRequest> = {}): LlmRouteRequest {
  return {
    featureId: 'admin_marshall_remediate',
    dataClass: 'P0',
    anthropicModel: 'claude-sonnet-4-6',
    xaiModel: 'grok-4.7',
    system: PROMPT,
    messages: [{ role: 'user', content: [{ type: 'text', text: 'draft' }] }],
    maxOutputTokens: 128,
    timeoutMs: 1000,
    ...overrides,
  };
}

function ok(provider: 'anthropic' | 'xai', text: string): LlmProviderResult {
  return {
    ok: true,
    text,
    provider,
    model: provider === 'xai' ? 'grok-4.7' : 'claude-sonnet-4-6',
    usage: { ...emptyUsage(), inputTokens: 3, outputTokens: 2, costUsd: 0.01 },
    latencyMs: 5,
    finishReason: 'end_turn',
  };
}

function fail(provider: 'anthropic' | 'xai', code: 'timeout' | 'upstream_error' | 'rate_limited'): LlmProviderResult {
  return {
    ok: false,
    code,
    provider,
    model: provider === 'xai' ? 'grok-4.7' : 'claude-sonnet-4-6',
    httpStatus: code === 'rate_limited' ? 429 : 503,
    retryable: true,
    latencyMs: 5,
  };
}

function provider(id: 'anthropic' | 'xai', complete: LlmProvider['complete'], stream?: LlmProvider['stream']): LlmProvider {
  return {
    id,
    complete,
    stream: stream ?? (async function* () {
      yield { type: 'text_delta', text: id };
    }),
  };
}

function flags(on: string[]): (flag: string) => boolean {
  const enabled = new Set(on);
  return (flag) => enabled.has(flag);
}

describe('routeLlm', () => {
  it('does not call xAI when every flag is off', async () => {
    const xai = vi.fn(async () => ok('xai', 'from-xai'));
    const anthropic = vi.fn(async () => ok('anthropic', 'from-claude'));
    const audits: LlmAuditEvent[] = [];
    const result = await routeLlm(request(), {
      xai: provider('xai', xai),
      anthropic: provider('anthropic', anthropic),
      isEnabled: () => false,
      audit: (event) => audits.push(event),
      sleep: async () => {},
    });
    expect(xai).not.toHaveBeenCalled();
    expect(anthropic).toHaveBeenCalledOnce();
    expect(result.ok && result.text).toBe('from-claude');
    expect(result.planReason).toBe('flag_off');
    expect(JSON.stringify(audits)).not.toContain(PROMPT);
  });

  it('uses xAI first for a P0 admin call and does not call Claude', async () => {
    const xai = vi.fn(async () => ok('xai', '{"proposedRewrite":"ok"}'));
    const anthropic = vi.fn(async () => ok('anthropic', 'from-claude'));
    const result = await routeLlm(request({ requireJson: true }), {
      xai: provider('xai', xai),
      anthropic: provider('anthropic', anthropic),
      isEnabled: flags(['llm_xai_admin_marshall_remediate_enabled']),
      sleep: async () => {},
    });
    expect(xai).toHaveBeenCalledOnce();
    expect(anthropic).not.toHaveBeenCalled();
    expect(result.ok && result.provider).toBe('xai');
    expect(result.fallbackFrom).toBeNull();
  });

  it('falls back when xAI text is not JSON and records schema_invalid', async () => {
    const audits: LlmAuditEvent[] = [];
    const result = await routeLlm(request({ requireJson: true }), {
      xai: provider('xai', async () => ok('xai', 'not json')),
      anthropic: provider('anthropic', async () => ok('anthropic', '{"proposedRewrite":"ok"}')),
      isEnabled: flags(['llm_xai_admin_marshall_remediate_enabled']),
      audit: (event) => audits.push(event),
      sleep: async () => {},
    });
    expect(result.ok && result.provider).toBe('anthropic');
    expect(result.fallbackFrom).toBe('xai');
    expect(audits[0]?.primaryErrorCode).toBe('schema_invalid');
    expect(JSON.stringify(audits)).not.toContain('not json');
  });

  it('falls back to Claude after a retryable xAI failure', async () => {
    const xai = vi.fn(async () => fail('xai', 'timeout'));
    const anthropic = vi.fn(async () => ok('anthropic', 'from-claude'));
    const result = await routeLlm(request(), {
      xai: provider('xai', xai),
      anthropic: provider('anthropic', anthropic),
      isEnabled: flags(['llm_xai_admin_marshall_remediate_enabled']),
      sleep: async () => {},
    });
    expect(xai).toHaveBeenCalledTimes(2);
    expect(anthropic).toHaveBeenCalledOnce();
    expect(result.ok && result.text).toBe('from-claude');
    expect(result.fallbackFrom).toBe('xai');
  });

  it('falls back when the xAI circuit is open without calling xAI', async () => {
    const xai = vi.fn(async () => ok('xai', 'should-not-run'));
    const anthropic = vi.fn(async () => ok('anthropic', 'from-claude'));
    const result = await routeLlm(request(), {
      xai: provider('xai', xai),
      anthropic: provider('anthropic', anthropic),
      isEnabled: flags(['llm_xai_admin_marshall_remediate_enabled']),
      sleep: async () => {},
      breaker(name) {
        if (name === 'llm-xai') {
          return {
            execute: async <T>(_fn: () => Promise<T>): Promise<T> => {
              throw new CircuitBreakerError(name);
            },
          };
        }
        return { execute: <T>(fn: () => Promise<T>) => fn() };
      },
    });
    expect(xai).not.toHaveBeenCalled();
    expect(result.ok && result.provider).toBe('anthropic');
    expect(result.fallbackFrom).toBe('xai');
  });

  it('refuses to send P1, P2, and P3 to xAI unless member data is allowed', async () => {
    for (const dataClass of ['P1', 'P2', 'P3'] as const) {
      const xai = vi.fn(async () => ok('xai', 'nope'));
      const anthropic = vi.fn(async () => ok('anthropic', 'claude'));
      const audits: LlmAuditEvent[] = [];
      const result = await routeLlm(request({
        featureId: 'lab_explanation',
        dataClass,
        safetyIdentifierSource: SECRET,
      }), {
        xai: provider('xai', xai),
        anthropic: provider('anthropic', anthropic),
        isEnabled: flags(['llm_xai_lab_explanation_enabled']),
        audit: (event) => audits.push(event),
        sleep: async () => {},
      });
      expect(xai).not.toHaveBeenCalled();
      expect(result.planReason).toBe('member_data_blocked');
      expect(JSON.stringify(audits)).not.toContain(SECRET);
      expect(JSON.stringify(audits)).not.toContain(PROMPT);
    }

    const xai = vi.fn(async () => ok('xai', 'allowed'));
    const allowed = await routeLlm(request({ dataClass: 'P2', featureId: 'lab_explanation' }), {
      xai: provider('xai', xai),
      anthropic: provider('anthropic', async () => ok('anthropic', 'claude')),
      isEnabled: flags(['llm_xai_lab_explanation_enabled', 'llm_xai_member_data_allowed']),
      sleep: async () => {},
    });
    expect(xai).toHaveBeenCalledOnce();
    expect(allowed.ok && allowed.provider).toBe('xai');
  });

  it('shadow returns Claude text, records no prompt, and skips xAI for member data', async () => {
    const xai = vi.fn(async () => ok('xai', 'xai-draft'));
    const anthropic = vi.fn(async () => ok('anthropic', 'claude-draft'));
    const audits: LlmAuditEvent[] = [];
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });
    const shadowed = await routeLlm(request(), {
      xai: provider('xai', xai),
      anthropic: provider('anthropic', anthropic),
      isEnabled: flags(['llm_xai_admin_marshall_remediate_shadow']),
      audit: (event) => audits.push(event),
      sleep: async () => {},
    });
    expect(shadowed.ok && shadowed.text).toBe('claude-draft');
    expect(shadowed.provider).toBe('anthropic');
    expect(audits[0]?.route).toBe('llm.admin_marshall_remediate#shadow');
    expect(audits[0]?.compareClass).toBe('differ');
    expect(JSON.stringify(audits)).not.toContain('xai-draft');
    expect(logs.join('\n')).not.toContain(PROMPT);

    const blocked = vi.fn(async () => ok('xai', 'nope'));
    await routeLlm(request({ dataClass: 'P3', featureId: 'body_photos' }), {
      xai: provider('xai', blocked),
      anthropic: provider('anthropic', async () => ok('anthropic', 'claude')),
      isEnabled: flags(['llm_xai_body_photos_shadow']),
      sleep: async () => {},
    });
    expect(blocked).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('sends a hashed safety identifier and store:false on the real client', async () => {
    const hash = await sha256Hex(SECRET);
    const fetchImpl = vi.fn(async () => Response.json(XAI_FIXTURE));
    const result = await routeLlm(request({ safetyIdentifierSource: SECRET, requireJson: true }), {
      xai: createXaiProvider({ apiKey: 'test-key', fetchImpl }),
      anthropic: provider('anthropic', vi.fn(async () => ok('anthropic', 'unused'))),
      isEnabled: flags(['llm_xai_admin_marshall_remediate_enabled']),
      env: { LLM_XAI_ALLOWLIST: hash },
      sleep: async () => {},
      breaker: () => ({ execute: (fn) => fn() }),
    });
    expect(result.ok).toBe(true);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent.store).toBe(false);
    expect(sent.safety_identifier).toBe(hash);
    expect(JSON.stringify(sent)).not.toContain(SECRET);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('/v1/responses');
  });
});

describe('routeLlmStream', () => {
  it('falls back to Claude when xAI errors before any text', async () => {
    const anthropicStream = vi.fn(async function* (): AsyncGenerator<LlmStreamEvent> {
      yield { type: 'text_delta', text: 'claude-stream' };
    });
    const xaiStream = vi.fn(async function* (): AsyncGenerator<LlmStreamEvent> {
      yield {
        type: 'error',
        error: {
          ok: false,
          code: 'upstream_error',
          provider: 'xai',
          model: 'grok-4.7',
          httpStatus: 500,
          retryable: true,
          latencyMs: 1,
        },
      };
    });
    const events = [];
    for await (const event of routeLlmStream(request(), {
      xai: provider('xai', async () => ok('xai', 'unused'), xaiStream),
      anthropic: provider('anthropic', async () => ok('anthropic', 'unused'), anthropicStream),
      isEnabled: flags(['llm_xai_admin_marshall_remediate_enabled']),
    })) {
      events.push(event);
    }
    expect(events).toEqual([{ type: 'text_delta', text: 'claude-stream' }]);
  });

  it('does not open an xAI stream when flags are off', async () => {
    const xaiStream = vi.fn(async function* (): AsyncGenerator<LlmStreamEvent> {
      yield { type: 'text_delta', text: 'xai' };
    });
    const events = [];
    for await (const event of routeLlmStream(request(), {
      xai: provider('xai', async () => ok('xai', 'unused'), xaiStream),
      anthropic: provider('anthropic', async () => ok('anthropic', 'unused')),
      isEnabled: () => false,
    })) {
      events.push(event);
    }
    expect(xaiStream).not.toHaveBeenCalled();
    expect(events).toEqual([{ type: 'text_delta', text: 'anthropic' }]);
  });
});
