// Body Tracker — TypeScript interfaces matching the migration schema.

export type BodyScoreTier = 'Critical' | 'Needs Attention' | 'Developing' | 'Good' | 'Optimal';
export type MilestoneGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
export type MilestoneType = 'weight_goal' | 'body_fat_goal' | 'muscle_gain_goal' | 'consistency' | 'custom';
export type EntrySource = 'manual' | 'device' | 'import';
export type MetricStatus = 'Good' | 'Standard' | 'High' | 'Low';
export type CircadianLevel = 'optimal' | 'moderate' | 'suboptimal' | 'low';

export interface BodyTrackerEntry {
  id: string;
  user_id: string;
  entry_date: string;
  source: EntrySource;
  device_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface BodyWeight {
  id: string;
  entry_id: string;
  user_id: string;
  weight_lbs: number | null;
  goal_weight_lbs: number | null;
  bmi: number | null;
  body_fat_pct: number | null;
  visceral_fat_rating: number | null;
  body_water_pct: number | null;
  waist_in: number | null;
  hips_in: number | null;
  chest_in: number | null;
  neck_in: number | null;
  right_arm_in: number | null;
  left_arm_in: number | null;
  right_thigh_in: number | null;
  left_thigh_in: number | null;
  created_at: string;
}

export interface SegmentalFat {
  id: string;
  entry_id: string;
  user_id: string;
  right_arm_pct: number | null;
  left_arm_pct: number | null;
  trunk_pct: number | null;
  right_leg_pct: number | null;
  left_leg_pct: number | null;
  total_body_fat_pct: number | null;
  created_at: string;
}

export interface SegmentalMuscle {
  id: string;
  entry_id: string;
  user_id: string;
  right_arm_lbs: number | null;
  left_arm_lbs: number | null;
  trunk_lbs: number | null;
  right_leg_lbs: number | null;
  left_leg_lbs: number | null;
  total_muscle_mass_lbs: number | null;
  skeletal_muscle_mass_lbs: number | null;
  created_at: string;
}

export interface MetabolicData {
  id: string;
  entry_id: string;
  user_id: string;
  metabolic_age: number | null;
  resting_hr_bpm: number | null;
  hrv_ms: number | null;
  metabolic_capacity: number | null;
  strain: number | null;
  metabolic_momentum: number | null;
  circadian_readiness: Record<string, CircadianLevel>;
  created_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  milestone_type: MilestoneType;
  title: string;
  description: string | null;
  target_value: number | null;
  target_unit: string | null;
  start_value: number | null;
  current_value: number | null;
  start_date: string;
  target_date: string | null;
  completed_date: string | null;
  expected_days: number | null;
  actual_days: number | null;
  grade: MilestoneGrade | null;
  is_active: boolean;
  milestone_order: number;
  total_milestones: number;
  helix_tokens_awarded: number;
  created_at: string;
}

export interface BodyScore {
  id: string;
  user_id: string;
  score_date: string;
  body_score: number;
  confidence_pct: number;
  composition_grade: string | null;
  weight_grade: string | null;
  muscle_grade: string | null;
  cardiovascular_grade: string | null;
  metabolic_grade: string | null;
  score_delta: number | null;
  tier: BodyScoreTier;
  breakdown_jsonb: Record<string, unknown>;
  created_at: string;
}

export interface QuickMetric {
  label: string;
  value: string;
  unit: string;
  status: MetricStatus;
  trend?: 'up' | 'down' | 'stable';
}
