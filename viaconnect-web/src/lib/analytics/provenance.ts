/**
 * Brief 32 — Analytics provenance chips.
 *
 * Every printed Analytics number in the coaching blocks names its source
 * from this exact vocabulary, or becomes "--".
 *
 * Hume chips only when sourceName === "hume_body_pod". phone_health never
 * maps to Hume. native_health_bridge stays off; this module does not read
 * wearable_daily_vitals.
 */

export const ANALYTICS_PROVENANCE_CHIPS = [
  'from CAQ',
  'from profile',
  'from Hume Body Pod',
  'from Apple Health',
  'estimated',
] as const;

export type AnalyticsProvenanceChip = (typeof ANALYTICS_PROVENANCE_CHIPS)[number];

export const ANALYTICS_PROVENANCE_EMPTY = '--';

export interface EntrySourceFields {
  source?: string | null;
  device_name?: string | null;
  manual_source_id?: string | null;
}

export interface DatedSourcedPoint {
  value: number;
  date: string;
  sourceName: string | null;
}

export interface ProvenanceDisplay {
  text: string;
  chip: AnalyticsProvenanceChip | null;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function isAnalyticsProvenanceChip(
  value: string | null | undefined,
): value is AnalyticsProvenanceChip {
  if (value == null) return false;
  return (ANALYTICS_PROVENANCE_CHIPS as readonly string[]).includes(value);
}

/**
 * Map a raw sourceName to the exact chip vocabulary.
 * Hume requires exact sourceName === "hume_body_pod".
 * phone_health never becomes Hume (or any other chip).
 */
export function chipForSourceName(
  sourceName: string | null | undefined,
): AnalyticsProvenanceChip | null {
  if (typeof sourceName !== 'string') return null;
  const raw = sourceName.trim();
  if (raw.length === 0) return null;

  if (raw === 'hume_body_pod') return 'from Hume Body Pod';

  const key = raw.toLowerCase().replace(/\s+/g, '_');
  if (key === 'phone_health') return null;
  if (key === 'hume' || key === 'hume_health' || key === 'fittrack') return null;

  if (key === 'apple_health') return 'from Apple Health';
  if (key === 'caq' || key === 'caq_backfill' || key === 'clinical_assessments') {
    return 'from CAQ';
  }
  if (
    key === 'profile' ||
    key === 'manual' ||
    key === 'goals_tab' ||
    key === 'weight_card' ||
    key === 'user_logged'
  ) {
    return 'from profile';
  }
  if (key === 'estimated' || key === 'derived') return 'estimated';
  // Photo-scan estimates (FormaVision persist writes device_name + source 'scan').
  if (key === 'formavision' || key === 'scan') return 'estimated';

  return null;
}

export function chipForGoalOrigin(
  origin: string | null | undefined,
): AnalyticsProvenanceChip | null {
  return chipForSourceName(origin);
}

export function unwrapRelatedEntry(raw: unknown): EntrySourceFields | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === 'object') return first as EntrySourceFields;
    return null;
  }
  if (typeof raw === 'object') return raw as EntrySourceFields;
  return null;
}

export function entryToSourceName(
  entry: EntrySourceFields | null | undefined,
): string | null {
  if (!entry) return null;
  const device = typeof entry.device_name === 'string' ? entry.device_name.trim() : '';
  if (device === 'hume_body_pod') return 'hume_body_pod';
  if (device === 'apple_health' || device === 'Apple Health') return 'apple_health';

  const source = typeof entry.source === 'string' ? entry.source.trim() : '';
  if (source === 'caq' || source === 'caq_backfill') return source;
  if (source === 'manual') return 'manual';
  if (device.length > 0) return device;
  if (source.length > 0) return source;
  return null;
}

export function sourcedDisplay(
  valueText: string | null | undefined,
  chip: AnalyticsProvenanceChip | null,
): ProvenanceDisplay {
  if (!chip) return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  if (typeof valueText !== 'string' || valueText.trim().length === 0) {
    return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  }
  if (valueText.trim() === ANALYTICS_PROVENANCE_EMPTY) {
    return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  }
  return { text: valueText, chip };
}

