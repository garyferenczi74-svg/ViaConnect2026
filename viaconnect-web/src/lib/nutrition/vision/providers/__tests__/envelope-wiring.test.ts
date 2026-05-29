// Prompt #170 Phase 1q hotfix 10: provider envelope-wiring sanity tests.
//
// Verifies that recognizeWithLogMeal and recognizeWithClaude invoke
// sanitizeVisionRequest with the correct 4-key allowlist shape BEFORE any
// outbound HTTP fetch or Anthropic SDK call. The redact module is mocked
// here so the test can observe the call order; the real wiring path is
// exercised by the sibling logmeal.test.ts + claude-vision.test.ts files
// which use the real sanitizer.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted so the spy lives at module-eval time, before the provider import.
const sanitizeMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/nutrition/privacy/redact', () => ({
  // Pass through but record the call. The provider's wiring path is what we
  // are asserting on; the real-shape validation is in redact.test.ts.
  sanitizeVisionRequest: sanitizeMock,
}));

// Mock sharp for the Claude branch (mirrors claude-vision.test.ts).
vi.mock('sharp', () => ({
  default: () => ({
    metadata: async () => ({ width: 1000, height: 800 }),
  }),
}));

// Mock the Anthropic SDK so no live call ever happens.
const messagesCreateMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: messagesCreateMock };
    constructor(_opts: { apiKey: string }) {
      void _opts;
    }
  }
  return { default: MockAnthropic };
});

import { recognizeWithLogMeal } from '../logmeal';
import { recognizeWithClaude } from '../claude-vision';

const imageBytes = Buffer.from('fake-image-bytes');
const mime = 'image/jpeg';
const validRequestId = 'a1b2c3d4-e5f6-4789-9abc-def012345678';
const validCapturedAt = '2026-05-29T12:00:00.000Z';
const validDeviceClass = 'web' as const;

beforeEach(() => {
  sanitizeMock.mockReset();
  sanitizeMock.mockImplementation((env: unknown) => env);
  messagesCreateMock.mockReset();
});

