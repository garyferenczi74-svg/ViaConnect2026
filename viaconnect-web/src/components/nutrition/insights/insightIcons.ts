// Prompt 192 Task 4: InsightType to Lucide icon map, shared by the My
// Nutrition hub tile and the /nutrition/insights page so the two surfaces can
// never drift. Consumers render these at strokeWidth 1.5 per the standing rule.

import {
  Clock3,
  Droplets,
  Flame,
  Lightbulb,
  Pill,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { InsightType } from '@/lib/nutrition/insights/types';

export const INSIGHT_TYPE_ICONS: Record<InsightType, LucideIcon> = {
  macro_gap: TrendingUp,
  micronutrient_gap: Lightbulb,
  meal_timing_pattern: Clock3,
  hydration_correlation: Droplets,
  supplement_meal_alignment: Pill,
  quality_trend: TrendingUp,
  consistency_streak: Flame,
  score_mover: Lightbulb,
};
