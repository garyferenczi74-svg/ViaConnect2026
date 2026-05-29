// Prompt #170 Phase 1j: tests for POST /api/nutrition/photo/analyze.
//
// Covers auth failure, missing image, bad mime, oversize, and the happy
// path where detectMeal + resolveNutrients + estimatePortion +
// suggestCookingOil are all mocked. Verifies the §9.1 response shape
// (job_id, meal_draft with items + totals + meal_confidence + warnings).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const VALID_UUID = '11111111-2222-4333-8444-555555555555';

const mocks = vi.hoisted(() => {
  return {
    supabaseAuth: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    storageUpload: vi.fn().mockResolvedValue({ error: null }),
    blobInsertSingle: vi.fn().mockResolvedValue({ data: { id: 'blob-1' }, error: null }),
    detectMeal: vi.fn(),
    resolveNutrients: vi.fn(),
    estimatePortion: vi.fn(),
    suggestCookingOil: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.supabaseAuth },
    storage: { from: () => ({ upload: mocks.storageUpload }) },
    from: () => ({
      insert: () => ({
        select: () => ({ single: mocks.blobInsertSingle }),
      }),
    }),
  }),
}));

vi.mock('@/lib/supabase/admin-optional', () => ({
  tryCreateAdminClient: () => ({
    storage: { from: () => ({ upload: mocks.storageUpload }) },
    from: () => ({
      insert: () => ({
        select: () => ({ single: mocks.blobInsertSingle }),
      }),
    }),
  }),
}));

vi.mock('@/lib/nutrition/vision/detect', () => ({
  detectMeal: mocks.detectMeal,
}));

vi.mock('@/lib/nutrition/databases/resolver', () => ({
  resolveNutrients: mocks.resolveNutrients,
}));

vi.mock('@/lib/nutrition/portion/volume-estimate', () => ({
  estimatePortion: mocks.estimatePortion,
}));

vi.mock('@/lib/nutrition/cooking-oil/suggester', () => ({
  suggestCookingOil: mocks.suggestCookingOil,
}));

vi.mock('@/lib/observability/audit-recorder', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  newRequestId: () => 'req-test',
}));

import { POST } from '../route';

function makeReq(opts: {
  imageMime?: string;
  imageBytes?: Uint8Array;
  capturedAt?: string;
  clientId?: string | null;
  deviceClass?: string;
  monthSpend?: string;
  omitImage?: boolean;
}): NextRequest {
  const fd = new FormData();
  if (!opts.omitImage) {
    const bytes = opts.imageBytes ?? new Uint8Array([0xff, 0xd8, 0xff]);
    const blob = new Blob([bytes as BlobPart], { type: opts.imageMime ?? 'image/jpeg' });
    fd.append(
      'image',
      new File([blob], 'meal.jpg', { type: opts.imageMime ?? 'image/jpeg' }),
    );
  }
  if (opts.capturedAt !== undefined) fd.append('captured_at', opts.capturedAt);
  if (opts.clientId !== null && opts.clientId !== undefined) {
    fd.append('client_id', opts.clientId);
  }
  if (opts.deviceClass !== undefined) fd.append('device_class', opts.deviceClass);
  if (opts.monthSpend !== undefined) fd.append('month_spend_usd_so_far', opts.monthSpend);
  return new Request('http://localhost/api/nutrition/photo/analyze', {
    method: 'POST',
    body: fd,
  }) as unknown as NextRequest;
}

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.supabaseAuth.mockResolvedValue({ data: { user: { id: 'u1' } } });
  mocks.storageUpload.mockReset();
  mocks.storageUpload.mockResolvedValue({ error: null });
  mocks.blobInsertSingle.mockReset();
  mocks.blobInsertSingle.mockResolvedValue({ data: { id: 'blob-1' }, error: null });
  mocks.detectMeal.mockReset();
  mocks.resolveNutrients.mockReset();
  mocks.estimatePortion.mockReset();
  mocks.suggestCookingOil.mockReset();
});

