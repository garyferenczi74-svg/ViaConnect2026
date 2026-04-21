// Prompt #104 Phase 4: Enforcement-action draft creation.
//
// POST /api/admin/legal/cases/[caseId]/enforcement-actions
//   { action_type, template_id, target_platform?, target_listing_url?,
//     signing_officer, response_deadline_days, evidence_summary?,
//     ...optional template-specific merge fields }
//   -> validates bucket+template compatibility, evidence sufficiency
//      (counterfeit needs physical evidence, material-differences
//      needs documented diffs), renders the draft body, hashes it,
//      and inserts a row in 'draft' status. Sending is a separate
//      step (PATCH on the action).
//
// HARD STOPS enforced here:
//   - bucket-mismatch blocks template selection (spec §15)
//   - counterfeit allegation blocked without physical evidence
//   - material-differences blocked without documented diffs
//   - DMCA template requires the six § 512(c)(3)(A) statutory elements
//     to be supplied (validated against the merge context)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { isTemplateCompatibleWithBucket, bucketSupportsIPEnforcement } from '@/lib/legal/bucketClassifier';
import { buildEnforcementDraft } from '@/lib/legal/enforcement/cdLetterBuilder';
import { validateDMCAStatutoryElements, validateMaterialDifferences } from '@/lib/legal/templates/statutoryValidator';
import {
  ENFORCEMENT_ACTION_TYPES,
  TEMPLATE_FAMILIES,
  type EnforcementActionType,
  type LegalCaseBucket,
  type TemplateFamily,
} from '@/lib/legal/types';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const ACTION_TYPE_SET = new Set<string>(ENFORCEMENT_ACTION_TYPES);
const TEMPLATE_FAMILY_SET = new Set<string>(TEMPLATE_FAMILIES);
const DMCA_TEMPLATE_FAMILIES = new Set<string>(['dmca_takedown_amazon', 'dmca_takedown_etsy', 'dmca_takedown_ebay']);

interface ProfileLite { role: string }

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

interface CaseRow {
  case_id: string;
  case_label: string;
  bucket: string;
  notes: string | null;
  counterparty_id: string | null;
  legal_counterparties: { display_label: string | null; contact_info_vault_ref: string | null; primary_jurisdiction: string | null } | null;
}

interface TemplateRow {
  template_id: string;
  template_family: string;
  version: string;
  applicable_buckets: string[];
  required_merge_fields: string[];
  markdown_body: string;
  status: string;
}

interface EvidenceTypeRow { artifact_type: string }

