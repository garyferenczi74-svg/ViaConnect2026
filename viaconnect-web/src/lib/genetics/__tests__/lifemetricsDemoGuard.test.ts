/**
 * Demo Client 4634 / demo@genemetrics.com must never write genotypes
 * onto any user_id, including an arbitrary member.
 * No em or en dashes.
 */

import { describe, expect, it } from 'vitest';
import {
  isLifemetricsDemoAccountLabel,
  isLifemetricsDemoSource,
  planLifemetricsPersist,
  LIFEMETRICS_DEMO_CLIENT_ID,
  LIFEMETRICS_DEMO_EMAIL,
} from '../lifemetricsDemoGuard';
import { mapLifemetricsImport } from '../lifemetricsImport';

const ARBITRARY_USER = '22222222-2222-4222-8222-222222222222';

const DEMO_PAYLOAD = {
  event_id: 'evt_demo_4634',
  event: 'genetics_result.uploaded',
  client_id: 4634,
  patient_email: LIFEMETRICS_DEMO_EMAIL,
  variants: [
    { panel: 'GENEX-M', rsid: 'rsTEST4634', gene: 'MTHFR', genotype: 'TT' },
    { panel: 'nutrition', rsid: 'rsTEST4635', gene: 'FTO', genotype: 'AT' },
  ],
};

describe('isLifemetricsDemoSource', () => {
  it('detects client 4634 and the demo email', () => {
    expect(isLifemetricsDemoSource({ clientId: LIFEMETRICS_DEMO_CLIENT_ID })).toBe(true);
    expect(isLifemetricsDemoSource({ clientId: 4634 })).toBe(true);
    expect(isLifemetricsDemoSource({ email: 'Demo@GeneMetrics.com' })).toBe(true);
    expect(isLifemetricsDemoSource({ email: 'member@example.test' })).toBe(false);
    expect(isLifemetricsDemoSource({ clientId: '355' })).toBe(false);
  });

  it('detects FarmCeutica Support even when client id and email are not demo', () => {
    expect(isLifemetricsDemoAccountLabel('FarmCeutica Support')).toBe(true);
    expect(isLifemetricsDemoAccountLabel('  farmceutica   support  ')).toBe(true);
    expect(
      isLifemetricsDemoSource({
        clientId: '355',
        email: 'member@example.test',
        displayName: 'FarmCeutica Support',
      }),
    ).toBe(true);
    expect(
      isLifemetricsDemoSource({
        clientId: '355',
        email: 'member@example.test',
        accountLabel: 'FarmCeutica Support',
      }),
    ).toBe(true);
    expect(
      isLifemetricsDemoSource({
        clientId: '355',
        email: 'member@example.test',
        displayName: 'Member Name',
      }),
    ).toBe(false);
  });
});

describe('planLifemetricsPersist demo client block', () => {
  it('does not write Demo Client 4634 genotypes onto an arbitrary user_id', () => {
    const mapped = mapLifemetricsImport(DEMO_PAYLOAD, ARBITRARY_USER);
    expect(mapped.variants.length).toBeGreaterThan(0);

    const planned = planLifemetricsPersist({
      source: { clientId: '4634', email: LIFEMETRICS_DEMO_EMAIL },
      targetUserId: ARBITRARY_USER,
      mapped,
    });

    expect(planned.blocked).toBe(true);
    expect(planned.reason).toBe('demo_client_blocked');
    expect(planned.targetUserId).toBe(ARBITRARY_USER);
    expect(planned.mapped.variants).toEqual([]);
    expect(planned.mapped.hormoneMarkers).toEqual([]);
    expect(planned.mapped.epigeneticMarkers).toEqual([]);
    expect(planned.mapped.unknownReason).toBe('demo_client_blocked');
  });

  it('blocks when only the demo email is present', () => {
    const mapped = mapLifemetricsImport(DEMO_PAYLOAD, ARBITRARY_USER);
    const planned = planLifemetricsPersist({
      source: { email: LIFEMETRICS_DEMO_EMAIL },
      targetUserId: ARBITRARY_USER,
      mapped,
    });
    expect(planned.blocked).toBe(true);
    expect(planned.mapped.variants).toHaveLength(0);
  });

  it('does not write FarmCeutica Support genotypes onto an arbitrary user_id', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_support_label',
        event: 'genetics_result.uploaded',
        variants: [{ panel: 'GENEX-M', rsid: 'rsTEST4636', gene: 'MTHFR', genotype: 'TT' }],
      },
      ARBITRARY_USER,
    );
    const byDisplayName = planLifemetricsPersist({
      source: {
        clientId: '355',
        email: 'member@example.test',
        displayName: 'FarmCeutica Support',
      },
      targetUserId: ARBITRARY_USER,
      mapped,
    });
    const byAccountLabel = planLifemetricsPersist({
      source: {
        clientId: '355',
        email: 'member@example.test',
        accountLabel: 'FarmCeutica Support',
      },
      targetUserId: ARBITRARY_USER,
      mapped,
    });
    expect(byDisplayName.blocked).toBe(true);
    expect(byDisplayName.reason).toBe('demo_client_blocked');
    expect(byDisplayName.mapped.variants).toEqual([]);
    expect(byDisplayName.mapped.unknownReason).toBe('demo_client_blocked');
    expect(byAccountLabel.blocked).toBe(true);
    expect(byAccountLabel.reason).toBe('demo_client_blocked');
    expect(byAccountLabel.mapped.variants).toEqual([]);
    expect(byAccountLabel.mapped.unknownReason).toBe('demo_client_blocked');
  });

  it('allows a non-demo source through to the mapped rows', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_member',
        event: 'genetics_result.uploaded',
        variants: [{ panel: 'GENEX-M', rsid: 'rsTEST8001', gene: 'MTHFR', genotype: 'CT' }],
      },
      ARBITRARY_USER,
    );
    const planned = planLifemetricsPersist({
      source: { clientId: '355', email: 'member@example.test' },
      targetUserId: ARBITRARY_USER,
      mapped,
    });
    expect(planned.blocked).toBe(false);
    expect(planned.mapped.variants).toHaveLength(1);
    expect(planned.mapped.variants[0].userId).toBe(ARBITRARY_USER);
  });
});
