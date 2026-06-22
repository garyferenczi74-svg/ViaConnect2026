// Prompt 208a Module E (E2): lab unit normalization + age/sex range harmonization.
//
// normalizeUnit is pure conversion math using standard published factors (not
// clinical judgment). ageSexRange reads an INJECTED reference table that ships
// empty until clinically seeded (flag-off, mirroring Module A's reference
// pattern); it never fabricates a reference range. Pure, deterministic, never
// throws. No em/en-dashes, no emojis.

import { biomarkerKeyFor } from './biomarkerDictionary';

export interface NormalizedValue {
  value: number;
  unit: string;
  converted: boolean;
}

// Standard unit conversions to the biomarker's canonical unit. Each factor is a
// published constant (canonicalValue = rawValue * factor). Keyed by canonical
// biomarker key, then by the lowercased source unit.
const CONVERSIONS: Record<string, { canonicalUnit: string; from: Record<string, number> }> = {
  glucose: { canonicalUnit: 'mg/dL', from: { 'mmol/l': 18.0182 } },
  ldl: { canonicalUnit: 'mg/dL', from: { 'mmol/l': 38.67 } },
  hdl: { canonicalUnit: 'mg/dL', from: { 'mmol/l': 38.67 } },
  total_cholesterol: { canonicalUnit: 'mg/dL', from: { 'mmol/l': 38.67 } },
  triglycerides: { canonicalUnit: 'mg/dL', from: { 'mmol/l': 88.57 } },
  creatinine: { canonicalUnit: 'mg/dL', from: { 'umol/l': 1 / 88.42, 'µmol/l': 1 / 88.42 } },
  homocysteine: { canonicalUnit: 'umol/L', from: {} }, // already canonical in umol/L
};

function normUnitStr(unit: string | null): string {
  return (unit ?? '').trim().toLowerCase();
}

/**
 * Normalize a biomarker value to its canonical unit when a standard conversion
 * is known. If the unit already matches the canonical unit, or no conversion is
 * known, the value is returned unchanged with converted=false.
 */
export function normalizeUnit(
  biomarkerName: string,
  value: number,
  unit: string | null,
): NormalizedValue {
  const key = biomarkerKeyFor(biomarkerName);
  const spec = CONVERSIONS[key];
  const u = normUnitStr(unit);
  if (!spec) return { value, unit: unit ?? '', converted: false };
  if (u === spec.canonicalUnit.toLowerCase()) {
    return { value, unit: spec.canonicalUnit, converted: false };
  }
  const factor = spec.from[u];
  if (typeof factor === 'number' && Number.isFinite(value)) {
    return { value: value * factor, unit: spec.canonicalUnit, converted: true };
  }
  // Unknown source unit: do not guess. Return as-is.
  return { value, unit: unit ?? '', converted: false };
}

export interface RefRange {
  low: number;
  high: number;
}

// Age/sex reference range table. INTENTIONALLY EMPTY: clinical reference ranges
// are clinician-authored content (the human clinical gate seeds this), never
// fabricated here. ageSexRange returns null until an entry exists, exactly like
// Module A's flag-off strand reference.
export type AgeSexRangeTable = Record<
  string,
  { sex?: 'male' | 'female' | 'any'; minAge?: number; maxAge?: number; range: RefRange }[]
>;

export const AGE_SEX_RANGES: AgeSexRangeTable = {};

/**
 * Resolve an age/sex-adjusted reference range for a biomarker from an injected
 * table (defaults to the empty clinical-seed table). Returns null when no entry
 * matches. Never fabricates a range.
 */
export function ageSexRange(
  biomarkerName: string,
  age: number | null,
  sex: 'male' | 'female' | null,
  table: AgeSexRangeTable = AGE_SEX_RANGES,
): RefRange | null {
  const key = biomarkerKeyFor(biomarkerName);
  const entries = table[key];
  if (!entries || entries.length === 0) return null;
  for (const e of entries) {
    if (e.sex && e.sex !== 'any' && sex && e.sex !== sex) continue;
    if (typeof e.minAge === 'number' && (age === null || age < e.minAge)) continue;
    if (typeof e.maxAge === 'number' && (age === null || age > e.maxAge)) continue;
    return e.range;
  }
  return null;
}
