// Prompt #125 P5: Propose a platform-mode change.
//
// POST body: { proposedMode: 'active' | 'scan_only' | 'disabled', reason: string }
// Role-gated to admin/superadmin/compliance_admin.
// Rejects if another pending change is already open for the platform
// (operators must resolve or cancel the existing one first).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { SCHEDULER_PLATFORMS, type SchedulerPlatform } from '@/lib/marshall/scheduler/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const VALID_MODES = new Set(['active', 'scan_only', 'disabled']);
const ADMIN_ROLES = new Set(['admin', 'superadmin', 'compliance_admin']);

interface ProposeBody {
  proposedMode?: string;
  reason?: string;
}

export async function POST(req: NextRequest, { params }: { params: { platform: string } }) {
  try {
    const platform = (params.platform ?? '').trim();
    if (!SCHEDULER_PLATFORMS.includes(platform as SchedulerPlatform)) {
      return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.marshall.scheduler.admin.propose.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'admin_role_required' }, { status: 403 });
    }

    let body: ProposeBody;
    try { body = (await req.json()) as ProposeBody; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

    const proposedMode = String(body.proposedMode ?? '').trim();
    const reason = String(body.reason ?? '').trim();
    if (!VALID_MODES.has(proposedMode)) {
      return NextResponse.json({ error: 'invalid_mode' }, { status: 400 });
    }
    if (reason.length < 20 || reason.length > 2000) {
      return NextResponse.json({ error: 'reason_length_invalid', min: 20, max: 2000 }, { status: 400 });
    }

    const { data: current } = await sb
      .from('scheduler_platform_states')
      .select('mode')
      .eq('platform', platform)
      .maybeSingle();
    const currentMode = (current as { mode?: string } | null)?.mode ?? 'active';
    if (currentMode === proposedMode) {
      return NextResponse.json({ error: 'no_change_proposed' }, { status: 400 });
    }

    const { data: existingPending } = await sb
      .from('scheduler_platform_state_changes')
      .select('id')
      .eq('platform', platform)
      .is('approved_at', null)
      .is('rejected_at', null)
      .maybeSingle();
    if (existingPending) {
      return NextResponse.json({
        error: 'pending_change_exists',
        existingChangeId: (existingPending as { id: string }).id,
      }, { status: 409 });
    }

    const { data: inserted, error } = await sb
      .from('scheduler_platform_state_changes')
      .insert({
        platform,
        previous_mode: currentMode,
        proposed_mode: proposedMode,
        proposed_by: user.id,
        proposal_reason: reason,
      })
      .select('id')
      .single();
    if (error) {
      return NextResponse.json({ error: 'insert_failed', code: error.code ?? 'unknown' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, changeId: (inserted as { id: string }).id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.scheduler.admin.propose', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.scheduler.admin.propose', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
