import { describe, it, expect } from 'vitest';
import { parseAppleHealthXml, filterIngestibleRecords } from '../apple-health-xml';
import { recordsToWearableRows, summarizePersist } from '../wearable-ingest';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Hume Health" unit="kg" value="70.1" startDate="2026-08-20 07:00:00 +0000"/>
  <Record type="HKQuantityTypeIdentifierBodyFatPercentage" sourceName="Hume Health" unit="%" value="18.4" startDate="2026-08-20 07:00:00 +0000"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="iPhone" value="1" startDate="2026-08-19 22:00:00 +0000" endDate="2026-08-20 06:00:00 +0000"/>
</HealthData>`;

describe('XML ingest to stored wearable rows', () => {
  it('writes Hume-tagged composition rows the BOS wearable source can read', () => {
    const parsed = parseAppleHealthXml(SAMPLE, { includePhi: false });
    const ingestible = filterIngestibleRecords(parsed, false);
    const rows = recordsToWearableRows('user-1', ingestible);
    const summary = summarizePersist(rows);
    expect(summary.humeStored).toBeGreaterThan(0);
    expect(summary.humeDimensionsFed).toContain('metabolic');
    expect(rows.every((r) => r.payload.user_id === 'user-1')).toBe(true);
    expect(rows.some((r) => r.table === 'wearable_body_composition')).toBe(true);
    const hume = rows.find((r) => r.tileId === 'hume' && r.payload.weight_kg != null);
    expect(hume?.payload.weight_kg).toBe(70.1);
    expect(hume?.payload.source_app).toBe('Hume Health');
    expect(hume?.payload.weight_kg).not.toBe(0);
  });

  it('stores sleep sessions only when PHI records are included', () => {
    const withPhi = parseAppleHealthXml(SAMPLE, { includePhi: true });
    const rows = recordsToWearableRows('user-1', filterIngestibleRecords(withPhi, true));
    expect(rows.some((r) => r.table === 'wearable_sleep_sessions')).toBe(true);
    const sleep = rows.find((r) => r.table === 'wearable_sleep_sessions');
    expect(sleep?.payload.total_sleep_min).toBe(480);
    expect(sleep?.dimension).toBe('sleep');
  });

  it('does not persist Hume-tagged sleep or count it as Hume last-sync', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Hume Health" value="1" startDate="2026-08-19 22:00:00 +0000" endDate="2026-08-20 06:00:00 +0000"/>
</HealthData>`;
    const parsed = parseAppleHealthXml(xml, { includePhi: true });
    const ingestible = filterIngestibleRecords(parsed, true);
    const rows = recordsToWearableRows('user-1', ingestible.length ? ingestible : parsed.records);
    const summary = summarizePersist(rows);
    expect(rows.some((r) => r.table === 'wearable_sleep_sessions')).toBe(false);
    expect(summary.humeStored).toBe(0);
    expect(summary.dimensionsFed).not.toContain('sleep');
    expect(summary.humeDimensionsFed).toEqual([]);
  });

  it('does not invent zero for missing Hume metrics', () => {
    const xml = `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Hume" unit="kg" value="bad" startDate="2026-08-20 07:00:00 +0000"/>`;
    const parsed = parseAppleHealthXml(xml);
    const rows = recordsToWearableRows('u', parsed.records);
    expect(rows[0]?.payload.weight_kg).toBeNull();
  });
});
