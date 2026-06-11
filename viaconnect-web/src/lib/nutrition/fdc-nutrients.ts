// Prompt 186 Phase 2: the canonical FDC nutrient map. The ONE source of truth
// for extracting nutrients from USDA FoodData Central payloads. Every
// extraction path (NutriVision photo, voice, analyze-text, manual entry
// assist, resolver cascade) must import this module; no other file may map
// FDC nutrient ids or names.
//
// Selection contract (Prompt 186 Section 2 and 3):
//   1. Select by nutrient ID with a required unitName, never by name alone.
//   2. Energy is id 1008 (kcal). Foundation foods omit 1008 and publish
//      Atwater energies instead (2047 general, 2048 specific, both kcal),
//      so those are ordered fallbacks. If only the kJ row (1062) exists,
//      derive kcal by dividing by 4.184 and tag the value as derived.
//   3. Total fat is id 1004 alone. Sub-fractions (1258 saturated, 1292 mono,
//      1293 poly, 1257 trans) are components, never additive to the total.
//   4. Total sugars is id 2000; Foundation publishes 1063 (same meaning).
//   5. A nutrient that cannot be extracted is UNKNOWN (null), never 0.
//   6. An energy row selected with a non kcal unit and no conversion is a
//      contract violation: log a structured error and treat as unknown
//      (fail open, never throw).
//
// Payload shapes handled:
//   detail (/food/{id}):       { nutrient: { id, name, unitName }, amount }
//   search (/foods/search):    { nutrientId, nutrientName, unitName, value }
//   Branded labelNutrients:    handled by extractFromLabelNutrients (per
//                              serving basis; the caller must scale by
//                              serving count, never mix with per-100g rows).

import { safeLog } from '@/lib/utils/safe-log';

export const KJ_PER_KCAL = 4.184;

export const FDC_IDS = {
  ENERGY_KCAL: 1008,
  ENERGY_ATWATER_GENERAL: 2047,
  ENERGY_ATWATER_SPECIFIC: 2048,
  ENERGY_KJ: 1062,
  PROTEIN_G: 1003,
  TOTAL_FAT_G: 1004,
  CARBS_BY_DIFFERENCE_G: 1005,
  CARBS_BY_SUMMATION_G: 1050,
  TOTAL_SUGARS_G: 2000,
  TOTAL_SUGARS_FOUNDATION_G: 1063,
  FIBER_G: 1079,
  SODIUM_MG: 1093,
  SATURATED_FAT_G: 1258,
  TRANS_FAT_G: 1257,
  CHOLESTEROL_MG: 1253,
  OMEGA3_ALA_G: 1404,
  OMEGA3_EPA_G: 1278,
  OMEGA3_DHA_G: 1272,
  OMEGA3_DPA_G: 1280,
} as const;

export type CanonicalNutrientKey =
  | 'calories'
  | 'protein_g'
  | 'carbs_g'
  | 'total_fat_g'
  | 'saturated_fat_g'
  | 'trans_fat_g'
  | 'omega3_g'
  | 'sugar_g'
  | 'fiber_g'
  | 'sodium_mg'
  | 'cholesterol_mg';

interface Selector {
  id: number;
  unit: string;
}

interface Spec {
  selectors: Selector[];
  // Derivation fallback used only when no selector matched. The value is
  // divided by divisor and the key is reported in `derived`.
  derive?: { id: number; unit: string; divisor: number };
  // Sum semantics: total is the sum of every PRESENT selector (omega 3
  // fractions); null only when none are present.
  sumAllPresent?: boolean;
}

