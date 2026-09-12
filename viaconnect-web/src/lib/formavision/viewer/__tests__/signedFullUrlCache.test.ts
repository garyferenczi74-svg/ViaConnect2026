import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  fetchSignedFullBlob,
  getCachedSignedFullUrl,
  invalidateSignedFullUrlsForScan,
  invalidateSignedFullUrlsForSession,
  resetSignedFullUrlCacheForTests,
  setCachedSignedFullUrl,
  signedFullUrlCacheKey,
  signedFullUrlGeneration,
} from '../signedFullUrlCache';

afterEach(() => {
  resetSignedFullUrlCacheForTests();
});

describe('signed full URL cache', () => {
  it('stores Ready full URLs per session + pose', () => {
    expect(signedFullUrlCacheKey('sess-1', 'front')).toBe('sess-1:front');
    expect(setCachedSignedFullUrl('sess-1', 'front', 'https://signed/front.jpg')).toBe(true);
    expect(getCachedSignedFullUrl('sess-1', 'front')).toBe('https://signed/front.jpg');
    expect(getCachedSignedFullUrl('sess-1', 'right')).toBeNull();
  });

  it('invalidate after discard drops that session so Ready cannot flash a stale img', () => {
    setCachedSignedFullUrl('sess-retain-1', 'front', 'https://signed/front.jpg');
    setCachedSignedFullUrl('sess-retain-1', 'back', 'https://signed/back.jpg');
    setCachedSignedFullUrl('other', 'front', 'https://signed/other.jpg');
    invalidateSignedFullUrlsForSession('sess-retain-1');
    expect(getCachedSignedFullUrl('sess-retain-1', 'front')).toBeNull();
    expect(getCachedSignedFullUrl('sess-retain-1', 'back')).toBeNull();
    expect(getCachedSignedFullUrl('other', 'front')).toBe('https://signed/other.jpg');
  });

  it('bumps generation so a late set after discard is ignored', () => {
    const gen = signedFullUrlGeneration('sess-retain-1');
    invalidateSignedFullUrlsForScan({
      id: 'photo-1',
      frblSessionId: 'sess-retain-1',
    });
    expect(
      setCachedSignedFullUrl('sess-retain-1', 'front', 'https://stale/front.jpg', gen),
    ).toBe(false);
    expect(getCachedSignedFullUrl('sess-retain-1', 'front')).toBeNull();
    expect(signedFullUrlGeneration('sess-retain-1')).toBe(gen + 1);
    expect(signedFullUrlGeneration('photo-1')).toBe(1);
  });
});

describe('fetchSignedFullBlob — same-origin, no Storage signed URL', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests delivery=blob and returns image bytes', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe('/api/scan/signed-url');
        expect(init?.method).toBe('POST');
        const body = JSON.parse(String(init?.body)) as { delivery?: string };
        expect(body.delivery).toBe('blob');
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'X-ViaConnect-Scan-Delivery': 'blob',
          },
        });
      }),
    );
    const blob = await fetchSignedFullBlob('sess-1', 'front');
    expect(blob).not.toBeNull();
    expect(blob?.size).toBe(4);
    expect(blob?.type).toMatch(/image\/jpeg/);
  });

  it('returns null on JSON error so the plate can stay on Wireframe + honesty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: false, error: 'download_failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    expect(await fetchSignedFullBlob('sess-1', 'front')).toBeNull();
  });

  it('source never fetches a cross-origin signed URL', () => {
    const src = readFileSync(join(__dirname, '..', 'signedFullUrlCache.ts'), 'utf8');
    expect(src).toMatch(/delivery: 'blob'/);
    expect(src).not.toMatch(/fetch\(signed/);
    expect(src).not.toMatch(/createImageBitmap/);
  });
});
