import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231 Task 9: server-side scan consent gate contract tests.
// Mirrors the Prompt 226 converterGate test shape: mocks the admin Supabase
// client only (hasScanConsent is a server-only, admin-backed check), never
// hits a real database. Covers the true/false ack states plus the two
// resilience layers (fail-open on throw, fail-open on timeout).

const mocks = vi.hoisted(() => ({
  adminFrom: vi.fn(),
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

import { hasScanConsent } from '@/lib/scan/scanConsentGate';

const ACTIVE_VERSION_ROW = {
  id: 'version-1',
  version: 'scan-231-v1',
  body_markdown: 'placeholder body',
  lex_status: 'cleared',
};

function versionsChain(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

function acksChain(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq2 = vi.fn().mockReturnValue({ maybeSingle });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return { select };
}

function installAdminMock(opts: { hasAck: boolean; noActiveVersion?: boolean }) {
  const versions = versionsChain(opts.noActiveVersion ? null : ACTIVE_VERSION_ROW);
  const acks = acksChain(opts.hasAck ? { id: 'ack-1' } : null);
  mocks.adminFrom.mockImplementation((table: string) =>
    table === 'scan_consent_versions' ? versions : acks,
  );
}

beforeEach(() => {
  mocks.adminFrom.mockReset();
});

describe('hasScanConsent', () => {
  it('returns ok:false before an ack exists for the active version', async () => {
    installAdminMock({ hasAck: false });
    const result = await hasScanConsent('user-1');
    expect(result.ok).toBe(false);
    expect(result.version).toBeUndefined();
  });

  it('returns ok:true with the version once an ack exists', async () => {
    installAdminMock({ hasAck: true });
    const result = await hasScanConsent('user-1');
    expect(result.ok).toBe(true);
    expect(result.version).toBe('scan-231-v1');
  });

  it('returns ok:false when no Lex-cleared active version exists', async () => {
    installAdminMock({ hasAck: true, noActiveVersion: true });
    const result = await hasScanConsent('user-1');
    expect(result.ok).toBe(false);
  });

  it('fails open to ok:false when the admin client throws', async () => {
    mocks.adminFrom.mockImplementation(() => {
      throw new Error('boom');
    });
    const result = await hasScanConsent('user-1');
    expect(result.ok).toBe(false);
  });

  it('fails open to ok:false on timeout', async () => {
    vi.useFakeTimers();
    try {
      mocks.adminFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => new Promise<never>(() => {}),
              }),
            }),
          }),
        }),
      }));
      const promise = hasScanConsent('user-1');
      await vi.advanceTimersByTimeAsync(10_000);
      const result = await promise;
      expect(result.ok).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
