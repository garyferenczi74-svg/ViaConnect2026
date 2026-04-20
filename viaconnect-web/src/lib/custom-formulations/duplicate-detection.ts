// Prompt #97 Phase 4.4: formulation similarity + duplicate detection.
//
// When two formulations share substantially the same ingredient set at
// similar doses, they may violate the exclusive-use commitment ViaCura
// extends to its Level 4 practitioners. The validation engine surfaces
// similarity scores above 0.85 as duplicate candidates so the admin
// reviewing the new formulation can see the conflict before granting
// approval.

export interface FormulationSnapshot {
  id: string;
  practitionerId: string;
  internalName: string;
  ingredients: Array<{
    ingredientId: string;
    dosePerServing: number;
  }>;
}

export interface SimilarFormulation {
  id: string;
  practitionerId: string;
  internalName: string;
  similarityScore: number;
}

/** Pure: Jaccard-on-ingredient-set (60%) + dose similarity on shared
 *  ingredients (40%). Returns a value in [0,1]. Identical formulations
 *  score 1.0; completely disjoint ingredient sets score 0.0. */
export function computeSimilarity(a: FormulationSnapshot, b: FormulationSnapshot): number {
  const aIds = new Set(a.ingredients.map((i) => i.ingredientId));
  const bIds = new Set(b.ingredients.map((i) => i.ingredientId));

  const intersection = new Set<string>();
  for (const id of aIds) {
    if (bIds.has(id)) intersection.add(id);
  }
  const union = new Set<string>([...aIds, ...bIds]);

  if (union.size === 0) return 0;
  const jaccard = intersection.size / union.size;

  // Disjoint sets: jaccard is already 0, so overall similarity is 0.
  if (intersection.size === 0) return 0;

  let doseSimSum = 0;
  for (const id of intersection) {
    const aDose = a.ingredients.find((x) => x.ingredientId === id)?.dosePerServing ?? 0;
    const bDose = b.ingredients.find((x) => x.ingredientId === id)?.dosePerServing ?? 0;
    if (aDose === 0 && bDose === 0) {
      doseSimSum += 1;
    } else if (aDose === 0 || bDose === 0) {
      doseSimSum += 0;
    } else {
      const ratio = Math.min(aDose, bDose) / Math.max(aDose, bDose);
      doseSimSum += ratio;
    }
  }
  const doseSim = doseSimSum / intersection.size;

  return jaccard * 0.6 + doseSim * 0.4;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  similarFormulations: SimilarFormulation[];
  thresholdUsed: number;
}

/** Pure: find similar formulations from other practitioners at or above
 *  a similarity threshold (default 0.85 per Prompt #97 spec). Callers
 *  pre-filter to `status = approved_production_ready` and exclude the
 *  target formulation's own practitioner. */
export function detectDuplicates(
  target: FormulationSnapshot,
  otherApprovedFormulations: FormulationSnapshot[],
  threshold = 0.85,
): DuplicateDetectionResult {
  const similar: SimilarFormulation[] = [];
  for (const other of otherApprovedFormulations) {
    if (other.practitionerId === target.practitionerId) continue;
    const score = computeSimilarity(target, other);
    if (score >= threshold) {
      similar.push({
        id: other.id,
        practitionerId: other.practitionerId,
        internalName: other.internalName,
        similarityScore: score,
      });
    }
  }
  similar.sort((a, b) => b.similarityScore - a.similarityScore);
  return {
    isDuplicate: similar.length > 0,
    similarFormulations: similar,
    thresholdUsed: threshold,
  };
}
