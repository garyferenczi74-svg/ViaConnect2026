import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  process.env.GEMINI_API_KEY = 'TESTKEY';
});

import { parseDescriptionWithGemini, parseImageWithGemini, estimateItemWithGemini } from '../gemini-client';

function geminiOk(text: string) {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
    usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 30 },
  }), { status: 200 });
}

describe('parseDescriptionWithGemini', () => {
  it('returns parsed items + usage on 200', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk(JSON.stringify({
      items: [{ name: 'egg', quantity: 2, unit: 'whole' }],
      confidence: 0.9,
      notes: 'breakfast portion',
    })));
    const r = await parseDescriptionWithGemini('two eggs');
    expect(r.parsed.items[0].name).toBe('egg');
    expect(r.usage.inputTokens).toBe(50);
  });

  it('throws AIRouteError MALFORMED_RESPONSE on garbage JSON', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk('not json {{{'));
    await expect(parseDescriptionWithGemini('two eggs')).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });

  it('throws AIRouteError RATE_LIMITED on 429', async () => {
    fetchMock.mockResolvedValueOnce(new Response('rate', { status: 429 }));
    await expect(parseDescriptionWithGemini('two eggs')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('throws AIRouteError AUTH_MISSING when env var is unset', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(parseDescriptionWithGemini('two eggs')).rejects.toMatchObject({ code: 'AUTH_MISSING' });
  });
});

describe('parseImageWithGemini', () => {
  it('returns parsed items on 200', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk(JSON.stringify({
      items: [{ name: 'salad', quantity: 1, unit: 'serving' }],
      confidence: 0.7,
      notes: 'plate of mixed greens',
    })));
    const r = await parseImageWithGemini(Buffer.from('fake'), 'image/jpeg', 'note');
    expect(r.parsed.items[0].name).toBe('salad');
  });
});

describe('estimateItemWithGemini', () => {
  it('returns per-item nutrients on 200', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk(JSON.stringify({
      calories: 200, protein_g: 5, carbs_g: 30, total_fat_g: 7,
      saturated_fat_g: 2, trans_fat_g: 0, omega3_g: 0,
      sugar_g: 10, fiber_g: 2, confidence: 0.5,
    })));
    const r = await estimateItemWithGemini('protein bar', 1, 'serving');
    expect(r.nutrients.calories).toBe(200);
  });
});
