/**
 * LifeMetrics webhook handler tests.
 * Bad HMAC fails closed. DUTCH-only hormone persist. No genetics in logs.
 * No em or en dashes.
 */

import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const MEMBER = '11111111-1111-4111-8111-111111111111';

const insertMock = vi.fn();
const updateEqMock = vi.fn();
const persistMock = vi.fn();
const resolveUserMock = vi.fn();

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

import { handleLifemetricsWebhook } from '../lifemetricsWebhookHandler';

const SECRET = 'route_test_secret';

function sign(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

function makeAdmin() {
  return {
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
  };
}

describe('handleLifemetricsWebhook', () => {
  beforeEach(() => {
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
    const result = await handleLifemetricsWebhook(
      body,
      new Headers({ 'X-LifeMetrics-Signature': 'nope' }),
      SECRET,
      makeAdmin(),
    );
    expect(result.status).toBe(401);
    expect(result.body.error).toBe('invalid_signature');
    expect(insertMock).not.toHaveBeenCalled();
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('fails closed when the HMAC header is missing', async () => {
    const body = JSON.stringify({ event_id: 'evt_nosig', event: 'lab_results.received' });
    const result = await handleLifemetricsWebhook(body, new Headers(), SECRET, makeAdmin());
    expect(result.status).toBe(401);
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('fails closed when the webhook secret is empty', async () => {
    const body = JSON.stringify({ event_id: 'evt_nosecret', event: 'lab_results.received' });
    const result = await handleLifemetricsWebhook(
      body,
      new Headers({ 'X-LifeMetrics-Signature': sign(body) }),
      '',
      makeAdmin(),
    );
    expect(result.status).toBe(401);
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
    const result = await handleLifemetricsWebhook(
      body,
      new Headers({ 'X-LifeMetrics-Signature': sign(body) }),
      SECRET,
      makeAdmin(),
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
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
    const result = await handleLifemetricsWebhook(
      body,
      new Headers({ 'X-LifeMetrics-Signature': sign(body) }),
      SECRET,
      makeAdmin(),
    );
    expect(result.status).toBe(200);
    const mapped = persistMock.mock.calls[0][2] as { hormoneMarkers: unknown[] };
    expect(mapped.hormoneMarkers).toHaveLength(0);
  });

  it('is idempotent on a duplicate event_id', async () => {
    insertMock.mockResolvedValue({ error: { message: 'duplicate key', code: '23505' } });
    const body = JSON.stringify({
      event_id: 'evt_dup',
      event: 'genetics_result.uploaded',
    });
    const result = await handleLifemetricsWebhook(
      body,
      new Headers({ 'X-LifeMetrics-Signature': sign(body) }),
      SECRET,
      makeAdmin(),
    );
    expect(result.status).toBe(200);
    expect(result.body.duplicate).toBe(true);
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('does not write when the member cannot be resolved', async () => {
    resolveUserMock.mockResolvedValue(null);
    const body = JSON.stringify({
      event_id: 'evt_unmatched',
      event: 'genetics_result.uploaded',
      variants: [{ panel: 'GENEX-M', rsid: 'rsTEST5001', gene: 'MTHFR', genotype: 'TT' }],
    });
    const result = await handleLifemetricsWebhook(
      body,
      new Headers({ 'X-LifeMetrics-Signature': sign(body) }),
      SECRET,
      makeAdmin(),
    );
    expect(result.status).toBe(200);
    expect(result.body.unmatched).toBe(true);
    expect((result.body.applied as { variants: number | null }).variants).toBeNull();
    expect(persistMock).not.toHaveBeenCalled();
  });
});
