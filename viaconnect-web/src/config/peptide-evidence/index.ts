// FarmCeutica Peptide Portfolio — 27 Products, 7 Categories, Clinical Evidence Database
// Seeds the Ultrathink RAG knowledge base with trial data for AI citation

export interface ClinicalTrial {
  id: string;
  title: string;
  type: string;
  design?: string;
  participants?: string;
  year?: number;
  keyFindings: string[];
  evidenceLevel: "strong" | "moderate" | "emerging" | "preclinical";
  safetyProfile?: string;
  regulatoryStatus?: string;
  authorities: string[];
  relevantProducts: string[];
}

export interface PeptideCategory {
  category: string;
  products: string[];
  clinicalTrials: ClinicalTrial[];
  overallEvidenceLevel: string;
  overallSafetyConsensus: string;
  genex360Synergies: string[];
  ultrathinkPatternMapping: string[];
}

// ═══ EVIDENCE LEVEL CLASSIFICATION ═══
export const EVIDENCE_LEVELS = {
  strong: { label: "Strong", description: "Phase 2/3 RCTs, FDA-approved indications, or extensive multi-year human clinical data", color: "teal-400" },
  moderate: { label: "Moderate", description: "Phase I human safety data, human pilot studies, large clinical experience, or case series >10 patients", color: "amber-400" },
  emerging: { label: "Emerging", description: "Small human pilots, preclinical data with strong mechanistic support, or early-stage case series", color: "orange-400" },
  preclinical: { label: "Preclinical", description: "Animal models and in-vitro studies only; no human data yet", color: "white" },
};

// ═══ TRANSPARENCY DISCLAIMERS ═══
export const PEPTIDE_DISCLAIMERS = {
  khavinson: "Many Khavinson bioregulator trials are based on large Russian/CIS clinical experience with 700+ publications but smaller sample sizes than Western Phase 3 RCTs. Evidence is substantial but varies by peptide.",
  bpc157: "BPC-157 has Phase I oral safety data (n=42) and emerging human case series but lacks large Phase 3 efficacy trials. It remains experimental in most jurisdictions.",
  ss31: "SS-31/Elamipretide has the strongest Western evidence base with Phase 2/3 RCTs and FDA approval for Barth syndrome (2025). Oral formulation uses liposomal-micellar delivery.",
  general: "All peptide products are positioned as wellness support informed by clinical literature. They are not positioned as cures or therapeutic replacements. Always consult a physician before starting any peptide regimen.",
};

// ═══ CATEGORY 1: ADRENAL / HPA AXIS ═══
export const ADRENAL_HPA: PeptideCategory = {
  category: "Adrenal/HPA Axis & Stress Resilience",
  products: ["AdrenoPeptide\u2122", "HPA-Balance\u2122", "StressShield\u2122", "RecoveryPulse\u2122"],
  clinicalTrials: [
    { id: "khavinson-epithalamin-6yr", title: "Epithalamin 6-Year Longitudinal Geroprotection Study", type: "human_clinical", participants: "162+ patients", keyFindings: ["Normalized cortisol/melatonin circadian rhythms", "Reduced fatigue scores significantly", "20-40% mortality reduction vs. controls", "Restored pineal-HPA axis balance"], evidenceLevel: "moderate", safetyProfile: "No serious adverse events across decades of clinical use", authorities: ["khavinson"], relevantProducts: ["AdrenoPeptide\u2122", "HPA-Balance\u2122"] },
    { id: "khavinson-pineal-retinitis", title: "Pineal Peptides in Retinitis Pigmentosa Cohort", type: "human_clinical", participants: "162+ patients", keyFindings: ["Restored circadian function", "HPA axis balance improvement", "Pineal gland peptide bioregulation confirmed"], evidenceLevel: "moderate", safetyProfile: "Excellent; decades of use in Russia/CIS with zero reported toxicity", authorities: ["khavinson"], relevantProducts: ["StressShield\u2122", "RecoveryPulse\u2122"] },
  ],
  overallEvidenceLevel: "moderate",
  overallSafetyConsensus: "Excellent; decades of clinical use in Russia/CIS with no reported toxicity at therapeutic doses",
  genex360Synergies: ["COMT variants (Val/Met) \u2192 stress resilience optimization with HPA-Balance\u2122", "CYP1A2 slow metabolizers \u2192 cortisol clearance support with AdrenoPeptide\u2122", "MTHFR C677T \u2192 methylation-dependent cortisol metabolism support"],
  ultrathinkPatternMapping: ["Adrenal Battery Depletion \u2192 AdrenoPeptide\u2122 + HPA-Balance\u2122", "HPA Axis Dysregulation \u2192 StressShield\u2122 acute + RecoveryPulse\u2122 recovery", "Flattened cortisol curve \u2192 Epithalamin-based circadian restoration"],
};

