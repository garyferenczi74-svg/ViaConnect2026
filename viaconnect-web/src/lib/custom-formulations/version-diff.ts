// Prompt #97 Phase 6.3: pure version comparison helper.
//
// Given two formulation snapshots (previous + new), produce a diff keyed
// by intended-use changes, delivery form, claim set, and per-ingredient
// changes (added / removed / dose-changed). Consumed by the version
// comparison UI and by the revision classifier (Phase 4's `classifyRevision`
// consumes the same shape).

export interface VersionSnapshot {
  internalName: string;
  deliveryForm: string;
  unitsPerServing: number;
  servingsPerContainer: number;
  intendedAdultUse: boolean;
  intendedPediatricUse: boolean;
  intendedPregnancyUse: boolean;
  proposedClaims: string[];
  ingredients: Array<{
    ingredientId: string;
    dosePerServing: number;
    doseUnit: string;
    isActive: boolean;
  }>;
}

export interface IngredientDiffEntry {
  ingredientId: string;
  kind: 'added' | 'removed' | 'dose_changed' | 'unit_changed' | 'activity_changed';
  previous?: {
    dosePerServing: number;
    doseUnit: string;
    isActive: boolean;
  };
  next?: {
    dosePerServing: number;
    doseUnit: string;
    isActive: boolean;
  };
  dosePercentChange?: number;
}

export interface VersionDiff {
  nameChanged: boolean;
  deliveryFormChanged: boolean;
  servingStructureChanged: boolean;
  intendedUseChanged: boolean;
  claimsChanged: {
    added: string[];
    removed: string[];
  };
  ingredientDiff: IngredientDiffEntry[];
  summaryLines: string[];
}

export function computeVersionDiff(prev: VersionSnapshot, next: VersionSnapshot): VersionDiff {
  const summary: string[] = [];

  const nameChanged = prev.internalName !== next.internalName;
  if (nameChanged) summary.push(`Name: ${prev.internalName} → ${next.internalName}`);

  const deliveryFormChanged = prev.deliveryForm !== next.deliveryForm;
  if (deliveryFormChanged) {
    summary.push(`Delivery form: ${prev.deliveryForm} → ${next.deliveryForm}`);
  }

  const servingStructureChanged =
    prev.unitsPerServing !== next.unitsPerServing ||
    prev.servingsPerContainer !== next.servingsPerContainer;
  if (servingStructureChanged) {
    summary.push(
      `Serving: ${prev.unitsPerServing}u/serving × ${prev.servingsPerContainer} → ${next.unitsPerServing}u × ${next.servingsPerContainer}`,
    );
  }

  const intendedUseChanged =
    prev.intendedAdultUse !== next.intendedAdultUse ||
    prev.intendedPediatricUse !== next.intendedPediatricUse ||
    prev.intendedPregnancyUse !== next.intendedPregnancyUse;
  if (intendedUseChanged) summary.push('Intended use changed');

  const prevClaims = new Set(prev.proposedClaims);
  const nextClaims = new Set(next.proposedClaims);
  const claimsAdded = [...nextClaims].filter((c) => !prevClaims.has(c));
  const claimsRemoved = [...prevClaims].filter((c) => !nextClaims.has(c));
  if (claimsAdded.length > 0) summary.push(`Claims added: ${claimsAdded.join(', ')}`);
  if (claimsRemoved.length > 0) summary.push(`Claims removed: ${claimsRemoved.join(', ')}`);

  const prevIngMap = new Map(prev.ingredients.map((i) => [i.ingredientId, i]));
  const nextIngMap = new Map(next.ingredients.map((i) => [i.ingredientId, i]));

  const ingredientDiff: IngredientDiffEntry[] = [];

  for (const [id, nextIng] of nextIngMap) {
    const prevIng = prevIngMap.get(id);
    if (!prevIng) {
      ingredientDiff.push({
        ingredientId: id,
        kind: 'added',
        next: {
          dosePerServing: nextIng.dosePerServing,
          doseUnit: nextIng.doseUnit,
          isActive: nextIng.isActive,
        },
      });
      summary.push(`+ ${id} (${nextIng.dosePerServing}${nextIng.doseUnit})`);
      continue;
    }

    if (prevIng.doseUnit !== nextIng.doseUnit) {
      ingredientDiff.push({
        ingredientId: id,
        kind: 'unit_changed',
        previous: {
          dosePerServing: prevIng.dosePerServing,
          doseUnit: prevIng.doseUnit,
          isActive: prevIng.isActive,
        },
        next: {
          dosePerServing: nextIng.dosePerServing,
          doseUnit: nextIng.doseUnit,
          isActive: nextIng.isActive,
        },
      });
      summary.push(`${id} unit: ${prevIng.doseUnit} → ${nextIng.doseUnit}`);
    } else if (prevIng.dosePerServing !== nextIng.dosePerServing) {
      const percentChange =
        prevIng.dosePerServing === 0
          ? 100
          : ((nextIng.dosePerServing - prevIng.dosePerServing) / prevIng.dosePerServing) * 100;
      ingredientDiff.push({
        ingredientId: id,
        kind: 'dose_changed',
        previous: {
          dosePerServing: prevIng.dosePerServing,
          doseUnit: prevIng.doseUnit,
          isActive: prevIng.isActive,
        },
        next: {
          dosePerServing: nextIng.dosePerServing,
          doseUnit: nextIng.doseUnit,
          isActive: nextIng.isActive,
        },
        dosePercentChange: percentChange,
      });
      summary.push(
        `${id} dose: ${prevIng.dosePerServing} → ${nextIng.dosePerServing}${nextIng.doseUnit} (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`,
      );
    } else if (prevIng.isActive !== nextIng.isActive) {
      ingredientDiff.push({
        ingredientId: id,
        kind: 'activity_changed',
        previous: {
          dosePerServing: prevIng.dosePerServing,
          doseUnit: prevIng.doseUnit,
          isActive: prevIng.isActive,
        },
        next: {
          dosePerServing: nextIng.dosePerServing,
          doseUnit: nextIng.doseUnit,
          isActive: nextIng.isActive,
        },
      });
      summary.push(`${id} activity: ${prevIng.isActive ? 'active' : 'excipient'} → ${nextIng.isActive ? 'active' : 'excipient'}`);
    }
  }

  for (const [id, prevIng] of prevIngMap) {
    if (!nextIngMap.has(id)) {
      ingredientDiff.push({
        ingredientId: id,
        kind: 'removed',
        previous: {
          dosePerServing: prevIng.dosePerServing,
          doseUnit: prevIng.doseUnit,
          isActive: prevIng.isActive,
        },
      });
      summary.push(`- ${id}`);
    }
  }

  return {
    nameChanged,
    deliveryFormChanged,
    servingStructureChanged,
    intendedUseChanged,
    claimsChanged: { added: claimsAdded, removed: claimsRemoved },
    ingredientDiff,
    summaryLines: summary,
  };
}
