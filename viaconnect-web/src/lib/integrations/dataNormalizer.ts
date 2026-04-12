// Base normalized data schema (Prompt #62j).
// Every external data source converts to this format before
// entering the pipeline.

export interface NormalizedData {
  id: string;
  userId: string;
  dataType: 'meal' | 'workout' | 'sleep' | 'steps' | 'heart_rate' | 'hrv' | 'weight' | 'mindfulness' | 'water';
  source: {
    appId: string;
    appName: string;
    tier: 1 | 2;
    originalId: string;
  };
  timestamp: string;
  date: string;
  data: NormalizedPayload;
  raw: unknown;
}

export type NormalizedPayload =
  | NormalizedMeal
  | NormalizedWorkout
  | NormalizedSleep
  | NormalizedSteps
  | NormalizedHRV
  | NormalizedMindfulness;

export interface NormalizedMeal {
  type: 'meal';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: NormalizedFoodItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; sodium?: number };
  micronutrients?: { nutrient: string; amount: number; unit: string; dailyValuePercent: number }[];
}

export interface NormalizedFoodItem {
  name: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NormalizedWorkout {
  type: 'workout';
  activityType: string;
  durationMinutes: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  distance?: number;
  distanceUnit?: string;
}

export interface NormalizedSleep {
  type: 'sleep';
  totalHours: number;
  efficiency: number;
  remMinutes?: number;
  deepMinutes?: number;
  lightMinutes?: number;
  awakeMinutes?: number;
  restingHR?: number;
  hrv?: number;
  readinessScore?: number;
}

export interface NormalizedSteps {
  type: 'steps';
  count: number;
  distanceKm?: number;
}

export interface NormalizedHRV {
  type: 'hrv';
  avgMs: number;
  restingHR?: number;
}

export interface NormalizedMindfulness {
  type: 'mindfulness';
  durationMinutes: number;
  sessionCount: number;
}
