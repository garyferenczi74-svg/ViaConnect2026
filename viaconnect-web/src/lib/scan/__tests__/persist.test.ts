import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231: persist.ts orchestration tests. Verifies
// prepare -> upload -> finalize runs in order via the returned signed
// upload URLs, and that object URLs are revoked ONLY after finalize
// confirms a ready result - never before, and never on a partial (this
// closes the earlier "persist untested" gap).

const mocks = vi.hoisted(() => ({
  uploadToSignedUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: { from: () => ({ uploadToSignedUrl: mocks.uploadToSignedUrl }) },
  }),
}));

import { persistScan, type ScanUploadFrame } from '@/lib/scan/persist';

const SCAN_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function buildFrame(pose: string, overrides: Partial<ScanUploadFrame> = {}): ScanUploadFrame {
  return {
    pose: pose as ScanUploadFrame['pose'],
    blob: new Blob(['full-bytes']),
    objectUrl: `blob:full-${pose}`,
    thumbBlob: new Blob(['thumb-bytes']),
    thumbObjectUrl: `blob:thumb-${pose}`,
    capturedAt: '2026-08-28T00:00:00.000Z',
    qa: { pass: true, code: 'PASS', message: '', mode: 'weak' },
    retryCount: 0,
    capturedWidth: 100,
    capturedHeight: 200,
    ...overrides,
  } as ScanUploadFrame;
}

const FOUR_FRAMES: (ScanUploadFrame | null)[] = ['front', 'right', 'back', 'left'].map((p) => buildFrame(p));

function uploadTarget(pose: string, variant: 'full' | 'thumb') {
  return {
    path: `user-1/${SCAN_ID}/${pose}_${variant}_1700000000000.jpg`,
    token: `token-${pose}-${variant}`,
    signedUrl: `https://signed.example/${pose}_${variant}`,
  };
}

