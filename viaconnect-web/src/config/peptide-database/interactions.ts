// Peptide Interaction Matrix — Layers 4-7
// Layer 4: Peptides x Medications | Layer 5: Peptides x Supplements
// Layer 6: Peptides x Peptides (stacking) | Layer 7: Peptides x Genetic Variants

export type InteractionSeverity = "major" | "moderate" | "synergistic";

export interface PeptideInteraction {
  peptideId: string;
  interactsWith: string;
  interactionType: string;
  severity: InteractionSeverity;
  description: string;
  action: string;
  deliveryFormSpecific?: string;
}

// ═══ MAJOR / BLOCK ═══
export const MAJOR_INTERACTIONS: PeptideInteraction[] = [
  {
    peptideId: "retatrutide",
    interactsWith: "Insulin",
    interactionType: "peptide_medication",
    severity: "major",
    description: "Retatrutide + insulin/sulfonylureas: significant hypoglycemia risk due to additive glucose-lowering effects",
    action: "BLOCK: Do not prescribe without endocrinologist co-management. Insulin dose reduction 20-50% typically required.",
  },
  {
    peptideId: "retatrutide",
    interactsWith: "Sulfonylureas",
    interactionType: "peptide_medication",
    severity: "major",
    description: "Triple agonist + sulfonylurea: compounded hypoglycemia risk",
    action: "BLOCK: Requires practitioner approval with glucose monitoring protocol.",
  },
  {
    peptideId: "immuneguard",
    interactsWith: "Immunosuppressants",
    interactionType: "peptide_medication",
    severity: "major",
    description: "Thymosin Alpha-1 immune activation contraindicated with immunosuppressive therapy (transplant, autoimmune)",
    action: "BLOCK: Contraindicated in transplant patients or those on cyclosporine, tacrolimus, mycophenolate.",
  },
  {
    peptideId: "tb500-oral",
    interactsWith: "Immunosuppressants",
    interactionType: "peptide_medication",
    severity: "major",
    description: "TB-500 immune trafficking effects contraindicated with immunosuppressive therapy",
    action: "BLOCK: Contraindicated in transplant patients.",
  },
  {
    peptideId: "vilon",
    interactsWith: "Immunosuppressants",
    interactionType: "peptide_medication",
    severity: "major",
    description: "Thymus bioregulator contraindicated with immunosuppressive therapy",
    action: "BLOCK: Contraindicated in transplant patients.",
  },
];

// ═══ MODERATE / FLAG ═══
export const MODERATE_INTERACTIONS: PeptideInteraction[] = [
  {
    peptideId: "moodlift",
    interactsWith: "Benzodiazepines",
    interactionType: "peptide_medication",
    severity: "moderate",
    description: "Selank-based MoodLift + benzodiazepines: additive sedation potential via overlapping GABA pathways",
    action: "FLAG: Monitor for excessive sedation. Consider reducing benzodiazepine dose with practitioner guidance.",
  },
  {
    peptideId: "moodlift",
    interactsWith: "SSRIs",
    interactionType: "peptide_medication",
    severity: "moderate",
    description: "MoodLift + SSRIs: serotonin pathway interaction, theoretical serotonergic overlap",
    action: "FLAG: Monitor mood changes. Low theoretical risk but warrants practitioner awareness.",
  },
  {
    peptideId: "thyroreg",
    interactsWith: "Levothyroxine",
    interactionType: "peptide_medication",
    severity: "moderate",
    description: "ThyroReg thyroid bioregulation may alter TSH/T4 levels, requiring levothyroxine dose adjustment",
    action: "FLAG: Recheck TSH/T4 at 4 and 8 weeks. Dose adjustment may be needed.",
  },
  {
    peptideId: "ovapeptide",
    interactsWith: "HRT (Hormone Replacement Therapy)",
    interactionType: "peptide_medication",
    severity: "moderate",
    description: "OvaPeptide + exogenous hormone therapy: interaction with endogenous ovarian signaling",
    action: "FLAG: Discuss with prescribing gynecologist/endocrinologist.",
  },
  {
    peptideId: "regenbpc",
    interactsWith: "Anticoagulants",
    interactionType: "peptide_medication",
    severity: "moderate",
    description: "RegenBPC injectable form: higher bleeding risk at injection sites with concurrent anticoagulant therapy",
    action: "FLAG: Injectable form contraindicated with blood thinners. Oral/liposomal forms preferred.",
    deliveryFormSpecific: "injectable",
  },
  {
    peptideId: "retatrutide",
    interactsWith: "Oral Contraceptives",
    interactionType: "peptide_medication",
    severity: "moderate",
    description: "Retatrutide delayed gastric emptying may reduce oral contraceptive absorption",
    action: "FLAG: Consider non-oral contraception or timing adjustment. Discuss with prescriber.",
  },
];

