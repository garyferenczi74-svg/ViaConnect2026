// Prompt #125 P5: Approve or reject a pending platform-state change.
//
// POST body:
//   { changeId: string, action: 'approve' | 'reject', rejectionReason?: string }
//
// Dual-approval rules:
//   - caller must be admin/superadmin/compliance_admin
//   - caller cannot be the original proposer
//   - change must still be pending (approved_at IS NULL AND rejected_at IS NULL)
//   - on approve: set approved_{by,at}, applied_at=now, and update the
//     scheduler_platform_states row atomically to the proposed mode
//   - on reject: set rejected_{by,at} + rejection_reason

import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { SCHEDULER_PLATFORMS, type SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'compliance_admin']);

interface Body {
  changeId?: string;
  action?: 'approve' | 'reject';
  rejectionReason?: string;
}

export async function POST(req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = (params.platform ?? '').trim();
  if (!SCHEDULER_PLATFORMS.includes(platform as SchedulerPlatform)) {
    return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!ADMIN_ROLES.has(role)) {
    return NextResponse.json({ error: 'admin_role_required' }, { status: 403 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const changeId = String(body.changeId ?? '').trim();
  const action = body.action;
  if (!changeId) return NextResponse.json({ error: 'change_id_required' }, { status: 400 });
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }

  const { data: change, error: readErr } = await sb
    .from('scheduler_platform_state_changes')
    .select('id, platform, previous_mode, proposed_mode, proposed_by, approved_at, rejected_at')
    .eq('id', changeId)
    .eq('platform', platform)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  if (!change) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (change.approved_at || change.rejected_at) {
    return NextResponse.json({ error: 'change_not_pending' }, { status: 409 });
  }
  if (change.proposed_by === user.id) {
    return NextResponse.json({ error: 'proposer_cannot_approve' }, { status: 403 });
  }

  const now = new Date().toISOString();

  if (action === 'reject') {
    const rejectionReason = String(body.rejectionReason ?? '').trim();
    if (rejectionReason.length < 5) {
      return NextResponse.json({ error: 'rejection_reason_too_short' }, { status: 400 });
    }
    const { error } = await sb
      .from('scheduler_platform_state_changes')
      .update({
        rejected_by: user.id,
        rejected_at: now,
        rejection_reason: rejectionReason,
      })
      .eq('id', changeId)
      .is('approved_at', null)
      .is('rejected_at', null);
    if (error) return NextResponse.json({ error: 'reject_failed', code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true, rejected: true });
  }

  // Approve path: mark change approved + applied, then update the
  // platform state. The .is('approved_at', null) predicate on the
  // update guards against a concurrent approve winning the race.
  const { data: updatedChange, error: approveError } = await sb
    .from('scheduler_platform_state_changes')
    .update({
      approved_by: user.id,
      approved_at: now,
      applied_at: now,
    })
    .eq('id', changeId)
    .is('approved_at', null)
    .is('rejected_at', null)
    .select('id, platform, proposed_mode')
    .maybeSingle();
  if (approveError) {
    return NextResponse.json({ error: 'approve_failed', code: approveError.code }, { status: 500 });
  }
  if (!updatedChange) {
    return NextResponse.json({ error: 'change_race_lost' }, { status: 409 });
  }

  const { error: stateError } = await sb
    .from('scheduler_platform_states')
    .update({
      mode: change.proposed_mode,
      updated_at: now,
      updated_by: user.id,
      applied_change_id: changeId,
    })
    .eq('platform', platform);
  if (stateError) {
    return NextResponse.json({ error: 'state_update_failed', code: stateError.code }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    applied: true,
    platform,
    mode: change.proposed_mode,
  });
}
