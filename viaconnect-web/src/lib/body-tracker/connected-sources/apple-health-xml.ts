// Apple Health export.xml parser. Extracts body metrics always, and
// optional HIPAA-gated sleep / activity / recovery records.
// Missing values stay null (UNKNOWN). Never invent 0.

import { matchesHume, HUME_DEVICE_ORIGIN } from './registry';

export const BODY_METRIC_TYPE_MAP: Record<string, { metricKey: string; unit: string; dimension: 'composition' | 'metabolic' }> = {
  HKQuantityTypeIdentifierBodyMass: { metricKey: 'weight', unit: 'kg', dimension: 'composition' },
  HKQuantityTypeIdentifierBodyFatPercentage: { metricKey: 'body_fat_pct', unit: 'pct', dimension: 'composition' },
  HKQuantityTypeIdentifierLeanBodyMass: { metricKey: 'lean_mass', unit: 'kg', dimension: 'composition' },
  HKQuantityTypeIdentifierBodyMassIndex: { metricKey: 'bmi', unit: 'index', dimension: 'metabolic' },
};

export const PHI_METRIC_TYPE_MAP: Record<string, { metricKey: string; unit: string; dimension: 'sleep' | 'activity' | 'recovery' }> = {
  HKCategoryTypeIdentifierSleepAnalysis: { metricKey: 'sleep', unit: 'min', dimension: 'sleep' },
  HKQuantityTypeIdentifierStepCount: { metricKey: 'steps', unit: 'count', dimension: 'activity' },
  HKQuantityTypeIdentifierActiveEnergyBurned: { metricKey: 'active_energy', unit: 'kcal', dimension: 'activity' },
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: { metricKey: 'hrv', unit: 'ms', dimension: 'recovery' },
  HKQuantityTypeIdentifierRestingHeartRate: { metricKey: 'resting_hr', unit: 'bpm', dimension: 'recovery' },
};

const LB_TO_KG = 0.45359237;

export interface ParsedHealthRecord {
  metricKey: string;
  dimension: 'composition' | 'metabolic' | 'sleep' | 'activity' | 'recovery';
  value: number | null;
  unit: string;
  measuredAt: string;
  endAt: string | null;
  externalId: string;
  sourceName: string;
  isHume: boolean;
  deviceOrigin: string | null;
  requiresPhiConsent: boolean;
}

export interface ParsedHealthExport {
  records: ParsedHealthRecord[];
  bodyRecords: ParsedHealthRecord[];
  phiRecords: ParsedHealthRecord[];
  humeRecords: ParsedHealthRecord[];
  recordsSeen: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

function normalizeValue(metricKey: string, rawValue: number, rawUnit: string): number | null {
  if (!Number.isFinite(rawValue)) return null;
  const unit = (rawUnit || '').trim().toLowerCase();
  if (metricKey === 'weight' || metricKey === 'lean_mass') {
    if (unit === 'lb' || unit === 'lbs') return rawValue * LB_TO_KG;
    if (unit === 'g') return rawValue / 1000;
    return rawValue;
  }
  if (metricKey === 'body_fat_pct') {
    return rawValue <= 1.5 ? rawValue * 100 : rawValue;
  }
  return rawValue;
}

function toIso(raw: string | undefined): string | null {
  if (!raw) return null;
  const compact = raw
    .trim()
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/, '$1T$2')
    .replace(/ ([+-]\d{2}):?(\d{2})$/, '$1$2');
  const d = new Date(compact);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function parseAppleHealthXml(xml: string, options?: { includePhi?: boolean }): ParsedHealthExport {
  const includePhi = options?.includePhi === true;
  const records: ParsedHealthRecord[] = [];
  let minDate: string | null = null;
  let maxDate: string | null = null;
  const tagRe = /<Record\b[^>]*>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(xml)) !== null) {
    const attrs = parseAttrs(match[0]);
    const bodyMap = BODY_METRIC_TYPE_MAP[attrs.type];
    const phiMap = PHI_METRIC_TYPE_MAP[attrs.type];
    const map = bodyMap ?? (includePhi ? phiMap : undefined);
    if (!map) continue;

    const rawValue = parseFloat(attrs.value);
    const value = Number.isFinite(rawValue) ? normalizeValue(map.metricKey, rawValue, attrs.unit ?? '') : null;
    const startDate = attrs.startDate || attrs.creationDate || attrs.endDate;
    const measuredAt = toIso(startDate);
    if (!measuredAt) continue;

    const endAt = toIso(attrs.endDate);
    const sourceName = attrs.sourceName || 'unknown';
    const isHume = matchesHume(sourceName);
    const requiresPhiConsent = Boolean(phiMap) && !bodyMap;

    if (!minDate || measuredAt < minDate) minDate = measuredAt;
    if (!maxDate || measuredAt > maxDate) maxDate = measuredAt;

    records.push({
      metricKey: map.metricKey,
      dimension: map.dimension,
      value,
      unit: map.unit,
      measuredAt,
      endAt,
      externalId: `${sourceName}|${startDate}|${attrs.type}|${attrs.value ?? ''}`,
      sourceName,
      isHume,
      deviceOrigin: isHume ? HUME_DEVICE_ORIGIN : null,
      requiresPhiConsent,
    });
  }

  return {
    records,
    bodyRecords: records.filter((r) => !r.requiresPhiConsent),
    phiRecords: records.filter((r) => r.requiresPhiConsent),
    humeRecords: records.filter((r) => r.isHume),
    recordsSeen: records.length,
    dateRangeStart: minDate,
    dateRangeEnd: maxDate,
  };
}

export function filterIngestibleRecords(
  parsed: ParsedHealthExport,
  phiConsent: boolean,
): ParsedHealthRecord[] {
  const base = phiConsent ? parsed.records : parsed.bodyRecords;
  // Hume-tagged sleep / activity / recovery in an Apple export must not
  // unlock Sleep or Hume last-sync. Body composition still attributes Hume.
  return base.filter((r) => !(r.isHume && r.requiresPhiConsent));
}

export function funnelSampleToParsed(
  sample: {
    metricKey: string;
    value: number | null;
    unit: string;
    measuredAt: string;
    externalId: string;
  },
  sourceName: string,
  isHume: boolean,
): ParsedHealthRecord {
  const dimension =
    sample.metricKey === 'bmi'
      ? 'metabolic'
      : sample.metricKey === 'sleep'
        ? 'sleep'
        : sample.metricKey === 'steps' || sample.metricKey === 'active_energy'
          ? 'activity'
          : sample.metricKey === 'hrv' || sample.metricKey === 'resting_hr'
            ? 'recovery'
            : 'composition';
  return {
    metricKey: sample.metricKey,
    dimension,
    value: sample.value,
    unit: sample.unit,
    measuredAt: sample.measuredAt,
    endAt: null,
    externalId: sample.externalId,
    sourceName,
    isHume,
    deviceOrigin: isHume ? HUME_DEVICE_ORIGIN : null,
    requiresPhiConsent: dimension === 'sleep' || dimension === 'activity' || dimension === 'recovery',
  };
}
