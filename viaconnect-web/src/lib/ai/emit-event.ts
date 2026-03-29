// Emit data change events to trigger the cascade system.
// Call this from ANY part of the app when user data changes.

import { createClient } from "@/lib/supabase/client";

export type DataEventType =
  | "medication_added"
  | "medication_removed"
  | "supplement_added"
  | "supplement_removed"
  | "daily_score_logged"
  | "supplement_taken"
  | "wearable_sync"
  | "checkin_completed"
  | "challenge_completed"
  | "genex360_received"
  | "lab_uploaded"
  | "practitioner_note_added"
  | "protocol_changed"
  | "caq_readministered"
  | "ai_chat_insight";

export async function emitDataEvent(
  userId: string,
  eventType: DataEventType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventData: any = {}
): Promise<void> {
  const supabase = createClient();

  // Define which cascade actions each event triggers
  const cascadeMap: Record<string, string[]> = {
    medication_added: ["interaction_check", "protocol_safety_gate", "analytics_medication_intel", "bio_optimization_recalc"],
    medication_removed: ["interaction_recheck", "analytics_medication_intel", "bio_optimization_recalc"],
    supplement_added: ["interaction_check", "analytics_nutrient_profile", "protocol_gap_analysis", "bio_optimization_recalc"],
    supplement_removed: ["analytics_nutrient_profile", "protocol_gap_analysis", "bio_optimization_recalc"],
    daily_score_logged: ["bio_optimization_daily", "analytics_trend_update", "helix_challenge_check", "helix_daily_score_token", "helix_steps_10k_check"],
    supplement_taken: ["regimen_score_update", "analytics_protocol_effectiveness", "helix_supplement_token", "helix_streak_check_adherence", "helix_achievement_check"],
    wearable_sync: ["daily_scores_from_wearable", "analytics_sleep_recovery", "helix_challenge_check", "helix_wearable_sync_token", "bio_optimization_recalc"],
    checkin_completed: ["analytics_stress_mood", "bio_optimization_recalc", "helix_checkin_token"],
    challenge_completed: ["helix_token_award", "helix_achievement_check", "bio_optimization_streak_bonus", "helix_tier_recalc"],
    genex360_received: ["unlock_genetic_category", "enhance_all_analytics", "protocol_genetic_refinement", "bio_optimization_genetic_bonus"],
    lab_uploaded: ["analytics_metabolic_health", "bio_optimization_recalc"],
    practitioner_note_added: ["update_clinical_context", "analytics_refresh"],
    protocol_changed: ["interaction_full_scan", "analytics_protocol_effectiveness"],
    caq_readministered: ["bio_optimization_rebaseline", "protocol_full_regeneration", "interaction_full_scan", "analytics_full_recalculation"],
    ai_chat_insight: ["analytics_insight_feed"],
  };

  const cascadeActions = cascadeMap[eventType] || [];

  await supabase.from("data_events").insert({
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
    cascade_actions: cascadeActions,
  }).catch(() => {});
}