// ═══ CATEGORY 2: MITOCHONDRIAL / ENERGY ═══
export const MITOCHONDRIAL_ENERGY: PeptideCategory = {
  category: "Mitochondrial/Energy Optimization",
  products: ["MitoPeptide\u2122", "EnergyCore\u2122", "CoQ10-Peptide\u2122", "ATP-Regen\u2122"],
  clinicalTrials: [
    { id: "ss31-mmpower", title: "MMPOWER Phase 2/3 \, SS-31/Elamipretide in Primary Mitochondrial Myopathy", type: "human_phase3", design: "Randomized, double-blind, placebo-controlled", keyFindings: ["Improved 6-minute walk test distance up to 96 meters", "Improved cardiac stroke volume", "Improved cardiolipin levels (mitochondrial membrane stabilization)", "Reduced fatigue scores"], evidenceLevel: "strong", safetyProfile: "Mild injection-site reactions; otherwise well-tolerated", authorities: ["seeds", "yurth"], relevantProducts: ["EnergyCore\u2122"] },
    { id: "ss31-tazpower", title: "TAZPOWER \, SS-31/Elamipretide in Barth Syndrome", type: "human_phase3", design: "Phase 3 with long-term extension", keyFindings: ["FDA approval granted 2025 for Barth syndrome", "Sustained mitochondrial energetics improvement", "Cardiolipin normalization maintained"], evidenceLevel: "strong", regulatoryStatus: "FDA-approved (Barth syndrome, 2025)", safetyProfile: "Well-tolerated subcutaneously", authorities: ["seeds"], relevantProducts: ["EnergyCore\u2122", "ATP-Regen\u2122"] },
    { id: "ss31-heartfailure", title: "SS-31 in Heart Failure \, Mitochondrial Energetics", type: "human_clinical", keyFindings: ["Mitochondrial energetics benefits in cardiac tissue", "Improved ATP production efficiency"], evidenceLevel: "moderate", authorities: ["seeds"], relevantProducts: ["CoQ10-Peptide\u2122"] },
    { id: "epitalon-mito-lifespan", title: "Epitalon Mitochondrial Protection & Lifespan Extension", type: "preclinical_plus_human_pilot", keyFindings: ["Mitochondrial membrane protection in animal models", "Lifespan extension in multiple species", "Human pilot supports ATP/telomere synergy"], evidenceLevel: "moderate", authorities: ["khavinson"], relevantProducts: ["MitoPeptide\u2122"] },
  ],
  overallEvidenceLevel: "strong",
  overallSafetyConsensus: "SS-31 has FDA-approved safety data; Epitalon has decades of clinical use; oral liposomal-micellar delivery aligns with bioavailability research",
  genex360Synergies: ["COMT + flattened cortisol \u2192 Mitochondrial Fog addressed by EnergyCore\u2122", "SOD2 variants \u2192 oxidative stress on mitochondria \u2192 MitoPeptide\u2122", "CoQ10 biosynthesis SNPs \u2192 CoQ10-Peptide\u2122 targeted support"],
  ultrathinkPatternMapping: ["Mitochondrial Fog \u2192 EnergyCore\u2122 (SS-31 analog, Phase 3 support)", "Chronic Fatigue Complex \u2192 ATP-Regen\u2122 + CoQ10-Peptide\u2122", "Post-viral energy depletion \u2192 MitoPeptide\u2122 membrane repair"],
};

