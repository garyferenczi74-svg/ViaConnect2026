// FarmCeutica Peptide Delivery Form System
// 4 independent delivery forms per oral peptide, 1 for Retatrutide
// 27 oral x 4 = 108 + 1 injectable-only = 109 total SKUs

export interface DeliveryFormConfig {
  form: "liposomal" | "micellar" | "injectable" | "nasal_spray";
  label: string;
  description: string;
  bioavailability: number;
  effectiveDoseFrom100mcg: number;
  onsetTimeline: string;
  durationPerDose: string;
  bestFor: string;
}

export const DELIVERY_FORMS: DeliveryFormConfig[] = [
  {
    form: "liposomal",
    label: "Liposomal",
    description: "Lipid bilayer encapsulation. Fat-soluble delivery vehicle wraps the peptide in a phospholipid membrane for GI protection and enhanced cellular uptake.",
    bioavailability: 0.90,
    effectiveDoseFrom100mcg: 90,
    onsetTimeline: "30-60 minutes",
    durationPerDose: "24 hours",
    bestFor: "GI-sensitive users, sustained release, fat-soluble peptide delivery",
  },
  {
    form: "micellar",
    label: "Micellar",
    description: "Surfactant micelle delivery. Water-soluble delivery vehicle uses micelle structures to solubilize peptides for rapid absorption. Different absorption kinetics than liposomal.",
    bioavailability: 0.85,
    effectiveDoseFrom100mcg: 85,
    onsetTimeline: "20-40 minutes",
    durationPerDose: "24 hours",
    bestFor: "Water-soluble peptide delivery, rapid oral absorption, convenience",
  },
  {
    form: "injectable",
    label: "Injectable (SQ)",
    description: "Subcutaneous injection. Direct systemic delivery bypassing GI tract entirely. Reconstitution from lyophilized vials with bacteriostatic water. Highest bioavailability.",
    bioavailability: 0.98,
    effectiveDoseFrom100mcg: 98,
    onsetTimeline: "15-30 minutes",
    durationPerDose: "24 hours",
    bestFor: "Maximum potency, clinical settings, practitioner-supervised",
  },
  {
    form: "nasal_spray",
    label: "Nasal Spray",
    description: "Intranasal delivery. Rapid onset (5-10 minutes). Bypasses first-pass hepatic metabolism via nasal mucosa absorption. Especially effective for neuro/cognitive peptides.",
    bioavailability: 0.75,
    effectiveDoseFrom100mcg: 75,
    onsetTimeline: "5-10 minutes",
    durationPerDose: "4-8 hours",
    bestFor: "Rapid onset (neuro/cognitive), needle-free, travel-friendly",
  },
];

export const DELIVERY_FORM_BY_KEY = Object.fromEntries(DELIVERY_FORMS.map((f) => [f.form, f]));

// Recommended delivery form per category
export const CATEGORY_PREFERRED_FORM: Record<string, string> = {
  "Longevity & Core Bioregulator": "injectable",
  "Adrenal/HPA Axis & Stress": "liposomal",
  "Mitochondrial/Energy": "liposomal",
  "Immune & Regenerative": "injectable",
  "Neuro/Cognitive & Mood": "nasal_spray",
  "Hormonal Balance & Endocrine": "liposomal",
  "Gut & Detox Support": "liposomal",
  "Metabolic / GLP-1 Class": "injectable",
};

// Symptom -> recommended form mapping for AI protocol engine
export const SYMPTOM_FORM_RECOMMENDATIONS: Record<string, { form: string; reason: string }> = {
  chronic_fatigue: { form: "liposomal", reason: "Fat-soluble mito membrane targeting" },
  brain_fog: { form: "nasal_spray", reason: "Fastest onset, olfactory BBB bypass" },
  acute_anxiety: { form: "nasal_spray", reason: "5-10 min onset for acute episodes" },
  chronic_stress: { form: "liposomal", reason: "Daily oral convenience" },
  joint_pain: { form: "injectable", reason: "Maximum tissue concentration" },
  digestive_issues: { form: "liposomal", reason: "GI-local action via oral delivery" },
  hormonal: { form: "liposomal", reason: "Sustained endocrine signaling" },
  weight_management: { form: "injectable", reason: "Subcutaneous only (Retatrutide)" },
};

// SKU count calculations
export const SKU_COUNTS = {
  oralPeptides: 27,
  formsPerOralPeptide: 4,
  injectableOnlyPeptides: 1, // Retatrutide
  totalSKUs: 27 * 4 + 1, // 109
  byCategory: {
    longevity: { products: 3, skus: 12 },
    adrenal: { products: 4, skus: 16 },
    mitochondrial: { products: 5, skus: 20 }, // includes SLU-PP-332
    immune: { products: 5, skus: 20 },
    neuro: { products: 4, skus: 16 },
    hormonal: { products: 4, skus: 16 },
    gut_detox: { products: 3, skus: 12 },
    metabolic: { products: 1, skus: 1 },
  },
};
