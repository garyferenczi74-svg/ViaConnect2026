// CAQ source for the Bio Optimization Score compute bundle.
//
// Reads the most recent completed CAQ row from caq_assessment_versions.
// Source-of-truth column: status = 'completed'. The 7 jsonb phase
// columns are exposed via source_specific.phases for Hannah (Phase C)
// to consume when computing the baseline score.
//
// baseline_score is returned as null in Phase B; Hannah agent computes
// it from the phase jsonb during Phase C.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CAQSource {
  completed: boolean;
  completed_at: string | null;
  baseline_score: number | null;
  version_number: number | null;
  source_specific?: {
    phases: {
      demographics: unknown;
      health_concerns: unknown;
      physical_symptoms: unknown;
      neuro_symptoms: unknown;
      emotional_symptoms: unknown;
      medications: unknown;
      supplements: unknown;
      allergies: unknown;
      lifestyle: unknown;
    };
  };
}

const EMPTY: CAQSource = {
  completed: false,
  completed_at: null,
  baseline_score: null,
  version_number: null,
};

export async function getCAQSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<CAQSource> {
  try {
    const { data, error } = await supabase
      .from('caq_assessment_versions')
      .select(
        'status, completed_at, version_number, demographics, health_concerns, physical_symptoms, neuro_symptoms, emotional_symptoms, medications, supplements, allergies, lifestyle',
      )
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return EMPTY;
    }

    const row = data as Record<string, unknown>;
    return {
      completed: row.status === 'completed',
      completed_at: (row.completed_at as string | null) ?? null,
      baseline_score: null,
      version_number: (row.version_number as number | null) ?? null,
      source_specific: {
        phases: {
          demographics: row.demographics ?? null,
          health_concerns: row.health_concerns ?? null,
          physical_symptoms: row.physical_symptoms ?? null,
          neuro_symptoms: row.neuro_symptoms ?? null,
          emotional_symptoms: row.emotional_symptoms ?? null,
          medications: row.medications ?? null,
          supplements: row.supplements ?? null,
          allergies: row.allergies ?? null,
          lifestyle: row.lifestyle ?? null,
        },
      },
    };
  } catch {
    return EMPTY;
  }
}
