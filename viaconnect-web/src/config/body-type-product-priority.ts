// FarmCeutica Product Priority by Body Type
// Used by Ultrathink to adjust peptide + supplement recommendations for underweight users

export const BODY_TYPE_PRODUCT_PRIORITY = {
  ectomorph: {
    primary: ["MitoPeptide\u2122", "EnergyCore\u2122", "ATP-Regen\u2122"],
    secondary: ["AdrenoPeptide\u2122", "GutShield\u2122"],
    rationale: "Mitochondrial energy + adrenal recovery for fast-metabolism hardgainers",
    macroFocus: "Calorie surplus with emphasis on complex carbs + healthy fats",
    trainingHint: "Compound lifts, low volume, adequate rest days",
  },
  mesomorph: {
    primary: ["AdrenoPeptide\u2122", "ImmunoGuard\u2122", "RecoveryPulse\u2122"],
    secondary: ["EndoHarmonize\u2122", "GutShield\u2122"],
    rationale: "Recovery optimization + root cause investigation for athletic frames",
    macroFocus: "Moderate surplus with high protein for muscle rebuilding",
    trainingHint: "Progressive overload, hypertrophy focus, recovery priority",
  },
  endomorph: {
    primary: ["EndoHarmonize\u2122", "DetoxFlow\u2122", "EnergyCore\u2122"],
    secondary: ["GutShield\u2122", "AdrenoPeptide\u2122"],
    rationale: "Metabolic + hormonal investigation for underweight wider frames",
    macroFocus: "Balanced macros with focus on nutrient density over volume",
    trainingHint: "Mix of resistance + metabolic conditioning, thyroid-aware programming",
  },
} as const;

export type BodyType = keyof typeof BODY_TYPE_PRODUCT_PRIORITY;

export const BODY_TYPE_PATTERN_WEIGHTS: Record<string, Record<string, number>> = {
  ectomorph: {
    mitochondrial: 0.2,
    adrenal: 0.15,
    gut: 0.1,
  },
  mesomorph: {
    adrenal: 0.2,
    immune: 0.15,
    hormonal: 0.1,
  },
  endomorph: {
    metabolic: 0.25,
    hormonal: 0.2,
    gut: 0.15,
  },
};
