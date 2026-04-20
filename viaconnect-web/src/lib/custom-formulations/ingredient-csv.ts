// Prompt #97 Phase 2.4: pure ingredient CSV parser.
//
// Parses a CSV export of the ViaCura internal formulation database into
// ingredient_library row candidates. Validates required fields + enum
// values. Returns { valid, invalid } so the admin UI can surface which
// rows failed and why. Imported rows land as is_available_for_custom_formulation = false
// so an admin must explicitly enable each after review.

import {
  type DoseUnit,
  type IngredientCategory,
  type PregnancyCategory,
  type RegulatoryStatus,
} from '@/types/custom-formulations';

const CATEGORIES: IngredientCategory[] = [
  'vitamin', 'mineral', 'amino_acid', 'botanical_herb', 'enzyme',
  'probiotic_strain', 'fatty_acid', 'phytochemical', 'nutraceutical',
  'antioxidant', 'mushroom_extract', 'fiber', 'excipient_filler', 'other',
];

const REG_STATUSES: RegulatoryStatus[] = [
  'pre_1994_dietary_ingredient', 'gras_affirmed', 'ndi_notified_accepted',
  'ndi_required_not_filed', 'prohibited', 'under_review',
];

const DOSE_UNITS: DoseUnit[] = ['mg', 'mcg', 'iu', 'g', 'cfu_billions', 'mg_per_kg'];

const PREGNANCY_CATEGORIES: PregnancyCategory[] = [
  'safe', 'caution', 'contraindicated', 'insufficient_data',
];

/** Q1 launch restricts imports to pre_1994 and gras_affirmed. Any other
 *  regulatory_status is parked with validation error; admin must manually
 *  resolve before that row can be enabled. */
const Q1_ALLOWED_REG_STATUSES: RegulatoryStatus[] = [
  'pre_1994_dietary_ingredient',
  'gras_affirmed',
];

export interface IngredientCsvCandidate {
  id: string;
  common_name: string;
  scientific_name?: string;
  category: IngredientCategory;
  regulatory_status: RegulatoryStatus;
  dose_unit: DoseUnit;
  typical_dose_mg?: number;
  minimum_effective_dose_mg?: number;
  tolerable_upper_limit_adult_mg?: number;
  tolerable_upper_limit_pediatric_mg?: number;
  pregnancy_category?: PregnancyCategory;
  fda_warning_letter_issued: boolean;
  fda_safety_concern_listed: boolean;
  structure_function_claim_allowed: boolean;
  is_available_for_custom_formulation: boolean;
}

export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
}

export interface CsvParseResult {
  valid: IngredientCsvCandidate[];
  invalid: Array<{ rowIndex: number; raw: Record<string, string>; errors: ValidationError[] }>;
}

/** Pure: parse a CSV string into ingredient candidates. The caller handles
 *  writing to the database. */
export function parseIngredientCsv(csv: string): CsvParseResult {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { valid: [], invalid: [] };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const valid: IngredientCsvCandidate[] = [];
  const invalid: CsvParseResult['invalid'] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const raw: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      raw[header[j]] = (cells[j] ?? '').trim();
    }
    const errors: ValidationError[] = [];

    const required: Array<keyof IngredientCsvCandidate> = [
      'id', 'common_name', 'category', 'regulatory_status', 'dose_unit',
    ];
    for (const field of required) {
      if (!raw[field as string]) {
        errors.push({ rowIndex: i, field: field as string, message: 'Required' });
      }
    }

    if (raw.category && !CATEGORIES.includes(raw.category as IngredientCategory)) {
      errors.push({
        rowIndex: i,
        field: 'category',
        message: `Invalid category; allowed: ${CATEGORIES.join(', ')}`,
      });
    }
    if (raw.regulatory_status && !REG_STATUSES.includes(raw.regulatory_status as RegulatoryStatus)) {
      errors.push({
        rowIndex: i,
        field: 'regulatory_status',
        message: `Invalid regulatory_status`,
      });
    } else if (raw.regulatory_status && !Q1_ALLOWED_REG_STATUSES.includes(raw.regulatory_status as RegulatoryStatus)) {
      errors.push({
        rowIndex: i,
        field: 'regulatory_status',
        message: `Q1 launch admits only pre_1994_dietary_ingredient and gras_affirmed; manual admin resolution required for ${raw.regulatory_status}`,
      });
    }
    if (raw.dose_unit && !DOSE_UNITS.includes(raw.dose_unit as DoseUnit)) {
      errors.push({
        rowIndex: i,
        field: 'dose_unit',
        message: `Invalid dose_unit; allowed: ${DOSE_UNITS.join(', ')}`,
      });
    }
    if (
      raw.pregnancy_category &&
      !PREGNANCY_CATEGORIES.includes(raw.pregnancy_category as PregnancyCategory)
    ) {
      errors.push({
        rowIndex: i,
        field: 'pregnancy_category',
        message: `Invalid pregnancy_category`,
      });
    }

    for (const numField of [
      'typical_dose_mg', 'minimum_effective_dose_mg',
      'tolerable_upper_limit_adult_mg', 'tolerable_upper_limit_pediatric_mg',
    ] as const) {
      if (raw[numField] && Number.isNaN(Number(raw[numField]))) {
        errors.push({ rowIndex: i, field: numField, message: 'Not a number' });
      }
    }

    if (errors.length > 0) {
      invalid.push({ rowIndex: i, raw, errors });
      continue;
    }

    valid.push({
      id: raw.id,
      common_name: raw.common_name,
      scientific_name: raw.scientific_name || undefined,
      category: raw.category as IngredientCategory,
      regulatory_status: raw.regulatory_status as RegulatoryStatus,
      dose_unit: raw.dose_unit as DoseUnit,
      typical_dose_mg: raw.typical_dose_mg ? Number(raw.typical_dose_mg) : undefined,
      minimum_effective_dose_mg: raw.minimum_effective_dose_mg
        ? Number(raw.minimum_effective_dose_mg)
        : undefined,
      tolerable_upper_limit_adult_mg: raw.tolerable_upper_limit_adult_mg
        ? Number(raw.tolerable_upper_limit_adult_mg)
        : undefined,
      tolerable_upper_limit_pediatric_mg: raw.tolerable_upper_limit_pediatric_mg
        ? Number(raw.tolerable_upper_limit_pediatric_mg)
        : undefined,
      pregnancy_category: raw.pregnancy_category
        ? (raw.pregnancy_category as PregnancyCategory)
        : undefined,
      fda_warning_letter_issued: parseBool(raw.fda_warning_letter_issued),
      fda_safety_concern_listed: parseBool(raw.fda_safety_concern_listed),
      structure_function_claim_allowed: parseBool(raw.structure_function_claim_allowed),
      // Deliberately forced to false. Admin must explicitly enable each
      // imported row after manual review — not just by virtue of import.
      is_available_for_custom_formulation: false,
    });
  }

  return { valid, invalid };
}

/** Tiny CSV line splitter: handles double-quoted fields and embedded commas.
 *  Not a full parser (no multi-line quoted cells) — intentional for Q1 scope.
 *  The admin import UI rejects the entire file if it contains newlines
 *  inside quoted fields; ViaCura's internal export format does not use them. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 't';
}
