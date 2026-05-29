// Prompt #170 Phase 1c: tests for the LogMeal Food AI primary recognition client.
// Per spec §2.2 LogMeal is the primary provider. Tests verify happy path
// mapping, timeout -> AIRouteError API_DOWN with 504, missing API key ->
// CONFIG_MISSING, non-200 -> API_DOWN, JSON parse failure -> MALFORMED_RESPONSE,
// and that no Supabase auth import bleeds into the provider module.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recognizeWithLogMeal } from '../logmeal';
import { readFileSync } from 'node:fs';

describe('recognizeWithLogMeal', () => {
  const imageBytes = Buffer.from('fake-image-bytes');
  const mime = 'image/jpeg';
  // Phase 1q hotfix 10: a valid v4 UUID + ISO timestamp + allowlisted device
  // class are required at the privacy envelope gate inside the provider.
  const validRequestId = 'a1b2c3d4-e5f6-4789-9abc-def012345678';
  const validCapturedAt = '2026-05-29T12:00:00.000Z';
  const validDeviceClass = 'web' as const;

  beforeEach(() => {
    // Reset any global fetch leaks between tests.
    vi.restoreAllMocks();
  });

  it('returns a shaped ProviderRecognition on a 200 OK', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          segmentation_results: [
            {
              foodName: 'Pizza',
              confidence: 0.91,
              bbox: { x: 10, y: 20, w: 200, h: 180 },
              cookingMethod: 'baked',
              cuisineTag: 'mediterranean',
            },
            {
              foodName: 'Salad',
              confidence: 0.74,
              bbox: { x: 240, y: 30, w: 150, h: 140 },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const result = await recognizeWithLogMeal(imageBytes, mime, {
      apiKey: 'TESTKEY',
      requestId: validRequestId,
      capturedAt: validCapturedAt,
      deviceClass: validDeviceClass,
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result.provider).toBe('logmeal');
    expect(result.items.length).toBe(2);
    expect(result.items[0].foodName).toBe('Pizza');
    expect(result.items[0].boundingBox).toEqual({ x: 10, y: 20, w: 200, h: 180 });
    expect(result.items[0].confidence).toBeCloseTo(0.91, 5);
    expect(result.meanConfidence).toBeCloseTo((0.91 + 0.74) / 2, 5);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns meanConfidence 0 when items array is empty', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ segmentation_results: [] }), { status: 200 }),
    );
    const result = await recognizeWithLogMeal(imageBytes, mime, {
      apiKey: 'TESTKEY',
      requestId: validRequestId,
      capturedAt: validCapturedAt,
      deviceClass: validDeviceClass,
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result.items.length).toBe(0);
    expect(result.meanConfidence).toBe(0);
  });

  it('throws AIRouteError CONFIG_MISSING when apiKey is empty and does NOT call fetch', async () => {
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
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('throws AIRouteError API_DOWN on non-200 response', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );
    await expect(
      recognizeWithLogMeal(imageBytes, mime, {
        apiKey: 'TESTKEY',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'API_DOWN' });
  });

  it('throws AIRouteError MALFORMED_RESPONSE on JSON parse failure', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('not-json-content {{{', { status: 200 }),
    );
    await expect(
      recognizeWithLogMeal(imageBytes, mime, {
        apiKey: 'TESTKEY',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });

  it('throws AIRouteError API_DOWN with httpStatus 504 on timeout', async () => {
    const fetchStub = vi.fn().mockImplementation(
      () => new Promise(() => { /* never resolves */ }),
    );
    await expect(
      recognizeWithLogMeal(imageBytes, mime, {
        apiKey: 'TESTKEY',
        requestId: validRequestId,
        capturedAt: validCapturedAt,
        deviceClass: validDeviceClass,
        timeoutMs: 30,
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'API_DOWN', httpStatus: 504 });
  });

  it('source file does not import any Supabase auth getter (lint-grep)', () => {
    const src = readFileSync(
      __dirname.replace(/__tests__$/, '') + '/logmeal.ts',
      'utf8',
    );
    expect(src).not.toMatch(/auth\.uid/);
    expect(src).not.toMatch(/getUser\b/);
    expect(src).not.toMatch(/createServerClient/);
    expect(src).not.toMatch(/createAdminClient/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabase/);
  });
});