// ═══ CATEGORY 3: IMMUNE & REGENERATIVE ═══
export const IMMUNE_REGENERATIVE: PeptideCategory = {
  category: "Immune & Regenerative",
  products: ["ImmuneGuard\u2122", "RegenBPC\u2122", "TB-500 Oral\u2122", "AntiInflam\u2122", "Vilon\u2122"],
  clinicalTrials: [
    { id: "bpc157-phase1-oral", title: "BPC-157 Phase I Safety/PK Trial \, Oral", type: "human_phase1", participants: "42 healthy adults", year: 2015, keyFindings: ["Oral administration confirmed tolerable", "No serious adverse events", "PK profile established for oral dosing"], evidenceLevel: "moderate", safetyProfile: "Clean safety in 42 healthy volunteers", authorities: ["seeds", "yurth"], relevantProducts: ["RegenBPC\u2122"] },
    { id: "bpc157-iv-pilot-2025", title: "BPC-157 IV Pilot Study (2025) \, 20mg Single Dose", type: "human_pilot", participants: "20 adults", year: 2025, keyFindings: ["No adverse effects on heart, liver, or kidney biomarkers", "20mg single IV dose well-tolerated"], evidenceLevel: "emerging", authorities: ["seeds", "yurth"], relevantProducts: ["RegenBPC\u2122"] },
    { id: "bpc157-knee-case", title: "BPC-157 Knee Pain Case Series", type: "human_case_series", participants: "12 patients", keyFindings: ["7/12 achieved >6 months pain relief (58%)"], evidenceLevel: "emerging", authorities: ["yurth", "seeds"], relevantProducts: ["RegenBPC\u2122"] },
    { id: "bpc157-bladder", title: "BPC-157 Bladder Pain Pilot", type: "human_pilot", participants: "12 patients", keyFindings: ["12/12 improved (100% response)"], evidenceLevel: "emerging", authorities: ["seeds"], relevantProducts: ["RegenBPC\u2122"] },
    { id: "thymosin-alpha1", title: "Thymosin \u03b11 Immune Modulation Trials", type: "human_multiple_trials", keyFindings: ["Extensive trials for hepatitis B/C", "Sepsis survival improvement", "Cancer adjunct immune enhancement", "Global regulatory approvals"], evidenceLevel: "strong", safetyProfile: "Decades of approved clinical use in multiple countries", authorities: ["seeds", "khavinson"], relevantProducts: ["ImmuneGuard\u2122"] },
    { id: "tb4-cardiac-phase1", title: "Thymosin \u03b24 Phase I \, Myocardial Infarction", type: "human_phase1", keyFindings: ["Safety confirmed in cardiac context", "Cardiac repair signals", "Anti-inflammatory benefits"], evidenceLevel: "moderate", authorities: ["seeds"], relevantProducts: ["TB-500 Oral\u2122"] },
    { id: "vilon-thymalin", title: "Vilon/Thymalin Immune Restoration in Elderly", type: "human_clinical", keyFindings: ["Immune restoration in elderly", "Reduced inflammation markers", "Lifespan benefits in longitudinal follow-up"], evidenceLevel: "moderate", authorities: ["khavinson"], relevantProducts: ["Vilon\u2122", "AntiInflam\u2122"] },
  ],
  overallEvidenceLevel: "moderate_to_strong",
  overallSafetyConsensus: "BPC-157 clean preclinical + limited human data; Thymosin \u03b11 decades of approved use; TB-4 Phase I confirmed cardiac safety",
  genex360Synergies: ["IL-6 inflammation variants \u2192 AntiInflam\u2122", "SOD2/GSTM1 oxidative stress \u2192 RegenBPC\u2122 tissue repair", "Immune panel variants \u2192 ImmuneGuard\u2122 + Vilon\u2122"],
  ultrathinkPatternMapping: ["Chronic Inflammation Pattern \u2192 AntiInflam\u2122 + Vilon\u2122", "Tissue Repair Deficit \u2192 RegenBPC\u2122 (BPC-157 Phase I support)", "Immune Exhaustion \u2192 ImmuneGuard\u2122 (Thymosin \u03b11, strong evidence)"],
};

