// Prompt #104 Phase 4: Cease-and-desist letter draft builder.
//
// Assembles the merge-field context map for a given case + template,
// renders the final body, computes SHA-256 of the rendered bytes for
// chain-of-custody, and reports any unresolved placeholders.
//
// Pure function: no DB, no IO. The API supplies the records; this
// returns the bundle the API writes into legal_enforcement_actions.

import { resolveMergeFields, type MergeFieldContext } from '../templates/mergeFieldResolver';
import { sha256Hex } from '../evidence/hashing';

export interface DraftBuilderInput {
  case: {
    case_label: string;
    bucket: string;
    notes: string | null;
  };
  counterparty: {
    display_label: string;
    contact_address: string | null;
    primary_jurisdiction: string | null;
  } | null;
  product: {
    name: string;
  } | null;
  template: {
    template_id: string;
    template_family: string;
    version: string;
    markdown_body: string;
    required_merge_fields: ReadonlyArray<string>;
  };
  signing_officer: string;
  response_deadline_iso: string;            // ISO date string e.g. 2026-05-08
  evidence_summary: string | null;          // free-text bullets summarizing what evidence supports the case
  material_differences_summary?: string | null;
  wholesale_agreement_reference?: string | null;
  breach_clauses?: string | null;
  map_policy_reference?: string | null;
  specific_violations_summary?: string | null;
  copyrighted_work_url?: string | null;
  infringing_listing_url?: string | null;
  copyright_registration?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  asin_or_listing_url?: string | null;
  complaint_type?: string | null;
}

export interface DraftBundle {
  body: string;
  sha256: string;
  missing_fields: string[];
}

export function buildMergeContext(input: DraftBuilderInput): MergeFieldContext {
  return {
    case_label:                    input.case.case_label,
    'counterparty.display_label':  input.counterparty?.display_label ?? null,
    'counterparty.contact_address': input.counterparty?.contact_address ?? null,
    'product.name':                input.product?.name ?? null,
    signing_officer:               input.signing_officer,
    response_deadline:             input.response_deadline_iso,
    evidence_summary:              input.evidence_summary ?? null,
    material_differences_summary:  input.material_differences_summary ?? null,
    wholesale_agreement_reference: input.wholesale_agreement_reference ?? null,
    breach_clauses:                input.breach_clauses ?? null,
    map_policy_reference:          input.map_policy_reference ?? null,
    specific_violations_summary:   input.specific_violations_summary ?? null,
    copyrighted_work_url:          input.copyrighted_work_url ?? null,
    infringing_listing_url:        input.infringing_listing_url ?? null,
    copyright_registration:        input.copyright_registration ?? null,
    contact_email:                 input.contact_email ?? null,
    contact_phone:                 input.contact_phone ?? null,
    asin_or_listing_url:           input.asin_or_listing_url ?? null,
    complaint_type:                input.complaint_type ?? null,
  };
}

export async function buildEnforcementDraft(input: DraftBuilderInput): Promise<DraftBundle> {
  const context = buildMergeContext(input);
  const merge = resolveMergeFields(input.template.markdown_body, context, { strict: false });
  const sha256 = await sha256Hex(new TextEncoder().encode(merge.body));
  return { body: merge.body, sha256, missing_fields: merge.missing };
}
