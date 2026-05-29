// Prompt #170 Phase 1d: tests for the detect orchestrator.
// Provider modules and gemini-client are mocked at the vitest layer so the
// orchestrator runs in pure JS with no network. The cache layer is also
// mocked via supabase stubs so the cache decisions are deterministic.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ----------------------------------------------------------------------------
// Mock providers and cache
// ----------------------------------------------------------------------------
// vi.mock is hoisted ABOVE module imports, so the mock factories must declare
// their own state. vi.hoisted lets us define shared spies that remain in scope
// for both the factories (above) and the tests (below).
const mocks = vi.hoisted(() => ({
  logMealMock: vi.fn(),
  claudeMock: vi.fn(),
  geminiParseMock: vi.fn(),
  lookupMock: vi.fn(),
  writeMock: vi.fn(),
  computeShaMock: vi.fn(() => 'sha-deadbeef'),
  computePhashMock: vi.fn(async () => BigInt(0)),
}));

vi.mock('../providers/logmeal', () => ({
  recognizeWithLogMeal: mocks.logMealMock,
}));
vi.mock('../providers/claude-vision', () => ({
  recognizeWithClaude: mocks.claudeMock,
}));
vi.mock('@/lib/nutrition/gemini-client', () => ({
  parseImageWithGemini: mocks.geminiParseMock,
}));
vi.mock('@/lib/nutrition/cache/recognition-cache', () => ({
  computeSha256: mocks.computeShaMock,
  computePHash64: mocks.computePhashMock,
  lookupCache: mocks.lookupMock,
  writeCache: mocks.writeMock,
}));

const {
  logMealMock,
  claudeMock,
  geminiParseMock,
  lookupMock,
  writeMock,
  computeShaMock,
  computePhashMock,
} = mocks;

// ----------------------------------------------------------------------------
// Import AFTER vi.mock so the orchestrator picks up the mocked deps.
// ----------------------------------------------------------------------------
import { detectMeal, isAmbiguousMixedDish, geminiToProviderRecognition } from '../detect';
import type { ProviderRecognition, ReconciledRecognition } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function provider(
  name: ProviderRecognition['provider'],
  items: Array<{ foodName: string; conf: number }>,
): ProviderRecognition {
  const visionItems = items.map((it, idx) => ({
    id: `${name}-${idx}`,
    foodName: it.foodName,
    boundingBox: { x: 0, y: idx * 100, w: 100, h: 100 },
    confidence: it.conf,
  }));
  const meanConfidence = visionItems.length === 0
    ? 0
    : visionItems.reduce((s, v) => s + v.confidence, 0) / visionItems.length;
  return { provider: name, items: visionItems, latencyMs: 50, meanConfidence };
}

function geminiResult(items: Array<{ name: string }>, conf = 0.8): unknown {
  return {
    parsed: {
      items: items.map((it) => ({ name: it.name, quantity: 1, unit: 'serving' })),
      confidence: conf,
      notes: '',
    },
    usage: { inputTokens: 1, outputTokens: 1 },
  };
}

function reconciled(
  items: Array<{ foodName: string; confidence: number }>,
  primaryProvider: ProviderRecognition['provider'] = 'logmeal',
): ReconciledRecognition {
  return {
    items: items.map((it, idx) => ({
      id: `r-${idx}`,
      foodName: it.foodName,
      boundingBox: { x: 0, y: idx * 100, w: 100, h: 100 },
      confidence: it.confidence,
    })),
    providerPrimary: primaryProvider,
    mealConfidence: items.length === 0
      ? 0
      : items.reduce((s, v) => s + v.confidence, 0) / items.length,
    warnings: [],
  };
}

function makeSupabaseStub(): SupabaseClient {
  return {} as unknown as SupabaseClient;
}

const baseOpts = {
  imageBytes: Buffer.from('img'),
  mime: 'image/jpeg',
  requestId: 'req-1',
  deviceClass: 'web' as const,
  capturedAt: new Date().toISOString(),
  monthSpendUsdSoFar: 0,
  monthlyCapUsdClaude: 100,
};

beforeEach(() => {
  logMealMock.mockReset();
  claudeMock.mockReset();
  geminiParseMock.mockReset();
  lookupMock.mockReset();
  writeMock.mockReset();
  computeShaMock.mockClear();
  computePhashMock.mockClear();
  // Restore default impls.
  computeShaMock.mockReturnValue('sha-deadbeef');
  computePhashMock.mockResolvedValue(BigInt(0));
  // Default env: LogMeal key present so the primary path runs.
  process.env.LOGMEAL_API_KEY = 'TESTKEY';
  process.env.ANTHROPIC_API_KEY = 'TESTKEY';
});

// ----------------------------------------------------------------------------
// isAmbiguousMixedDish
// ----------------------------------------------------------------------------