// ═══ CATEGORY 4: NEURO / COGNITIVE ═══
export const NEURO_COGNITIVE: PeptideCategory = {
  category: "Neuro/Cognitive & Mood",
  products: ["Pinealon\u2122", "NeuroShield\u2122", "CerebroPeptide\u2122", "MoodLift\u2122"],
  clinicalTrials: [
    { id: "pinealon-neuroprotection", title: "Pinealon Human Pilots \, Neuroprotection & Neurogenesis", type: "human_pilot", keyFindings: ["Neuroprotective effects confirmed", "Neurogenesis stimulation", "Anxiolytic effects without sedation", "Cognitive decline improvement in elderly"], evidenceLevel: "moderate", safetyProfile: "No serious adverse events; excellent CNS tolerability", authorities: ["khavinson"], relevantProducts: ["Pinealon\u2122", "CerebroPeptide\u2122"] },
    { id: "selank-anxiolytic", title: "Selank Analogs \, Anxiolytic and Cognitive Enhancement", type: "human_clinical", keyFindings: ["Anxiolytic effects comparable to benzodiazepines without sedation", "Cognitive enhancement under stress", "Russian clinical approval for anxiety"], evidenceLevel: "moderate", safetyProfile: "Excellent CNS tolerability; no dependence or withdrawal", authorities: ["khavinson"], relevantProducts: ["MoodLift\u2122", "NeuroShield\u2122"] },
    { id: "ghk-cu-gene-regulation", title: "GHK-Cu Gene Regulation & Neuroprotective Pathways", type: "human_rct_plus_mechanistic", keyFindings: ["Topical RCTs improved skin regeneration", "Systemic gene-regulation potential", "Anti-oxidative neuroprotective pathways", "Emerging pilots for systemic delivery"], evidenceLevel: "moderate", authorities: ["craik", "fields"], relevantProducts: ["NeuroShield\u2122"] },
  ],
  overallEvidenceLevel: "moderate",
  overallSafetyConsensus: "No serious events across Pinealon, Selank, GHK-Cu; excellent CNS tolerability without sedation or dependence",
  genex360Synergies: ["COMT Val/Met \u2192 CerebroPeptide\u2122 cognitive support", "MTHFR \u2192 Pinealon\u2122 neuroprotection", "BDNF variants \u2192 NeuroShield\u2122", "APOE \u03b54 \u2192 GHK-Cu neuroprotection"],
  ultrathinkPatternMapping: ["Brain Fog Complex \u2192 CerebroPeptide\u2122 + Pinealon\u2122", "Anxiety without sedation need \u2192 MoodLift\u2122 (Selank evidence)", "Neurodegeneration risk \u2192 NeuroShield\u2122 (GHK-Cu)"],
};

