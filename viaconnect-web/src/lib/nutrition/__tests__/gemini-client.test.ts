import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

const anthropicCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: anthropicCreate };
  },
}));

beforeEach(() => {
  fetchMock.mockReset();
  anthropicCreate.mockReset();
  process.env.GEMINI_API_KEY = 'TESTKEY';
  process.env.ANTHROPIC_API_KEY = 'TESTKEY';
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
    // Prompt 180e introduced a retry on MALFORMED_RESPONSE so a
    // second mocked response is required to exercise the path; both
    // calls return garbage so the final error still surfaces as
    // MALFORMED_RESPONSE.
    fetchMock.mockResolvedValueOnce(geminiOk('not json {{{'));
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

  it('disables thinking and gives the tiny JSON response headroom (truncation incident)', async () => {
    // 2026-06-11 production incident: gemini-2.5-flash thought tokens
    // consumed maxOutputTokens and truncated the estimation JSON, which
    // surfaced as "AI returned incomplete output" and failed whole meals.
    fetchMock.mockResolvedValueOnce(geminiOk(JSON.stringify({
      calories: 100, protein_g: 25, carbs_g: 3, total_fat_g: 1,
      saturated_fat_g: 0.2, trans_fat_g: 0, omega3_g: 0, sugar_g: 2, fiber_g: 0,
      confidence: 0.6,
    })));
    await estimateItemWithGemini('protein powder', 30, 'g');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(2048);
  });

  it('falls back to Claude when Gemini returns malformed output twice', async () => {
    // Truncated estimate missing core macros, twice (attempt + retry).
    const truncated = geminiOk('{"calories": 120, "protein_g": 24');
    fetchMock.mockResolvedValueOnce(truncated.clone());
    fetchMock.mockResolvedValueOnce(geminiOk('{"calories": 120, "protein_g": 24'));
    anthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({
        calories: 120, protein_g: 24, carbs_g: 3, total_fat_g: 1.5,
        saturated_fat_g: 0.3, trans_fat_g: 0, omega3_g: 0, sugar_g: 2, fiber_g: 0,
        confidence: 0.55,
      }) }],
      usage: { input_tokens: 40, output_tokens: 60 },
    });
    const r = await estimateItemWithGemini('protein powder', 30, 'g');
    expect(anthropicCreate).toHaveBeenCalledTimes(1);
    expect(r.nutrients.calories).toBe(120);
    expect(r.nutrients.protein_g).toBe(24);
  });
});
