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

      // Cast the update payload to any: jsonb columns are typed as the strict
      // Json union, which Record<string, unknown> doesn't satisfy structurally.
      await supabase.from("profiles").update({
        symptoms_physical: symptomsPhysical,
        symptoms_neurological: symptomsNeurological,
        symptoms_emotional: symptomsEmotional,
        health_concerns: (healthConcernsData as { healthConcerns?: string[] }).healthConcerns || [],
        family_history: (healthConcernsData as { familyHistory?: unknown[] }).familyHistory || [],
        assessment_completed: true,
        caq_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any).eq("id", user.id);

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

    // ═══ STEP 5: Copy Phase 6 supplements to user_current_supplements + adherence ═══
    try {
      const { data: assessments } = await supabase
        .from("assessment_results")
        .select("phase, data")
        .eq("user_id", user.id)
        .eq("phase", 4)
        .single();

      const phase4 = (assessments?.data || {}) as Record<string, unknown>;
      const userSupps = (phase4.userSupplements as Array<Record<string, unknown>>) || [];

      if (userSupps.length > 0 && !userSupps.some((s) => s.name === "None")) {
        // Save to user_current_supplements
        const entries = userSupps.map((s) => ({
          user_id: user.id,
          supplement_name: String(s.name || ""),
          brand: String(s.brand || ""),
          product_name: String(s.name || ""),
          formulation: String(s.formulation || ""),
          dosage: s.dosage ? `${s.dosage}${s.unit || "mg"}` : "",
          dosage_form: String(s.deliveryMethod || "capsule"),
          frequency: String(s.frequency || "daily"),
          category: String(s.category || "general"),
          key_ingredients: [] as string[],
          source: String(s.source || "manual"),
          is_current: true,
          is_ai_recommended: false,
          added_at: new Date().toISOString(),
        }));

        await supabase.from("user_current_supplements").upsert(entries, {
          onConflict: "user_id,supplement_name",
        });

        // Create adherence tracking
        const adherenceEntries = entries.map((e) => ({
          user_id: user.id,
          supplement_name: e.supplement_name,
          supplement_type: "current",
          category: e.category,
          recommended_dosage: e.dosage,
          recommended_frequency: e.frequency,
          adherence_percent: 0,
          streak_days: 0,
          total_doses_logged: 0,
          started_at: new Date().toISOString(),
          status: "active",
        }));

        await supabase.from("supplement_adherence").upsert(adherenceEntries, {
          onConflict: "user_id,supplement_name",
        });

        results["current_supplements"] = true;
      } else {
        results["current_supplements"] = true; // No supplements to copy is not an error
      }
    } catch (err) {
      results["current_supplements"] = false;
      errors.push(`Current supplements: ${err instanceof Error ? err.message : "Failed"}`);
    }

    // ═══ STEP 6: Trigger Ultrathink Protocol Generation ═══
    try {
      const ultraRes = await fetch("/api/ultrathink/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "caq-complete" }),
      });
      results["ultrathink_protocol"] = ultraRes.ok;
      if (!ultraRes.ok) errors.push(`Ultrathink: ${ultraRes.status}`);
    } catch (err) {
      results["ultrathink_protocol"] = false;
      errors.push(`Ultrathink: ${err instanceof Error ? err.message : "Failed"}`);
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