// ═══ SYNERGISTIC / ENHANCE ═══
export const SYNERGISTIC_INTERACTIONS: PeptideInteraction[] = [
  { peptideId: "epitalon", interactsWith: "mitopeptide", interactionType: "peptide_peptide", severity: "synergistic", description: "Telomere + mitochondrial longevity: dual aging pathway support", action: "ENHANCE: Recommended longevity stack." },
  { peptideId: "regenbpc", interactsWith: "tb500-oral", interactionType: "peptide_peptide", severity: "synergistic", description: "BPC-157 local repair + TB-500 systemic calming: comprehensive dual repair protocol", action: "ENHANCE: Gold-standard tissue repair stack." },
  { peptideId: "pinealon", interactsWith: "cerebropeptide", interactionType: "peptide_peptide", severity: "synergistic", description: "Pinealon neuroprotection + CerebroPeptide executive function: multi-region brain support", action: "ENHANCE: Recommended cognitive stack." },
  { peptideId: "adrenopeptide", interactsWith: "hpa-balance", interactionType: "peptide_peptide", severity: "synergistic", description: "Dual HPA axis targeting: rhythm restoration + communication recalibration", action: "ENHANCE: Comprehensive adrenal protocol." },
  { peptideId: "gutrepair", interactsWith: "histaminebalance", interactionType: "peptide_peptide", severity: "synergistic", description: "Gut barrier repair + histamine clearance: addresses root cause + symptom simultaneously", action: "ENHANCE: Recommended GI stack for histamine intolerance." },
  { peptideId: "coq10-peptide", interactsWith: "Ubiquinol (CoQ10 supplement)", interactionType: "peptide_supplement", severity: "synergistic", description: "Endogenous CoQ10 production + exogenous supplementation: dual-pathway mitochondrial support", action: "ENHANCE: Recommended combination." },
  { peptideId: "hpa-balance", interactsWith: "Ashwagandha (KSM-66)", interactionType: "peptide_supplement", severity: "synergistic", description: "Peptide HPA recalibration + adaptogenic cortisol modulation: complementary mechanisms", action: "ENHANCE: Peptide + adaptogen synergy." },
  { peptideId: "detoxpeptide", interactsWith: "NAC (N-Acetyl Cysteine)", interactionType: "peptide_supplement", severity: "synergistic", description: "Liver bioregulation + glutathione precursor: tissue support + biochemical detox substrate", action: "ENHANCE: Recommended detox combination." },
  { peptideId: "slu-pp-332", interactsWith: "energycore", interactionType: "peptide_peptide", severity: "synergistic", description: "Exercise mimetic gene activation + inner membrane targeting: triple-layer mitochondrial protocol", action: "ENHANCE: Maximum mitochondrial optimization." },
  { peptideId: "slu-pp-332", interactsWith: "mitopeptide", interactionType: "peptide_peptide", severity: "synergistic", description: "ERR agonist biogenesis + membrane protection: comprehensive mitochondrial renewal", action: "ENHANCE: Part of MITO-MAX stack." },
];

export const ALL_INTERACTIONS = [...MAJOR_INTERACTIONS, ...MODERATE_INTERACTIONS, ...SYNERGISTIC_INTERACTIONS];
