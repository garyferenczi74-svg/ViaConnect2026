export type Interaction = {
  id: string;
  herbId: string;
  targetType: 'herb' | 'drug' | 'supplement' | 'gene';
  targetId: string;
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'contraindicated';
  description: string;
  evidence: string[];
};

export function checkInteractions(_herbIds: string[], _targetIds: string[]): Interaction[] {
  // Placeholder - will query interaction database
  return [];
}
