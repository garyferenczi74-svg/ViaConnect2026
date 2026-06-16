// Prompt 201: canonical body-composition metric taxonomy (app side).
//
// Sources normalize every reading to the canonical unit below before it reaches
// the ingestion funnel. The funnel and Arnold reconciliation (Deno edge
// function) keep their own copy of the projection mapping to body_tracker_weight;
// this app-side module carries only labels, units, and capability grouping for
// the UI and client validation.
//
// All comments use hyphens only. No em-dashes or en-dashes.

export type BodyMetricKey =
  | "weight"
  | "body_fat_pct"
  | "lean_mass"
  | "bmi"
  | "visceral_fat"
  | "body_water_pct"
  | "bone_mass"
  | "basal_metabolic_rate"
  | "skeletal_muscle_mass"
  | "protein_mass"
  | "mineral_mass"
  | "metabolic_age";

export type Confidence = "high" | "medium" | "low" | "unknown";

export type CanonicalUnit = "kg" | "pct" | "index" | "rating" | "kcal_per_day" | "years";

export interface MetricDef {
  key: BodyMetricKey;
  label: string;
  canonicalUnit: CanonicalUnit;
  unitLabel: string; // user-facing suffix
  isCore: boolean;   // true when the Apple Health bridge can deliver it
}

export const METRIC_DEFS: Record<BodyMetricKey, MetricDef> = {
  weight: { key: "weight", label: "Weight", canonicalUnit: "kg", unitLabel: "kg", isCore: true },
  body_fat_pct: { key: "body_fat_pct", label: "Body Fat", canonicalUnit: "pct", unitLabel: "%", isCore: true },
  lean_mass: { key: "lean_mass", label: "Lean Mass", canonicalUnit: "kg", unitLabel: "kg", isCore: true },
  bmi: { key: "bmi", label: "BMI", canonicalUnit: "index", unitLabel: "", isCore: true },
  visceral_fat: { key: "visceral_fat", label: "Visceral Fat", canonicalUnit: "rating", unitLabel: "", isCore: false },
  body_water_pct: { key: "body_water_pct", label: "Body Water", canonicalUnit: "pct", unitLabel: "%", isCore: false },
  bone_mass: { key: "bone_mass", label: "Bone Mass", canonicalUnit: "kg", unitLabel: "kg", isCore: false },
  basal_metabolic_rate: { key: "basal_metabolic_rate", label: "Basal Metabolic Rate", canonicalUnit: "kcal_per_day", unitLabel: "kcal/day", isCore: false },
  skeletal_muscle_mass: { key: "skeletal_muscle_mass", label: "Skeletal Muscle Mass", canonicalUnit: "kg", unitLabel: "kg", isCore: false },
  protein_mass: { key: "protein_mass", label: "Protein Mass", canonicalUnit: "kg", unitLabel: "kg", isCore: false },
  mineral_mass: { key: "mineral_mass", label: "Mineral Mass", canonicalUnit: "kg", unitLabel: "kg", isCore: false },
  metabolic_age: { key: "metabolic_age", label: "Metabolic Age", canonicalUnit: "years", unitLabel: "yrs", isCore: false },
};

export const ALL_METRIC_KEYS = Object.keys(METRIC_DEFS) as BodyMetricKey[];
export const CORE_METRIC_KEYS = ALL_METRIC_KEYS.filter((k) => METRIC_DEFS[k].isCore);
export const EXTENDED_METRIC_KEYS = ALL_METRIC_KEYS.filter((k) => !METRIC_DEFS[k].isCore);

export function isMetricKey(value: string): value is BodyMetricKey {
  return value in METRIC_DEFS;
}
