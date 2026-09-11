import { afterEach, describe, expect, it } from 'vitest';
import {
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
