// Cross-engine event cascade system.
// Processes data change events and triggers downstream engine updates.

import { buildUnifiedContext } from "./unified-context";

export async function processEventCascade(
  userId: string,
  eventType: string,
  cascadeActions: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventData: any
): Promise<{ actionsCompleted: string[]; errors: string[] }> {
  const completed: string[] = [];
  const errors: string[] = [];

  for (const action of cascadeActions) {
    try {
      await executeAction(userId, action, eventData);
      completed.push(action);
    } catch (err) {
      errors.push(`${action}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return { actionsCompleted: completed, errors };
}

async function executeAction(
  userId: string,
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _eventData: any
): Promise<void> {
  // Each action maps to an API call or direct function
  switch (action) {
    case "interaction_check":
    case "interaction_recheck":
    case "interaction_full_scan": {
      const ctx = await buildUnifiedContext(userId);
      await fetch("/api/ai/check-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          medications: ctx.medications.map((m) => m.name),
          supplements: ctx.supplements.map((s) => s.product_name || s.name),
          allergies: ctx.caq.allergies,
        }),
      }).catch(() => {});
      break;
    }

    case "bio_optimization_recalc":
    case "bio_optimization_daily":
    case "bio_optimization_rebaseline":
    case "bio_optimization_genetic_bonus":
    case "bio_optimization_streak_bonus":
      await fetch("/api/ai/calculate-bio-optimization", { method: "POST" }).catch(() => {});
      break;

    case "analytics_nutrient_profile":
    case "analytics_medication_intel":
    case "analytics_protocol_effectiveness":
    case "analytics_sleep_recovery":
    case "analytics_stress_mood":
    case "analytics_metabolic_health":
    case "analytics_trend_update":
    case "analytics_exercise":
    case "analytics_engagement":
    case "analytics_insight_feed":
    case "analytics_refresh":
    case "analytics_full_recalculation":
    case "enhance_all_analytics":
      await fetch("/api/ai/generate-wellness-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "cascade" }),
      }).catch(() => {});
      break;

    case "protocol_safety_gate":
    case "protocol_gap_analysis":
    case "protocol_full_regeneration":
    case "protocol_genetic_refinement":
    case "protocol_clinical_refinement":
    case "protocol_consideration":
      await fetch("/api/ai/generate-protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
      break;

    case "regimen_score_update":
    case "helix_token_award":
    case "helix_achievement_check":
    case "helix_challenge_check":
    case "unlock_genetic_category":
    case "update_clinical_context":
    case "lab_symptom_correlation":
    case "practitioner_alert":
    case "user_notification":
    case "progress_report_generation":
    case "daily_scores_from_wearable":
    case "ai_pattern_detection":
    case "interaction_pharmacogenomic_update":
      // These actions are stubs — will be implemented as features are built
      break;

    default:
      break;
  }
}
