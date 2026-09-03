import { describe, expect, it } from 'vitest';
import { isMeshyEnabled, meshyAuthHeader, readMeshyApiKey } from '../meshyApiKey';

describe('readMeshyApiKey', () => {
  it('treats missing or blank as a clean no-op', () => {
    expect(readMeshyApiKey({})).toBeNull();
    expect(readMeshyApiKey({ MESHY_API_KEY: '' })).toBeNull();
    expect(readMeshyApiKey({ MESHY_API_KEY: '   ' })).toBeNull();
    expect(isMeshyEnabled({ MESHY_API_KEY: '' })).toBe(false);
  });

  it('never reads NEXT_PUBLIC_MESHY_API_KEY', () => {
    expect(
      readMeshyApiKey({
        NEXT_PUBLIC_MESHY_API_KEY: 'public-leak',
        MESHY_API_KEY: '',
      }),
    ).toBeNull();
  });

  it('returns the trimmed server key', () => {
    expect(readMeshyApiKey({ MESHY_API_KEY: ' secret ' })).toBe('secret');
    expect(meshyAuthHeader('secret')).toBe('Bearer secret');
  });
});
