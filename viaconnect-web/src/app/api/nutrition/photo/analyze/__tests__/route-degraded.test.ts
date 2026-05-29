// Prompt #170 Phase 1q hotfix tests: analyze route graceful degrade.
//
// When SUPABASE_SERVICE_ROLE_KEY is missing, tryCreateAdminClient returns
// null. The route must still return 200 with a meal_draft and surface a
// degraded_modes array. detectMeal receives supabaseAdmin: undefined and
// recordAudit failures are swallowed.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const VALID_UUID = '11111111-2222-4333-8444-555555555555';

const mocks = vi.hoisted(() => {
  return {
    supabaseAuth: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    storageUpload: vi.fn().mockResolvedValue({ error: null }),
    blobInsertSingle: vi.fn().mockResolvedValue({ data: { id: 'blob-1' }, error: null }),
    tryCreateAdminClient: vi.fn(),
    detectMeal: vi.fn(),
    resolveNutrients: vi.fn(),
    estimatePortion: vi.fn(),
    suggestCookingOil: vi.fn(),
    recordAudit: vi.fn(),
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
  tryCreateAdminClient: () => mocks.tryCreateAdminClient(),
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
  recordAudit: mocks.recordAudit,
  newRequestId: () => 'req-test',
}));

import { POST } from '../route';

function makeReq(): NextRequest {
  const fd = new FormData();
  const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
  const blob = new Blob([bytes as BlobPart], { type: 'image/jpeg' });
  fd.append('image', new File([blob], 'meal.jpg', { type: 'image/jpeg' }));
  fd.append('captured_at', '2026-05-28T10:00:00.000Z');
  fd.append('client_id', VALID_UUID);
  fd.append('device_class', 'ios_lidar');
  fd.append('month_spend_usd_so_far', '12.50');
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
  mocks.tryCreateAdminClient.mockReset();
  mocks.detectMeal.mockReset();
  mocks.resolveNutrients.mockReset();
  mocks.estimatePortion.mockReset();
  mocks.suggestCookingOil.mockReset();
  mocks.recordAudit.mockReset();
  mocks.recordAudit.mockResolvedValue(undefined);
});

describe('POST /api/nutrition/photo/analyze (degraded mode)', () => {
  it('returns 200 with degraded_modes when admin client is unavailable', async () => {
    // No service role key: tryCreateAdminClient returns null.
    mocks.tryCreateAdminClient.mockReturnValueOnce(null);

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

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meal_draft).toBeTruthy();
    expect(Array.isArray(json.meal_draft.degraded_modes)).toBe(true);
    expect(json.meal_draft.degraded_modes).toContain('no_cache');
    expect(json.meal_draft.degraded_modes).toContain('no_curated_lookup');
    expect(json.meal_draft.degraded_modes).toContain('no_audit');
  });

  it('passes supabaseAdmin as undefined to detectMeal when admin client is unavailable', async () => {
    mocks.tryCreateAdminClient.mockReturnValueOnce(null);

    mocks.detectMeal.mockResolvedValueOnce({
      recognition: {
        items: [
          {
            id: 'logmeal-item-0',
            foodName: 'Apple',
            boundingBox: { x: 0, y: 0, w: 100, h: 100 },
            confidence: 0.85,
          },
        ],
        providerPrimary: 'logmeal',
        mealConfidence: 0.85,
        warnings: [],
      },
      fromCache: 'none',
      providersCalled: ['logmeal'],
      warnings: [],
      totalLatencyMs: 600,
    });
    mocks.resolveNutrients.mockResolvedValueOnce({
      source: 'usda_fdc',
      foodName: 'Apple',
      per100g: { calories_kcal: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2 },
    });
    mocks.estimatePortion.mockReturnValueOnce({
      method: 'unknown',
      grams: 150,
      confidence: 0.4,
    });
    mocks.suggestCookingOil.mockReturnValueOnce({
      type: 'none',
      amount_ml: 0,
      reasoning: 'fallback',
    });

    await POST(makeReq());

    expect(mocks.detectMeal).toHaveBeenCalledTimes(1);
    const detectCall = mocks.detectMeal.mock.calls[0]?.[0] as { supabaseAdmin: unknown };
    expect(detectCall.supabaseAdmin).toBeUndefined();

    expect(mocks.resolveNutrients).toHaveBeenCalledTimes(1);
    const resolveCall = mocks.resolveNutrients.mock.calls[0]?.[1] as { supabaseAdmin: unknown };
    expect(resolveCall.supabaseAdmin).toBeUndefined();
  });

  it('does not include degraded_modes when admin client is available', async () => {
    // When admin is available, no degradation; degraded_modes is omitted.
    // The stub mirrors the shape the route needs: storage.from().upload() and
    // .from().insert().select().single() for photo_meal_blobs.
    mocks.tryCreateAdminClient.mockReturnValueOnce({
      storage: { from: () => ({ upload: mocks.storageUpload }) },
      from: () => ({
        insert: () => ({
          select: () => ({ single: mocks.blobInsertSingle }),
        }),
      }),
    });

    mocks.detectMeal.mockResolvedValueOnce({
      recognition: {
        items: [
          {
            id: 'logmeal-item-0',
            foodName: 'Apple',
            boundingBox: { x: 0, y: 0, w: 100, h: 100 },
            confidence: 0.85,
          },
        ],
        providerPrimary: 'logmeal',
        mealConfidence: 0.85,
        warnings: [],
      },
      fromCache: 'none',
      providersCalled: ['logmeal'],
      warnings: [],
      totalLatencyMs: 600,
    });
    mocks.resolveNutrients.mockResolvedValueOnce({
      source: 'usda_fdc',
      foodName: 'Apple',
      per100g: { calories_kcal: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2 },
    });
    mocks.estimatePortion.mockReturnValueOnce({
      method: 'unknown',
      grams: 150,
      confidence: 0.4,
    });
    mocks.suggestCookingOil.mockReturnValueOnce({
      type: 'none',
      amount_ml: 0,
      reasoning: 'fallback',
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meal_draft.degraded_modes).toBeUndefined();
  });

  it('swallows recordAudit failure and still returns 200', async () => {
    mocks.tryCreateAdminClient.mockReturnValueOnce(null);
    mocks.recordAudit.mockRejectedValueOnce(new Error('audit boom'));

    mocks.detectMeal.mockResolvedValueOnce({
      recognition: {
        items: [
          {
            id: 'logmeal-item-0',
            foodName: 'Apple',
            boundingBox: { x: 0, y: 0, w: 100, h: 100 },
            confidence: 0.85,
          },
        ],
        providerPrimary: 'logmeal',
        mealConfidence: 0.85,
        warnings: [],
      },
      fromCache: 'none',
      providersCalled: ['logmeal'],
      warnings: [],
      totalLatencyMs: 600,
    });
    mocks.resolveNutrients.mockResolvedValueOnce({
      source: 'usda_fdc',
      foodName: 'Apple',
      per100g: { calories_kcal: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2 },
    });
    mocks.estimatePortion.mockReturnValueOnce({
      method: 'unknown',
      grams: 150,
      confidence: 0.4,
    });
    mocks.suggestCookingOil.mockReturnValueOnce({
      type: 'none',
      amount_ml: 0,
      reasoning: 'fallback',
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
  });
});
