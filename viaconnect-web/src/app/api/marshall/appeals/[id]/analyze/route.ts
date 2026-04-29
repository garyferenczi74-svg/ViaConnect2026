// Prompt #123: run analyzer + drafter for an appeal.
// POST /api/marshall/appeals/[id]/analyze
//
// Idempotent at the analysis level (one analysis per appeal); generates
// a new draft version each time it is called when an analysis exists.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runAnalyzer, type AppealContext } from '@/lib/marshall/appeals/analyzer';
import { generateDraft } from '@/lib/marshall/appeals/drafter';
import { logAppealEvent } from '@/lib/marshall/appeals/logging';
import { ANALYZER_VERSION, STEVE_TITLE, type AppealClaimType } from '@/lib/marshall/appeals/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPLIANCE_ROLES = new Set(['admin', 'superadmin', 'compliance_officer', 'compliance_admin']);

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.marshall.appeals.analyze.auth');
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (sb as any)
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    const role = (profile?.role as string | undefined) ?? '';
    if (!COMPLIANCE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: appealRow } = await (sb as any)
      .from('practitioner_notice_appeals')
      .select('id, notice_id, rebuttal, claim_type, submitted_by')
      .eq('id', params.id)
      .maybeSingle();
    if (!appealRow) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: noticeRow } = await (sb as any)
      .from('practitioner_notices')
      .select('id, finding_id, practitioner_id')
      .eq('id', appealRow.notice_id)
      .maybeSingle();

    const ctx: AppealContext = {
      appeal_id: appealRow.id,
      notice_id: appealRow.notice_id,
      finding_id: noticeRow?.finding_id ?? null,
      practitioner_id: noticeRow?.practitioner_id ?? appealRow.submitted_by,
      practitioner_strike_count: 0,
      finding_severity: 'P2',
      evidence_integrity: 'high',
      handle_verified: true,
      remediation_verifiable: false,
      triggers_external_referral: false,
      triggers_clinical_review: false,
      rebuttal_text: appealRow.rebuttal ?? '',
      published_text: null,
      claim_type: appealRow.claim_type as AppealClaimType,
    };

    logAppealEvent({ event: 'analyze_started', appeal_id: ctx.appeal_id });
    const analyzerOutput = await runAnalyzer(sb, ctx);

    // Upsert analysis row (one per appeal_id).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analysisRow, error: analysisErr } = await (sb as any)
      .from('appeal_analyses')
      .upsert({
        appeal_id: ctx.appeal_id,
        claim_type: ctx.claim_type,
        sub_claim_type: analyzerOutput.sub_claim_type,
        recommendation: analyzerOutput.recommendation,
        confidence: analyzerOutput.confidence,
        rationale: analyzerOutput.rationale,
        drift_report: analyzerOutput.drift_report,
        pattern_report: null,
        requires_dual_approval: analyzerOutput.requires_dual_approval,
        dual_approvers: analyzerOutput.dual_approvers,
        analyzer_version: ANALYZER_VERSION,
      }, { onConflict: 'appeal_id' })
      .select('id')
      .single();

    if (analysisErr || !analysisRow) {
      return NextResponse.json({ error: analysisErr?.message ?? 'analysis_insert_failed' }, { status: 500 });
    }

    logAppealEvent({
      event: 'analyze_completed',
      appeal_id: ctx.appeal_id,
      analysis_id: analysisRow.id,
      recommendation: analyzerOutput.recommendation,
    });

    const draftResult = await generateDraft(sb, {
      appeal_id: ctx.appeal_id,
      analysis: {
        id: analysisRow.id,
        recommendation: analyzerOutput.recommendation,
        drift_report: analyzerOutput.drift_report,
        claim_type: ctx.claim_type,
      },
      jurisdiction: 'US',
      language: 'en-US',
      slot_values: {
        practitioner_display_name: 'Practitioner',
        notice_id: ctx.notice_id,
        rule_id: 'PENDING',
        rule_description: 'finding under review',
        citation: 'see notice',
        evidence_reference: ctx.notice_id,
        remediation_action: 'remove or revise the cited content',
        signed_by: 'Steve Rica',
        signed_title: STEVE_TITLE,
      },
    });

    return NextResponse.json({
      ok: true,
      analysis_id: analysisRow.id,
      recommendation: analyzerOutput.recommendation,
      confidence: analyzerOutput.confidence,
      requires_dual_approval: analyzerOutput.requires_dual_approval,
      draft: draftResult,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.appeals.analyze', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.appeals.analyze', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
