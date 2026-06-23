// TDD: written before persistScanClient.ts is implemented.
// Tests that persistScan never throws and returns structured results.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Dynamic import so the module is resolved after the test file sets up vi.fn.
// We use a factory pattern to reset the module between test runs.

describe('persistScan', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('(a) success path: POSTs JSON with scanId and returns the parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, entryId: 'entry-abc' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { persistScan } = await import('../persistScanClient');
    const result = await persistScan('scan-123');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/body/scan/persist');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ scanId: 'scan-123' });
    expect(result).toEqual({ ok: true, entryId: 'entry-abc' });
  });

  it('(b) non-ok HTTP status returns ok:false with an http_ reason', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, reason: 'unauthorized' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { persistScan } = await import('../persistScanClient');
    const result = await persistScan('scan-456');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('http_401');
  });

  it('(c) fetch rejecting returns ok:false reason:network, never throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network failure'));
    vi.stubGlobal('fetch', fetchMock);

    const { persistScan } = await import('../persistScanClient');
    // Must not throw
    const result = await persistScan('scan-789');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('network');
  });

  it('(d) fetch abort (AbortError) returns ok:false reason:timeout, never throws', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal('fetch', fetchMock);

    const { persistScan } = await import('../persistScanClient');
    // Must not throw
    const result = await persistScan('scan-timeout');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('timeout');
  });
});
