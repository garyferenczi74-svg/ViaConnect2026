/**
 * LifeMetrics persist refuses demo identities, including FarmCeutica Support
 * when client id and email are not the 4634 / demo@ pair.
 * UNKNOWN stays null. No em or en dashes.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/labs/labUploadStore', () => ({
  persistLabBiomarkers: vi.fn().mockResolvedValue({ saved: 0 }),
}));

vi.mock('../epigenResultStore', () => ({
  persistEpigeneticMarkers: vi.fn().mockResolvedValue({ saved: 0 }),
}));

import { persistLifemetricsImport } from '../lifemetricsPersist';
import { mapLifemetricsImport } from '../lifemetricsImport';

const MEMBER = '22222222-2222-4222-8222-222222222222';

const upsertMock = vi.fn();

function makeSupabase() {
  return {
    from: () => ({ upsert: upsertMock }),
  };
}

describe('persistLifemetricsImport demo refusal', () => {
  beforeEach(() => {
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
  });

  it('refuses FarmCeutica Support even when client id and email are not demo', async () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_persist_support',
        event: 'genetics_result.uploaded',
        variants: [{ panel: 'GENEX-M', rsid: 'rsTEST9101', gene: 'MTHFR', genotype: 'TT' }],
      },
      MEMBER,
    );
    expect(mapped.variants.length).toBeGreaterThan(0);

    const byDisplayName = await persistLifemetricsImport(makeSupabase(), MEMBER, mapped, {
      clientId: '355',
      email: 'member@example.test',
      displayName: 'FarmCeutica Support',
    });
    const byAccountLabel = await persistLifemetricsImport(makeSupabase(), MEMBER, mapped, {
      clientId: '355',
      email: 'member@example.test',
      accountLabel: 'FarmCeutica Support',
    });

    expect(byDisplayName.variants).toBeNull();
    expect(byDisplayName.hormoneMarkers).toBeNull();
    expect(byDisplayName.epigeneticMarkers).toBeNull();
    expect(byAccountLabel.variants).toBeNull();
    expect(byAccountLabel.hormoneMarkers).toBeNull();
    expect(byAccountLabel.epigeneticMarkers).toBeNull();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('refuses client 4634 and the demo email the same way', async () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_persist_4634',
        event: 'genetics_result.uploaded',
        variants: [{ panel: 'GENEX-M', rsid: 'rsTEST9102', gene: 'COMT', genotype: 'GG' }],
      },
      MEMBER,
    );

    const byClient = await persistLifemetricsImport(makeSupabase(), MEMBER, mapped, {
      clientId: '4634',
      email: 'member@example.test',
    });
    const byEmail = await persistLifemetricsImport(makeSupabase(), MEMBER, mapped, {
      clientId: '355',
      email: 'demo@genemetrics.com',
    });

    expect(byClient.variants).toBeNull();
    expect(byEmail.variants).toBeNull();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('writes a non-demo member source', async () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_persist_member',
        event: 'genetics_result.uploaded',
        variants: [{ panel: 'GENEX-M', rsid: 'rsTEST9103', gene: 'MTHFR', genotype: 'CT' }],
      },
      MEMBER,
    );

    const counts = await persistLifemetricsImport(makeSupabase(), MEMBER, mapped, {
      clientId: '355',
      email: 'member@example.test',
      displayName: 'Member Name',
    });

    expect(counts.variants).toBe(1);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});
