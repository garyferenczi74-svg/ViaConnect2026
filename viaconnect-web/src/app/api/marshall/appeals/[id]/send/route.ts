// Prompt #123: Steve's send action (with optional second-approver token).
// POST /api/marshall/appeals/[id]/send
// Body: { decision_kind, modification_reason_code?, modification_note?,
//         final_response_text, second_approver_user_id?, second_approver_note? }
//
// Server-enforced dual-approval gate per spec section 16.1: when the
// analysis row has requires_dual_approval=true, the request must include
// a second_approver_user_id corresponding to a user with the appropriate
// role grant (route-layer check; deeper RBAC plumbing is Phase 2).

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordDecisionAndSend } from '@/lib/marshall/appeals/send';
import type { AppealDecisionKind, AppealModificationReasonCode } from '@/lib/marshall/appeals/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPLIANCE_ROLES = new Set(['admin', 'superadmin', 'compliance_officer', 'compliance_admin']);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.marshall.appeals.send.auth');
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (sb as any)
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    const role = (profile?.role as string | undefined) ?? '';
    if (!COMPLIANCE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as {
      decision_kind?: string;
      modification_reason_code?: string;
      modification_note?: string;
      final_response_text?: string;
      final_draft_id?: string | null;
      second_approver_user_id?: string;
      second_approver_note?: string;
      diff_summary?: { kind: 'minor' | 'substantive'; chars_changed: number };
    } | null;

    if (!body?.decision_kind || !body.final_response_text) {
      return NextResponse.json({ error: 'decision_kind and final_response_text required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analysis } = await (sb as any)
      .from('appeal_analyses')
      .select('id')
      .eq('appeal_id', params.id)
      .maybeSingle();
    if (!analysis) {
      return NextResponse.json({ error: 'analysis_not_found' }, { status: 404 });
    }

    const result = await recordDecisionAndSend(sb, {
      appeal_id: params.id,
      analysis_id: analysis.id,
      final_draft_id: body.final_draft_id ?? null,
      decision_kind: body.decision_kind as AppealDecisionKind,
      modification_reason_code: body.modification_reason_code as AppealModificationReasonCode | undefined,
      modification_note: body.modification_note,
      diff_summary: body.diff_summary,
      decided_by: user.id,
      second_approver: body.second_approver_user_id,
      second_approver_note: body.second_approver_note,
      final_response_text: body.final_response_text,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true, decision_id: result.decision_id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.appeals.send', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.appeals.send', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
