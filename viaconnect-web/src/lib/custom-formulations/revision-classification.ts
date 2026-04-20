// Prompt #97 Phase 6 (used by Phase 4 revision workflow):
// pure classification of a revision's depth.
//
// minor       small dose tweaks, excipient swaps, flavor — accelerated SLA
// substantive dose >10%, ingredient add/remove, claim change — re-charge medical review fee
// material    intended-use shift, delivery-form change, multi-ingredient churn — re-charge 50% dev fee

export type RevisionClassification = 'minor' | 'substantive' | 'material';

export interface RevisionDiffInput {
  previous: {
    intendedAdultUse: boolean;
    intendedPediatricUse: boolean;
    intendedPregnancyUse: boolean;
    deliveryForm: string;
    proposedClaims: string[];
    ingredients: Array<{ ingredientId: string; dosePerServing: number; isActive: boolean }>;
  };
  next: {
    intendedAdultUse: boolean;
    intendedPediatricUse: boolean;
    intendedPregnancyUse: boolean;
    deliveryForm: string;
    proposedClaims: string[];
    ingredients: Array<{ ingredientId: string; dosePerServing: number; isActive: boolean }>;
  };
}

export interface RevisionClassificationResult {
  classification: RevisionClassification;
  reasons: string[];
}

export function classifyRevision(input: RevisionDiffInput): RevisionClassificationResult {
  const reasons: string[] = [];
  const prev = input.previous;
  const next = input.next;

  // Material: intended-use shift or delivery-form change or >= 3 ingredient
  // changes.
  const useShift =
    prev.intendedAdultUse !== next.intendedAdultUse ||
    prev.intendedPediatricUse !== next.intendedPediatricUse ||
    prev.intendedPregnancyUse !== next.intendedPregnancyUse;
  if (useShift) reasons.push('Intended use changed');

  const formChange = prev.deliveryForm !== next.deliveryForm;
  if (formChange) reasons.push('Delivery form changed');

  const prevIds = new Set(prev.ingredients.filter((i) => i.isActive).map((i) => i.ingredientId));
  const nextIds = new Set(next.ingredients.filter((i) => i.isActive).map((i) => i.ingredientId));

  const added = [...nextIds].filter((id) => !prevIds.has(id));
  const removed = [...prevIds].filter((id) => !nextIds.has(id));
  const ingredientChanges = added.length + removed.length;
  if (ingredientChanges > 0) {
    reasons.push(`${added.length} ingredient(s) added, ${removed.length} removed`);
  }

  if (useShift || formChange || ingredientChanges >= 3) {
    return { classification: 'material', reasons };
  }

  // Substantive: dose change >10% on any shared ingredient, OR any active
  // ingredient add/remove (1 or 2), OR claim set changed.
  let hasBigDoseChange = false;
  for (const nextIng of next.ingredients) {
    if (!nextIng.isActive) continue;
    const prevIng = prev.ingredients.find((i) => i.ingredientId === nextIng.ingredientId);
    if (!prevIng) continue;
    if (prevIng.dosePerServing === 0 && nextIng.dosePerServing === 0) continue;
    const base = prevIng.dosePerServing;
    if (base === 0) {
      hasBigDoseChange = true;
      break;
    }
    const delta = Math.abs(nextIng.dosePerServing - base) / base;
    if (delta > 0.1) {
      hasBigDoseChange = true;
      break;
    }
  }
  if (hasBigDoseChange) reasons.push('Active ingredient dose changed by >10%');

  const claimChange = !setsEqual(new Set(prev.proposedClaims), new Set(next.proposedClaims));
  if (claimChange) reasons.push('Proposed structure/function claims changed');

  if (hasBigDoseChange || ingredientChanges > 0 || claimChange) {
    return { classification: 'substantive', reasons };
  }

  reasons.push('Only cosmetic or sub-10% changes detected');
  return { classification: 'minor', reasons };
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
