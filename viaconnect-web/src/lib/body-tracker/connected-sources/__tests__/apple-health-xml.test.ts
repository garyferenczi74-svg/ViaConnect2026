import { describe, it, expect } from 'vitest';
import { filterIngestibleRecords, parseAppleHealthXml } from '../apple-health-xml';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Hume Health" unit="lb" value="154.3" startDate="2026-08-20 07:00:00 -0400" endDate="2026-08-20 07:00:00 -0400"/>
  <Record type="HKQuantityTypeIdentifierBodyFatPercentage" sourceName="Hume Health" unit="%" value="0.184" startDate="2026-08-20 07:00:00 -0400"/>
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Apple Watch" unit="count" value="8123" startDate="2026-08-20 08:00:00 -0400"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Apple Watch" unit="ms" value="42" startDate="2026-08-20 06:00:00 -0400"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Oura" value="1" startDate="2026-08-19 22:15:00 -0400" endDate="2026-08-20 06:30:00 -0400"/>
</HealthData>`;

describe('Apple Health XML parse', () => {
  it('parses Hume-tagged composition without inventing zeros', () => {
    const parsed = parseAppleHealthXml(SAMPLE, { includePhi: false });
    expect(parsed.humeRecords.length).toBe(2);
    expect(parsed.humeRecords.every((r) => r.deviceOrigin === 'hume_body_pod')).toBe(true);
    const weight = parsed.bodyRecords.find((r) => r.metricKey === 'weight');
    expect(weight?.value).not.toBeNull();
    expect(weight?.value).toBeGreaterThan(60);
    expect(parsed.phiRecords).toEqual([]);
  });

  it('keeps sleep/activity/recovery out until PHI consent', () => {
    const noConsent = parseAppleHealthXml(SAMPLE, { includePhi: false });
    expect(noConsent.records.every((r) => r.dimension === 'composition' || r.dimension === 'metabolic')).toBe(true);
    const withConsent = parseAppleHealthXml(SAMPLE, { includePhi: true });
    expect(withConsent.records.some((r) => r.metricKey === 'steps')).toBe(true);
    expect(withConsent.records.some((r) => r.metricKey === 'hrv')).toBe(true);
    expect(withConsent.records.some((r) => r.metricKey === 'sleep')).toBe(true);
    expect(filterIngestibleRecords(withConsent, false).every((r) => !r.requiresPhiConsent)).toBe(true);
    expect(filterIngestibleRecords(withConsent, true).length).toBe(withConsent.records.length);
  });

  it('tags sourceName hume_body_pod as Hume Body Pod origin', () => {
    const xml = `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="hume_body_pod" unit="kg" value="71.2" startDate="2026-08-20 07:00:00 +0000"/>`;
    const parsed = parseAppleHealthXml(xml);
    expect(parsed.humeRecords).toHaveLength(1);
    expect(parsed.humeRecords[0]?.deviceOrigin).toBe('hume_body_pod');
    expect(parsed.humeRecords[0]?.isHume).toBe(true);
    expect(parsed.humeRecords[0]?.value).toBe(71.2);
  });

  it('does not ingest Hume-tagged sleep even with PHI consent', () => {
    const xml = `<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="hume_body_pod" value="1" startDate="2026-08-19 22:00:00 +0000" endDate="2026-08-20 06:00:00 +0000"/>`;
    const parsed = parseAppleHealthXml(xml, { includePhi: true });
    expect(parsed.humeRecords).toHaveLength(1);
    expect(parsed.humeRecords[0]?.dimension).toBe('sleep');
    expect(filterIngestibleRecords(parsed, true)).toEqual([]);
    expect(filterIngestibleRecords(parsed, false)).toEqual([]);
  });

  it('leaves missing numeric values as null, never 0', () => {
    const xml = `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Health" unit="kg" value="not-a-number" startDate="2026-08-20 07:00:00 +0000"/>`;
    const parsed = parseAppleHealthXml(xml);
    expect(parsed.records[0]?.value).toBeNull();
  });
});
