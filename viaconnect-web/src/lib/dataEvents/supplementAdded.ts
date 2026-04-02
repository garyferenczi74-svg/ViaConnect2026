// Cascade engine: fires when a supplement or peptide is saved
// Triggers updates to Supplement Protocol, Analytics, Peptide Protocol, Dashboard

import { createClient } from "@/lib/supabase/client";
import type { IngredientBreakdownEntry } from "@/types/supplements";

interface CascadePayload {
  entryId: string;
  entryType: "supplement" | "peptide";
  brand: string;
  productName: string;
  ingredientBreakdown: IngredientBreakdownEntry[];
  deliveryMethod: string;
  frequency: string;
  timeOfDay: string[];
  interactionResults: { ingredientName: string; severity: string; summary: string }[];
}

export async function onSupplementSaved(userId: string, payload: CascadePayload): Promise<{
  dailyScheduleUpdated: boolean;
  analyticsUpdated: boolean;
  adherenceCreated: boolean;
  errors: string[];
}> {
  const supabase = createClient();
  const errors: string[] = [];
  let dailyScheduleUpdated = false;
  let analyticsUpdated = false;
  let adherenceCreated = false;

  // ═══ 1. UPDATE DAILY SCHEDULE (Tab 1) ═══
  try {
    const ingredientSummary = payload.ingredientBreakdown
      .filter((i) => i.amount != null)
      .map((i) => `${i.name} ${i.amount}${i.unit}`)
      .join(", ");

    for (const time of payload.timeOfDay.length > 0 ? payload.timeOfDay : ["morning"]) {
      await supabase.from("user_current_supplements").upsert({
        user_id: userId,
        supplement_name: `${payload.brand} ${payload.productName}`,
        brand: payload.brand,
        product_name: payload.productName,
        formulation: ingredientSummary,
        dosage: payload.deliveryMethod,
        dosage_form: payload.deliveryMethod,
        frequency: payload.frequency,
        category: payload.entryType,
        source: "ai_identified",
        is_current: true,
        is_ai_recommended: false,
      }, { onConflict: "user_id,supplement_name" });
    }
    dailyScheduleUpdated = true;
  } catch (err) {
    errors.push(`Daily Schedule: ${err instanceof Error ? err.message : "Failed"}`);
  }

  // ═══ 2. CREATE ADHERENCE TRACKING ═══
  try {
    await supabase.from("supplement_adherence").upsert({
      user_id: userId,
      supplement_name: `${payload.brand} ${payload.productName}`,
      supplement_type: payload.entryType,
      category: payload.entryType === "peptide" ? "peptide" : "supplement",
      recommended_dosage: payload.deliveryMethod,
      recommended_frequency: payload.frequency,
      adherence_percent: 0,
      streak_days: 0,
      total_doses_logged: 0,
      started_at: new Date().toISOString(),
      status: "active",
    }, { onConflict: "user_id,supplement_name" });
    adherenceCreated = true;
  } catch (err) {
    errors.push(`Adherence: ${err instanceof Error ? err.message : "Failed"}`);
  }

  // ═══ 3. TRIGGER ANALYTICS RECALCULATION ═══
  try {
    await fetch("/api/ai/generate-wellness-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "supplement_added" }),
    });
    analyticsUpdated = true;
  } catch (err) {
    errors.push(`Analytics: ${err instanceof Error ? err.message : "Failed"}`);
  }

  return { dailyScheduleUpdated, analyticsUpdated, adherenceCreated, errors };
}

export async function onPeptideSaved(userId: string, payload: {
  peptideId: string;
  deliveryForm: string;
  dose: string;
  frequency: string;
  cycleProtocol: string;
}): Promise<{ saved: boolean; error?: string }> {
  const supabase = createClient();

  try {
    await supabase.from("user_peptide_prescriptions").insert({
      user_id: userId,
      peptide_id: payload.peptideId,
      delivery_form: payload.deliveryForm,
      dosing_protocol: payload.dose,
      cycle_protocol: payload.cycleProtocol,
      status: "active",
      started_at: new Date().toISOString(),
    });

    // Create adherence tracking for peptide
    await supabase.from("supplement_adherence").upsert({
      user_id: userId,
      supplement_name: payload.peptideId,
      supplement_type: "peptide",
      category: "peptide",
      recommended_dosage: payload.dose,
      recommended_frequency: payload.frequency,
      adherence_percent: 0,
      streak_days: 0,
      total_doses_logged: 0,
      started_at: new Date().toISOString(),
      status: "active",
    }, { onConflict: "user_id,supplement_name" });

    return { saved: true };
  } catch (err) {
    return { saved: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
