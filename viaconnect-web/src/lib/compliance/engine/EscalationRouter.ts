/**
 * Marshall EscalationRouter — routes findings to the correct stakeholders
 * per the ladder in config/escalation.ts.
 *
 * For Phase A we route into two channels:
 *   1. jeffery_messages (already wired to /admin/jeffery Live Feed)
 *   2. compliance_findings.escalated_to (array column stored on the finding)
 *
 * Slack webhooks / SMS / email are deferred (require secrets wiring).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Finding } from "./types";
import { resolveEscalation } from "../config/escalation";

export class EscalationRouter {
  constructor(private readonly db: SupabaseClient) {}

  async route(finding: Finding): Promise<void> {
    const pillar = finding.ruleId.split(".")[1] as
      | "CLAIMS"
      | "PEPTIDE"
      | "GENETIC"
      | "PRACTITIONER"
      | "MAP"
      | "COMMS"
      | "PRIVACY"
      | "BRAND"
      | "AUDIT";
    const ladder = resolveEscalation(finding.severity, pillar);
    if (ladder.to.length === 0) return;

    // Mirror into Jeffery's Live Feed so Gary sees it in /admin/jeffery.
    try {
      await this.db.rpc("jeffery_emit_message", {
        p_category: finding.severity === "P0" ? "error_escalation" : "advisor_insight",
        p_severity: this.severityToJeffery(finding.severity),
        p_title: `Marshall ${finding.severity}: ${finding.ruleId}`,
        p_summary: finding.message.slice(0, 240),
        p_detail: {
          findingId: finding.findingId,
          ruleId: finding.ruleId,
          surface: finding.surface,
          source: finding.source,
          location: finding.location,
          excerpt: finding.excerpt,
          citation: finding.citation,
          escalateTo: ladder.to,
          slaMinutes: ladder.slaMinutes,
        },
        p_source_agent: "marshall",
        p_source_context: null,
        p_proposed_action: finding.remediation ?? null,
      });
    } catch (err) {
      console.warn(`[marshall] jeffery emit failed for ${finding.findingId}: ${(err as Error).message}`);
    }
  }

  private severityToJeffery(sev: Finding["severity"]): "critical" | "review_required" | "advisory" | "info" {
    switch (sev) {
      case "P0":
        return "critical";
      case "P1":
        return "review_required";
      case "P2":
        return "advisory";
      case "P3":
      case "ADVISORY":
        return "info";
    }
  }
}
