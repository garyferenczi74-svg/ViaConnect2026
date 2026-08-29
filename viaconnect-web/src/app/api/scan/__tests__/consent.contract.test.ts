import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231 Task 9: /api/scan/consent route contract tests. Mirrors the
// Prompt 226 acknowledge route test shape: mocks @/lib/supabase/server (auth)
// and @/lib/supabase/admin (the scan_consent_versions / scan_consent_acks
// reads and writes) at the module level, imports the route handlers after
// the mocks are registered, and drives them with real Request objects.

const mocks = vi.hoisted(() => ({
  supabaseGetUser: vi.fn(),
  adminFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mocks.supabaseGetUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mocks.adminFrom }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET, POST } from '@/app/api/scan/consent/route';

const ACTIVE_VERSION_ROW = {
  id: 'version-1',
  version: 'scan-231-v1',
  body_markdown: 'placeholder body',
  lex_status: 'cleared',
};

function versionsChain(row: Record<string, unknown> | null = ACTIVE_VERSION_ROW) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

function acksReadChain(row: Record<string, unknown> | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq2 = vi.fn().mockReturnValue({ maybeSingle });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return { select };
}

function acksWriteChain(upsertError: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  return { upsert };
}

function installAdminMock(opts: {
  activeVersion?: Record<string, unknown> | null;
  existingAck?: Record<string, unknown> | null;
  upsertError?: unknown;
} = {}) {
  const versions = versionsChain(
    opts.activeVersion === undefined ? ACTIVE_VERSION_ROW : opts.activeVersion,
  );
  const acksRead = acksReadChain(opts.existingAck ?? null);
  const acksWrite = acksWriteChain(opts.upsertError ?? null);
  const acks = { ...acksRead, ...acksWrite };
  mocks.adminFrom.mockImplementation((table: string) =>
    table === 'scan_consent_versions' ? versions : acks,
  );
  return acks;
}

function buildRequest(): Request {
  return new Request('http://localhost/api/scan/consent', { method: 'POST' });
}

beforeEach(() => {
  mocks.supabaseGetUser.mockReset();
  mocks.adminFrom.mockReset();
});

describe('GET /api/scan/consent', () => {
  it('rejects an unauthenticated request', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns the active version copy and acknowledged state for the authed user', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    installAdminMock({ existingAck: { id: 'ack-1' } });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.available).toBe(true);
    expect(body.version).toBe('scan-231-v1');
    expect(body.bodyMarkdown).toBe('placeholder body');
    expect(body.acknowledged).toBe(true);
  });

  it('reports unavailable when no Lex-cleared version exists', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    installAdminMock({ activeVersion: null });
    const res = await GET();
    const body = await res.json();
    expect(body.available).toBe(false);
  });
});

describe('POST /api/scan/consent', () => {
  it('rejects an unauthenticated request', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(buildRequest());
    expect(res.status).toBe(401);
  });

  it('records an ack for the authenticated user against the active version', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const acks = installAdminMock();
    const res = await POST(buildRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.version).toBe('scan-231-v1');
    expect(acks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', consent_version_id: 'version-1' }),
      { onConflict: 'user_id,consent_version_id' },
    );
  });

  it('is idempotent: a second ack call for the same user does not error', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } });
    installAdminMock();
    const first = await POST(buildRequest());
    const second = await POST(buildRequest());
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.ok).toBe(true);
  });

  it('rejects the ack with a clear reason when no Lex-cleared version exists', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-3' } } });
    installAdminMock({ activeVersion: null });
    const res = await POST(buildRequest());
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('consent_not_cleared');
  });
});
