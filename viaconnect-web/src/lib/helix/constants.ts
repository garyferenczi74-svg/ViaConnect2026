// ============================================================
// Helix Rewards System — Constants
// ViaConnect 2026
// ============================================================

/** Helix earning values for every trackable action */
export const HELIX_VALUES = {
  // Daily actions
  supplement: 25,
  steps_5k: 10,
  steps_7500: 30,
  steps_10k: 50,
  meal: 15,
  checkin: 10,
  workout: 35,
  sleep: 20,
  weight: 10,
  biomarker: 15,

  // Referrals
  referral: 500,
  friend_bonus: 250,

  // Subscription
  subscription_bonus: 1000,

  // Research
  research_monthly: 200,

  // Streak multipliers (applied to daily total)
  streak_7day_multiplier: 2,
  streak_14day_multiplier: 3,
  streak_30day_multiplier: 5,
} as const;

export type HelixValueKey = keyof typeof HELIX_VALUES;

/** Level progression thresholds — 10 levels */
export const LEVEL_THRESHOLDS = [
  { level: 1,  name: 'Newcomer',      minHelix: 0,      icon: '🌱' },
  { level: 2,  name: 'Explorer',      minHelix: 100,    icon: '🧭' },
  { level: 3,  name: 'Achiever',      minHelix: 500,    icon: '⭐' },
  { level: 4,  name: 'Specialist',    minHelix: 1500,   icon: '🔬' },
  { level: 5,  name: 'Champion',      minHelix: 3500,   icon: '🏆' },
  { level: 6,  name: 'Visionary',     minHelix: 7500,   icon: '👁️' },
  { level: 7,  name: 'Luminary',      minHelix: 15000,  icon: '💡' },
  { level: 8,  name: 'Pioneer',       minHelix: 30000,  icon: '🚀' },
  { level: 9,  name: 'Legend',        minHelix: 60000,  icon: '🌟' },
  { level: 10, name: 'Transcendent',  minHelix: 100000, icon: '🧬' },
] as const;

export type LevelThreshold = (typeof LEVEL_THRESHOLDS)[number];

/** Daily action type definitions */
export const DAILY_ACTION_TYPES: Record<
  string,
  { label: string; icon: string; helix: number; category: string }
> = {
  supplement: {
    label: 'Supplement Logged',
    icon: '💊',
    helix: HELIX_VALUES.supplement,
    category: 'nutrition',
  },
  steps_5k: {
    label: '5,000 Steps',
    icon: '🚶',
    helix: HELIX_VALUES.steps_5k,
    category: 'fitness',
  },
  steps_7500: {
    label: '7,500 Steps',
    icon: '🏃',
    helix: HELIX_VALUES.steps_7500,
    category: 'fitness',
  },
  steps_10k: {
    label: '10,000 Steps',
    icon: '🏅',
    helix: HELIX_VALUES.steps_10k,
    category: 'fitness',
  },
  meal: {
    label: 'Meal Logged',
    icon: '🍽️',
    helix: HELIX_VALUES.meal,
    category: 'nutrition',
  },
  checkin: {
    label: 'Daily Check-in',
    icon: '✅',
    helix: HELIX_VALUES.checkin,
    category: 'engagement',
  },
  workout: {
    label: 'Workout Completed',
    icon: '💪',
    helix: HELIX_VALUES.workout,
    category: 'fitness',
  },
  sleep: {
    label: 'Sleep Tracked',
    icon: '😴',
    helix: HELIX_VALUES.sleep,
    category: 'recovery',
  },
  weight: {
    label: 'Weight Logged',
    icon: '⚖️',
    helix: HELIX_VALUES.weight,
    category: 'tracking',
  },
  biomarker: {
    label: 'Biomarker Recorded',
    icon: '🧪',
    helix: HELIX_VALUES.biomarker,
    category: 'testing',
  },
} as const;