describe('isAmbiguousMixedDish', () => {
  it('matches curry, stew, casserole, bowl', () => {
    expect(isAmbiguousMixedDish([{ foodName: 'Chicken curry' }])).toBe(true);
    expect(isAmbiguousMixedDish([{ foodName: 'beef stew' }])).toBe(true);
    expect(isAmbiguousMixedDish([{ foodName: 'Tuna Casserole' }])).toBe(true);
    expect(isAmbiguousMixedDish([{ foodName: 'Acai bowl' }])).toBe(true);
  });

  it('matches additional mixed-dish tokens', () => {
    expect(isAmbiguousMixedDish([{ foodName: 'stir-fry vegetables' }])).toBe(true);
    expect(isAmbiguousMixedDish([{ foodName: 'spicy ramen' }])).toBe(true);
    expect(isAmbiguousMixedDish([{ foodName: 'biryani plate' }])).toBe(true);
  });

  it('does not match plain proteins or single items', () => {
    expect(isAmbiguousMixedDish([{ foodName: 'grilled chicken' }])).toBe(false);
    expect(isAmbiguousMixedDish([{ foodName: 'sliced apple' }])).toBe(false);
    expect(isAmbiguousMixedDish([])).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// geminiToProviderRecognition
// ----------------------------------------------------------------------------

describe('geminiToProviderRecognition', () => {
  it('adapts a ParsedMeal-shaped payload into a ProviderRecognition', () => {
    const out = geminiToProviderRecognition(geminiResult([{ name: 'Pizza' }, { name: 'Salad' }], 0.6), 42);
    expect(out.provider).toBe('gemini');
    expect(out.items.length).toBe(2);
    expect(out.items[0].foodName).toBe('Pizza');
    expect(out.items[0].confidence).toBeCloseTo(0.6, 5);
    expect(out.latencyMs).toBe(42);
  });

  it('returns zero items when input is null', () => {
    expect(geminiToProviderRecognition(null, 0).items.length).toBe(0);
  });

  it('clamps confidence to [0, 1]', () => {
    const bigConf = geminiResult([{ name: 'X' }], 2);
    const out = geminiToProviderRecognition(bigConf, 0);
    expect(out.items[0].confidence).toBeLessThanOrEqual(1);
  });
});

// ----------------------------------------------------------------------------
// detectMeal
// ----------------------------------------------------------------------------

describe('detectMeal cache + provider orchestration', () => {
  it('returns immediately on a sha256_exact cache hit, no providers called', async () => {
    const cached = reconciled([{ foodName: 'Pizza', confidence: 0.9 }]);
    lookupMock.mockResolvedValueOnce({ kind: 'sha256_exact', recognition: cached });

    const out = await detectMeal({
      ...baseOpts,
      supabaseAdmin: makeSupabaseStub(),
    });

    expect(out.fromCache).toBe('sha256_exact');
    expect(out.providersCalled).toEqual([]);
    expect(out.recognition.items[0].foodName).toBe('Pizza');
    expect(logMealMock).not.toHaveBeenCalled();
    expect(geminiParseMock).not.toHaveBeenCalled();
    expect(claudeMock).not.toHaveBeenCalled();
  });

  it('on pHash near hit runs only Gemini and returns phash_near when labels overlap >= 0.80', async () => {
    const cached = reconciled([{ foodName: 'Pizza', confidence: 0.85 }]);
    lookupMock.mockResolvedValueOnce({
      kind: 'phash_near',
      recognition: cached,
      hammingDistance: 3,
    });
    geminiParseMock.mockResolvedValueOnce(geminiResult([{ name: 'Pizza' }], 0.8));

    const out = await detectMeal({
      ...baseOpts,
      supabaseAdmin: makeSupabaseStub(),
    });

    expect(out.fromCache).toBe('phash_near');
    expect(out.providersCalled).toEqual(['gemini']);
    expect(logMealMock).not.toHaveBeenCalled();
    expect(claudeMock).not.toHaveBeenCalled();
  });

  it('on pHash near hit falls through to full pipeline when label overlap < 0.80', async () => {
    const cached = reconciled([{ foodName: 'Pizza', confidence: 0.85 }]);
    lookupMock.mockResolvedValueOnce({
      kind: 'phash_near',
      recognition: cached,
      hammingDistance: 3,
    });
    // Gemini verification returns a totally different item -> overlap 0.
    geminiParseMock.mockResolvedValueOnce(geminiResult([{ name: 'Burger' }], 0.8));
    // Full pipeline then runs LogMeal as primary (no second gemini call needed since conf >= 0.70).
    logMealMock.mockResolvedValueOnce(provider('logmeal', [{ foodName: 'Burger', conf: 0.9 }]));

    const out = await detectMeal({
      ...baseOpts,
      supabaseAdmin: makeSupabaseStub(),
    });

    expect(out.fromCache).toBe('none');
    expect(out.providersCalled).toContain('gemini');
    expect(out.providersCalled).toContain('logmeal');
    expect(out.warnings.some((w) => w.toLowerCase().includes('phash near hit failed'))).toBe(true);
  });

  it('LogMeal primary success, high confidence: no secondary Gemini call', async () => {
    logMealMock.mockResolvedValueOnce(provider('logmeal', [
      { foodName: 'Pizza', conf: 0.95 },
    ]));

    const out = await detectMeal({ ...baseOpts });

    expect(out.fromCache).toBe('none');
    expect(out.providersCalled).toEqual(['logmeal']);
    expect(geminiParseMock).not.toHaveBeenCalled();
    expect(claudeMock).not.toHaveBeenCalled();
  });

  it('LogMeal primary low confidence triggers secondary Gemini verification', async () => {
    logMealMock.mockResolvedValueOnce(provider('logmeal', [
      { foodName: 'Pizza', conf: 0.6 },
    ]));
    geminiParseMock.mockResolvedValueOnce(geminiResult([{ name: 'Pizza' }], 0.75));

    const out = await detectMeal({ ...baseOpts });

    expect(out.providersCalled).toContain('logmeal');
    expect(out.providersCalled).toContain('gemini');
    expect(claudeMock).not.toHaveBeenCalled();
  });

  it('mixed-dish + low reconciled confidence + budget OK triggers Claude tertiary', async () => {
    logMealMock.mockResolvedValueOnce(provider('logmeal', [
      { foodName: 'Chicken Curry', conf: 0.4 },
    ]));
    geminiParseMock.mockResolvedValueOnce(geminiResult([{ name: 'Chicken Curry' }], 0.4));
    claudeMock.mockResolvedValueOnce(provider('claude_vision', [
      { foodName: 'Chicken Curry', conf: 0.7 },
    ]));

    const out = await detectMeal({ ...baseOpts });

    expect(out.providersCalled).toContain('claude_vision');
    expect(claudeMock).toHaveBeenCalledTimes(1);
  });

  it('mixed-dish + budget cap hit emits warning, does NOT call Claude', async () => {
    logMealMock.mockResolvedValueOnce(provider('logmeal', [
      { foodName: 'Beef Stew', conf: 0.4 },
    ]));
    geminiParseMock.mockResolvedValueOnce(geminiResult([{ name: 'Beef Stew' }], 0.4));

    const out = await detectMeal({
      ...baseOpts,
      monthSpendUsdSoFar: 200,
      monthlyCapUsdClaude: 100,
    });

    expect(claudeMock).not.toHaveBeenCalled();
    expect(out.warnings).toContain('Tertiary recognition skipped, monthly cap reached.');
  });

  it('LogMeal config missing degrades to Gemini-as-primary', async () => {
    process.env.LOGMEAL_API_KEY = '';
    geminiParseMock.mockResolvedValueOnce(geminiResult([{ name: 'Pizza' }], 0.85));

    const out = await detectMeal({ ...baseOpts });

    expect(logMealMock).not.toHaveBeenCalled();
    expect(out.providersCalled).toEqual(['gemini']);
    expect(out.warnings.some((w) => w.toLowerCase().includes('logmeal unavailable'))).toBe(true);
  });

  it('LogMeal API_DOWN degrades to Gemini-as-primary', async () => {
    const { AIRouteError } = await import('@/lib/errors/classify-ai');
    logMealMock.mockRejectedValueOnce(new AIRouteError('API_DOWN', 'down', 503, 'down'));
    geminiParseMock.mockResolvedValueOnce(geminiResult([{ name: 'Pizza' }], 0.85));

    const out = await detectMeal({ ...baseOpts });

    expect(out.providersCalled).toEqual(['gemini']);
    expect(out.warnings.some((w) => w.toLowerCase().includes('logmeal'))).toBe(true);
  });

  it('does not call claude when reconciled confidence is high enough', async () => {
    logMealMock.mockResolvedValueOnce(provider('logmeal', [
      { foodName: 'Chicken Curry', conf: 0.9 },
    ]));

    const out = await detectMeal({ ...baseOpts });

    expect(claudeMock).not.toHaveBeenCalled();
    expect(out.providersCalled).toEqual(['logmeal']);
  });

  it('does not call claude when food is not a mixed dish even at low confidence', async () => {
    logMealMock.mockResolvedValueOnce(provider('logmeal', [
      { foodName: 'Plain Apple', conf: 0.3 },
    ]));
    geminiParseMock.mockResolvedValueOnce(geminiResult([{ name: 'Plain Apple' }], 0.3));

    const out = await detectMeal({ ...baseOpts });

    expect(claudeMock).not.toHaveBeenCalled();
  });

  it('writes to cache after a successful full pipeline run', async () => {
    logMealMock.mockResolvedValueOnce(provider('logmeal', [
      { foodName: 'Pizza', conf: 0.95 },
    ]));
    lookupMock.mockResolvedValueOnce(null);

    await detectMeal({
      ...baseOpts,
      supabaseAdmin: makeSupabaseStub(),
    });

    expect(writeMock).toHaveBeenCalledTimes(1);
    const call = writeMock.mock.calls[0][0] as { provider: string; pHash64: bigint };
    expect(call.provider).toBe('logmeal');
    expect(typeof call.pHash64).toBe('bigint');
  });
});
