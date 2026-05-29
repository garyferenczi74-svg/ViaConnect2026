// Prompt #170 Phase 1c: tests for the Claude Vision tertiary recognition client.
// Per spec §2.2 step 4, Claude Vision is invoked only when primary.meanConfidence
// is below 0.55, with a monthly USD cap to limit spend. Tests cover budget
// gating, happy path with bbox normalization, missing key, and timeout.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recognizeWithClaude } from '../claude-vision';

// Mock sharp metadata so bbox normalization is deterministic.
vi.mock('sharp', () => {
  return {
    default: () => ({
      metadata: async () => ({ width: 1000, height: 800 }),
    }),
  };
});

// Mock the Anthropic SDK so no live API call ever happens.
const messagesCreateMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  // Use a real class so `new Anthropic({ apiKey })` works as a constructor.
  class MockAnthropic {
    messages = { create: messagesCreateMock };
    // Accept the apiKey-bearing options object the production code passes.
    constructor(_opts: { apiKey: string }) {
      void _opts;
    }
  }
  return { default: MockAnthropic };
});

const imageBytes = Buffer.from('fake-image-bytes');
const mime = 'image/jpeg';
// Phase 1q hotfix 10: a valid v4 UUID + ISO timestamp + allowlisted device
// class are required at the privacy envelope gate inside the provider.
const validRequestId = 'a1b2c3d4-e5f6-4789-9abc-def012345678';
const validCapturedAt = '2026-05-29T12:00:00.000Z';
const validDeviceClass = 'web' as const;

beforeEach(() => {
  messagesCreateMock.mockReset();
});

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

describe('recognizeWithClaude', () => {
  it('throws AIRouteError BUDGET_HIT when monthly cap is already reached', async () => {
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
    expect(messagesCreateMock).not.toHaveBeenCalled();
  });

  it('throws AIRouteError CONFIG_MISSING when apiKey is empty', async () => {
    await expect(
      recognizeWithClaude(imageBytes, mime, {
        apiKey: '',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        monthlyCapUsd: 5,
        monthSpendUsdSoFar: 0,
      }),
    ).rejects.toMatchObject({ code: 'CONFIG_MISSING' });
    expect(messagesCreateMock).not.toHaveBeenCalled();
  });

  it('returns shaped ProviderRecognition with denormalized pixel bboxes on happy path', async () => {
    messagesCreateMock.mockResolvedValueOnce(
      claudeTextResponse(JSON.stringify([
        {
          foodName: 'Pizza',
          cuisineTag: 'mediterranean',
          boundingBox: { x: 0.1, y: 0.2, w: 0.4, h: 0.5 },
          confidence: 0.82,
          cookingMethod: 'baked',
        },
        {
          foodName: 'Salad',
          cuisineTag: 'north_american',
          boundingBox: { x: 0.6, y: 0.1, w: 0.3, h: 0.4 },
          confidence: 0.7,
          cookingMethod: 'raw',
        },
      ])),
    );
    const result = await recognizeWithClaude(imageBytes, mime, {
      apiKey: 'TESTKEY',
      requestId: validRequestId,
      capturedAt: validCapturedAt,
      deviceClass: validDeviceClass,
      monthlyCapUsd: 5,
      monthSpendUsdSoFar: 0,
    });
    expect(result.provider).toBe('claude_vision');
    expect(result.items.length).toBe(2);
    // Pixel denormalization against the mocked 1000x800 metadata.
    expect(result.items[0].boundingBox).toEqual({
      x: 100,
      y: 160,
      w: 400,
      h: 400,
    });
    expect(result.items[0].confidence).toBeCloseTo(0.82, 5);
    expect(result.items[0].foodName).toBe('Pizza');
    expect(result.meanConfidence).toBeCloseTo((0.82 + 0.7) / 2, 5);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('throws AIRouteError API_DOWN with httpStatus 504 on timeout', async () => {
    messagesCreateMock.mockImplementation(
      () => new Promise(() => { /* never resolves */ }),
    );
    await expect(
      recognizeWithClaude(imageBytes, mime, {
        apiKey: 'TESTKEY',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        timeoutMs: 30,
        monthlyCapUsd: 5,
        monthSpendUsdSoFar: 0,
      }),
    ).rejects.toMatchObject({ code: 'API_DOWN', httpStatus: 504 });
  });

  it('throws AIRouteError MALFORMED_RESPONSE on un-parseable model output', async () => {
    messagesCreateMock.mockResolvedValueOnce(
      claudeTextResponse('not a json array at all'),
    );
    await expect(
      recognizeWithClaude(imageBytes, mime, {
        apiKey: 'TESTKEY',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        monthlyCapUsd: 5,
        monthSpendUsdSoFar: 0,
      }),
    ).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });

  it('returns empty items + meanConfidence 0 on an empty JSON array', async () => {
    messagesCreateMock.mockResolvedValueOnce(
      claudeTextResponse('[]'),
    );
    const result = await recognizeWithClaude(imageBytes, mime, {
      apiKey: 'TESTKEY',
      requestId: validRequestId,
      capturedAt: validCapturedAt,
      deviceClass: validDeviceClass,
      monthlyCapUsd: 5,
      monthSpendUsdSoFar: 0,
    });
    expect(result.items.length).toBe(0);
    expect(result.meanConfidence).toBe(0);
  });
});
