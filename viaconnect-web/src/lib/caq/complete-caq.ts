// Complete CAQ Trigger — fires all downstream AI engines after CAQ Phase 7

import { createClient } from "@/lib/supabase/client";

export async function completeCAQAndTriggerEngines(): Promise<{
  success: boolean;
  results: Record<string, boolean>;
  errors: string[];
}> {
  const supabase = createClient();
  const results: Record<string, boolean> = {};
  const errors: string[] = [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, results: {}, errors: ["Not authenticated"] };

    // ═══ STEP 1: Copy symptom data from assessment_results to profiles ═══
    // The symptom profile API reads from profiles.symptoms_physical etc.
    // But CAQ saves to assessment_results (phases 7, 8, 9)
    try {
      const { data: assessments } = await supabase
        .from("assessment_results")
        .select("phase, data")
        .eq("user_id", user.id);

      const getPhase = (p: number) => (assessments || []).find((a) => a.phase === p)?.data as Record<string, unknown> | undefined;

      const symptomsPhysical = getPhase(7) || {};
      const symptomsNeurological = getPhase(8) || {};
      const symptomsEmotional = getPhase(9) || {};
      const healthConcernsData = getPhase(6) || {};
      const demographicsData = getPhase(1) || {};

      await supabase.from("profiles").update({
        symptoms_physical: symptomsPhysical,
        symptoms_neurological: symptomsNeurological,
        symptoms_emotional: symptomsEmotional,
        health_concerns: (healthConcernsData as { healthConcerns?: string[] }).healthConcerns || [],
        family_history: (healthConcernsData as { familyHistory?: unknown[] }).familyHistory || [],
        assessment_completed: true,
        caq_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      results["sync_profile"] = true;
    } catch (err) {
      results["sync_profile"] = false;
      errors.push(`Sync profile: ${err instanceof Error ? err.message : "Failed"}`);
    }

    // ═══ STEP 2: Generate Symptom Profile (Ultrathink) ═══
    try {
      const res = await fetch("/api/ai/generate-symptom-profile", { method: "POST" });
      results["symptom_profile"] = res.ok;
      if (!res.ok) errors.push(`Symptom Profile: ${res.status}`);
    } catch (err) {
      results["symptom_profile"] = false;
      errors.push(`Symptom Profile: ${err instanceof Error ? err.message : "Failed"}`);
    }

    // ═══ STEP 3: Generate Wellness Analytics ═══
    try {
      const res = await fetch("/api/ai/generate-wellness-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "caq_complete" }),
      });
      results["wellness_analytics"] = res.ok;
      if (!res.ok) errors.push(`Wellness Analytics: ${res.status}`);
    } catch (err) {
      results["wellness_analytics"] = false;
      errors.push(`Wellness Analytics: ${err instanceof Error ? err.message : "Failed"}`);
    }

    // ═══ STEP 4: Check Interactions ═══
    try {
      const res = await fetch("/api/ai/check-interactions", { method: "POST" });
      results["interactions"] = res.ok;
      if (!res.ok) errors.push(`Interactions: ${res.status}`);
    } catch (err) {
      results["interactions"] = false;
      errors.push(`Interactions: ${err instanceof Error ? err.message : "Failed"}`);
    }

    const allPassed = Object.values(results).every((v) => v === true);
    return { success: allPassed, results, errors };
  } catch (err) {
    return {
      success: false,
      results,
      errors: [`Critical failure: ${err instanceof Error ? err.message : "Unknown"}`],
    };
  }
}
