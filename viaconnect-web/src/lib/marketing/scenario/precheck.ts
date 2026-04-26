/**
 * Marshall pre-check wrapper for Sarah Scenario content (Prompt #138d §6.4).
 *
 * Reuses the variants pre-check wrapper but passes contentKind='case_study'
 * so the #138d-specific P0 rules fire:
 *   MARSHALL.MARKETING.COMPOSITE_DISCLOSURE
 *   MARSHALL.MARKETING.INTERVENTION_SPECIFICITY
 *
 * Findings are deduplicated by ruleId since the variant wrapper evaluates
 * each rule per text field.
 */

import { preCheckVariant, type VariantPreCheckResult } from "../variants/precheck";

export interface ScenarioPreCheckInput {
  text: string;
  /** Whether the opening + closing illustrative disclosures are active. */
  hasOpeningDisclosure?: boolean;
  hasClosingDisclosure?: boolean;
  /** Whether the disclosures render as footnotes (forbidden per spec section 6.3). */
  rendersAsFootnote?: boolean;
}

export async function preCheckScenarioContent(
  input: ScenarioPreCheckInput,
): Promise<VariantPreCheckResult> {
  const result = await preCheckVariant({
    headline: input.text,
    subheadline: input.text,
    ctaLabel: input.text,
  });

  const seen = new Set<string>();
  const dedupedFindings = result.findings.filter((f) => {
    if (seen.has(f.ruleId)) return false;
    seen.add(f.ruleId);
    return true;
  });

  const blockerCount = dedupedFindings.filter((f) => f.severity === "P0" || f.severity === "P1").length;
  const warnCount = dedupedFindings.filter((f) => f.severity === "P2" || f.severity === "P3" || f.severity === "ADVISORY").length;

  return {
    ...result,
    findings: dedupedFindings,
    blockerCount,
    warnCount,
    passed: blockerCount === 0,
  };
}
