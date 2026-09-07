import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtractedMeasurements, MeasuredValue } from '@/lib/arnold/scanning/types';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils/with-timeout', () => ({
  withTimeout: async <T>(p: Promise<T>) => p,
}));

import { POST } from '../route';

const SESSION_ID = '11111111-2222-4333-8444-555555555555';
const VISION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function measured(cm: number | null): MeasuredValue {
  return {
    cm,
    uncertaintyCm: 1,
    confidence: cm === null ? 'low' : 'high',
    source: cm === null ? 'missing' : 'ellipse_frontSide',
  };
}

const NULL_AX = { aCm: null, bCm: null, aspectRatio: null } as const;

function measurements(waistCm: number | null): ExtractedMeasurements {
  const unknown = measured(null);
  return {
    neckCirc: unknown,
    shoulderCirc: unknown,
    chestCirc: unknown,
    waistNaturalCirc: measured(waistCm),
    waistNavelCirc: unknown,
    hipCirc: unknown,
    rightBicepCirc: unknown,
    leftBicepCirc: unknown,
    rightForearmCirc: unknown,
    leftForearmCirc: unknown,
    rightThighCirc: unknown,
    leftThighCirc: unknown,
    rightCalfCirc: unknown,
    leftCalfCirc: unknown,
    waistToHipRatio: 0,
    waistToHeightRatio: 0,
    shoulderToWaistRatio: 0,
    inseamCm: 0,
    torsoLengthCm: 0,
    corroborationSignals: { lrCorroboration: 0, fbCorroboration: 0, lrAsymmetry: null },
    semiAxes: {
      neck: NULL_AX,
      shoulder: NULL_AX,
      chest: NULL_AX,
      waistNatural: NULL_AX,
      waistNavel: NULL_AX,
      hip: NULL_AX,
      bicepR: NULL_AX,
      bicepL: NULL_AX,
      forearmR: NULL_AX,
      forearmL: NULL_AX,
      thighR: NULL_AX,
      thighL: NULL_AX,
      calfR: NULL_AX,
      calfL: NULL_AX,
    },
  };
}

function post(body: Record<string, unknown>): Promise<Response> {
  return POST(
    new Request('http://localhost/api/body/circumference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.from.mockReset();
});

describe('POST /api/body/circumference', () => {
  it('T5: looks up the entry by vision scan id even when photoSessionId is present', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    let lookedUpScanId: string | null = null;
    let inserted: Record<string, unknown> | null = null;
    mocks.from.mockImplementation((table: string) => {
      if (table === 'body_tracker_entries') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              if (col === 'scan_id') lookedUpScanId = val;
              return {
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'entry-1' }, error: null }),
                }),
              };
            },
          }),
        };
      }
      if (table === 'body_tracker_circumference') {
        return {
          insert: (row: Record<string, unknown>) => {
            inserted = row;
            return Promise.resolve({ error: null });
          },
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      };
    });

    const res = await post({
      scanId: VISION_ID,
      photoSessionId: SESSION_ID,
      measurements: measurements(86),
    });
    const json = (await res.json()) as { ok: boolean; entryId?: string };
    expect(json.ok).toBe(true);
    expect(json.entryId).toBe('entry-1');
    expect(lookedUpScanId).toBe(VISION_ID);
    expect(inserted?.scan_id).toBe(SESSION_ID);
    expect(inserted?.waist).toBe(86);
  });

  it('skips all-UNKNOWN payloads as ok:false', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const res = await post({
      scanId: VISION_ID,
      measurements: measurements(null),
    });
    const json = (await res.json()) as { ok: boolean; reason?: string };
    expect(json.ok).toBe(false);
    expect(json.reason).toBe('all_unknown');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('T6: unique scan_id conflict is idempotent success', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.from.mockImplementation((table: string) => {
      if (table === 'body_tracker_entries') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'entry-1' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'body_tracker_circumference') {
        return {
          insert: () =>
            Promise.resolve({ error: { message: 'duplicate', code: '23505' } }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      };
    });

    const res = await post({
      scanId: VISION_ID,
      photoSessionId: SESSION_ID,
      measurements: measurements(80),
    });
    const json = (await res.json()) as { ok: boolean; idempotent?: boolean };
    expect(json.ok).toBe(true);
    expect(json.idempotent).toBe(true);
  });
});
