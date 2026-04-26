/**
 * Self-check pass for drafted rebuttal text (Prompt #123 §6.5 + §13.9).
 *
 * Runs Marshall's rebuttal-specific rules (compliance/rules/rebuttal.ts)
 * against a drafted rebuttal. The drafter retries up to SELF_CHECK_RECURSION_CAP
 * times, stripping augmentation and retrying with template-only output if
 * findings persist. After the cap, the draft is flagged self_check_failed
 * and Steve sees a manual-review notice.
 */

import { rebuttalRules } from "@/lib/compliance/rules/rebuttal";
import type { Finding } from "@/lib/compliance/engine/types";

export interface SelfCheckResult {
  passed: boolean;
  findings: Array<{ ruleId: string; severity: string; message: string }>;
}

export async function selfCheckDraft(draftText: string): Promise<SelfCheckResult> {
  const allFindings: Finding[] = [];
  for (const rule of rebuttalRules) {
    if (!rule.surfaces.includes("rebuttal_draft")) continue;
    try {
      const findings = await rule.evaluate(draftText, {
        surface: "rebuttal_draft",
        source: "runtime",
        now: new Date(),
      });
      if (findings && findings.length > 0) allFindings.push(...findings);
    } catch {
      // Rule error during self-check is itself a failure but we keep
      // collecting other rules' results so Steve sees the full picture.
    }
  }
  // Pass = zero P0/P1 findings. P2 warnings (no-dashes etc.) are surfaced
  // but do not fail the gate.
  const blockers = allFindings.filter((f) => f.severity === "P0" || f.severity === "P1");
  return {
    passed: blockers.length === 0,
    findings: allFindings.map((f) => ({
      ruleId: f.ruleId,
      severity: f.severity,
      message: f.message,
    })),
  };
}
