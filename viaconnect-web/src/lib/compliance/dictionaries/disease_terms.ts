/**
 * Marshall dictionary: disease terms that trigger a DISEASE_CLAIM when paired
 * with forbidden verbs (cures, treats, prevents, heals, reverses, etc.).
 *
 * This is a seed list, not exhaustive. Steve Rica extends via the Supabase
 * mirror (compliance_rules.threshold_config) as clinical categories expand.
 */

export const DISEASE_VERBS = [
  "cure",
  "cures",
  "cured",
  "curing",
  "treat",
  "treats",
  "treated",
  "treating",
  "prevent",
  "prevents",
  "prevented",
  "preventing",
  "heal",
  "heals",
  "healed",
  "healing",
  "reverse",
  "reverses",
  "reversed",
  "reversing",
  "eliminate",
  "eliminates",
  "eradicate",
  "eradicates",
] as const;

export const DISEASE_TERMS = [
  // Metabolic
  "diabetes",
  "type 1 diabetes",
  "type 2 diabetes",
  "pre-diabetes",
  "prediabetes",
  "insulin resistance",
  "metabolic syndrome",
  "obesity",
  "morbid obesity",
  "hypothyroidism",
  "hyperthyroidism",
  "thyroid disease",
  "hashimotos",
  "graves disease",

  // Cardiovascular
  "hypertension",
  "high blood pressure",
  "coronary artery disease",
  "heart disease",
  "heart failure",
  "atrial fibrillation",
  "stroke",
  "atherosclerosis",

  // Oncology
  "cancer",
  "breast cancer",
  "prostate cancer",
  "lung cancer",
  "colon cancer",
  "colorectal cancer",
  "melanoma",
  "leukemia",
  "lymphoma",
  "tumor",
  "tumour",
  "malignancy",
  "carcinoma",
  "sarcoma",

  // Autoimmune
  "rheumatoid arthritis",
  "psoriasis",
  "psoriatic arthritis",
  "crohns",
  "crohn's",
  "ulcerative colitis",
  "ibd",
  "lupus",
  "multiple sclerosis",
  "celiac",
  "coeliac",

  // Neurological
  "alzheimer",
  "alzheimers",
  "dementia",
  "parkinson",
  "parkinsons",
  "epilepsy",
  "migraine",
  "migraines",

  // Mental health
  "depression",
  "major depressive disorder",
  "bipolar",
  "bipolar disorder",
  "schizophrenia",
  "ptsd",
  "post-traumatic stress disorder",
  "anxiety disorder",
  "panic disorder",
  "adhd",
  "attention deficit",
  "ocd",
  "obsessive compulsive disorder",

  // Gastroenterology
  "ibs",
  "irritable bowel",
  "leaky gut",
  "gerd",
  "acid reflux",
  "ulcer",

  // Respiratory
  "asthma",
  "copd",
  "chronic obstructive pulmonary",
  "emphysema",

  // Infectious
  "hiv",
  "aids",
  "hepatitis",
  "tuberculosis",
  "covid",
  "covid-19",
  "coronavirus",

  // Renal / hepatic
  "kidney disease",
  "chronic kidney disease",
  "liver disease",
  "cirrhosis",
  "fatty liver",
  "nafld",

  // Reproductive / endocrine
  "pcos",
  "polycystic ovarian",
  "endometriosis",
  "infertility",
  "hypogonadism",
  "low testosterone",
  "erectile dysfunction",

  // Musculoskeletal
  "osteoporosis",
  "osteoarthritis",
  "fibromyalgia",
] as const;

/**
 * A pre-compiled verb/term regex that matches any disease verb within ~30
 * characters of any disease noun. Kept exported so the rule evaluator can
 * reuse the same compiled regex per evaluation pass.
 */
export function buildDiseaseClaimRegex(): RegExp {
  const verbs = DISEASE_VERBS.join("|");
  const terms = DISEASE_TERMS.map((t) => t.replace(/\s+/g, "\\s+")).join("|");
  return new RegExp(
    `\\b(?:${verbs})\\b[\\s\\S]{0,60}?\\b(?:${terms})\\b|\\b(?:${terms})\\b[\\s\\S]{0,60}?\\b(?:${verbs})\\b`,
    "gi",
  );
}
