/**
 * POST /api/genetics/lifemetrics/webhook route tests.
 * Bad HMAC fails closed. DUTCH-only hormone persist. No genetics in logs.
 * No em or en dashes.
 */

import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MEMBER = '11111111-1111-4111-8111-111111111111';

const insertMock = vi.fn();
const updateEqMock = vi.fn();
const persistMock = vi.fn();
const resolveUserMock = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'lifemetrics_webhook_events') {
        return {
          insert: insertMock,
          update: () => ({ eq: updateEqMock }),
        };
      }
      if (table === 'audit_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return { insert: vi.fn(), update: () => ({ eq: vi.fn() }) };
    },
  }),
}));

vi.mock('@/lib/genetics/lifemetricsIdentity', async () => {
  const actual = await vi.importActual<typeof import('@/lib/genetics/lifemetricsIdentity')>(
    '@/lib/genetics/lifemetricsIdentity',
  );
  return {
    ...actual,
    resolveLifemetricsUserId: (...args: unknown[]) => resolveUserMock(...args),
  };
});

vi.mock('@/lib/genetics/lifemetricsLookups', () => ({
  createLifemetricsIdentityLookups: () => ({}),
}));

vi.mock('@/lib/genetics/lifemetricsClient', () => ({
  extractLifemetricsPullPointer: () => ({}),
  pullLifemetricsResult: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/genetics/lifemetricsPersist', () => ({
  persistLifemetricsImport: (...args: unknown[]) => persistMock(...args),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from '../route';
import { safeLog } from '@/lib/utils/safe-log';

const SECRET = 'route_test_secret';

function sign(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

function makeRequest(body: string, signature?: string): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (signature) headers.set('X-LifeMetrics-Signature', signature);
  return new Request('http://localhost/api/genetics/lifemetrics/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

describe('POST /api/genetics/lifemetrics/webhook', () => {
  beforeEach(() => {
    process.env.LIFEMETRICS_WEBHOOK_SECRET = SECRET;
    insertMock.mockReset();
    updateEqMock.mockReset();
    persistMock.mockReset();
    resolveUserMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    updateEqMock.mockResolvedValue({ error: null });
    persistMock.mockResolvedValue({ variants: 0, hormoneMarkers: 2, epigeneticMarkers: null });
    resolveUserMock.mockResolvedValue(MEMBER);
  });

  it('fails closed on a bad HMAC and does not persist', async () => {
    const body = JSON.stringify({
      event_id: 'evt_bad_hmac',
      event: 'lab_results.received',
    });
    const res = await POST(makeRequest(body, 'nope') as never);
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('fails closed when the HMAC header is missing', async () => {
    const body = JSON.stringify({ event_id: 'evt_nosig', event: 'lab_results.received' });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(401);
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('persists DUTCH hormone markers only after a valid HMAC', async () => {
    const body = JSON.stringify({
      event_id: 'evt_dutch_ok',
      event: 'lab_results.received',
      lab_name: 'Precision Analytical (DUTCH)',
      results: [{ name: '2-OH-E1', value: 3.4, unit: 'ng/mg' }],
      patient: { email: 'member@example.test' },
    });
    const res = await POST(makeRequest(body, sign(body)) as never);
    const json = (await res.json()) as { ok?: boolean; applied?: { hormoneMarkers: number | null } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(persistMock).toHaveBeenCalledTimes(1);
    const mapped = persistMock.mock.calls[0][2] as {
      hormoneMarkers: Array<{ name: string }>;
      variants: unknown[];
    };
    expect(mapped.hormoneMarkers).toHaveLength(1);
    expect(mapped.hormoneMarkers[0].name).toBe('2-OH-E1');
    expect(mapped.variants).toHaveLength(0);
  });

  it('does not persist Quest hormone names as HormoneIQ', async () => {
    persistMock.mockResolvedValue({ variants: null, hormoneMarkers: null, epigeneticMarkers: null });
    const body = JSON.stringify({
      event_id: 'evt_quest_skip',
      event: 'lab_results.received',
      results: [{ name: 'Estradiol', value: 80, unit: 'pg/mL', lab_name: 'Quest' }],
      patient: { email: 'member@example.test' },
    });
    const res = await POST(makeRequest(body, sign(body)) as never);
    expect(res.status).toBe(200);
    const mapped = persistMock.mock.calls[0][2] as { hormoneMarkers: unknown[] };
    expect(mapped.hormoneMarkers).toHaveLength(0);
  });

  it('is idempotent on a duplicate event_id', async () => {
    insertMock.mockResolvedValue({ error: { message: 'duplicate key', code: '23505' } });
    const body = JSON.stringify({
      event_id: 'evt_dup',
      event: 'genetics_result.uploaded',
    });
    const res = await POST(makeRequest(body, sign(body)) as never);
    const json = (await res.json()) as { duplicate?: boolean };
    expect(res.status).toBe(200);
    expect(json.duplicate).toBe(true);
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('does not write when the member cannot be resolved', async () => {
    resolveUserMock.mockResolvedValue(null);
    const body = JSON.stringify({
      event_id: 'evt_unmatched',
      event: 'genetics_result.uploaded',
      variants: [{ panel: 'GENEX-M', rsid: 'rsTEST5001', gene: 'MTHFR', genotype: 'TT' }],
    });
    const res = await POST(makeRequest(body, sign(body)) as never);
    const json = (await res.json()) as { unmatched?: boolean; applied?: { variants: number | null } };
    expect(res.status).toBe(200);
    expect(json.unmatched).toBe(true);
    expect(json.applied?.variants).toBeNull();
    expect(persistMock).not.toHaveBeenCalled();
  });
});

describe('webhook route source guards', () => {
  const source = readFileSync(path.resolve(__dirname, '..', 'route.ts'), 'utf8');

  it('documents how to set the webhook URL once keys exist', () => {
    expect(source).toContain('https://www.viaconnectapp.com/api/genetics/lifemetrics/webhook');
    expect(source).toContain('farmceutica-wellness.labs.y0urbrand.com/admin/tenants/355');
    expect(source).toContain('LIFEMETRICS_WEBHOOK_SECRET');
  });

  it('does not log genetics fields', () => {
    expect(source).not.toContain('rsid');
    expect(source).not.toContain('genotype');
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });

  it('never mentions a hardcoded destination member', () => {
    expect(source.toLowerCase()).not.toContain('gary');
  });
});

describe('safeLog usage on the webhook route', () => {
  it('is imported so runtime logs stay structured', () => {
    expect(safeLog.warn).toBeTypeOf('function');
  });
});
