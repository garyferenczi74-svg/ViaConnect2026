// Map CAQ Lifestyle (phase 3) activity / exercise values onto
// MacroActivityLevel for generateMacroTargets. The generate-targets route
// is the only nutrition_targets writer; this helper is the activity
// normalizer that route uses.
//
// Frequency labels come from EXERCISE_FREQ in
// src/app/(auth)/onboarding/[step]/page.tsx:
//   ["Never", "1-2x/week", "3-4x/week", "5-6x/week", "Daily"]
// Live prod distinct values observed on assessment_results.phase=3.exercise:
//   Never, 1-2x/week, 3-4x/week, 5-6x/week, ""
// Daily is in the CAQ select (the 7x / every-day option) even when no
// live row has picked it yet. Empty / unknown strings map to sedentary so
// a completed Lifestyle phase still produces a row; non-string (missing
// field) stays null so generateMacroTargets can 422 estimate_unavailable.

import {
  ACTIVITY_MULTIPLIERS,
  type MacroActivityLevel,
} from '@/lib/gordon/macro-config';

function isMacroActivityLevel(value: string): value is MacroActivityLevel {
  return Object.prototype.hasOwnProperty.call(ACTIVITY_MULTIPLIERS, value);
}

export function normalizeActivity(value: unknown): MacroActivityLevel | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return 'sedentary';

  const v = trimmed.toLowerCase().replace(/[\s-]/g, '_');
  if (isMacroActivityLevel(v)) return v;

  // Legacy short forms used in earlier CAQ / Body Tracker snapshots.
  if (v === 'light') return 'lightly_active';
  if (v === 'moderate') return 'moderately_active';
  if (v === 'very') return 'very_active';
  if (v === 'athlete' || v === 'extra') return 'extra_active';

  // CAQ frequency strings. Hyphens already became underscores above;
  // slashes become underscores so "1-2x/week" -> "1_2x_week".
  const compact = v.replace(/\//g, '_');
  if (compact === 'never' || compact === 'rarely') return 'sedentary';
  if (compact === '1_2x_week' || compact.startsWith('1_2x')) return 'lightly_active';
  if (compact === '3_4x_week' || compact.startsWith('3_4x')) return 'moderately_active';
  if (compact === '5_6x_week' || compact.startsWith('5_6x')) return 'very_active';
  if (
    compact === 'daily' ||
    compact === 'every_day' ||
    compact === '7x' ||
    compact === '7x_week' ||
    compact.startsWith('7x')
  ) {
    return 'extra_active';
  }

  // Unknown non-empty string: same as unanswered frequency.
  return 'sedentary';
}
