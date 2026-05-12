// Tests for the fetcher half of src/hooks/use-bos-current.ts.
//
// The useBOSCurrent() hook itself wraps useQuery and is exercised by
// the integration tests at the component level. This test isolates the
// pure fetcher (__fetchBOSCurrentForTest) so the network contract is
// verified without spinning up a React renderer (the scoring vitest
// config runs in Node and does not include jsdom).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { __fetchBOSCurrentForTest, BOS_CURRENT_QUERY_KEY } from '@/hooks/use-bos-current';
import type { BOSCurrentResponse } from '@/lib/scoring/types';

describe('BOS_CURRENT_QUERY_KEY', () => {
  it('is the canonical react-query key tuple', () => {
    expect(BOS_CURRENT_QUERY_KEY).toEqual(['bos', 'current']);
  });
});

describe('fetchBOSCurrent', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  function precomputeBody(): BOSCurrentResponse {
    return {
      score: null,
      baseline: null,
      tier: 1,
      confidence: 0.72,
      confidence_display: '72%',
      computed_at: null,
      compute_version: '2.0.0',
      accuracy_pills: [
        { key: 'caq', label: 'CAQ', state: 'incomplete', destination_key: 'caq_resume', confidence_unlocked_pct: 72 },
        { key: 'labs', label: 'Labs', state: 'incomplete', destination_key: 'labs_upload', confidence_unlocked_pct: 86 },
        { key: 'genetics', label: 'Genetics', state: 'incomplete', destination_key: 'genex360_purchase', confidence_unlocked_pct: 96 },
      ],
      engagement_pills: [],
      hannah_explanation: 'Complete your CAQ to see your Bio Optimization Score.',
    };
  }

  it('calls /api/bos/current with credentials included', async () => {
    const spy = vi.fn(async () =>
      new Response(JSON.stringify(precomputeBody()), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;

    await __fetchBOSCurrentForTest();

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/bos/current');
    expect(init.credentials).toBe('include');
  });

  it('returns the parsed JSON body on 200', async () => {
    const body = precomputeBody();
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
    ) as unknown as typeof fetch;

    const result = await __fetchBOSCurrentForTest();
    expect(result).toEqual(body);
  });

  it('throws on a 401 response with the status code surfaced', async () => {
    globalThis.fetch = vi.fn(async () => new Response('Unauthorized', { status: 401 })) as unknown as typeof fetch;
    await expect(__fetchBOSCurrentForTest()).rejects.toThrow(/401/);
  });

  it('throws on a 500 response', async () => {
    globalThis.fetch = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
    await expect(__fetchBOSCurrentForTest()).rejects.toThrow(/500/);
  });
});
