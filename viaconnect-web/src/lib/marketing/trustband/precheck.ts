/**
 * Marshall pre-check wrapper for trust band content (Prompt #138c §7.4).
 *
 * Reuses the engine wrapper established in #138a (`lib/marketing/variants/precheck.ts`)
 * by composing a single text field per content kind. The Trust Band surfaces
 * have shorter copy than hero variants, so the wrapper simplifies to a single
 * text input rather than headline+subheadline+cta.
 */

import { preCheckVariant, type VariantPreCheckResult } from "../variants/precheck";

export interface TrustBandPreCheckInput {
  text: string;
  contentKind: "trust_band" | "testimonial";
  /** Required when text names a clinician. */
  clinicianConsentOnFile?: boolean;
  /** Required when text references a regulatory framework with substantiation. */
  scientificSubstantiationOnFile?: boolean;
}

/**
 * Runs marketing rules over a single trust band text block. The variants
 * pre-check wrapper takes headline+subheadline+cta_label; for trust band
 * surfaces we pass the same text three times so every rule's per-field
 * evaluation runs once on the content. Findings are deduplicated client-side
 * by ruleId since the same finding will fire three times.
 */
export async function preCheckTrustBandContent(
  input: TrustBandPreCheckInput,
): Promise<VariantPreCheckResult> {
  const result = await preCheckVariant({
    headline: input.text,
    subheadline: input.text,
    ctaLabel: input.text,
    clinicianConsentOnFile: input.clinicianConsentOnFile,
    scientificSubstantiationOnFile: input.scientificSubstantiationOnFile,
  });

  // Deduplicate by ruleId so the operator UI doesn't show the same finding
  // three times. Keep the first occurrence of each ruleId.
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