/** Unsourced 0 (or any 0 without logs) is "--", never "0.0 L". */
export function hydrationVitalDisplay(input: {
  totalMl: number | null | undefined;
  logCount?: number | null;
  eventCount?: number | null;
}): ProvenanceDisplay {
  const total = finiteOrNull(input.totalMl);
  const logs = (input.logCount ?? 0) + (input.eventCount ?? 0);
  if (total === null || total <= 0 || logs <= 0) {
    return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  }
  return {
    text: `${(total / 1000).toFixed(1)} L`,
    chip: 'from profile',
  };
}

export function isDerivedLeanMass(
  leanLbs: number | null | undefined,
  weightLbs: number | null | undefined,
  bodyFatPct: number | null | undefined,
): boolean {
  const lean = finiteOrNull(leanLbs);
  const weight = finiteOrNull(weightLbs);
  const bf = finiteOrNull(bodyFatPct);
  if (lean === null || weight === null || bf === null) return false;
  if (weight <= 0 || bf < 0 || bf >= 100) return false;
  const derived = weight * (1 - bf / 100);
  return Math.abs(derived - lean) < 0.15;
}

function derivedLeanLbs(
  weightLbs: number | null | undefined,
  bodyFatPct: number | null | undefined,
): number | null {
  const weight = finiteOrNull(weightLbs);
  const bf = finiteOrNull(bodyFatPct);
  if (weight === null || bf === null) return null;
  if (weight <= 0 || bf < 0 || bf >= 100) return null;
  return weight * (1 - bf / 100);
}

export function leanMassDisplay(input: {
  measuredLbs: number | null | undefined;
  measuredSourceName: string | null | undefined;
  weightLbs: number | null | undefined;
  bodyFatPct: number | null | undefined;
}): ProvenanceDisplay {
  const measured = finiteOrNull(input.measuredLbs);
  if (measured !== null && isDerivedLeanMass(measured, input.weightLbs, input.bodyFatPct)) {
    return { text: `${measured.toFixed(1)} lb`, chip: 'estimated' };
  }
  const measuredChip = chipForSourceName(input.measuredSourceName);
  if (measured !== null && measuredChip) {
    return { text: `${measured.toFixed(1)} lb`, chip: measuredChip };
  }
  // Unsourced measured lean that is not the weight x (1 - bf) identity stays "--".
  if (measured !== null) {
    return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  }
  const derived = derivedLeanLbs(input.weightLbs, input.bodyFatPct);
  if (derived !== null) {
    return { text: `${derived.toFixed(1)} lb`, chip: 'estimated' };
  }
  return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
}

export function bodyFatDisplay(input: {
  bodyFatPct: number | null | undefined;
  sourceName: string | null | undefined;
}): ProvenanceDisplay {
  const bf = finiteOrNull(input.bodyFatPct);
  const chip = chipForSourceName(input.sourceName);
  if (bf === null || bf <= 0 || !chip) {
    return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  }
  return { text: `${bf.toFixed(1)} %`, chip };
}

export function vitalValueDisplay(input: {
  value: number | null | undefined;
  unit: string;
  sourceName: string | null | undefined;
  round?: boolean;
}): ProvenanceDisplay {
  const v = finiteOrNull(input.value);
  const chip = chipForSourceName(input.sourceName);
  if (v === null || v <= 0 || !chip) {
    return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  }
  const shown = input.round ? String(Math.round(v)) : v.toFixed(1);
  return { text: `${shown} ${input.unit}`, chip };
}