export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};
  const actionType: string | null = typeof body.action_type === 'string' && ACTION_TYPE_SET.has(body.action_type) ? body.action_type : null;
  const templateId: string | null = typeof body.template_id === 'string' ? body.template_id : null;
  const signingOfficer: string | null = typeof body.signing_officer === 'string' && body.signing_officer.length >= 3 ? body.signing_officer : null;
  const responseDeadlineDays: number = Number.isFinite(body.response_deadline_days) ? Number(body.response_deadline_days) : 14;
  const targetListingUrl: string | null = typeof body.target_listing_url === 'string' ? body.target_listing_url : null;
  const targetPlatform: string | null = typeof body.target_platform === 'string' ? body.target_platform : null;

  if (!actionType) return NextResponse.json({ error: 'action_type required (valid enum)' }, { status: 400 });
  if (!templateId) return NextResponse.json({ error: 'template_id required' }, { status: 400 });
  if (!signingOfficer) return NextResponse.json({ error: 'signing_officer required (>= 3 chars)' }, { status: 400 });
  if (responseDeadlineDays < 1 || responseDeadlineDays > 90) {
    return NextResponse.json({ error: 'response_deadline_days must be 1..90' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Load case + counterparty.
  const { data: caseRow } = await sb
    .from('legal_investigation_cases')
    .select(`case_id, case_label, bucket, notes, counterparty_id,
             legal_counterparties ( display_label, contact_info_vault_ref, primary_jurisdiction )`)
    .eq('case_id', params.caseId)
    .maybeSingle() as { data: CaseRow | null };
  if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Load template.
  const { data: template } = await sb
    .from('legal_templates_library')
    .select('template_id, template_family, version, applicable_buckets, required_merge_fields, markdown_body, status')
    .eq('template_id', templateId)
    .maybeSingle() as { data: TemplateRow | null };
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!TEMPLATE_FAMILY_SET.has(template.template_family)) {
    return NextResponse.json({ error: `Unknown template family: ${template.template_family}` }, { status: 500 });
  }
  if (template.status === 'retired') {
    return NextResponse.json({ error: 'Template is retired; pick an active version' }, { status: 400 });
  }

  // HARD STOP: bucket-template compatibility (spec §15).
  const compat = isTemplateCompatibleWithBucket({
    template_family: template.template_family as TemplateFamily,
    bucket: caseRow.bucket as LegalCaseBucket,
  });
  if (!compat.ok) {
    return NextResponse.json({
      error: `Template ${template.template_family} is not compatible with case bucket ${caseRow.bucket}`,
      reason: compat.reason,
    }, { status: 422 });
  }

  // HARD STOP: bucket evidence requirements for IP enforcement
  // (counterfeit needs physical evidence; material-differences needs
  // documented diffs).
  if (caseRow.bucket === 'counterfeit' || caseRow.bucket === 'gray_market_material_differences') {
    const { data: evRows } = await sb
      .from('legal_investigation_evidence')
      .select('artifact_type')
      .eq('case_id', params.caseId) as { data: EvidenceTypeRow[] | null };
    const evidenceTypes = (evRows ?? []).map((r) => r.artifact_type);
    const documentedDiffsCount = Array.isArray(body.documented_material_differences) ? body.documented_material_differences.length : 0;

    const evidenceCheck = bucketSupportsIPEnforcement({
      bucket: caseRow.bucket as LegalCaseBucket,
      evidence_artifact_types: evidenceTypes,
      documented_material_differences_count: documentedDiffsCount,
    });
    if (!evidenceCheck.ok) {
      return NextResponse.json({
        error: 'Evidence does not support IP enforcement for this bucket',
        reason: evidenceCheck.reason,
      }, { status: 422 });
    }

    // For material-differences, also run the structured validator on
    // the supplied differences list so empty descriptions are caught.
    if (caseRow.bucket === 'gray_market_material_differences') {
      const docs = Array.isArray(body.documented_material_differences) ? body.documented_material_differences : [];
      const matCheck = validateMaterialDifferences({ documented_differences: docs });
      if (!matCheck.ok) {
        return NextResponse.json({ error: 'Material differences invalid', reason: matCheck.reason }, { status: 422 });
      }
    }
  }

  // HARD STOP: DMCA templates require the six § 512(c)(3)(A) elements
  // to be supplied via the merge context (the DB CHECK constraint
  // enforces the same rule when the dmca_filings row gets inserted in
  // a follow-on step; we surface the error here with field-level detail).
  if (DMCA_TEMPLATE_FAMILIES.has(template.template_family)) {
    const dmcaCheck = validateDMCAStatutoryElements({
      signature: signingOfficer,
      copyrighted_work_identification: typeof body.copyrighted_work_url === 'string' ? body.copyrighted_work_url : null,
      infringing_material_identification: typeof body.infringing_listing_url === 'string' ? body.infringing_listing_url : null,
      contact_info: { email: typeof body.contact_email === 'string' ? body.contact_email : null, phone: typeof body.contact_phone === 'string' ? body.contact_phone : null },
      good_faith_statement_present: body.good_faith_statement_present === true,
      perjury_statement_present: body.perjury_statement_present === true,
    });
    if (!dmcaCheck.ok) {
      return NextResponse.json({ error: 'DMCA statutory elements incomplete', missing: dmcaCheck.missing }, { status: 422 });
    }
  }

  // Build merge context + render draft + hash.
  const responseDeadlineIso = new Date(Date.now() + responseDeadlineDays * 86_400_000).toISOString().slice(0, 10);
  const draft = await buildEnforcementDraft({
    case: { case_label: caseRow.case_label, bucket: caseRow.bucket, notes: caseRow.notes },
    counterparty: caseRow.legal_counterparties
      ? { display_label: caseRow.legal_counterparties.display_label ?? '', contact_address: null, primary_jurisdiction: caseRow.legal_counterparties.primary_jurisdiction }
      : null,
    product: typeof body.product_name === 'string' ? { name: body.product_name } : null,
    template,
    signing_officer: signingOfficer,
    response_deadline_iso: responseDeadlineIso,
    evidence_summary: typeof body.evidence_summary === 'string' ? body.evidence_summary : null,
    material_differences_summary: typeof body.material_differences_summary === 'string' ? body.material_differences_summary : null,
    wholesale_agreement_reference: typeof body.wholesale_agreement_reference === 'string' ? body.wholesale_agreement_reference : null,
    breach_clauses: typeof body.breach_clauses === 'string' ? body.breach_clauses : null,
    map_policy_reference: typeof body.map_policy_reference === 'string' ? body.map_policy_reference : null,
    specific_violations_summary: typeof body.specific_violations_summary === 'string' ? body.specific_violations_summary : null,
    copyrighted_work_url: typeof body.copyrighted_work_url === 'string' ? body.copyrighted_work_url : null,
    infringing_listing_url: typeof body.infringing_listing_url === 'string' ? body.infringing_listing_url : null,
    copyright_registration: typeof body.copyright_registration === 'string' ? body.copyright_registration : null,
    contact_email: typeof body.contact_email === 'string' ? body.contact_email : null,
    contact_phone: typeof body.contact_phone === 'string' ? body.contact_phone : null,
    asin_or_listing_url: typeof body.asin_or_listing_url === 'string' ? body.asin_or_listing_url : null,
    complaint_type: typeof body.complaint_type === 'string' ? body.complaint_type : null,
  });

  // Insert draft. The DB trigger enforce_legal_action_no_auto_send rejects
  // any attempt to ship status='sent' without an approval — we never
  // reach that path here; we always start in 'draft'.
  const { data: created, error } = await sb
    .from('legal_enforcement_actions')
    .insert({
      case_id: params.caseId,
      action_type: actionType as EnforcementActionType,
      template_id: template.template_id,
      target_platform: targetPlatform,
      target_listing_url: targetListingUrl,
      draft_storage_path: null,
      draft_content_sha256: draft.sha256,
      status: 'draft',
      drafted_by: ctx.user_id,
      response_deadline: new Date(`${responseDeadlineIso}T23:59:59Z`).toISOString(),
      metadata_json: {
        body: draft.body,
        missing_fields: draft.missing_fields,
        signing_officer: signingOfficer,
        target_platform: targetPlatform,
        target_listing_url: targetListingUrl,
        template_family: template.template_family,
        template_version: template.version,
      },
    })
    .select('action_id, status, drafted_at')
    .maybeSingle();
  if (error || !created) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id,
    actor_role: ctx.role,
    action_category: 'enforcement_action',
    action_verb: 'drafted',
    target_table: 'legal_enforcement_actions',
    target_id: created.action_id,
    case_id: params.caseId,
    after_state_json: {
      template_id: template.template_id,
      template_family: template.template_family,
      action_type: actionType,
      sha256: draft.sha256,
      missing_fields: draft.missing_fields,
    },
  });

  return NextResponse.json({
    action: created,
    draft: { sha256: draft.sha256, body: draft.body, missing_fields: draft.missing_fields },
  }, { status: 201 });
}
