// Multi-Modal Data Fusion — Assembles complete patient context from all sources
// CAQ (always) + Labs (Tier 2) + Genetics (Tier 3) + Wearables (future)

import { createClient } from "@/lib/supabase/client";
import type { PatientContext } from "./ultrathink-engine";

export async function fusePatientData(userId: string): Promise<PatientContext> {
  const supabase = createClient();

  const [profileRes, assessmentsRes, supplementsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("assessment_results").select("phase, data").eq("user_id", userId),
    supabase.from("user_supplements").select("*").eq("user_id", userId).eq("is_active", true),
  ]);

  // Cast to any: see unified-context.ts for context — typegen produces a strict
  // Row type which the `|| {}` fallback widens to bare {}, losing property access.
  const profile: any = profileRes.data || {};
  const assessments = assessmentsRes.data || [];
  const getPhase = (p: number) => assessments.find((a) => a.phase === p)?.data as Record<string, unknown> | undefined;
  const phase4 = getPhase(4) || {};
  const phase3 = getPhase(3) || {};

  const meds = ((phase4.medications as string[]) || []).filter(m => m !== "None").map(m => ({ name: m }));
  const allergies = ((phase4.allergies as string[]) || []).filter(a => a !== "None");
  const supps = (supplementsRes.data || []).map(s => ({ name: s.product_name || "", dosage: s.dosage_amount ? `${s.dosage_amount}${s.dosage_unit || "mg"}` : "", delivery_method: s.delivery_method || "" }));

  const hasLabs = false; // Will be true when lab_results table has data
  const hasGenetics = !!profile.genetic_profile;
  const dataTier: 1 | 2 | 3 = hasGenetics ? 3 : hasLabs ? 2 : 1;

  const age = profile.date_of_birth ? Math.floor((Date.now() - new Date(profile.date_of_birth as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  return {
    age,
    sex: profile.sex || null,
    bmi: null, // Calculate from height/weight if available
    ethnicity: (profile.ethnicity as string[]) || null,
    symptomsPhysical: (profile.symptoms_physical || {}) as Record<string, { score: number; description: string }>,
    symptomsNeurological: (profile.symptoms_neurological || {}) as Record<string, { score: number; description: string }>,
    symptomsEmotional: (profile.symptoms_emotional || {}) as Record<string, { score: number; description: string }>,
    healthConcerns: (profile.health_concerns as string[]) || [],
    familyHistory: (profile.family_history as Array<{ condition: string; relationships: string[] }>) || [],
    lifestyle: phase3 as Record<string, unknown>,
    allergies,
    adverseReactions: (phase4.adverseReactions as string) || "",
    medications: meds,
    supplements: supps,
    bodyType: (profile.body_type as string) || null,
    geneticData: null, // Populate when genetic data available
    labData: null, // Populate when lab data available
    dataTier,
    dataCompleteness: (profile.assessment_completed ? 30 : 0) + (supps.length > 0 ? 10 : 0) + (hasGenetics ? 15 : 0) + (hasLabs ? 15 : 0) + 10,
  };
}
