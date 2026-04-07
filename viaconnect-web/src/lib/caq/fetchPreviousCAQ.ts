// Fetch the most recent completed CAQ for pre-populating retake

import { createClient } from "@/lib/supabase/client";

export interface PreviousCAQData {
  assessmentId: string;
  versionNumber: number;
  demographics: Record<string, unknown>;
  healthConcerns: Record<string, unknown>;
  physicalSymptoms: Record<string, unknown>;
  neuroSymptoms: Record<string, unknown>;
  emotionalSymptoms: Record<string, unknown>;
  medications: unknown[];
  supplements: unknown[];
  allergies: unknown[];
  lifestyle: Record<string, unknown>;
  completedAt: string;
}

export async function fetchPreviousCAQ(userId: string): Promise<PreviousCAQData | null> {
  const supabase = createClient();

  // Try the versioned table first
  const { data: versionData } = await supabase
    .rpc("get_latest_completed_caq", { target_user_id: userId });

  if (versionData && versionData.length > 0) {
    // Cast row to any: jsonb columns (demographics, healthConcerns, etc.) come
    // back as Supabase's Json union type, which can't be assigned to the strict
    // Record<string, unknown> / unknown[] interface fields without per-field
    // narrowing. Casting once at the source preserves runtime behavior.
    const row = versionData[0] as any;
    return {
      assessmentId: row.assessment_id,
      versionNumber: row.version_number,
      demographics: row.demographics || {},
      healthConcerns: row.health_concerns || {},
      physicalSymptoms: row.physical_symptoms || {},
      neuroSymptoms: row.neuro_symptoms || {},
      emotionalSymptoms: row.emotional_symptoms || {},
      medications: row.medications || [],
      supplements: row.supplements || [],
      allergies: row.allergies || [],
      lifestyle: row.lifestyle || {},
      completedAt: row.completed_at,
    };
  }

  // Fallback: read from assessment_results table (existing data from first CAQ)
  const { data: assessments } = await supabase
    .from("assessment_results")
    .select("phase, data")
    .eq("user_id", userId);

  if (!assessments || assessments.length === 0) return null;

  const getPhase = (p: number) => (assessments.find((a) => a.phase === p)?.data || {}) as Record<string, unknown>;

  return {
    assessmentId: "legacy",
    versionNumber: 1,
    demographics: getPhase(1),
    healthConcerns: getPhase(6),
    physicalSymptoms: getPhase(7),
    neuroSymptoms: getPhase(8),
    emotionalSymptoms: getPhase(9),
    medications: [],
    supplements: [],
    allergies: [],
    lifestyle: getPhase(3),
    completedAt: new Date().toISOString(),
  };
}