// ═══ CATEGORY 5: HORMONAL / ENDOCRINE ═══
export const HORMONAL_ENDOCRINE: PeptideCategory = {
  category: "Hormonal Balance & Endocrine",
  products: ["OvaPeptide\u2122", "ThyroReg\u2122", "ProgestoBalance\u2122", "EndoHarmonize\u2122"],
  clinicalTrials: [
    { id: "khavinson-ovarian", title: "Khavinson Ovarian Bioregulators \, Hormonal Dysregulation", type: "human_clinical", keyFindings: ["Normalized ovarian metabolites", "Restored hormonal function markers", "Pineal-endocrine axis regulation"], evidenceLevel: "moderate", authorities: ["khavinson"], relevantProducts: ["OvaPeptide\u2122", "ProgestoBalance\u2122"] },
    { id: "khavinson-thyroid", title: "Khavinson Thyroid Bioregulators \, Thyroid Function Restoration", type: "human_clinical", keyFindings: ["Thyroid function normalization in subclinical hypothyroid", "Bioregulatory peptide approach to endocrine balance"], evidenceLevel: "moderate", authorities: ["khavinson"], relevantProducts: ["ThyroReg\u2122"] },
    { id: "ss31-endocrine-energy", title: "SS-31 Cross-Support \, Endocrine Energy Deficits", type: "human_clinical_crossover", keyFindings: ["Mitochondrial energetics benefits endocrine function", "Hormonal organs highly mitochondria-dependent"], evidenceLevel: "moderate", authorities: ["seeds"], relevantProducts: ["EndoHarmonize\u2122"] },
  ],
  overallEvidenceLevel: "moderate",
  overallSafetyConsensus: "Aligns with Khavinson safety record; no reported adverse events",
  genex360Synergies: ["CYP19A1/ESR1 (HormoneIQ\u2122) \u2192 OvaPeptide\u2122 estrogen support", "DIO2 thyroid variants \u2192 ThyroReg\u2122", "AR androgen variants \u2192 EndoHarmonize\u2122"],
  ultrathinkPatternMapping: ["Hormonal Transition Pattern \u2192 OvaPeptide\u2122 + ProgestoBalance\u2122", "Subclinical Thyroid \u2192 ThyroReg\u2122", "Endocrine Fatigue \u2192 EndoHarmonize\u2122 + SS-31 cross-support"],
};

// ═══ CATEGORY 6: GUT & DETOX ═══
export const GUT_DETOX: PeptideCategory = {
  category: "Gut & Detox Support",
  products: ["GutRepair\u2122", "DetoxPeptide\u2122", "HistamineBalance\u2122"],
  clinicalTrials: [
    { id: "bpc157-gut-barrier", title: "BPC-157 Gut Barrier Repair \, Animal Models + Human Pilots", type: "preclinical_plus_human_pilot", keyFindings: ["Gut barrier integrity restoration", "IBD symptom relief in preclinical models", "Retrospective UC pilot: 60% improvement", "Oral Phase I confirmed GI tolerability"], evidenceLevel: "moderate", safetyProfile: "Oral Phase I confirmed GI tolerability in 42 healthy volunteers", authorities: ["seeds", "yurth"], relevantProducts: ["GutRepair\u2122"] },
    { id: "khavinson-liver", title: "Khavinson Liver Bioregulators \, Detox Enzyme Support", type: "human_clinical", keyFindings: ["Liver detox enzyme normalization", "Hepatoprotective peptide bioregulation", "Phase I/II liver detox pathway support"], evidenceLevel: "moderate", authorities: ["khavinson"], relevantProducts: ["DetoxPeptide\u2122"] },
  ],
  overallEvidenceLevel: "moderate",
  overallSafetyConsensus: "BPC-157 oral Phase I GI safety confirmed; liver bioregulators align with Khavinson record",
  genex360Synergies: ["NAT2/GSTM1 detox variants \u2192 DetoxPeptide\u2122", "FUT2 B12 absorption \u2192 GutRepair\u2122 barrier optimization", "DAO/HNMT histamine variants \u2192 HistamineBalance\u2122"],
  ultrathinkPatternMapping: ["Gut-Brain Axis Disruption \u2192 GutRepair\u2122 (BPC-157)", "Toxic Burden Pattern \u2192 DetoxPeptide\u2122", "Histamine Intolerance \u2192 HistamineBalance\u2122"],
};

