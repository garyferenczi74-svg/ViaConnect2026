// Prompt #127 P4: HIPAA device / media event record.
// 45 CFR 164.310(d)(1), (d)(2)(i-iv).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const HIPAA_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const VALID_KINDS = new Set(['received', 'reissued', 'disposed', 'sanitized', 'reused', 'moved', 'lost', 'stolen']);

interface Body {
  deviceId?: string;
  eventKind?: string;
  eventDate?: string;
  method?: string | null;
  notes?: string | null;
  responsibleParty?: string | null; // auth.users(id)
}

export async function POST(req: NextRequest) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.hipaa.device-media.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.hipaa.device-media.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!HIPAA_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'HIPAA admin role required' }, { status: 403 });

    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const deviceId = (body.deviceId ?? '').trim();
  const eventKind = (body.eventKind ?? '').trim();
  const eventDate = (body.eventDate ?? '').trim();
  if (!deviceId) return NextResponse.json({ error: 'device_id_required' }, { status: 400 });
  if (!VALID_KINDS.has(eventKind)) return NextResponse.json({ error: 'invalid_event_kind' }, { status: 400 });
  if (!eventDate) return NextResponse.json({ error: 'event_date_required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await withTimeout(
    (async () => sb
      .from('hipaa_device_media_events')
      .insert({
        device_id: deviceId,
        event_kind: eventKind,
        event_date: eventDate,
        method: body.method ?? null,
        notes: body.notes ?? null,
        responsible_party: body.responsibleParty ?? user.id,
      })
      .select('id')
      .single())(),
    8000,
    'api.hipaa.device-media.insert',
  );
  if (error) {
    safeLog.error('api.hipaa.device-media', 'insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hipaa.device-media', 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.hipaa.device-media', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
