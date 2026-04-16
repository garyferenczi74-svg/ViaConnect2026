/**
 * Body Tracker Connection Registry (Prompt #85)
 *
 * Defines all available plugin and wearable data sources that can connect
 * to the Body Tracker. Each source specifies its capabilities, auth method,
 * and the types of data it provides.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConnectionSource {
  id: string;
  name: string;
  sourceType: 'plugin' | 'wearable';
  icon: string;           // Lucide icon name
  description: string;
  dataProvided: string[];
  authMethod: 'oauth' | 'api_key' | 'manual_import';
}

// ---------------------------------------------------------------------------
// Plugin sources
// ---------------------------------------------------------------------------

export const PLUGIN_SOURCES: ConnectionSource[] = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    sourceType: 'plugin',
    icon: 'Apple',
    description: 'Import health and fitness data from the Apple Health app on your iPhone.',
    dataProvided: ['weight', 'body_fat', 'heart_rate', 'steps', 'sleep', 'active_energy'],
    authMethod: 'oauth',
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    sourceType: 'plugin',
    icon: 'Activity',
    description: 'Sync fitness and wellness data from Google Fit on Android devices.',
    dataProvided: ['weight', 'body_fat', 'heart_rate', 'steps', 'sleep', 'active_energy'],
    authMethod: 'oauth',
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    sourceType: 'plugin',
    icon: 'Utensils',
    description: 'Import nutrition tracking, calorie counts, and weight logs from MyFitnessPal.',
    dataProvided: ['weight', 'calories', 'macros', 'meals'],
    authMethod: 'oauth',
  },
  {
    id: 'cronometer',
    name: 'Cronometer',
    sourceType: 'plugin',
    icon: 'BarChart3',
    description: 'Sync detailed micronutrient and macronutrient data from Cronometer.',
    dataProvided: ['weight', 'calories', 'macros', 'micronutrients', 'meals'],
    authMethod: 'api_key',
  },
  {
    id: 'strava',
    name: 'Strava',
    sourceType: 'plugin',
    icon: 'Bike',
    description: 'Import workout activities, distance, and performance metrics from Strava.',
    dataProvided: ['workouts', 'distance', 'heart_rate', 'active_energy', 'cadence'],
    authMethod: 'oauth',
  },
];

// ---------------------------------------------------------------------------
// Wearable sources
// ---------------------------------------------------------------------------

export const WEARABLE_SOURCES: ConnectionSource[] = [
  {
    id: 'apple_watch',
    name: 'Apple Watch',
    sourceType: 'wearable',
    icon: 'Watch',
    description: 'Continuous health monitoring including heart rate, HRV, blood oxygen, and activity rings.',
    dataProvided: ['heart_rate', 'hrv', 'blood_oxygen', 'steps', 'active_energy', 'sleep', 'workouts'],
    authMethod: 'oauth',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    sourceType: 'wearable',
    icon: 'Zap',
    description: 'Strain, recovery, and sleep performance tracking optimized for athletes.',
    dataProvided: ['strain', 'recovery', 'hrv', 'heart_rate', 'sleep', 'respiratory_rate'],
    authMethod: 'oauth',
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    sourceType: 'wearable',
    icon: 'Circle',
    description: 'Sleep quality, readiness scores, and body temperature trends from the Oura Ring.',
    dataProvided: ['sleep', 'hrv', 'heart_rate', 'body_temperature', 'readiness', 'activity'],
    authMethod: 'oauth',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    sourceType: 'wearable',
    icon: 'Navigation',
    description: 'GPS fitness tracking, body composition, stress, and advanced workout analytics.',
    dataProvided: ['heart_rate', 'hrv', 'steps', 'stress', 'body_battery', 'sleep', 'workouts', 'body_composition'],
    authMethod: 'oauth',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    sourceType: 'wearable',
    icon: 'Heart',
    description: 'Daily activity, heart rate, sleep stages, and wellness metrics from Fitbit devices.',
    dataProvided: ['heart_rate', 'steps', 'sleep', 'active_energy', 'weight', 'body_fat'],
    authMethod: 'oauth',
  },
  {
    id: 'hume_body_pod',
    name: 'Hume Body Pod',
    sourceType: 'wearable',
    icon: 'Scan',
    description: 'Precision body composition analysis including segmental muscle and fat measurements.',
    dataProvided: ['body_fat', 'muscle_mass', 'segmental_fat', 'segmental_muscle', 'visceral_fat', 'body_water'],
    authMethod: 'api_key',
  },
  {
    id: 'withings',
    name: 'Withings',
    sourceType: 'wearable',
    icon: 'Scale',
    description: 'Smart scale, blood pressure, and sleep tracking from Withings connected devices.',
    dataProvided: ['weight', 'body_fat', 'muscle_mass', 'body_water', 'bone_mass', 'heart_rate', 'blood_pressure', 'sleep'],
    authMethod: 'oauth',
  },
];

// ---------------------------------------------------------------------------
// Combined registry
// ---------------------------------------------------------------------------

export const ALL_SOURCES: ConnectionSource[] = [...PLUGIN_SOURCES, ...WEARABLE_SOURCES];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Look up a connection source by its unique ID.
 */
export function getSourceById(sourceId: string): ConnectionSource | undefined {
  return ALL_SOURCES.find((s) => s.id === sourceId);
}

/**
 * Filter sources by type ('plugin' or 'wearable').
 */
export function getSourcesByType(sourceType: 'plugin' | 'wearable'): ConnectionSource[] {
  return ALL_SOURCES.filter((s) => s.sourceType === sourceType);
}