describe('POST /api/nutrition/photo/analyze', () => {
  it('returns 401 when there is no session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(
      makeReq({
        clientId: VALID_UUID,
        deviceClass: 'ios_lidar',
        capturedAt: '2026-05-28T10:00:00.000Z',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when image is missing', async () => {
    const res = await POST(
      makeReq({
        omitImage: true,
        clientId: VALID_UUID,
        deviceClass: 'ios_lidar',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for HEIC mime', async () => {
    const res = await POST(
      makeReq({
        imageMime: 'image/heic',
        clientId: VALID_UUID,
        deviceClass: 'ios_lidar',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 413 for oversize image', async () => {
    // 11 MB Uint8Array exceeds the 10 MB cap.
    const big = new Uint8Array(11 * 1024 * 1024);
    const res = await POST(
      makeReq({
        imageBytes: big,
        clientId: VALID_UUID,
        deviceClass: 'ios_lidar',
      }),
    );
    expect(res.status).toBe(413);
  });

  it('returns 400 when client_id is not a UUID v4', async () => {
    const res = await POST(
      makeReq({
        clientId: 'not-a-uuid',
        deviceClass: 'ios_lidar',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when device_class is missing', async () => {
    const res = await POST(makeReq({ clientId: VALID_UUID }));
    expect(res.status).toBe(400);
  });

  it('happy path returns 200 with §9.1 meal_draft shape', async () => {
    mocks.detectMeal.mockResolvedValueOnce({
      recognition: {
        items: [
          {
            id: 'logmeal-item-0',
            foodName: 'Grilled chicken breast',
            boundingBox: { x: 100, y: 100, w: 200, h: 200 },
            confidence: 0.9,
            cookingMethod: 'grilled',
            cuisineTag: 'north_american',
          },
        ],
        providerPrimary: 'logmeal',
        mealConfidence: 0.9,
        warnings: [],
      },
      fromCache: 'none',
      providersCalled: ['logmeal'],
      warnings: [],
      totalLatencyMs: 1200,
    });
    mocks.resolveNutrients.mockResolvedValueOnce({
      source: 'usda_fdc',
      foodName: 'chicken breast',
      usdaFdcId: 171477,
      per100g: { calories_kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
    });
    mocks.estimatePortion.mockReturnValueOnce({
      method: 'vision_inference',
      grams: 142,
      confidence: 0.55,
      humanLabel: 'approximately 142 g',
    });
    mocks.suggestCookingOil.mockReturnValueOnce({
      type: 'none',
      amount_ml: 0,
      reasoning: 'Suggested for grilled north american based on common preparation.',
    });

    const res = await POST(
      makeReq({
        clientId: VALID_UUID,
        deviceClass: 'ios_lidar',
        capturedAt: '2026-05-28T10:00:00.000Z',
        monthSpend: '12.50',
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.job_id).toMatch(/^req-/);
    expect(json.source_photo_blob_id).toBe('blob-1');
    expect(json.meal_draft).toBeTruthy();
    expect(Array.isArray(json.meal_draft.items)).toBe(true);
    expect(json.meal_draft.items).toHaveLength(1);
    expect(json.meal_draft.items[0].food_name).toBe('Grilled chicken breast');
    expect(json.meal_draft.items[0].portion_grams).toBe(142);
    expect(json.meal_draft.items[0].nutrient_source).toBe('usda_fdc');
    expect(json.meal_draft.items[0].recognition_provider).toBe('logmeal');
    expect(json.meal_draft.items[0].cooking_oil_suggestion.type).toBe('none');
    expect(json.meal_draft.totals.calories_kcal).toBe(Math.round(165 * 1.42));
    expect(json.meal_draft.meal_confidence).toBe(0.9);
    expect(json.meal_draft.from_cache).toBe('none');
    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
    expect(mocks.detectMeal).toHaveBeenCalledTimes(1);
    expect(mocks.resolveNutrients).toHaveBeenCalledTimes(1);
    expect(mocks.estimatePortion).toHaveBeenCalledTimes(1);
    expect(mocks.suggestCookingOil).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when no nutrient data is found for any item', async () => {
    mocks.detectMeal.mockResolvedValueOnce({
      recognition: {
        items: [
          {
            id: 'logmeal-item-0',
            foodName: 'Mystery dish',
            boundingBox: { x: 0, y: 0, w: 100, h: 100 },
            confidence: 0.4,
          },
        ],
        providerPrimary: 'logmeal',
        mealConfidence: 0.4,
        warnings: [],
      },
      fromCache: 'none',
      providersCalled: ['logmeal'],
      warnings: [],
      totalLatencyMs: 800,
    });
    mocks.resolveNutrients.mockResolvedValueOnce(null);
    mocks.estimatePortion.mockReturnValueOnce({
      method: 'unknown',
      grams: 120,
      confidence: 0.3,
    });
    mocks.suggestCookingOil.mockReturnValueOnce({
      type: 'none',
      amount_ml: 0,
      reasoning: 'fallback',
    });
    const res = await POST(
      makeReq({
        clientId: VALID_UUID,
        deviceClass: 'ios_lidar',
      }),
    );
    expect(res.status).toBe(502);
  });
});
