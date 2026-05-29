// Prompt #170 Phase 1h: tests for the conditional photo contribution helper.
// Covers the opt-in gate (false / missing / true), the path shape, the
// metadata-stripping pure helper, and the no-throw guarantee on upload errors.

import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { maybeContributePhoto, stripImageMetadata } from '../photo-contribution';

interface FakeStorageOpts {
  uploadResult?: { error: { message: string } | null };
  captureUpload?: (path: string, body: Buffer) => void;
}

interface FakeClientOpts {
  optIn?: boolean | null;          // null means no row found
  settingsError?: { message: string } | null;
  storage?: FakeStorageOpts;
}

function buildFakeClient(opts: FakeClientOpts): {
  client: Parameters<typeof maybeContributePhoto>[0]['supabaseAdmin'];
  uploadCalls: Array<{ bucket: string; path: string; bodyLength: number }>;
} {
  const uploadCalls: Array<{ bucket: string; path: string; bodyLength: number }> = [];

  const maybeSingle = vi.fn(async () => {
    if (opts.settingsError) return { data: null, error: opts.settingsError };
    if (opts.optIn === null || opts.optIn === undefined) {
      return { data: null, error: null };
    }
    return { data: { corpus_opt_in: opts.optIn }, error: null };
  });

  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  const upload = vi.fn(async (path: string, body: Buffer) => {
    opts.storage?.captureUpload?.(path, body);
    return opts.storage?.uploadResult ?? { error: null };
  });

  const storageFrom = vi.fn((bucket: string) => ({
    upload: (path: string, body: Buffer, _options: unknown) => {
      uploadCalls.push({ bucket, path, bodyLength: body.length });
      return upload(path, body);
    },
  }));

  const client = {
    from,
    storage: { from: storageFrom },
  } as unknown as Parameters<typeof maybeContributePhoto>[0]['supabaseAdmin'];

  return { client, uploadCalls };
}

// 1x1 white PNG buffer (well-formed; sharp can read and re-encode).
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64',
);

describe('stripImageMetadata', () => {
  it('returns a JPEG buffer from a PNG input', async () => {
    const result = await stripImageMetadata(ONE_PX_PNG);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const meta = await sharp(result).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(1);
    expect(meta.height).toBe(1);
    // The re-encode pipeline does not carry EXIF forward for a PNG input
    // (PNGs do not carry EXIF), and our pipeline omits withMetadata so even
    // a JPEG source would have its EXIF dropped.
    expect(meta.exif).toBeUndefined();
  });
});

describe('maybeContributePhoto', () => {
  it('returns user_opt_out and skips storage when corpus_opt_in is false', async () => {
    const { client, uploadCalls } = buildFakeClient({ optIn: false });

    const result = await maybeContributePhoto({
      supabaseAdmin: client,
      userId: 'user-1',
      userHash: 'a'.repeat(64),
      imageBytes: ONE_PX_PNG,
      mimeType: 'image/png',
      capturedAt: '2026-05-28T12:00:00Z',
      requestId: 'req-1',
    });

    expect(result.contributed).toBe(false);
    expect(result.reason).toBe('user_opt_out');
    expect(uploadCalls.length).toBe(0);
  });

  it('treats a missing settings row as opt-out', async () => {
    const { client, uploadCalls } = buildFakeClient({ optIn: null });

    const result = await maybeContributePhoto({
      supabaseAdmin: client,
      userId: 'user-2',
      userHash: 'b'.repeat(64),
      imageBytes: ONE_PX_PNG,
      mimeType: 'image/png',
      capturedAt: '2026-05-28T12:00:00Z',
      requestId: 'req-2',
    });

    expect(result.contributed).toBe(false);
    expect(result.reason).toBe('user_opt_out');
    expect(uploadCalls.length).toBe(0);
  });

  it('uploads to <userHash>/<YYYY-MM-DD>/<uuid>.jpg when opted in', async () => {
    const { client, uploadCalls } = buildFakeClient({ optIn: true });
    const userHash = 'c'.repeat(64);

    const result = await maybeContributePhoto({
      supabaseAdmin: client,
      userId: 'user-3',
      userHash,
      imageBytes: ONE_PX_PNG,
      mimeType: 'image/png',
      capturedAt: '2026-05-28T18:00:00Z',
      requestId: 'req-3',
    });

    expect(result.contributed).toBe(true);
    expect(uploadCalls.length).toBe(1);
    const call = uploadCalls[0];
    expect(call.bucket).toBe('nutrivision-meals');
    expect(call.path).toMatch(
      new RegExp(`^${userHash}/2026-05-28/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$`),
    );
    expect(call.bodyLength).toBeGreaterThan(0);
    expect(result.storagePath).toBe(call.path);
  });

  it('returns upload_error without throwing when the storage upload fails', async () => {
    const { client } = buildFakeClient({
      optIn: true,
      storage: { uploadResult: { error: { message: 'object exists' } } },
    });

    const result = await maybeContributePhoto({
      supabaseAdmin: client,
      userId: 'user-4',
      userHash: 'd'.repeat(64),
      imageBytes: ONE_PX_PNG,
      mimeType: 'image/png',
      capturedAt: '2026-05-28T12:00:00Z',
      requestId: 'req-4',
    });

    expect(result.contributed).toBe(false);
    expect(result.reason).toBe('upload_error');
  });

  it('falls back to opt_in_lookup_error when settings read returns an error', async () => {
    const { client } = buildFakeClient({
      settingsError: { message: 'rls' },
    });

    const result = await maybeContributePhoto({
      supabaseAdmin: client,
      userId: 'user-5',
      userHash: 'e'.repeat(64),
      imageBytes: ONE_PX_PNG,
      mimeType: 'image/png',
      capturedAt: '2026-05-28T12:00:00Z',
      requestId: 'req-5',
    });

    // The read error path is conservative and downgrades to false.
    expect(result.contributed).toBe(false);
    expect(result.reason).toBe('user_opt_out');
  });
});
