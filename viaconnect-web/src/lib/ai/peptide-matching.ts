// Peptide Pattern Matching Engine
// Maps Ultrathink master patterns to FarmCeutica peptide recommendations

export interface PeptideProduct {
  name: string;
  category: string;
}

export interface PeptideRecommendation {
  id: string;
  patternCategory: string;
  patternName: string;
  products: PeptideProduct[];
  personalizedReason: string;
  analogy: string;
  dosingProtocol: string;
  cycleDuration: string;
  evidenceSummary: string;
  evidenceLevel: "strong" | "moderate" | "emerging";
  authorities: string[];
  helixPerDay: number;
  genexSynergy: string;
  includesRetatrutideRef: boolean;
}

interface MasterPattern {
  name: string;
  symptomsInvolved?: string[];
}

function classifyPatternCategory(pattern: MasterPattern): string {
  const n = pattern.name.toLowerCase();
  const symptoms = (pattern.symptomsInvolved || []).join(" ").toLowerCase();

  if (n.includes("adrenal") || n.includes("hpa") || n.includes("cortisol")) return "adrenal";
  if (n.includes("mitochondr") || n.includes("energy") || n.includes("atp")) return "mitochondrial";
  if (n.includes("metabol") || n.includes("weight") || n.includes("insulin")) return "metabolic";
  if (n.includes("neuro") || n.includes("brain") || n.includes("cognit") || n.includes("fog")) return "neuro";
  if (n.includes("immune") || n.includes("inflam") || n.includes("autoimmune")) return "immune";
  if (n.includes("hormon") || n.includes("endocrine") || n.includes("thyroid")) return "hormonal";
  if (n.includes("gut") || n.includes("digest") || n.includes("microbiome")) return "gut";
  if (n.includes("longevity") || n.includes("aging") || n.includes("telomere")) return "longevity";

  if (symptoms.includes("fatigue") || symptoms.includes("energy")) return "adrenal";
  if (symptoms.includes("brain fog") || symptoms.includes("memory")) return "neuro";
  if (symptoms.includes("digest") || symptoms.includes("bloat")) return "gut";

  return "adrenal";
}

