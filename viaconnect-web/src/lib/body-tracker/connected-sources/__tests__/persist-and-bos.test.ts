import { describe, it, expect } from 'vitest';
import { parseAppleHealthXml } from '../apple-health-xml';
import { recordsToWearableRows, summarizePersist } from '../wearable-ingest';
import { wearableContributorFromSource } from '@/lib/scoring/wearable-contributor';

describe('XML persist can feed a BOS wearable contributor', () => {
  it('Hume-tagged XML rows produce a present contributor snapshot', () => {
    const xml = `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="hume_body_pod" unit="kg" value="71.2" startDate="2026-08-20 07:00:00 +0000"/>`;
    const parsed = parseAppleHealthXml(xml);
    const rows = recordsToWearableRows('u-1', parsed.records);
    const summary = summarizePersist(rows);
    expect(summary.humeStored).toBe(1);
    const contributor = wearableContributorFromSource({
      last_engaged_at: '2026-08-20T07:00:00.000Z',
      recent_events_7d: summary.stored,
      recent_events_30d: summary.stored,
      source_specific: {
        active_integration_count: 1,
        device_types: ['hume'],
        latest_hrv: null,
        latest_sleep_hours: null,
      },
    });
    expect(contributor.present).toBe(true);
    expect(contributor.device_types).toContain('hume');
    expect(contributor.latest_hrv).toBeNull();
  });
});
