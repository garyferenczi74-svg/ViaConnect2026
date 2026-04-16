// Supported third-party app registry (Prompt #62j).

export type AppCategory = 'nutrition' | 'fitness' | 'mindfulness' | 'health';
export type SyncMethod = 'webhook' | 'polling' | 'healthkit';

export interface AppDefinition {
  id: string;
  name: string;
  category: AppCategory;
  dataProvided: string[];
  gaugesAffected: string[];
  syncMethod: SyncMethod;
  tier: 1 | 2;
  oauthUrl?: string;
}

export const APP_REGISTRY: AppDefinition[] = [
  // Nutrition
  { id: 'myfitnesspal', name: 'MyFitnessPal', category: 'nutrition', dataProvided: ['Meals', 'Macros', 'Water'], gaugesAffected: ['nutrition'], syncMethod: 'webhook', tier: 2 },
  { id: 'cronometer', name: 'Cronometer', category: 'nutrition', dataProvided: ['Meals', 'Macros', 'Micronutrients'], gaugesAffected: ['nutrition'], syncMethod: 'polling', tier: 2 },
  { id: 'noom', name: 'Noom', category: 'nutrition', dataProvided: ['Meals', 'Weight'], gaugesAffected: ['nutrition'], syncMethod: 'polling', tier: 2 },
  { id: 'loseit', name: 'Lose It!', category: 'nutrition', dataProvided: ['Meals', 'Calories', 'Weight'], gaugesAffected: ['nutrition'], syncMethod: 'polling', tier: 2 },

  // Fitness + Wearables
  { id: 'apple_health', name: 'Apple Health', category: 'fitness', dataProvided: ['Steps', 'Workouts', 'Sleep', 'HRV', 'Heart Rate'], gaugesAffected: ['sleep', 'exercise', 'steps', 'stress', 'recovery'], syncMethod: 'healthkit', tier: 1 },
  { id: 'fitbit', name: 'Fitbit', category: 'fitness', dataProvided: ['Steps', 'Sleep', 'Activity', 'HRV', 'SpO2'], gaugesAffected: ['sleep', 'exercise', 'steps', 'stress', 'recovery'], syncMethod: 'webhook', tier: 1 },
  { id: 'oura', name: 'Oura', category: 'fitness', dataProvided: ['Sleep Stages', 'Readiness', 'HRV', 'Temperature'], gaugesAffected: ['sleep', 'recovery', 'stress'], syncMethod: 'webhook', tier: 1 },
  { id: 'whoop', name: 'Whoop', category: 'fitness', dataProvided: ['Recovery', 'Strain', 'Sleep', 'HRV'], gaugesAffected: ['recovery', 'exercise', 'sleep', 'stress'], syncMethod: 'webhook', tier: 1 },
  { id: 'garmin', name: 'Garmin', category: 'fitness', dataProvided: ['Steps', 'Training Load', 'Body Battery', 'Sleep'], gaugesAffected: ['steps', 'exercise', 'sleep', 'recovery'], syncMethod: 'webhook', tier: 1 },
  { id: 'strava', name: 'Strava', category: 'fitness', dataProvided: ['Workouts', 'Distance', 'Heart Rate'], gaugesAffected: ['exercise'], syncMethod: 'webhook', tier: 2 },
  { id: 'peloton', name: 'Peloton', category: 'fitness', dataProvided: ['Workouts', 'Output', 'Heart Rate'], gaugesAffected: ['exercise'], syncMethod: 'polling', tier: 2 },

  // Mindfulness
  { id: 'headspace', name: 'Headspace', category: 'mindfulness', dataProvided: ['Meditation Minutes', 'Sessions'], gaugesAffected: ['stress'], syncMethod: 'polling', tier: 2 },
  { id: 'calm', name: 'Calm', category: 'mindfulness', dataProvided: ['Meditation Minutes', 'Sleep Stories'], gaugesAffected: ['stress', 'sleep'], syncMethod: 'polling', tier: 2 },

  // Health + Emotion
  { id: 'hume', name: 'Hume', category: 'health', dataProvided: ['Emotional Expression', 'Vocal Biomarkers', 'Sentiment Tracking'], gaugesAffected: ['stress', 'recovery'], syncMethod: 'webhook', tier: 1 },
];

export function getAppDef(appId: string): AppDefinition | undefined {
  return APP_REGISTRY.find((a) => a.id === appId);
}

export function getAppsByCategory(category: AppCategory): AppDefinition[] {
  return APP_REGISTRY.filter((a) => a.category === category);
}