const PATTERN_RECOMMENDATIONS: Record<string, Omit<PeptideRecommendation, "id" | "patternName">> = {
  adrenal: {
    patternCategory: "adrenal",
    products: [
      { name: "AdrenoPeptide\u2122", category: "HPA Axis" },
      { name: "MitoPeptide\u2122", category: "Mitochondrial" },
    ],
    personalizedReason: "Your assessment identified fatigue and stress patterns that align with HPA-axis and mitochondrial support.",
    analogy: "Your adrenals are like a low-charge phone \u2014 these peptides help the charger work better.",
    dosingProtocol: "Morning: AdrenoPeptide\u2122 1 cap. Afternoon: MitoPeptide\u2122 1 cap.",
    cycleDuration: "30-day loading cycle, then maintenance",
    evidenceSummary: "Khavinson 6-year longitudinal: 20\u201340% mortality reduction, cortisol normalization",
    evidenceLevel: "moderate",
    authorities: ["Khavinson", "Seeds"],
    helixPerDay: 25,
    genexSynergy: "COMT variants \u2192 enhanced HPA axis calibration with GeneX-M\u2122 data",
    includesRetatrutideRef: false,
  },
  mitochondrial: {
    patternCategory: "mitochondrial",
    products: [
      { name: "EnergyCore\u2122", category: "Mitochondrial" },
      { name: "CoQ10-Peptide\u2122", category: "Cellular Energy" },
    ],
    personalizedReason: "Your energy and cellular fatigue patterns suggest mitochondrial optimization support.",
    analogy: "Think of mitochondria as tiny power plants \u2014 these peptides help them run at full capacity.",
    dosingProtocol: "Morning: EnergyCore\u2122 1 cap with breakfast. Evening: CoQ10-Peptide\u2122 1 cap.",
    cycleDuration: "30-day loading cycle",
    evidenceSummary: "SS-31 Phase 2/3 trials: 96m 6MWT improvement. FDA-approved analog for Barth syndrome.",
    evidenceLevel: "strong",
    authorities: ["Seeds"],
    helixPerDay: 25,
    genexSynergy: "SOD2 + CoQ10 variants \u2192 enhanced mitochondrial response with NutrigenDX\u2122 data",
    includesRetatrutideRef: false,
  },
  metabolic: {
    patternCategory: "metabolic",
    products: [
      { name: "EnergyCore\u2122", category: "Mitochondrial" },
      { name: "EndoHarmonize\u2122", category: "Endocrine" },
    ],
    personalizedReason: "Your metabolic health goals and lifestyle data align with mitochondrial + endocrine optimization.",
    analogy: "Think of your metabolism as a furnace \u2014 these peptides help it burn cleaner and more efficiently.",
    dosingProtocol: "Morning: EnergyCore\u2122 1 cap. Evening: EndoHarmonize\u2122 1 cap.",
    cycleDuration: "30-day loading cycle",
    evidenceSummary: "SS-31 Phase 2/3 (MMPOWER/TAZPOWER): metabolic efficiency markers improved. Thyroid peptides showed TSH normalization.",
    evidenceLevel: "strong",
    authorities: ["Seeds"],
    helixPerDay: 25,
    genexSynergy: "SOD2 + CoQ10 variants \u2192 enhanced mitochondrial response with NutrigenDX\u2122 data",
    includesRetatrutideRef: true,
  },
  neuro: {
    patternCategory: "neuro",
    products: [
      { name: "Pinealon\u2122", category: "Neuroprotection" },
      { name: "NeuroShield\u2122", category: "Cognitive" },
    ],
    personalizedReason: "Directly addresses your reported brain fog and concentration challenges.",
    analogy: "Your brain\u2019s signal pathways need clearer lanes \u2014 these peptides help reduce the traffic jam.",
    dosingProtocol: "Morning: Pinealon\u2122 1 cap. Afternoon: NeuroShield\u2122 1 cap.",
    cycleDuration: "30-day initial, then alternate months",
    evidenceSummary: "Pinealon: neuroprotection + neurogenesis without sedation. Selank: anxiolytic comparable to benzodiazepines without dependence.",
    evidenceLevel: "moderate",
    authorities: ["Khavinson"],
    helixPerDay: 25,
    genexSynergy: "COMT + MTHFR \u2192 neurotransmitter optimization with GeneX-M\u2122 data",
    includesRetatrutideRef: false,
  },
  immune: {
    patternCategory: "immune",
    products: [
      { name: "ImmunoGuard\u2122", category: "Immune Modulation" },
      { name: "GutShield\u2122", category: "Gut Barrier" },
    ],
    personalizedReason: "Your immune and inflammatory patterns suggest immune modulation and gut barrier support.",
    analogy: "Your immune system is like a security team \u2014 these peptides help it tell friend from foe more accurately.",
    dosingProtocol: "Morning: ImmunoGuard\u2122 1 cap. Evening: GutShield\u2122 1 cap.",
    cycleDuration: "30-day loading, then 10 days on / 20 days off",
    evidenceSummary: "Thymosin Alpha-1 approved in 35+ countries for immune modulation. BPC-157 gut healing trials show mucosal restoration.",
    evidenceLevel: "moderate",
    authorities: ["Khavinson", "Yurth"],
    helixPerDay: 25,
    genexSynergy: "HLA variants \u2192 immune calibration with GeneX-M\u2122 data",
    includesRetatrutideRef: false,
  },
  hormonal: {
    patternCategory: "hormonal",
    products: [
      { name: "EndoHarmonize\u2122", category: "Endocrine" },
      { name: "AdrenoPeptide\u2122", category: "HPA Axis" },
    ],
    personalizedReason: "Your hormonal symptom patterns suggest endocrine and HPA axis optimization.",
    analogy: "Your hormones are an orchestra \u2014 these peptides help the conductor keep better time.",
    dosingProtocol: "Morning: EndoHarmonize\u2122 1 cap. Evening: AdrenoPeptide\u2122 1 cap.",
    cycleDuration: "30-day loading cycle, then maintenance",
    evidenceSummary: "Thyroid and adrenal peptide bioregulators: Khavinson studies show glandular normalization over 6-month cycles.",
    evidenceLevel: "moderate",
    authorities: ["Khavinson", "Seeds"],
    helixPerDay: 25,
    genexSynergy: "CYP19A1 + ESR1 variants \u2192 hormonal calibration with HormoneIQ\u2122 data",
    includesRetatrutideRef: false,
  },
  gut: {
    patternCategory: "gut",
    products: [
      { name: "GutShield\u2122", category: "Gut Barrier" },
      { name: "DetoxFlow\u2122", category: "Detox Support" },
    ],
    personalizedReason: "Your digestive symptoms and gut-related patterns align with barrier restoration and detox support.",
    analogy: "Your gut lining is like a garden fence \u2014 these peptides help repair gaps so only good things get through.",
    dosingProtocol: "Morning: GutShield\u2122 1 cap on empty stomach. Evening: DetoxFlow\u2122 1 cap.",
    cycleDuration: "30-day loading cycle",
    evidenceSummary: "BPC-157: accelerated mucosal healing in GI studies. Khavinson gut peptides: intestinal epithelial regeneration.",
    evidenceLevel: "moderate",
    authorities: ["Yurth", "Khavinson"],
    helixPerDay: 25,
    genexSynergy: "FUT2 + MTHFR \u2192 gut-methylation axis with GeneX-M\u2122 data",
    includesRetatrutideRef: false,
  },
  longevity: {
    patternCategory: "longevity",
    products: [
      { name: "Epitalon\u2122", category: "Telomere Support" },
      { name: "Vilon\u2122", category: "Bioregulator" },
    ],
    personalizedReason: "Your longevity and anti-aging goals align with telomere and bioregulatory peptide support.",
    analogy: "Think of telomeres as the protective caps on your DNA shoelaces \u2014 these peptides help keep them intact.",
    dosingProtocol: "Evening: Epitalon\u2122 1 cap. Vilon\u2122 1 cap.",
    cycleDuration: "10-day cycle, repeat every 6 months",
    evidenceSummary: "Epitalon: telomerase activation in Khavinson studies, 28-year longitudinal mortality data.",
    evidenceLevel: "moderate",
    authorities: ["Khavinson"],
    helixPerDay: 25,
    genexSynergy: "TERT variants \u2192 telomere response with EpigenHQ\u2122 data",
    includesRetatrutideRef: false,
  },
};

export function matchPeptidesToPatterns(masterPatterns: MasterPattern[]): PeptideRecommendation[] {
  const recommendations: PeptideRecommendation[] = [];
  const seen = new Set<string>();

  for (const pattern of masterPatterns) {
    const category = classifyPatternCategory(pattern);
    if (seen.has(category)) continue;
    seen.add(category);

    const template = PATTERN_RECOMMENDATIONS[category];
    if (!template) continue;

    recommendations.push({
      ...template,
      id: `peptide-${category}-${recommendations.length}`,
      patternName: pattern.name,
    });
  }

  return recommendations.slice(0, 4);
}
