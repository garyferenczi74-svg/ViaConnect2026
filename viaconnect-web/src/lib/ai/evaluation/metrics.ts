// Ultrathink Evaluation Metrics — Accuracy, safety, readability, bias

export const EVALUATION_METRICS = {
  accuracy: {
    description: "Pattern matching to expert gold standards",
    target: ">85% agreement with blinded expert review",
    method: "Held-out CAQ cases with expert annotations",
  },
  safety: {
    description: "Zero diagnostic language, 100% disclaimer adherence",
    target: "100% compliance",
    method: "Automated scanning + human audit",
  },
  multiLensQuality: {
    description: "All 14 lenses represented where relevant",
    target: ">90% of profiles include Eastern + Functional + Genomic perspectives",
    method: "Section completeness scoring",
  },
  readability: {
    description: "Plain language accessible to health-curious adults",
    target: "Flesch-Kincaid grade level 8-10",
    method: "Automated readability scoring",
  },
  analogyEffectiveness: {
    description: "Analogies help understanding without trivializing",
    target: ">80% user comprehension in testing",
    method: "User testing + feedback surveys",
  },
  citationAccuracy: {
    description: "Expert references correctly matched to recommendations",
    target: ">95% accurate citations",
    method: "Automated cross-check against expert-authorities.ts",
  },
  biasAudit: {
    description: "Fair across demographics, evidence levels, edge cases",
    target: "No systematic bias detected",
    method: "Demographic stratification analysis quarterly",
  },
};