describe('LogMeal provider envelope wiring', () => {
  it('invokes sanitizeVisionRequest with the 4-key allowlist envelope BEFORE fetch', async () => {
    const fetchOrder: string[] = [];
    sanitizeMock.mockImplementation((env: unknown) => {
      fetchOrder.push('sanitize');
      return env;
    });
    const fetchStub = vi.fn().mockImplementation(async () => {
      fetchOrder.push('fetch');
      return new Response(JSON.stringify({ segmentation_results: [] }), { status: 200 });
    });

    await recognizeWithLogMeal(imageBytes, mime, {
      apiKey: 'TESTKEY',
      requestId: validRequestId,
      capturedAt: validCapturedAt,
      deviceClass: validDeviceClass,
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });

    expect(sanitizeMock).toHaveBeenCalledTimes(1);
    const envelope = sanitizeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(envelope).sort()).toEqual(
      ['capturedAt', 'deviceClass', 'imageBase64', 'requestId'],
    );
    expect(envelope.requestId).toBe(validRequestId);
    expect(envelope.capturedAt).toBe(validCapturedAt);
    expect(envelope.deviceClass).toBe(validDeviceClass);
    expect(typeof envelope.imageBase64).toBe('string');
    expect((envelope.imageBase64 as string).length).toBeGreaterThan(0);
    expect(fetchOrder).toEqual(['sanitize', 'fetch']);
  });

  it('strips the req- prefix from requestId before handing to sanitize', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ segmentation_results: [] }), { status: 200 }),
    );
    await recognizeWithLogMeal(imageBytes, mime, {
      apiKey: 'TESTKEY',
      requestId: `req-${validRequestId}`,
      capturedAt: validCapturedAt,
      deviceClass: validDeviceClass,
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    const envelope = sanitizeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(envelope.requestId).toBe(validRequestId);
  });

  it('throws AIRouteError INVALID_INPUT 400 if sanitize throws, and does NOT call fetch', async () => {
    sanitizeMock.mockImplementation(() => {
      throw new Error('sanitizeVisionRequest: forbidden or extra keys present: user_id');
    });
    const fetchStub = vi.fn();
    await expect(
      recognizeWithLogMeal(imageBytes, mime, {
        apiKey: 'TESTKEY',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', httpStatus: 400 });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('does NOT call sanitize when apiKey is missing (fails fast before envelope)', async () => {
    const fetchStub = vi.fn();
    await expect(
      recognizeWithLogMeal(imageBytes, mime, {
        apiKey: '',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'CONFIG_MISSING' });
    expect(sanitizeMock).not.toHaveBeenCalled();
  });
});

describe('Claude Vision provider envelope wiring', () => {
  function claudeTextResponse(text: string): unknown {
    return {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-6',
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 50 },
    };
  }

  it('invokes sanitizeVisionRequest with the 4-key allowlist envelope BEFORE Anthropic SDK call', async () => {
    const callOrder: string[] = [];
    sanitizeMock.mockImplementation((env: unknown) => {
      callOrder.push('sanitize');
      return env;
    });
    messagesCreateMock.mockImplementation(async () => {
      callOrder.push('sdk');
      return claudeTextResponse('[]');
    });

    await recognizeWithClaude(imageBytes, mime, {
      apiKey: 'TESTKEY',
      requestId: validRequestId,
      capturedAt: validCapturedAt,
      deviceClass: validDeviceClass,
      monthlyCapUsd: 100,
      monthSpendUsdSoFar: 0,
    });

    expect(sanitizeMock).toHaveBeenCalledTimes(1);
    const envelope = sanitizeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(envelope).sort()).toEqual(
      ['capturedAt', 'deviceClass', 'imageBase64', 'requestId'],
    );
    expect(envelope.requestId).toBe(validRequestId);
    expect(envelope.capturedAt).toBe(validCapturedAt);
    expect(envelope.deviceClass).toBe(validDeviceClass);
    expect(typeof envelope.imageBase64).toBe('string');
    expect((envelope.imageBase64 as string).length).toBeGreaterThan(0);
    expect(callOrder).toEqual(['sanitize', 'sdk']);
  });

  it('strips the req- prefix from requestId before handing to sanitize', async () => {
    messagesCreateMock.mockResolvedValue(claudeTextResponse('[]'));
    await recognizeWithClaude(imageBytes, mime, {
      apiKey: 'TESTKEY',
      requestId: `req-${validRequestId}`,
      capturedAt: validCapturedAt,
      deviceClass: validDeviceClass,
      monthlyCapUsd: 100,
      monthSpendUsdSoFar: 0,
    });
    const envelope = sanitizeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(envelope.requestId).toBe(validRequestId);
  });

  it('throws AIRouteError INVALID_INPUT 400 if sanitize throws, and does NOT call the SDK', async () => {
    sanitizeMock.mockImplementation(() => {
      throw new Error('sanitizeVisionRequest: forbidden or extra keys present: user_id');
    });
    await expect(
      recognizeWithClaude(imageBytes, mime, {
        apiKey: 'TESTKEY',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        monthlyCapUsd: 100,
        monthSpendUsdSoFar: 0,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', httpStatus: 400 });
    expect(messagesCreateMock).not.toHaveBeenCalled();
  });

  it('does NOT call sanitize when monthly cap is already reached (fails fast before envelope)', async () => {
    await expect(
      recognizeWithClaude(imageBytes, mime, {
        apiKey: 'TESTKEY',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        monthlyCapUsd: 5,
        monthSpendUsdSoFar: 5.01,
      }),
    ).rejects.toMatchObject({ code: 'BUDGET_HIT' });
    expect(sanitizeMock).not.toHaveBeenCalled();
  });
});
