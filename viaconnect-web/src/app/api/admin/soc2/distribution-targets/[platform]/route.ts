// Prompt #122 P7: distribution-target toggle / update.
// Admin/superadmin only. Only fields allowed to mutate: enabled, api_url, api_key_ref, notes.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);
const VALID_PLATFORMS = new Set(['drata', 'vanta', 'manual_download']);

interface Body {
  enabled?: boolean;
  api_url?: string | null;
  api_key_ref?: string | null;
  notes?: string | null;
}

export async function PATCH(req: NextRequest, { params }: { params: { platform: string } }) {
  try {
    if (!VALID_PLATFORMS.has(params.platform)) {
      return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
    }
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.soc2.distribution-targets.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const profileRes = await withTimeout(
      (async () => supabase.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.soc2.distribution-targets.load-profile',
    );
    const role = (profileRes.data as { role?: string } | null)?.role ?? '';
    if (!ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

    if (body.api_url !== undefined && body.api_url !== null && !body.api_url.startsWith('https://')) {
      return NextResponse.json({ error: 'api_url_must_be_https' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (typeof body.enabled === 'boolean') update.enabled = body.enabled;
    if (body.api_url !== undefined) update.api_url = body.api_url;
    if (body.api_key_ref !== undefined) update.api_key_ref = body.api_key_ref;
    if (body.notes !== undefined) update.notes = body.notes;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await withTimeout(
      (async () => sb
        .from('soc2_distribution_targets')
        .update(update)
        .eq('platform', params.platform))(),
      8000,
      'api.soc2.distribution-targets.update',
    );
    if (error) {
      safeLog.error('api.soc2.distribution-targets', 'update failed', { platform: params.platform, message: error.message });
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.soc2.distribution-targets', 'database timeout', { platform: params.platform, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.soc2.distribution-targets', 'unexpected error', { platform: params.platform, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
