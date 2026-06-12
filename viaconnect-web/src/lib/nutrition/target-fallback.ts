// Prompt #162 section 6.3: nutrition target fallback using Mifflin-St Jeor
// BMR + activity multiplier + goal modifier + macro split.
//
// Replace this entire module call site with `getNutritionTargets()` from the
// protocol engine when that team ships their public entrypoint. Until then,
// every invocation here logs a console.warn so we see the signal.

export interface NutritionTargets {
  readonly calories: number;
  readonly carbs_g: number;
  readonly bad_fat_g: number;
  readonly good_fat_g: number;
  readonly sugar_g: number;
  readonly tier: 0 | 1 | 2 | 3;
  readonly confidence: number;
  readonly source: 'protocol_engine' | 'fallback';
}

// Activity enum aligned with the existing user_health_profile table values
// (sedentary / lightly_active / moderately_active / very_active /
// extremely_active) per Jeffery's audit. If the profile table ever migrates
// to short forms, add a normalizer at the call site rather than diverging.
type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';
type Goal = 'weight_loss' | 'maintenance' | 'muscle_gain' | 'keto' | 'high_protein';
type Sex = 'male' | 'female';

export interface ProfileInput {
  readonly sex?: Sex | null;
  readonly age?: number | null;
  readonly weight_kg?: number | null;
  readonly height_cm?: number | null;
  readonly activity_level?: ActivityLevel | null;
  readonly goal?: Goal | null;
}

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

const GOAL_KCAL_DELTA: Record<Goal, number> = {
  weight_loss: -500,
  maintenance: 0,
  muscle_gain: 250,
  keto: 0,
  high_protein: 0,
};

interface MacroSplit {
  readonly carbsPct: number;
  readonly fatPct: number;
  readonly proteinPct: number;
}

const MACRO_SPLIT: Record<Goal, MacroSplit> = {
  weight_loss:    { carbsPct: 0.45, fatPct: 0.30, proteinPct: 0.25 },
  maintenance:    { carbsPct: 0.45, fatPct: 0.30, proteinPct: 0.25 },
  muscle_gain:    { carbsPct: 0.45, fatPct: 0.30, proteinPct: 0.25 },
  keto:           { carbsPct: 0.05, fatPct: 0.70, proteinPct: 0.25 },
  high_protein:   { carbsPct: 0.30, fatPct: 0.30, proteinPct: 0.40 },
};

function defaults(): {
  sex: Sex;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  goal: Goal;
} {
  return {
    sex: 'male',
    age: 30,
    weight_kg: 75,
    height_cm: 175,
    activity_level: 'moderately_active',
    goal: 'maintenance',
  };
}

export function computeFallbackTargets(profile: ProfileInput): NutritionTargets {
  const sex = profile.sex ?? defaults().sex;
  const age = profile.age ?? defaults().age;
  const weight_kg = profile.weight_kg ?? defaults().weight_kg;
  const height_cm = profile.height_cm ?? defaults().height_cm;
  const activity = profile.activity_level ?? defaults().activity_level;
  const goal = profile.goal ?? defaults().goal;

  // Mifflin-St Jeor BMR
  const sexConstant = sex === 'female' ? -161 : 5;
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + sexConstant;
  const tdee = bmr * ACTIVITY_MULT[activity];
  const calories = Math.round(tdee + GOAL_KCAL_DELTA[goal]);

  const split = MACRO_SPLIT[goal];
  const carbs_g = Math.round((calories * split.carbsPct) / 4);
  const total_fat_g = Math.round((calories * split.fatPct) / 9);

  // Bad fat is the saturated portion (capped at ~10% of fat by default);
  // good fat is the rest. For keto the user is fat-heavy, so the cap is
  // raised slightly (15%) to allow real-world intake without misleading
  // "over" status.
  const badFatPct = goal === 'keto' ? 0.15 : 0.20;
  const bad_fat_g = Math.max(1, Math.round(total_fat_g * badFatPct));
  const good_fat_g = Math.max(1, total_fat_g - bad_fat_g);

  // Sugar cap: 10% of calories converted to grams (kcal / 4), capped at AHA
  // adult limits (36g male, 25g female).
  const sugarCalories = calories * 0.10;
  const sugarRawGrams = sugarCalories / 4;
  const sugarHardCap = sex === 'female' ? 25 : 36;
  const sugar_g = Math.round(Math.min(sugarRawGrams, sugarHardCap));

  return {
    calories,
    carbs_g,
    bad_fat_g,
    good_fat_g,
    sugar_g,
    tier: 0,
    confidence: 0.5,
    source: 'fallback',
  };
}
