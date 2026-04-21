// Prompt #104 Phase 6: Briefing packet builder.
//
// Assembles a Markdown briefing packet for outside counsel. Spec §6.3.
// Output is plain Markdown so admin can preview in the browser, copy
// into email, or render to PDF via any standard tool. The packet
// header carries the CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED stamp
// per spec §3.4.
//
// PII isolation (spec §3.4): customer count + revenue figures are
// AGGREGATED ONLY. Builder accepts only aggregates; never individual
// customer rows. The API layer enforces this by querying aggregates.

export interface BriefingPacketInput {
  case_label: string;
  prepared_at_iso: string;
  bucket: string;
  bucket_confidence_score: number | null;
  estimated_damages_cents: number | null;

  counterparty: {
    display_label: string;
    counterparty_type: string;
    primary_jurisdiction: string | null;
    verified_business_reg_id: string | null;
    verified_domain: string | null;
    total_cases_count: number;
    total_settlement_cents: number;
  } | null;

  enforcement_history: ReadonlyArray<{
    occurred_at_iso: string;
    description: string;
  }>;

  evidence_summary: ReadonlyArray<{
    artifact_type: string;
    captured_at_iso: string;
    sha256: string;
    description: string | null;
  }>;

  documented_material_differences?: ReadonlyArray<{ category: string; description: string }>;

  affected_orders_count_aggregate: number | null;
  affected_revenue_cents_aggregate: number | null;

  approved_budget_cents: number | null;
  cfo_approver_label: string | null;
  ceo_approver_label: string | null;

  suggested_action_plan: ReadonlyArray<string>;
}

export function buildBriefingPacketMarkdown(input: BriefingPacketInput): string {
  const lines: string[] = [];
  const dollar = (cents: number | null) => cents === null ? 'unknown' : `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  lines.push('# CONFIDENTIAL: ATTORNEY-CLIENT PRIVILEGED COMMUNICATION');
  lines.push('');
  lines.push('## ViaCura Legal Ops Briefing Packet');
  lines.push(`**Case:** ${input.case_label}`);
  lines.push(`**Prepared:** ${input.prepared_at_iso.slice(0, 10)}`);
  lines.push('');

  lines.push('## Executive summary');
  lines.push(`- Bucket: ${input.bucket}${input.bucket_confidence_score !== null ? ` (confidence ${Math.round(input.bucket_confidence_score * 100)}%)` : ''}`);
  if (input.counterparty) {
    lines.push(`- Counterparty: ${input.counterparty.display_label} (${input.counterparty.counterparty_type}, ${input.counterparty.primary_jurisdiction ?? 'jurisdiction unknown'})`);
  } else {
    lines.push('- Counterparty: not yet identified');
  }
  lines.push(`- Estimated damages: ${dollar(input.estimated_damages_cents)}`);
  if (input.affected_orders_count_aggregate !== null) {
    lines.push(`- Affected order volume (aggregate, no PII): ${input.affected_orders_count_aggregate.toLocaleString()} orders, ${dollar(input.affected_revenue_cents_aggregate)} revenue`);
  }
  lines.push('');

  lines.push('## Counterparty profile');
  if (input.counterparty) {
    lines.push(`- Display label: ${input.counterparty.display_label}`);
    lines.push(`- Type: ${input.counterparty.counterparty_type}`);
    lines.push(`- Jurisdiction: ${input.counterparty.primary_jurisdiction ?? 'unknown'}`);
    if (input.counterparty.verified_business_reg_id) {
      lines.push(`- Business reg: ${input.counterparty.verified_business_reg_id}`);
    }
    if (input.counterparty.verified_domain) {
      lines.push(`- Verified domain: ${input.counterparty.verified_domain}`);
    }
    lines.push(`- Prior cases: ${input.counterparty.total_cases_count}`);
    lines.push(`- Total prior settlements: ${dollar(input.counterparty.total_settlement_cents)}`);
  } else {
    lines.push('Counterparty record has not been linked to this case yet.');
  }
  lines.push('');

  lines.push('## Violation evidence');
  if (input.evidence_summary.length === 0) {
    lines.push('- No evidence artifacts on file.');
  } else {
    for (const e of input.evidence_summary) {
      lines.push(`- ${e.artifact_type} (${e.captured_at_iso.slice(0, 10)}, sha256: ${e.sha256.slice(0, 16)}...): ${e.description ?? '(no description)'}`);
    }
  }
  lines.push('');

  if (input.documented_material_differences && input.documented_material_differences.length > 0) {
    lines.push('## Documented material differences');
    for (const d of input.documented_material_differences) {
      lines.push(`- ${d.category}: ${d.description}`);
    }
    lines.push('');
  }

  lines.push('## Enforcement history this case');
  if (input.enforcement_history.length === 0) {
    lines.push('- No prior enforcement actions on this case.');
  } else {
    for (const h of input.enforcement_history) {
      lines.push(`- ${h.occurred_at_iso.slice(0, 10)}: ${h.description}`);
    }
  }
  lines.push('');

  lines.push('## Suggested action plan');
  if (input.suggested_action_plan.length === 0) {
    lines.push('- (no plan provided)');
  } else {
    input.suggested_action_plan.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
  }
  lines.push('');

  lines.push('## Budget posture');
  lines.push(`- Approved outside counsel budget: ${dollar(input.approved_budget_cents)}`);
  if (input.cfo_approver_label) lines.push(`- CFO approval: ${input.cfo_approver_label}`);
  if (input.ceo_approver_label) lines.push(`- CEO approval: ${input.ceo_approver_label}`);
  lines.push('');

  lines.push('---');
  lines.push('Prepared by ViaCura Legal Ops. PII redacted to aggregates per internal policy. All evidence artifacts referenced above are available with SHA-256 chain-of-custody verification.');

  return lines.join('\n');
}
