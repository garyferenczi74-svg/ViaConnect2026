// Multi-source conflict resolver (Prompt #62j).
// When multiple sources provide data for the same gauge on the same day,
// picks the winner based on tier, completeness, and recency.

import type { NormalizedData } from './dataNormalizer';

export interface ConflictResolution {
  strategy: 'highest_tier' | 'most_recent' | 'merge';
  winner: NormalizedData;
  reason: string;
}

export function resolveConflicts(items: NormalizedData[]): NormalizedData[] {
  // Group by dataType + date
  const groups = new Map<string, NormalizedData[]>();
  for (const item of items) {
    const key = `${item.dataType}:${item.date}`;
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }

  const results: NormalizedData[] = [];

  for (const [, group] of groups) {
    if (group.length === 1) {
      results.push(group[0]);
      continue;
    }

    // Meals from different sources merge (different meal types coexist)
    if (group[0].dataType === 'meal') {
      const byMealType = new Map<string, NormalizedData[]>();
      for (const item of group) {
        const mealType = (item.data as any).mealType ?? 'other';
        const existing = byMealType.get(mealType) ?? [];
        existing.push(item);
        byMealType.set(mealType, existing);
      }

      for (const [, mealGroup] of byMealType) {
        if (mealGroup.length === 1) {
          results.push(mealGroup[0]);
        } else {
          // Same meal type from multiple sources: highest tier wins
          results.push(pickWinner(mealGroup));
        }
      }
      continue;
    }

    // Non-meal data: highest tier wins
    results.push(pickWinner(group));
  }

  return results;
}

function pickWinner(group: NormalizedData[]): NormalizedData {
  return group.sort((a, b) => {
    // Lower tier number = higher priority
    if (a.source.tier !== b.source.tier) return a.source.tier - b.source.tier;
    // Same tier: most recent wins
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  })[0];
}
