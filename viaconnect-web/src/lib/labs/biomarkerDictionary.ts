// Prompt 204c lab engine (2026-06-18): the canonical biomarker dictionary. It
// provides a canonical key, a display name, the panel group, a canonical unit,
// and alias matching for the common lab markers, so extracted rows normalize to
// a stable key and group by panel.
//
// CLINICAL DISCIPLINE: this dictionary categorizes markers (panel group, canonical
// unit, names). It does NOT assert reference ranges except where a sourced,
// Hannah-vetted range already exists (the five genetic-optimal markers, whose
// standard ranges live in lab-service.ts). For every other marker, status is
// determined against the report's PRINTED reference range, never an invented one.

export type PanelGroup =
  | 'Complete blood count'
  | 'Metabolic'
  | 'Lipids'
  | 'Inflammatory'
  | 'Hormones'
  | 'Vitamins and minerals'
  | 'Other';

export interface BiomarkerDictionaryEntry {
  key: string;
  displayName: string;
  panelGroup: PanelGroup;
  canonicalUnit: string;
  /** Lowercased substrings; the first entry whose alias the name contains wins. */
  aliases: string[];
}

// Ordered most-specific-first so "free t3" matches before a bare "t3", etc.
export const BIOMARKER_DICTIONARY: BiomarkerDictionaryEntry[] = [
  // Complete blood count
  { key: 'wbc', displayName: 'White blood cells', panelGroup: 'Complete blood count', canonicalUnit: 'K/uL', aliases: ['white blood cell', 'wbc', 'leukocyte'] },
  { key: 'rbc', displayName: 'Red blood cells', panelGroup: 'Complete blood count', canonicalUnit: 'M/uL', aliases: ['red blood cell', 'rbc', 'erythrocyte'] },
  { key: 'hemoglobin', displayName: 'Hemoglobin', panelGroup: 'Complete blood count', canonicalUnit: 'g/dL', aliases: ['hemoglobin', 'hgb', 'hb'] },
  { key: 'hematocrit', displayName: 'Hematocrit', panelGroup: 'Complete blood count', canonicalUnit: '%', aliases: ['hematocrit', 'hct'] },
  { key: 'platelets', displayName: 'Platelets', panelGroup: 'Complete blood count', canonicalUnit: 'K/uL', aliases: ['platelet', 'plt'] },
  { key: 'mcv', displayName: 'MCV', panelGroup: 'Complete blood count', canonicalUnit: 'fL', aliases: ['mcv', 'mean corpuscular volume'] },
  { key: 'neutrophils', displayName: 'Neutrophils', panelGroup: 'Complete blood count', canonicalUnit: '%', aliases: ['neutrophil'] },
  { key: 'lymphocytes', displayName: 'Lymphocytes', panelGroup: 'Complete blood count', canonicalUnit: '%', aliases: ['lymphocyte'] },

  // Metabolic
  { key: 'glucose', displayName: 'Glucose', panelGroup: 'Metabolic', canonicalUnit: 'mg/dL', aliases: ['glucose, fasting', 'fasting glucose', 'glucose'] },
  { key: 'hba1c', displayName: 'Hemoglobin A1c', panelGroup: 'Metabolic', canonicalUnit: '%', aliases: ['hba1c', 'a1c', 'hemoglobin a1c', 'glycohemoglobin'] },
  { key: 'insulin', displayName: 'Insulin', panelGroup: 'Metabolic', canonicalUnit: 'uIU/mL', aliases: ['insulin, fasting', 'fasting insulin', 'insulin'] },
  { key: 'bun', displayName: 'BUN', panelGroup: 'Metabolic', canonicalUnit: 'mg/dL', aliases: ['bun', 'urea nitrogen'] },
  { key: 'creatinine', displayName: 'Creatinine', panelGroup: 'Metabolic', canonicalUnit: 'mg/dL', aliases: ['creatinine'] },
  { key: 'egfr', displayName: 'eGFR', panelGroup: 'Metabolic', canonicalUnit: 'mL/min', aliases: ['egfr', 'gfr'] },
  { key: 'fructosamine', displayName: 'Fructosamine', panelGroup: 'Metabolic', canonicalUnit: 'umol/L', aliases: ['fructosamine'] },
  { key: 'uric_acid', displayName: 'Uric acid', panelGroup: 'Metabolic', canonicalUnit: 'mg/dL', aliases: ['uric acid', 'urate'] },
  { key: 'alp', displayName: 'ALP', panelGroup: 'Metabolic', canonicalUnit: 'U/L', aliases: ['alkaline phosphatase'] },
  { key: 'ggt', displayName: 'GGT', panelGroup: 'Metabolic', canonicalUnit: 'U/L', aliases: ['gamma glutamyl', 'gamma-glutamyl'] },
  { key: 'sodium', displayName: 'Sodium', panelGroup: 'Metabolic', canonicalUnit: 'mmol/L', aliases: ['sodium', 'na '] },
  { key: 'potassium', displayName: 'Potassium', panelGroup: 'Metabolic', canonicalUnit: 'mmol/L', aliases: ['potassium'] },
  { key: 'chloride', displayName: 'Chloride', panelGroup: 'Metabolic', canonicalUnit: 'mmol/L', aliases: ['chloride'] },
  { key: 'calcium', displayName: 'Calcium', panelGroup: 'Metabolic', canonicalUnit: 'mg/dL', aliases: ['calcium'] },
  { key: 'albumin', displayName: 'Albumin', panelGroup: 'Metabolic', canonicalUnit: 'g/dL', aliases: ['albumin'] },
  { key: 'alt', displayName: 'ALT', panelGroup: 'Metabolic', canonicalUnit: 'U/L', aliases: ['alt', 'sgpt', 'alanine'] },
  { key: 'ast', displayName: 'AST', panelGroup: 'Metabolic', canonicalUnit: 'U/L', aliases: ['ast', 'sgot', 'aspartate'] },

  // Lipids (specific markers before the broad "cholesterol" so "LDL Cholesterol"
  // matches ldl, not total cholesterol).
  { key: 'ldl', displayName: 'LDL cholesterol', panelGroup: 'Lipids', canonicalUnit: 'mg/dL', aliases: ['ldl'] },
  { key: 'hdl', displayName: 'HDL cholesterol', panelGroup: 'Lipids', canonicalUnit: 'mg/dL', aliases: ['hdl'] },
  { key: 'triglycerides', displayName: 'Triglycerides', panelGroup: 'Lipids', canonicalUnit: 'mg/dL', aliases: ['triglyceride'] },
  { key: 'apob', displayName: 'ApoB', panelGroup: 'Lipids', canonicalUnit: 'mg/dL', aliases: ['apob', 'apolipoprotein b'] },
  { key: 'lpa', displayName: 'Lp(a)', panelGroup: 'Lipids', canonicalUnit: 'nmol/L', aliases: ['lp(a)', 'lipoprotein (a)', 'lipoprotein a'] },
  { key: 'remnant_cholesterol', displayName: 'Remnant cholesterol', panelGroup: 'Lipids', canonicalUnit: 'mg/dL', aliases: ['remnant cholesterol', 'remnant chol'] },
  { key: 'total_cholesterol', displayName: 'Total cholesterol', panelGroup: 'Lipids', canonicalUnit: 'mg/dL', aliases: ['total cholesterol', 'cholesterol, total', 'cholesterol'] },

  // Inflammatory
  { key: 'hscrp', displayName: 'hs-CRP', panelGroup: 'Inflammatory', canonicalUnit: 'mg/L', aliases: ['hs-crp', 'hscrp', 'high sensitivity crp', 'c-reactive'] },
  { key: 'esr', displayName: 'ESR', panelGroup: 'Inflammatory', canonicalUnit: 'mm/hr', aliases: ['esr', 'sed rate', 'sedimentation'] },
  { key: 'homocysteine', displayName: 'Homocysteine', panelGroup: 'Inflammatory', canonicalUnit: 'umol/L', aliases: ['homocyst'] },

  // Hormones
  { key: 'tsh', displayName: 'TSH', panelGroup: 'Hormones', canonicalUnit: 'uIU/mL', aliases: ['tsh', 'thyroid stimulating'] },
  { key: 'free_t3', displayName: 'Free T3', panelGroup: 'Hormones', canonicalUnit: 'pg/mL', aliases: ['free t3', 'ft3'] },
  { key: 'free_t4', displayName: 'Free T4', panelGroup: 'Hormones', canonicalUnit: 'ng/dL', aliases: ['free t4', 'ft4'] },
  { key: 'free_testosterone', displayName: 'Free testosterone', panelGroup: 'Hormones', canonicalUnit: 'pg/mL', aliases: ['free testosterone', 'free-t'] },
  { key: 'testosterone', displayName: 'Testosterone', panelGroup: 'Hormones', canonicalUnit: 'ng/dL', aliases: ['testosterone'] },
  { key: 'shbg', displayName: 'SHBG', panelGroup: 'Hormones', canonicalUnit: 'nmol/L', aliases: ['shbg', 'sex hormone binding'] },
  { key: 'estradiol', displayName: 'Estradiol', panelGroup: 'Hormones', canonicalUnit: 'pg/mL', aliases: ['estradiol', 'e2'] },
  { key: 'progesterone', displayName: 'Progesterone', panelGroup: 'Hormones', canonicalUnit: 'ng/mL', aliases: ['progesterone'] },
  { key: 'cortisol', displayName: 'Cortisol', panelGroup: 'Hormones', canonicalUnit: 'ug/dL', aliases: ['cortisol'] },
  { key: 'dhea_s', displayName: 'DHEA-S', panelGroup: 'Hormones', canonicalUnit: 'ug/dL', aliases: ['dhea-s', 'dhea sulfate', 'dhea'] },

  // Vitamins and minerals
  { key: 'vitamin_d', displayName: 'Vitamin D, 25-OH', panelGroup: 'Vitamins and minerals', canonicalUnit: 'ng/mL', aliases: ['vitamin d', '25-oh', '25 oh', 'hydroxyvitamin', 'calcidiol'] },
  { key: 'vitamin_b12', displayName: 'Vitamin B12', panelGroup: 'Vitamins and minerals', canonicalUnit: 'pg/mL', aliases: ['b12', 'cobalamin'] },
  { key: 'folate', displayName: 'Folate', panelGroup: 'Vitamins and minerals', canonicalUnit: 'ng/mL', aliases: ['folate', 'folic'] },
  { key: 'ferritin', displayName: 'Ferritin', panelGroup: 'Vitamins and minerals', canonicalUnit: 'ng/mL', aliases: ['ferritin'] },
  { key: 'iron', displayName: 'Iron', panelGroup: 'Vitamins and minerals', canonicalUnit: 'ug/dL', aliases: ['iron, total', 'serum iron', 'iron'] },
  { key: 'magnesium', displayName: 'Magnesium', panelGroup: 'Vitamins and minerals', canonicalUnit: 'mg/dL', aliases: ['magnesium', 'rbc magnesium'] },
  { key: 'zinc', displayName: 'Zinc', panelGroup: 'Vitamins and minerals', canonicalUnit: 'ug/dL', aliases: ['zinc'] },
];

/** Match a raw lab marker name to a dictionary entry via alias substring. */
export function matchBiomarker(name: string): BiomarkerDictionaryEntry | null {
  const n = (name ?? '').toLowerCase();
  if (!n.trim()) return null;
  for (const entry of BIOMARKER_DICTIONARY) {
    if (entry.aliases.some((a) => n.includes(a))) return entry;
  }
  return null;
}

/** Panel group for a raw marker name, or 'Other' when unmatched. */
export function panelGroupFor(name: string): PanelGroup {
  return matchBiomarker(name)?.panelGroup ?? 'Other';
}

/** Stable canonical key for a raw marker name, or a slug fallback. */
export function biomarkerKeyFor(name: string): string {
  const matched = matchBiomarker(name);
  if (matched) return matched.key;
  return (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
