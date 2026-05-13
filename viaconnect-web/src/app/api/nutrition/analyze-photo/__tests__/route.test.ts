import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  return {
    supabaseAuth: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    upload: vi.fn().mockResolvedValue({ error: null }),
    insertSelect: vi.fn().mockResolvedValue({ data: { id: 'log-1' }, error: null }),
    parseImage: vi.fn(),
    lookupFood: vi.fn(),
    estimateItem: vi.fn().mockResolvedValue({
      nutrients: { calories: 100, protein_g: 5, carbs_g: 10, total_fat_g: 3, saturated_fat_g: 1, trans_fat_g: 0, omega3_g: 0, sugar_g: 2, fiber_g: 1 },
      confidence: 0.5, usage: { inputTokens: 30, outputTokens: 20 },
    }),
  };
});

const { supabaseAuth, upload, insertSelect, parseImage, lookupFood } = mocks;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.supabaseAuth },
    storage: { from: () => ({ upload: mocks.upload }) },
    from: () => ({ insert: () => ({ select: () => ({ single: mocks.insertSelect }) }) }),
  }),
}));

vi.mock('@/lib/nutrition/gemini-client', () => ({
  parseImageWithGemini: mocks.parseImage,
  estimateItemWithGemini: mocks.estimateItem,
}));

vi.mock('@/lib/nutrition/usda-client', () => ({ lookupFood: mocks.lookupFood }));
vi.mock('@/lib/observability/audit-recorder', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  newRequestId: () => 'req-test',
}));

import { POST } from '../route';

function makePhotoReq(): NextRequest {
  const fd = new FormData();
  fd.append('image', new File([new Uint8Array([0xff, 0xd8, 0xff])], 'meal.jpg', { type: 'image/jpeg' }));
  fd.append('mealType', 'lunch');
  fd.append('note', 'lunch on the patio');
  return new Request('http://localhost/api/nutrition/analyze-photo', {
    method: 'POST', body: fd,
  }) as unknown as NextRequest;
}

beforeEach(() => { parseImage.mockReset(); lookupFood.mockReset(); upload.mockClear(); insertSelect.mockClear(); });

describe('POST /api/nutrition/analyze-photo', () => {
  it('happy path returns 200 + logId', async () => {
    parseImage.mockResolvedValueOnce({
      parsed: { items: [{ name: 'salad', quantity: 1, unit: 'serving' }], confidence: 0.7, notes: '' },
      usage: { inputTokens: 100, outputTokens: 40 },
    });
    lookupFood.mockResolvedValueOnce({
      calories: 80, protein_g: 3, carbs_g: 14, total_fat_g: 2, saturated_fat_g: 0.3, trans_fat_g: 0, omega3_g: 0.05, sugar_g: 5, fiber_g: 4, source: 'usda',
    });
    const res = await POST(makePhotoReq());
    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(insertSelect).toHaveBeenCalledTimes(1);
  });

  it('returns 400 on missing image', async () => {
    const fd = new FormData(); fd.append('mealType', 'lunch');
    const res = await POST(new Request('http://x/p', { method: 'POST', body: fd }) as unknown as NextRequest);
    expect(res.status).toBe(400);
  });
});