// Priority order inside selectors matters: first present row wins.
export const CANONICAL_NUTRIENT_MAP: Record<CanonicalNutrientKey, Spec> = {
  calories: {
    selectors: [
      { id: FDC_IDS.ENERGY_KCAL, unit: 'kcal' },
      { id: FDC_IDS.ENERGY_ATWATER_GENERAL, unit: 'kcal' },
      { id: FDC_IDS.ENERGY_ATWATER_SPECIFIC, unit: 'kcal' },
    ],
    derive: { id: FDC_IDS.ENERGY_KJ, unit: 'kj', divisor: KJ_PER_KCAL },
  },
  protein_g: { selectors: [{ id: FDC_IDS.PROTEIN_G, unit: 'g' }] },
  carbs_g: {
    selectors: [
      { id: FDC_IDS.CARBS_BY_DIFFERENCE_G, unit: 'g' },
      { id: FDC_IDS.CARBS_BY_SUMMATION_G, unit: 'g' },
    ],
  },
  total_fat_g: { selectors: [{ id: FDC_IDS.TOTAL_FAT_G, unit: 'g' }] },
  saturated_fat_g: { selectors: [{ id: FDC_IDS.SATURATED_FAT_G, unit: 'g' }] },
  trans_fat_g: { selectors: [{ id: FDC_IDS.TRANS_FAT_G, unit: 'g' }] },
  omega3_g: {
    selectors: [
      { id: FDC_IDS.OMEGA3_ALA_G, unit: 'g' },
      { id: FDC_IDS.OMEGA3_EPA_G, unit: 'g' },
      { id: FDC_IDS.OMEGA3_DHA_G, unit: 'g' },
      { id: FDC_IDS.OMEGA3_DPA_G, unit: 'g' },
    ],
    sumAllPresent: true,
  },
  sugar_g: {
    selectors: [
      { id: FDC_IDS.TOTAL_SUGARS_G, unit: 'g' },
      { id: FDC_IDS.TOTAL_SUGARS_FOUNDATION_G, unit: 'g' },
    ],
  },
  fiber_g: { selectors: [{ id: FDC_IDS.FIBER_G, unit: 'g' }] },
  sodium_mg: { selectors: [{ id: FDC_IDS.SODIUM_MG, unit: 'mg' }] },
  cholesterol_mg: { selectors: [{ id: FDC_IDS.CHOLESTEROL_MG, unit: 'mg' }] },
};

export type CanonicalNutrients = Record<CanonicalNutrientKey, number | null>;

export interface UsedNutrientRow {
  key: CanonicalNutrientKey;
  id: number;
  name?: string;
  unit?: string;
  value: number;
}

export interface ExtractionResult {
  values: CanonicalNutrients;
  // Keys whose value came from a derivation (kJ divided by 4.184).
  derived: CanonicalNutrientKey[];
  // Keys with no extractable value: UNKNOWN, surfaced as null, never 0.
  missing: CanonicalNutrientKey[];
  // The raw rows the extraction used, for the permanent structured log.
  rowsUsed: UsedNutrientRow[];
}

interface NormalizedRow {
  id: number;
  name?: string;
  unit?: string;
  value: number;
}

interface DetailShapeNutrient {
  nutrient?: { id?: number; name?: string; unitName?: string };
  amount?: number;
}

interface FlatShapeNutrient {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
}

export interface FdcNutrientPayload {
  foodNutrients?: Array<DetailShapeNutrient | FlatShapeNutrient | unknown>;
}

const LOG_SCOPE = 'nutrition.fdc-nutrients';

function normalizeRows(payload: FdcNutrientPayload): NormalizedRow[] {
  const rows: NormalizedRow[] = [];
  for (const raw of payload.foodNutrients ?? []) {
    if (raw === null || typeof raw !== 'object') continue;
    const detail = raw as DetailShapeNutrient;
    if (detail.nutrient && typeof detail.nutrient.id === 'number' && typeof detail.amount === 'number') {
      rows.push({
        id: detail.nutrient.id,
        name: detail.nutrient.name,
        unit: detail.nutrient.unitName?.toLowerCase(),
        value: detail.amount,
      });
      continue;
    }
    const flat = raw as FlatShapeNutrient;
    if (typeof flat.nutrientId === 'number' && typeof flat.value === 'number') {
      rows.push({
        id: flat.nutrientId,
        name: flat.nutrientName,
        unit: flat.unitName?.toLowerCase(),
        value: flat.value,
      });
    }
  }
  return rows;
}