// ═══ CATEGORY 7: LONGEVITY & CORE BIOREGULATOR ═══
export const LONGEVITY_BIOREGULATOR: PeptideCategory = {
  category: "Longevity & Core Bioregulator Series",
  products: ["Epitalon\u2122", "Vesugen\u2122", "Bronchogen\u2122"],
  clinicalTrials: [
    { id: "epitalon-landmark", title: "Epitalon Landmark Geroprotection Trials (2003\u20132025)", type: "human_clinical_longitudinal", keyFindings: ["Geroprotective effects confirmed across multiple trials", "Mortality reduction 20\u201340% in elderly cohorts", "Telomerase activation in human fibroblasts (past Hayflick limit)", "Pineal gland function restoration", "Circadian rhythm normalization"], evidenceLevel: "strong", safetyProfile: "Decades of clinical use; no toxicity signals", authorities: ["khavinson"], relevantProducts: ["Epitalon\u2122"] },
    { id: "epitalon-telomere", title: "Epitalon Telomere Extension \, In Vitro Confirmation", type: "in_vitro_human_cells", keyFindings: ["Human fibroblasts divided past Hayflick limit", "Telomerase activation confirmed at cellular level"], evidenceLevel: "moderate", authorities: ["khavinson"], relevantProducts: ["Epitalon\u2122"] },
    { id: "vesugen-bronchogen", title: "Vesugen/Bronchogen Multi-Tissue Support", type: "human_clinical", keyFindings: ["Vascular function support (Vesugen)", "Respiratory tissue bioregulation (Bronchogen)", "Multi-system optimization in elderly"], evidenceLevel: "moderate", authorities: ["khavinson"], relevantProducts: ["Vesugen\u2122", "Bronchogen\u2122"] },
  ],
  overallEvidenceLevel: "strong",
  overallSafetyConsensus: "Decades of clinical use across all Khavinson bioregulators with no toxicity signals",
  genex360Synergies: ["TERT/TERC (EpigenHQ\u2122) \u2192 Epitalon\u2122 telomerase activation", "FOXO3 longevity variants \u2192 Epitalon\u2122 geroprotective synergy", "APOE variants \u2192 Vesugen\u2122 vascular protection", "SIRT1 variants \u2192 Epitalon\u2122 + Vesugen\u2122 aging optimization"],
  ultrathinkPatternMapping: ["Accelerated Aging Pattern \u2192 Epitalon\u2122 (telomerase, strong evidence)", "Vascular Aging \u2192 Vesugen\u2122", "Respiratory Decline \u2192 Bronchogen\u2122"],
};

// ═══ UNIFIED EXPORTS ═══
export const ALL_PEPTIDE_CATEGORIES: PeptideCategory[] = [
  ADRENAL_HPA, MITOCHONDRIAL_ENERGY, IMMUNE_REGENERATIVE,
  NEURO_COGNITIVE, HORMONAL_ENDOCRINE, GUT_DETOX, LONGEVITY_BIOREGULATOR,
];

export const ALL_PEPTIDE_PRODUCTS = ALL_PEPTIDE_CATEGORIES.flatMap(c => c.products);
export const ALL_CLINICAL_TRIALS = ALL_PEPTIDE_CATEGORIES.flatMap(c => c.clinicalTrials);

export function getEvidenceForProduct(productName: string): { trials: ClinicalTrial[]; category: PeptideCategory | undefined } {
  for (const cat of ALL_PEPTIDE_CATEGORIES) {
    const trials = cat.clinicalTrials.filter(t => t.relevantProducts.some(p => p.toLowerCase() === productName.toLowerCase()));
    if (trials.length > 0) return { trials, category: cat };
  }
  return { trials: [], category: undefined };
}

export function getPatternToProductMapping(patternName: string): string[] {
  const results: string[] = [];
  for (const cat of ALL_PEPTIDE_CATEGORIES) {
    for (const mapping of cat.ultrathinkPatternMapping) {
      if (mapping.toLowerCase().includes(patternName.toLowerCase())) results.push(mapping);
    }
  }
  return results;
}
