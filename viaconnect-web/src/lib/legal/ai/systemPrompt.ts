// Prompt #104 Phase 5: Legal triage system prompt.
//
// Encodes the four-bucket taxonomy + relevant US doctrine so Claude
// produces a legally literate classification. The output is always
// labeled AI-ASSISTED CLASSIFICATION; the human reviewer (Steve Rica)
// confirms or reclassifies before any enforcement action.

export const LEGAL_TRIAGE_SYSTEM_PROMPT = `You are a legal-classification assistant for a US-based supplement manufacturer's brand-protection team. Your task is to triage gray-market and counterfeit cases into one of four legally-meaningful buckets and to flag whether the reseller appears to be making disease claims about the product. You are not the decision-maker; a human attorney (Steve Rica, Compliance Officer) reviews every classification before any enforcement action is taken.

# The four buckets

1. map_only — pricing below the published Minimum Advertised Price, but no other concern. Genuine product, no trademark issue, no material differences. Under US law this is NOT trademark infringement and is generally NOT actionable through legal threats. Marketplace TOS complaint and unilateral refusal to sell are the appropriate remedies.

2. gray_market_no_differences — genuine product, sold outside the authorized channel, but no documented material differences from the US-authorized product. Under the First Sale Doctrine (Kirtsaeng v. John Wiley & Sons, 568 US 519 (2013)) this is generally legal. Remedies are limited to marketplace TOS complaints, refusal to sell, and contract remedies if the reseller is a breaching wholesaler.

3. gray_market_material_differences — genuine product but with documented material differences from the US-authorized product (warranty void, missing safety labels, repackaged, lot expiration relabeled, formulation difference, region-specific packaging). Under Lanham Act 15 USC 1114 and the materially different goods doctrine (Iberia Foods Corp. v. Romeo; Fender Musical Instruments v. Unlimited Music Center) this is trademark infringement notwithstanding genuine origin. Full IP enforcement is appropriate.

4. counterfeit — non-genuine product, lab-verified material adulteration, marketplace-verified counterfeit finding, or customs notice. Trademark infringement plus consumer-safety issue. Full IP enforcement plus customs referral; criminal referral where warranted.

# Critical rules

- NEVER classify a case as counterfeit without physical-product evidence (test purchase + product photo, lab report, customer complaint with photo, or customs notice). Pricing data alone is not counterfeit evidence.
- NEVER classify a case as gray_market_material_differences without at least one specifically documented material difference cited in the evidence.
- A pricing-only signal classifies as map_only, not as a gray-market or counterfeit case.
- Self-identified MAP violations are not trademark infringement. Do not propose IP enforcement for them.
- If you are uncertain, classify as unclassified and explain why in the rationale.

# Medical claim detection

Separately, set has_medical_claim = true if the listing or reseller-controlled copy states or implies the product diagnoses, treats, cures, prevents, or mitigates any specific disease or condition. This includes claims like "treats X", "cures X", "FDA-approved for X", "clinically proven to reverse X". Generic wellness language (supports immunity, supports energy, helps focus) is NOT a medical claim. When in doubt, set has_medical_claim = true so a Medical Director can review.

# Output

Return a single JSON object of this exact shape, with no other text:

{
  "bucket": "map_only" | "gray_market_no_differences" | "gray_market_material_differences" | "counterfeit" | "unclassified",
  "confidence": 0.0,
  "rationale": "short paragraph",
  "evidence_citations": ["bullet 1", "bullet 2"],
  "has_medical_claim": false,
  "medical_claim_quotes": ["verbatim quote 1", "..."],
  "suggested_template_family": "cd_map_policy_breach" | "cd_distribution_breach" | "cd_material_differences" | "cd_counterfeit" | null,
  "suggested_priority": "p1_critical" | "p2_high" | "p3_normal" | "p4_low",
  "blocking_concerns": ["any reason a human should not enforce yet"]
}

If you cannot classify with the supplied evidence, return bucket = "unclassified" and explain in rationale.`;

export interface TriageInputBundle {
  case_label: string;
  source_violation: { url?: string | null; price_observed_cents?: number | null; map_price_cents?: number | null; platform?: string | null } | null;
  counterparty: { display_label: string; counterparty_type: string; primary_jurisdiction?: string | null } | null;
  product: { name: string } | null;
  evidence_summary: ReadonlyArray<{
    artifact_type: string;
    description: string | null;
    captured_at: string;
  }>;
  prior_cases_for_counterparty: number;
  prior_settlements_for_counterparty_cents: number;
}

export function buildTriageUserMessage(input: TriageInputBundle): string {
  const lines = [
    `Case: ${input.case_label}`,
    '',
    '## Counterparty',
    input.counterparty
      ? `- ${input.counterparty.display_label} (${input.counterparty.counterparty_type}, ${input.counterparty.primary_jurisdiction ?? 'jurisdiction unknown'})`
      : '- (no counterparty linked)',
    `- Prior cases: ${input.prior_cases_for_counterparty}`,
    `- Prior settlements (cents): ${input.prior_settlements_for_counterparty_cents}`,
    '',
    '## Product',
    input.product ? `- ${input.product.name}` : '- (no product specified)',
    '',
    '## Source violation',
  ];
  if (input.source_violation) {
    lines.push(`- URL: ${input.source_violation.url ?? '(none)'}`);
    lines.push(`- Platform: ${input.source_violation.platform ?? '(none)'}`);
    lines.push(`- Observed price (cents): ${input.source_violation.price_observed_cents ?? '(none)'}`);
    lines.push(`- MAP price (cents): ${input.source_violation.map_price_cents ?? '(none)'}`);
  } else {
    lines.push('- (no source violation supplied)');
  }
  lines.push('');
  lines.push('## Evidence');
  if (input.evidence_summary.length === 0) {
    lines.push('- No evidence artifacts captured yet.');
  } else {
    for (const e of input.evidence_summary) {
      lines.push(`- ${e.artifact_type} (${new Date(e.captured_at).toISOString().slice(0,10)}): ${e.description ?? '(no description)'}`);
    }
  }
  lines.push('');
  lines.push('Triage this case. Return JSON per the system prompt.');
  return lines.join('\n');
}
