// FarmCeutica Peptide Stacking Protocols & Pricing Tiers

export interface StackingProtocol {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  tierLabel: string;
  peptideIds: string[];
  description: string;
  monthlyPrice: string;
  targetPatterns: string[];
}

export const STACKING_PROTOCOLS: StackingProtocol[] = [
  // TIER 1: DTC ($600-$800/month avg.)
  { id: "clarity-stack", name: "CLARITY-STACK", tier: 1, tierLabel: "DTC", peptideIds: ["moodlift", "pinealon"], description: "Cognitive clarity + mood stability. Anxiolytic + neuroprotective dual-action.", monthlyPrice: "$159/mo", targetPatterns: ["neuro", "mood"] },
  { id: "recover-x", name: "RECOVER-X", tier: 1, tierLabel: "DTC", peptideIds: ["regenbpc", "tb500-oral"], description: "Comprehensive tissue repair. BPC-157 local + TB-500 systemic dual-action.", monthlyPrice: "$229/mo", targetPatterns: ["immune", "recovery"] },
  { id: "vitality-gh", name: "VITALITY-GH", tier: 1, tierLabel: "DTC", peptideIds: ["neuroshield"], description: "GHK-Cu gene regulation + tissue health. Anti-aging foundation.", monthlyPrice: "$199/mo", targetPatterns: ["longevity", "skin"] },
  { id: "longevity-core", name: "LONGEVITY-CORE", tier: 1, tierLabel: "DTC", peptideIds: ["epitalon"], description: "Telomerase activation. Foundational longevity bioregulator.", monthlyPrice: "$149/mo", targetPatterns: ["longevity", "circadian"] },
  { id: "mito-max", name: "MITO-MAX", tier: 1, tierLabel: "DTC", peptideIds: ["energycore", "slu-pp-332", "mitopeptide"], description: "Triple-layer mitochondrial protocol: gene activation + membrane targeting + membrane protection.", monthlyPrice: "$299/mo", targetPatterns: ["mitochondrial", "energy", "exercise"] },
  { id: "adrenal-restore", name: "ADRENAL-RESTORE", tier: 1, tierLabel: "DTC", peptideIds: ["adrenopeptide", "hpa-balance"], description: "Dual HPA axis protocol: rhythm restoration + communication recalibration.", monthlyPrice: "$199/mo", targetPatterns: ["adrenal", "stress"] },

  // TIER 2: HCP ($1,200-$1,800/month avg.)
  { id: "metabolic-pro", name: "METABOLIC-PRO", tier: 2, tierLabel: "HCP", peptideIds: ["endoharmonize", "energycore"], description: "Multi-endocrine + mitochondrial metabolic optimization for complex patterns.", monthlyPrice: "$399+/mo", targetPatterns: ["metabolic", "hormonal"] },
  { id: "gut-restore", name: "GUT-RESTORE", tier: 2, tierLabel: "HCP", peptideIds: ["gutrepair", "histaminebalance"], description: "Barrier repair + histamine clearance. Root cause + symptom dual-action.", monthlyPrice: "$189/mo", targetPatterns: ["gut", "histamine"] },
  { id: "immune-reset", name: "IMMUNE-RESET", tier: 2, tierLabel: "HCP", peptideIds: ["immuneguard", "vilon"], description: "Thymosin Alpha-1 + thymus dipeptide: immune surveillance + cell maturation.", monthlyPrice: "$279/mo", targetPatterns: ["immune", "autoimmune"] },
  { id: "neuro-elite", name: "NEURO-ELITE", tier: 2, tierLabel: "HCP", peptideIds: ["pinealon", "cerebropeptide", "moodlift"], description: "Multi-region brain: neuroprotection + executive function + mood stability.", monthlyPrice: "$329/mo", targetPatterns: ["neuro", "cognitive", "mood"] },

  // TIER 3: Premium ($1,500-$2,500/month avg.)
  { id: "retatrutide-advanced", name: "RETATRUTIDE-ADVANCED", tier: 3, tierLabel: "Premium", peptideIds: ["retatrutide"], description: "Triple GLP-1/GIP/Glucagon agonist. 28.7% weight loss. Investigational, practitioner-prescribed only.", monthlyPrice: "$450-$600/mo", targetPatterns: ["metabolic", "weight"] },
  { id: "total-longevity", name: "TOTAL-LONGEVITY", tier: 3, tierLabel: "Premium", peptideIds: ["epitalon", "mitopeptide", "vesugen", "vilon"], description: "Complete longevity system: telomere + mitochondrial + vascular + immune.", monthlyPrice: "$499/mo", targetPatterns: ["longevity", "anti-aging"] },
];

export const MARKET_LAUNCH_ROADMAP = [
  { phase: 1, label: "Foundation", months: "4-8", products: ["vitality-gh", "recover-x", "clarity-stack", "longevity-core"], mrrTarget: "$200K-$400K" },
  { phase: 2, label: "Clinical", months: "9-12", products: ["metabolic-pro", "immune-reset", "gut-restore", "mito-max"], mrrTarget: "$2M-$2.5M" },
  { phase: 3, label: "Premium", months: "13-18", products: ["neuro-elite", "total-longevity"], mrrTarget: "$4M-$4.5M" },
  { phase: 4, label: "Innovation", months: "19-24", products: ["retatrutide-advanced"], mrrTarget: "$5M-$5.5M" },
];
