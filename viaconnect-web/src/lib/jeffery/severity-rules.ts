/**
 * Jeffery Severity Auto-Assignment Rules (Prompt #60c — Section 9C)
 *
 * Maps a (category, detail) pair to the appropriate severity. The rules are:
 *   - self_tune          → always review_required (Jeffery changing himself)
 *   - interaction_alert  → always review_required (clinical safety)
 *   - error_escalation   → always critical
 *   - agent_decision     → review_required if confidence < 0.7, else advisory
 *   - knowledge_update   → review_required if sourceConfidence < 0.8, else info
 *   - data_ingestion     → info (auto-apply)
 *   - population_trend   → advisory
 *   - advisor_insight    → advisory
 *   - evolution_report   → advisory
 *   - research_task      → info
 *
 * Pure functions — no side effects, no DB. Used by the message-bus emitter
 * BEFORE inserting a row, so the right severity goes into the table.
 */

export type MessageCategory =
  | "data_ingestion"
  | "knowledge_update"
  | "agent_decision"
  | "self_tune"
  | "evolution_report"
  | "advisor_insight"
  | "interaction_alert"
  | "population_trend"
  | "error_escalation"
  | "research_task";

export type MessageSeverity = "info" | "advisory" | "review_required" | "critical";

export interface SeverityContext {
  confidence?: number;
  sourceConfidence?: number;
  forceCritical?: boolean;
}

/**
 * Compute severity for a (category, context) pair. Pure function.
 */
export function computeSeverity(
  category: MessageCategory,
  context: SeverityContext = {}
): MessageSeverity {
  if (context.forceCritical) return "critical";

  switch (category) {
    case "self_tune":
      return "review_required";
    case "interaction_alert":
      return "review_required";
    case "error_escalation":
      return "critical";
    case "agent_decision":
      return (context.confidence ?? 1.0) < 0.7 ? "review_required" : "advisory";
    case "knowledge_update":
      return (context.sourceConfidence ?? 1.0) < 0.8 ? "review_required" : "info";
    case "data_ingestion":
      return "info";
    case "population_trend":
      return "advisory";
    case "advisor_insight":
      return "advisory";
    case "evolution_report":
      return "advisory";
    case "research_task":
      return "info";
    default:
      return "info";
  }
}

/**
 * Map a category to a learning_category bucket (used by the learning log).
 */
export function categorizeLesson(category: MessageCategory): string {
  switch (category) {
    case "agent_decision":
    case "self_tune":
      return "agent_behavior";
    case "knowledge_update":
    case "data_ingestion":
    case "research_task":
      return "data_quality";
    case "advisor_insight":
      return "tone_adjustment";
    case "interaction_alert":
      return "safety_rule";
    case "population_trend":
      return "demand_signal";
    case "error_escalation":
      return "operational";
    case "evolution_report":
      return "self_review";
    default:
      return "general";
  }
}
