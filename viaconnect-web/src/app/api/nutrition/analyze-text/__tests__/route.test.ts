import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  return {
    supabaseAuth: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    insertSelect: vi.fn().mockResolvedValue({ data: { id: 'log-1' }, error: null }),
    parseDescription: vi.fn(),
    lookupFood: vi.fn(),
    estimateItem: vi.fn().mockResolvedValue({
      nutrients: { calories: 100, protein_g: 5, carbs_g: 10, total_fat_g: 3, saturated_fat_g: 1, trans_fat_g: 0, omega3_g: 0, sugar_g: 2, fiber_g: 1 },
      confidence: 0.5,
      usage: { inputTokens: 30, outputTokens: 20 },
    }),
  };
});

const { supabaseAuth, insertSelect, parseDescription, lookupFood } = mocks;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.supabaseAuth },
    from: () => ({ insert: () => ({ select: () => ({ single: mocks.insertSelect }) }) }),
  }),
}));

vi.mock('@/lib/nutrition/gemini-client', () => ({
  parseDescriptionWithGemini: mocks.parseDescription,
  estimateItemWithGemini: mocks.estimateItem,
}));

vi.mock('@/lib/nutrition/usda-client', () => ({ lookupFood: mocks.lookupFood }));

vi.mock('@/lib/observability/audit-recorder', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  newRequestId: () => 'req-test',
}));

beforeEach(() => {
  parseDescription.mockReset();
  lookupFood.mockReset();
  insertSelect.mockClear();
});

import { POST } from '../route';

function makeReq(body: object): NextRequest {
  return new Request('http://localhost/api/nutrition/analyze-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/nutrition/analyze-text', () => {
  it('returns 200 + logId for happy path (all USDA)', async () => {
    parseDescription.mockResolvedValueOnce({
      parsed: { items: [{ name: 'egg', quantity: 2, unit: 'whole' }], confidence: 0.9, notes: 'ok' },
      usage: { inputTokens: 40, outputTokens: 30 },
    });
    lookupFood.mockResolvedValueOnce({
      calories: 155, protein_g: 13, carbs_g: 1, total_fat_g: 11, saturated_fat_g: 3.3, trans_fat_g: 0, omega3_g: 0.1, sugar_g: 1, fiber_g: 0, source: 'usda',
    });
    const res = await POST(makeReq({ description: 'two eggs', mealType: 'breakfast' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.logId).toBe('log-1');
    expect(json.analysis.data_source).toBe('usda');
    expect(insertSelect).toHaveBeenCalledTimes(1);
  });

  it('returns mixed when one item misses USDA', async () => {
    parseDescription.mockResolvedValueOnce({
      parsed: { items: [
        { name: 'egg', quantity: 1, unit: 'whole' },
        { name: 'protein bar', quantity: 1, unit: 'serving' },
      ], confidence: 0.7, notes: '' },
      usage: { inputTokens: 50, outputTokens: 30 },
    });
    lookupFood.mockResolvedValueOnce({
      calories: 78, protein_g: 6, carbs_g: 0, total_fat_g: 5, saturated_fat_g: 1.5, trans_fat_g: 0, omega3_g: 0.05, sugar_g: 0, fiber_g: 0, source: 'usda',
    });
    lookupFood.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ description: 'one egg and one protein bar', mealType: 'snack' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.analysis.data_source).toBe('mixed');
  });

  it('returns 400 when description is too short', async () => {
    const res = await POST(makeReq({ description: 'hi', mealType: 'breakfast' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq({ description: 'two eggs', mealType: 'breakfast' }));
    expect(res.status).toBe(401);
  });

  it('returns 502 MALFORMED_RESPONSE when Gemini returns zero items', async () => {
    parseDescription.mockResolvedValueOnce({
      parsed: { items: [], confidence: 0.2, notes: 'too vague' },
      usage: { inputTokens: 20, outputTokens: 15 },
    });
    const res = await POST(makeReq({ description: 'lunch yesterday', mealType: 'lunch' }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error.code).toBe('MALFORMED_RESPONSE');
  });
});
