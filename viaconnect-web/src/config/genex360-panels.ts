// GeneX360 Official Panel Names and Configuration

export const GENEX360_PANEL_IDS = {
  COMPLETE: "genex360-complete",
  METHYLATION: "genex-m",
  NUTRITION: "nutrigendx",
  HORMONE: "hormoneiq",
  EPIGENETICS: "epigenhq",
  PEPTIDE: "peptideiq",
  CANNABIS: "cannabisiq",
} as const;

export const GENEX360_PANELS = [
  {
    id: "genex360-complete",
    name: "GeneX360\u2122 Complete",
    subtitle: "All 6 Panels",
    icon: "\ud83e\uddec",
    color: "bg-gradient-to-br from-teal-400/20 to-orange-400/10",
    borderColor: "border-teal-400/30",
    description: "The full suite \u2014 all 6 genetic panels in one comprehensive test",
    isComplete: true,
  },
  {
    id: "genex-m",
    name: "GeneX-M\u2122",
    subtitle: "Methylation",
    icon: "\ud83d\udd2c",
    color: "bg-blue-400/10",
    borderColor: "border-blue-400/20",
    description: "MTHFR, COMT, CBS, MTR, MTRR \u2014 methylation pathway analysis",
  },
  {
    id: "nutrigendx",
    name: "NutrigenDX\u2122",
    subtitle: "Nutrition",
    icon: "\ud83e\udd57",
    color: "bg-green-400/10",
    borderColor: "border-green-400/20",
    description: "Vitamin metabolism, mineral absorption, macronutrient sensitivity",
  },
  {
    id: "hormoneiq",
    name: "HormoneIQ\u2122",
    subtitle: "Complete Hormone",
    icon: "\u26a1",
    color: "bg-purple-400/10",
    borderColor: "border-purple-400/20",
    description: "Estrogen, testosterone, thyroid, cortisol, and insulin pathway genetics",
  },
  {
    id: "epigenhq",
    name: "EpigenHQ\u2122",
    subtitle: "Biological Age Analysis",
    icon: "\u231b",
    color: "bg-amber-400/10",
    borderColor: "border-amber-400/20",
    description: "Biological age, telomere length, DNA methylation clock",
  },
  {
    id: "peptideiq",
    name: "PeptideIQ\u2122",
    subtitle: "Peptide Genetic Testing",
    icon: "\ud83e\uddea",
    color: "bg-cyan-400/10",
    borderColor: "border-cyan-400/20",
    description: "Growth hormone, collagen synthesis, neuropeptide sensitivity",
  },
  {
    id: "cannabisiq",
    name: "CannabisIQ\u2122",
    subtitle: "Cannabinoid Genetics",
    icon: "\ud83c\udf3f",
    color: "bg-emerald-400/10",
    borderColor: "border-emerald-400/20",
    description: "CB1/CB2 receptors, FAAH, THC metabolism, endocannabinoid system",
  },
] as const;

export const GENEX360_PANEL_NAMES: Record<string, { name: string; subtitle: string }> = {
  "genex360-complete": { name: "GeneX360\u2122 Complete", subtitle: "All 6 Panels" },
  "genex-m": { name: "GeneX-M\u2122", subtitle: "Methylation" },
  "nutrigendx": { name: "NutrigenDX\u2122", subtitle: "Nutrition" },
  "hormoneiq": { name: "HormoneIQ\u2122", subtitle: "Complete Hormone" },
  "epigenhq": { name: "EpigenHQ\u2122", subtitle: "Biological Age Analysis" },
  "peptideiq": { name: "PeptideIQ\u2122", subtitle: "Peptide Genetic Testing" },
  "cannabisiq": { name: "CannabisIQ\u2122", subtitle: "Cannabinoid Genetics" },
};