// Unit check: ID is the primary key; unitName is the assertion layer. A row
// with no unitName (older payloads, recorded fixtures) passes on ID alone.
// A row whose unitName mismatches the contract is skipped, and for energy
// that is the hard assertion of Phase 3: structured error, fail open.
function unitMatches(row: NormalizedRow, expected: string): boolean {
  if (row.unit === undefined) return true;
  return row.unit === expected;
}

export function extractCanonicalNutrients(payload: FdcNutrientPayload): ExtractionResult {
  const rows = normalizeRows(payload);
  const byId = new Map<number, NormalizedRow>();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }

  const values = {} as CanonicalNutrients;
  const derived: CanonicalNutrientKey[] = [];
  const missing: CanonicalNutrientKey[] = [];
  const rowsUsed: UsedNutrientRow[] = [];

  for (const key of Object.keys(CANONICAL_NUTRIENT_MAP) as CanonicalNutrientKey[]) {
    const spec = CANONICAL_NUTRIENT_MAP[key];
    let value: number | null = null;

    if (spec.sumAllPresent) {
      let sum = 0;
      let seen = false;
      for (const sel of spec.selectors) {
        const row = byId.get(sel.id);
        if (row && unitMatches(row, sel.unit)) {
          sum += row.value;
          seen = true;
          rowsUsed.push({ key, id: row.id, name: row.name, unit: row.unit, value: row.value });
        }
      }
      value = seen ? sum : null;
    } else {
      for (const sel of spec.selectors) {
        const row = byId.get(sel.id);
        if (!row) continue;
        if (!unitMatches(row, sel.unit)) {
          if (key === 'calories') {
            safeLog.error(LOG_SCOPE, 'energy unit assertion failed: row skipped', {
              nutrient_id: row.id,
              unit_name: row.unit,
              expected_unit: sel.unit,
              value: row.value,
            });
          }
          continue;
        }
        value = row.value;
        rowsUsed.push({ key, id: row.id, name: row.name, unit: row.unit, value: row.value });
        break;
      }
      if (value === null && spec.derive) {
        const row = byId.get(spec.derive.id);
        if (row && unitMatches(row, spec.derive.unit)) {
          value = row.value / spec.derive.divisor;
          derived.push(key);
          rowsUsed.push({ key, id: row.id, name: row.name, unit: row.unit, value: row.value });
        }
      }
    }

    values[key] = value;
    if (value === null) missing.push(key);
  }

  return { values, derived, missing, rowsUsed };
}

// Branded foods: labelNutrients is the per serving basis. The caller scales
// by serving count and must NOT also apply the per-100g foodNutrients rows
// for the same item (one basis per item, logged by the caller).
export interface LabelNutrientsShape {
  calories?: { value?: number };
  protein?: { value?: number };
  carbohydrates?: { value?: number };
  fat?: { value?: number };
  saturatedFat?: { value?: number };
  transFat?: { value?: number };
  sugars?: { value?: number };
  fiber?: { value?: number };
  sodium?: { value?: number };
  cholesterol?: { value?: number };
}

export function extractFromLabelNutrients(label: LabelNutrientsShape): {
  values: CanonicalNutrients;
  missing: CanonicalNutrientKey[];
} {
  const pick = (slot?: { value?: number }): number | null =>
    typeof slot?.value === 'number' && Number.isFinite(slot.value) ? slot.value : null;

  const values: CanonicalNutrients = {
    calories: pick(label.calories),
    protein_g: pick(label.protein),
    carbs_g: pick(label.carbohydrates),
    total_fat_g: pick(label.fat),
    saturated_fat_g: pick(label.saturatedFat),
    trans_fat_g: pick(label.transFat),
    omega3_g: null,
    sugar_g: pick(label.sugars),
    fiber_g: pick(label.fiber),
    sodium_mg: pick(label.sodium),
    cholesterol_mg: pick(label.cholesterol),
  };
  const missing = (Object.keys(values) as CanonicalNutrientKey[]).filter((k) => values[k] === null);
  return { values, missing };
}