export function weightBoundDisplay(input: {
  kind: 'Start' | 'Now' | 'Target' | 'Baseline';
  pounds: number | null | undefined;
  sourceName: string | null | undefined;
  caqWeightLbs?: number | null;
}): ProvenanceDisplay {
  const lbs = finiteOrNull(input.pounds);
  if (lbs === null || lbs <= 0) {
    return { text: `${input.kind} --`, chip: null };
  }
  const direct = chipForSourceName(input.sourceName);
  if (direct) {
    return { text: `${input.kind} ${Math.round(lbs)} lb`, chip: direct };
  }
  const caq = finiteOrNull(input.caqWeightLbs);
  if (caq !== null && caq > 0 && Math.abs(caq - lbs) < 0.6) {
    return { text: `${input.kind} ${Math.round(lbs)} lb`, chip: 'from CAQ' };
  }
  return { text: `${input.kind} --`, chip: null };
}

export function goalProgressDisplay(input: {
  percent: number | null | undefined;
  startChip: AnalyticsProvenanceChip | null;
  nowChip: AnalyticsProvenanceChip | null;
  targetChip: AnalyticsProvenanceChip | null;
}): ProvenanceDisplay {
  const pct = finiteOrNull(input.percent);
  if (
    pct === null ||
    !input.startChip ||
    !input.nowChip ||
    !input.targetChip
  ) {
    return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  }
  return { text: `${Math.round(pct)}%`, chip: 'estimated' };
}

export function hannahLiftDisplay(
  estimatedImpact: number | null | undefined,
): ProvenanceDisplay {
  const n = finiteOrNull(estimatedImpact);
  if (n === null || n === 0) {
    return { text: ANALYTICS_PROVENANCE_EMPTY, chip: null };
  }
  const rounded = Math.round(n);
  const sign = rounded > 0 ? '+' : '';
  return { text: `${sign}${rounded} pts`, chip: 'estimated' };
}

/**
 * Trend / sparkline / delta only when two or more real dated points share
 * the same named source. Zero or missing values are not real points.
 */
export function sameSourceTrend(points: DatedSourcedPoint[]): {
  series: number[];
  delta: number | null;
  chip: AnalyticsProvenanceChip | null;
} {
  const empty = { series: [] as number[], delta: null, chip: null };
  if (!Array.isArray(points)) return empty;

  const real = points.filter((p) => {
    if (!p || typeof p.date !== 'string' || p.date.trim().length === 0) return false;
    if (finiteOrNull(p.value) === null || p.value <= 0) return false;
    return chipForSourceName(p.sourceName) !== null;
  });
  if (real.length < 2) {
    return {
      series: [],
      delta: null,
      chip: real[0] ? chipForSourceName(real[0].sourceName) : null,
    };
  }

  const chip0 = chipForSourceName(real[0].sourceName);
  if (!chip0) return empty;
  const same = real.filter((p) => chipForSourceName(p.sourceName) === chip0);
  if (same.length < 2) {
    return { series: [], delta: null, chip: chip0 };
  }

  const prev = same[same.length - 2].value;
  const last = same[same.length - 1].value;
  const delta = Math.round((last - prev) * 10) / 10;
  return { series: same.map((p) => p.value), delta, chip: chip0 };
}

export function redactUnsourcedHannahNumbers(
  text: string,
  sourcedValues: number[],
): string {
  if (typeof text !== 'string' || text.length === 0) return text;
  const sourced = sourcedValues.filter((n) => Number.isFinite(n));
  const isSourced = (n: number): boolean =>
    sourced.some((s) => Math.abs(s - n) < 0.051);

  return text
    .replace(/\b(baseline at )(\d{1,3}(?:\.\d+)?)\b/gi, (full, prefix: string, num: string) => {
      const n = Number(num);
      if (Number.isFinite(n) && isSourced(n)) return full;
      return `${prefix}${ANALYTICS_PROVENANCE_EMPTY}`;
    })
    .replace(/\+(\d+(?:\.\d+)?)\s*pts/gi, (full, num: string) => {
      const n = Number(num);
      if (Number.isFinite(n) && (isSourced(n) || n !== 0)) return full;
      return `+${ANALYTICS_PROVENANCE_EMPTY} pts`;
    });
}
