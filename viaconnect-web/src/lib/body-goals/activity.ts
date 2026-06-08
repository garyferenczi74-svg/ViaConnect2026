// Prompt 179 Section 5.2: activity multiplier maps, keyed by the body_goals
// activity enum. The multiplier VALUES match the macro engine; the key NAMES
// differ (body_goals uses the short form), so this is the single mapping home.

import type { GoalActivityLevel } from './types';
import type { ActivityLevel as HydrationActivity } from '@/lib/nutrition/hydration/target-personalizer';

const GOAL_ACTIVITY_MULTIPLIER: Record<GoalActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

// Default to light per 179 Section 5.2 when activity is unknown.
export function goalActivityMultiplier(level: GoalActivityLevel | null): number {
  return GOAL_ACTIVITY_MULTIPLIER[level ?? 'light'];
}

const GOAL_TO_HYDRATION: Record<GoalActivityLevel, HydrationActivity> = {
  sedentary: 'sedentary',
  light: 'light',
  moderate: 'moderate',
  very: 'intense',
  extra: 'intense',
};

export function goalToHydrationActivity(level: GoalActivityLevel | null): HydrationActivity {
  return GOAL_TO_HYDRATION[level ?? 'light'];
}
