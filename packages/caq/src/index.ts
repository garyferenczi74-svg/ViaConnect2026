export type ClinicalQuestion = {
  id: string;
  category: string;
  question: string;
  options?: string[];
  required: boolean;
};

export type ClinicalAssessment = {
  id: string;
  patientId: string;
  responses: Record<string, string | string[]>;
  completedAt?: Date;
  score?: number;
};

export function calculateAssessmentScore(_assessment: ClinicalAssessment): number {
  // Placeholder - will implement scoring logic
  return 0;
}
