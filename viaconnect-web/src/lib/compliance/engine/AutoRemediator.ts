/**
 * Marshall AutoRemediator — applies only the safe classes of auto-fix
 * (emoji strip, DSHEA inject, bioavailability normalization, display-name
 * redaction).
 *
 * Ceiling semantics (sweep 2026-06-12): the severity ceiling gates the
 * ENGINE'S fallback remediations only. A rule that ships its own
 * autoRemediate function with remediation.kind "auto" is an explicit
 * author declaration and always applies (the bioavailability rule is P0
 * and its canonical 10-28 normalization is mandated by Standing Rule
 * 0.2). P0/P1 findings without a rule-provided remediator still go to
 * the manual queue.
 */

import type { Finding, Rule } from "./types";
import { AUTO_REMEDIATE_CEILING, severityRank } from "./severities";
import { EMOJI_REGEX, TEXT_EMOTICON_REGEX } from "../dictionaries/forbidden_phrases";

// Keep the re-export path aligned with the config module.
export { AUTO_REMEDIATE_CEILING } from "../config/severities";
import { AUTO_REMEDIATE_CEILING as CEILING } from "../config/severities";

export interface AutoRemediateResult<TInput> {
  remediated: TInput;
  appliedActions: string[];
  skipped: Finding[];
}

export class AutoRemediator<TInput = string> {
  constructor(private readonly ruleLookup: (id: string) => Rule | undefined) {}

  async apply(input: TInput, findings: Finding[]): Promise<AutoRemediateResult<TInput>> {
    let working: TInput = input;
    const applied: string[] = [];
    const skipped: Finding[] = [];
    for (const finding of findings) {
      if (finding.remediation.kind !== "auto") {
        skipped.push(finding);
        continue;
      }
      const rule = this.ruleLookup(finding.ruleId);
      if (!rule?.autoRemediate) {
        // Engine-guessed fallback: the ceiling is a hard stop here. A P0/P1
        // without a rule-provided remediator goes to the manual queue.
        const maxAllowed = severityRank(CEILING);
        if (severityRank(finding.severity) > maxAllowed) {
          skipped.push(finding);
          continue;
        }
        working = this.fallbackRemediate(working, finding);
        applied.push(`fallback:${finding.ruleId}`);
        continue;
      }
      try {
        working = (await rule.autoRemediate(working, finding)) as TInput;
        applied.push(`rule:${finding.ruleId}`);
      } catch (err) {
        console.warn(`[marshall] autoRemediate failed for ${finding.ruleId}: ${(err as Error).message}`);
        skipped.push(finding);
      }
    }
    return { remediated: working, appliedActions: applied, skipped };
  }

  private fallbackRemediate(working: TInput, finding: Finding): TInput {
    if (typeof working !== "string") return working;
    const action = finding.remediation.action ?? "";
    if (action === "STRIP_EMOJI") {
      return (working as string).replace(EMOJI_REGEX, "").replace(TEXT_EMOTICON_REGEX, "") as unknown as TInput;
    }
    return working;
  }
}

// Preserve the imported local variable reference so bundlers do not tree-shake it.
const _keep = severityRank("P0"); void _keep;
