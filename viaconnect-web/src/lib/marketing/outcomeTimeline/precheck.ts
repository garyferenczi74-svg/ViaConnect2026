/**
 * Marshall pre-check wrapper for outcome timeline content (Prompt #138e §6.4).
 *
 * Reuses the pipeline from #121 via the variants wrapper. The wrapper
 * accepts headline+subheadline+cta_label; for outcome timeline content the
 * three fields map naturally to phase_title + phase_subtitle + phase_body
 * (or qualifier_text/cta_label).
 *
 * Critical: passes contentKind='outcome_timeline' so the new
 * MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED P0 rule fires.
 */

import { preCheckVariant, type VariantPreCheckResult } from "../variants/precheck";

export interface OutcomeTimelinePreCheckInput {
  /** Phase title or block heading. */
  title: string;
  /** Phase subtitle or block secondary line. */
  subtitle?: string;
  /** Phase body or block paragraph. */
  body: string;
  /** Has the qualifier block been activated and renders adjacent? */
  hasAdjacentQualifier?: boolean;
  /** Is the qualifier rendered as footnote (forbidden per spec section 6.3)? */
  qualifierIsFootnote?: boolean;
}

export async function preCheckOutcomeTimelineContent(
  input: OutcomeTimelinePreCheckInput,
): Promise<VariantPreCheckResult> {
  const result = await preCheckVariant({
    headline: input.title,
    subheadline: input.subtitle ?? input.body,
    ctaLabel: input.body,
  });

  // Deduplicate by ruleId since the variant wrapper evaluates each rule
  // per text field; trust band content is one logical block.
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
