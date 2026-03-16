export type PersonalizationLevel = 'highly_personalized' | 'personalized' | 'general_wellness' | 'incomplete';

export type PersonalizationScore = {
  total: number;
  level: PersonalizationLevel;
  components: {
    genetic_match: number;
    clinical_evidence: number;
    safety_profile: number;
    user_goals: number;
  };
};

export type PersonalizationInput = {
  hasGeneticData: boolean;
  geneticPathwaysAnalyzed: number;
  totalPathways: number;
  caqCompleted: boolean;
  caqModulesCompleted: number;
  totalCAQModules: number;
  hasInteractionCheck: boolean;
  interactionsResolved: number;
  totalInteractions: number;
  goalsSet: number;
  goalsWithProtocols: number;
};

const WEIGHTS = {
  genetic_match: 0.35,
  clinical_evidence: 0.30,
  safety_profile: 0.25,
  user_goals: 0.10,
} as const;

export function calculatePersonalizationScore(input: PersonalizationInput): PersonalizationScore {
  // Genetic Match (35%): How much genetic data we have
  const geneticMatch = input.hasGeneticData
    ? Math.min(100, (input.geneticPathwaysAnalyzed / Math.max(1, input.totalPathways)) * 100)
    : 0;

  // Clinical Evidence (30%): CAQ completeness
  const clinicalEvidence = input.caqCompleted
    ? 100
    : (input.caqModulesCompleted / Math.max(1, input.totalCAQModules)) * 100;

  // Safety Profile (25%): Interaction checking coverage
  const safetyProfile = input.hasInteractionCheck
    ? input.totalInteractions === 0
      ? 100
      : Math.min(100, (input.interactionsResolved / input.totalInteractions) * 100)
    : 0;

  // User Goals (10%): Goals with active protocols
  const userGoals = input.goalsSet > 0
    ? Math.min(100, (input.goalsWithProtocols / input.goalsSet) * 100)
    : 0;

  const total = Math.round(
    geneticMatch * WEIGHTS.genetic_match +
    clinicalEvidence * WEIGHTS.clinical_evidence +
    safetyProfile * WEIGHTS.safety_profile +
    userGoals * WEIGHTS.user_goals
  );

  let level: PersonalizationLevel;
  if (total >= 85) level = 'highly_personalized';
  else if (total >= 60) level = 'personalized';
  else if (total >= 30) level = 'general_wellness';
  else level = 'incomplete';

  return {
    total,
    level,
    components: {
      genetic_match: Math.round(geneticMatch),
      clinical_evidence: Math.round(clinicalEvidence),
      safety_profile: Math.round(safetyProfile),
      user_goals: Math.round(userGoals),
    },
  };
}

export const PERSONALIZATION_LABELS: Record<PersonalizationLevel, string> = {
  highly_personalized: 'Highly Personalized',
  personalized: 'Personalized',
  general_wellness: 'General Wellness',
  incomplete: 'Incomplete',
};
