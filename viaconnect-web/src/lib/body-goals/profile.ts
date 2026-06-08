// Prompt 179: read the demographics snapshot a goal needs (sex, age, height,
// activity) from the canonical CAQ source (assessment_results phase 1 + 3),
// mirroring the generate-targets route. Height is converted cm -> in for the
// body_goals snapshot. Fails soft to nulls so buildGoalTarget can surface a
// setup prompt rather than guess.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { BiologicalSex } from '@/lib/gordon/generateMacroTargets';
import type { GoalActivityLevel } from './types';

const CM_PER_IN = 2.54;

function normalizeSex(v: unknown): BiologicalSex | null {
  const s = String(v ?? '').toLowerCase();
  if (s.startsWith('m')) return 'male';
  if (s.startsWith('f') || s.startsWith('w')) return 'female';
  return s ? 'unspecified' : null;
}
function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function normalizeActivity(v: unknown): GoalActivityLevel | null {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('sedentary')) return 'sedentary';
  if (s.includes('extra') || s.includes('athlete')) return 'extra';
  if (s.includes('very')) return 'very';
  if (s.includes('moder')) return 'moderate';
  if (s.includes('light')) return 'light';
  return null;
}

export interface GoalProfile {
  sex: BiologicalSex | null;
  ageYears: number | null;
  heightIn: number | null;
  activityLevel: GoalActivityLevel | null;
}

export async function readGoalProfile(userId: string, supabase: SupabaseClient): Promise<GoalProfile> {
  try {
    const { data } = await withTimeout<{ data: Array<{ phase: number; data: Record<string, unknown> }> | null }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('assessment_results').select('phase, data').eq('user_id', userId).in('phase', [1, 3]),
      8000,
      'readGoalProfile',
    );
    const rows = data ?? [];
    const p1 = rows.find((r) => r.phase === 1)?.data ?? {};
    const p3 = rows.find((r) => r.phase === 3)?.data ?? {};
    const heightCm = numOrNull(p1.height);
    return {
      sex: normalizeSex(p1.sex),
      ageYears: numOrNull(p1.age),
      heightIn: heightCm !== null ? Math.round((heightCm / CM_PER_IN) * 10) / 10 : null,
      activityLevel: normalizeActivity(p3.activity_level ?? p3.activity ?? p3.activityLevel),
    };
  } catch (err) {
    safeLog.warn('readGoalProfile', 'profile read failed', { err, userId });
    return { sex: null, ageYears: null, heightIn: null, activityLevel: null };
  }
}
