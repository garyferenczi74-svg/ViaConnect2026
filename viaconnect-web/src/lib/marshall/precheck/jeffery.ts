/**
 * Jeffery's coaching wrap around Marshall's pre-check output.
 * Jeffery never modifies findings; he translates them into conversational
 * coaching tone for the practitioner.
 */

import type { PrecheckFindingDto, PrecheckSessionResult } from "./types";

export function summarizeCoach(result: PrecheckSessionResult): string {
  if (result.findings.length === 0) {
    return `I ran your draft past Marshall. Clean, no flags. A clearance receipt is attached (${result.receipt?.receiptId ?? "pending"}).`;
  }
  const worst = result.worstSeverity ?? "ADVISORY";
  const count = result.findings.length;
  const head =
    worst === "P0" || worst === "P1"
      ? `I ran your draft past Marshall. He's holding it — ${count} finding${count === 1 ? "" : "s"} that need attention before it goes public.`
      : `I ran your draft past Marshall. ${count} coaching note${count === 1 ? "" : "s"} came back.`;
  const lines: string[] = [head, ""];
  for (const f of result.findings.slice(0, 10)) {
    lines.push(`• ${severityTag(f.severity)} ${shortRuleLabel(f.ruleId)} — ${f.message.split(".")[0]}.`);
    if (f.remediation.summary) {
      lines.push(`  Suggested fix: ${f.remediation.summary}`);
    }
  }
  if (count > 10) lines.push(`... and ${count - 10} more.`);
  lines.push("");
  if (result.cleared) {
    lines.push(`After your accepted fixes, the final draft is cleared. Receipt ${result.receipt?.receiptId ?? "pending"}.`);
  } else {
    lines.push("Once you address each of these, paste the revised draft and I'll re-scan. Clean drafts get a signed clearance receipt.");
  }
  return lines.join("\n");
}

function severityTag(sev: PrecheckFindingDto["severity"]): string {
  return `[${sev}]`;
}

function shortRuleLabel(ruleId: string): string {
  const parts = ruleId.split(".");
  return parts.slice(1).join(" ").toLowerCase().replace(/_/g, " ");
}

export function findingToCoachCard(f: PrecheckFindingDto) {
  return {
    severity: f.severity,
    confidence: f.confidence,
    ruleId: f.ruleId,
    title: shortRuleLabel(f.ruleId),
    headline: f.message.split(".")[0],
    body: f.message,
    citation: f.citation,
    suggested: f.remediation.summary,
    action: f.remediation.action ?? null,
    proposedRewrite: f.proposedRewrite ?? null,
    rationale: f.rewriteRationale ?? null,
    round: f.round,
    findingId: f.findingId,
  };
}