function prepareResponseBody(poses: string[] = ['front', 'right', 'back', 'left']) {
  return {
    ok: true,
    sessionId: SCAN_ID,
    uploads: poses.map((pose) => ({
      pose,
      full: uploadTarget(pose, 'full'),
      thumb: uploadTarget(pose, 'thumb'),
    })),
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;
let revokeSpy: ReturnType<typeof vi.fn>;
let callOrder: string[];

beforeEach(() => {
  callOrder = [];
  mocks.uploadToSignedUrl.mockReset();
  mocks.uploadToSignedUrl.mockImplementation((path: string) => {
    callOrder.push(`upload:${path}`);
    return Promise.resolve({ data: { path, fullPath: path }, error: null });
  });

  revokeSpy = vi.fn();
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeSpy, writable: true, configurable: true });

  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

describe('persistScan', () => {
  it('calls prepare, then uploads, then finalize, in order', async () => {
    fetchMock.mockImplementation((input: string) => {
      const url = String(input);
      if (url.includes('/api/scan/prepare')) {
        callOrder.push('prepare');
        return Promise.resolve(jsonResponse(200, prepareResponseBody()));
      }
      if (url.includes('/api/scan/finalize')) {
        callOrder.push('finalize');
        return Promise.resolve(jsonResponse(200, { ok: true, sessionId: SCAN_ID, failedPoses: [] }));
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await persistScan(SCAN_ID, FOUR_FRAMES);

    expect(result.ok).toBe(true);
    expect(result.sessionId).toBe(SCAN_ID);
    expect(callOrder[0]).toBe('prepare');
    expect(callOrder[callOrder.length - 1]).toBe('finalize');
    expect(callOrder.slice(1, -1).every((c) => c.startsWith('upload:'))).toBe(true);
    expect(mocks.uploadToSignedUrl).toHaveBeenCalledTimes(8); // 4 poses x (full + thumb)
  });

  it('sends both full and thumb blobs to the paths returned by prepare', async () => {
    fetchMock.mockImplementation((input: string) => {
      const url = String(input);
      if (url.includes('/api/scan/prepare')) return Promise.resolve(jsonResponse(200, prepareResponseBody(['front'])));
      if (url.includes('/api/scan/finalize')) {
        return Promise.resolve(jsonResponse(200, { ok: true, sessionId: SCAN_ID, failedPoses: [] }));
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const frontOnly: (ScanUploadFrame | null)[] = [buildFrame('front'), null, null, null];
    await persistScan(SCAN_ID, frontOnly);

    expect(mocks.uploadToSignedUrl).toHaveBeenCalledWith(
      uploadTarget('front', 'full').path,
      uploadTarget('front', 'full').token,
      frontOnly[0]!.blob,
    );
    expect(mocks.uploadToSignedUrl).toHaveBeenCalledWith(
      uploadTarget('front', 'thumb').path,
      uploadTarget('front', 'thumb').token,
      frontOnly[0]!.thumbBlob,
    );
  });

  it('revokes object URLs ONLY after finalize confirms a ready (ok) result', async () => {
    fetchMock.mockImplementation((input: string) => {
      const url = String(input);
      if (url.includes('/api/scan/prepare')) return Promise.resolve(jsonResponse(200, prepareResponseBody()));
      if (url.includes('/api/scan/finalize')) {
        expect(revokeSpy).not.toHaveBeenCalled();
        return Promise.resolve(jsonResponse(200, { ok: true, sessionId: SCAN_ID, failedPoses: [] }));
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    await persistScan(SCAN_ID, FOUR_FRAMES);

    expect(revokeSpy).toHaveBeenCalledWith('blob:full-front');
    expect(revokeSpy).toHaveBeenCalledWith('blob:thumb-front');
    expect(revokeSpy).toHaveBeenCalledTimes(8); // 4 poses x (full + thumb)
  });

  it('does NOT revoke object URLs when finalize reports a partial failure', async () => {
    fetchMock.mockImplementation((input: string) => {
      const url = String(input);
      if (url.includes('/api/scan/prepare')) return Promise.resolve(jsonResponse(200, prepareResponseBody()));
      if (url.includes('/api/scan/finalize')) {
        return Promise.resolve(
          jsonResponse(422, {
            ok: false,
            error: 'incomplete_upload',
            sessionId: SCAN_ID,
            failedPoses: ['front'],
            nextAction: 'Retry.',
          }),
        );
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await persistScan(SCAN_ID, FOUR_FRAMES);

    expect(result.ok).toBe(false);
    expect(result.failedPoses).toEqual(['front']);
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('does NOT revoke object URLs and never calls finalize when prepare fails', async () => {
    fetchMock.mockImplementation((input: string) => {
      const url = String(input);
      if (url.includes('/api/scan/prepare')) {
        return Promise.resolve(jsonResponse(403, { ok: false, error: 'consent_required', nextAction: 'Consent.' }));
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await persistScan(SCAN_ID, FOUR_FRAMES);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('consent_required');
    expect(mocks.uploadToSignedUrl).not.toHaveBeenCalled();
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('still calls finalize (marking the session partial) when an upload fails, never leaving the session stuck', async () => {
    let finalizeBody: Record<string, unknown> | null = null;
    mocks.uploadToSignedUrl.mockImplementation((path: string) => {
      if (path.includes('front_full')) return Promise.resolve({ data: null, error: { message: 'network' } });
      return Promise.resolve({ data: { path, fullPath: path }, error: null });
    });
    fetchMock.mockImplementation((input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/scan/prepare')) return Promise.resolve(jsonResponse(200, prepareResponseBody()));
      if (url.includes('/api/scan/finalize')) {
        finalizeBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Promise.resolve(
          jsonResponse(422, { ok: false, error: 'incomplete_upload', sessionId: SCAN_ID, failedPoses: ['front'] }),
        );
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await persistScan(SCAN_ID, FOUR_FRAMES);

    expect(fetchMock).toHaveBeenCalledTimes(2); // prepare + finalize, even though an upload failed
    expect(result.ok).toBe(false);
    const frames = (finalizeBody as { frames: Array<{ view: string; paths: unknown }> }).frames;
    const frontFrame = frames.find((f) => f.view === 'front');
    expect(frontFrame?.paths).toBeNull();
  });
});
