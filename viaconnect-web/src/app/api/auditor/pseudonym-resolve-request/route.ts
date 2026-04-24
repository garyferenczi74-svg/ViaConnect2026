// Prompt #122 P8: Auditor pseudonym-resolve request.
//
// POST /api/auditor/pseudonym-resolve-request
// Body: { packetId: string; pseudonym: string; justification: string }
//
// This endpoint OPENS a request. It does NOT resolve the pseudonym.
// Resolution requires Steve + Thomas dual approval, delivered by the
// P9 workflow. Here we only:
//   1. Verify the auditor has an active grant for packetId.
//   2. Validate pseudonym format (26 base32 chars per our pseudonymize output).
//   3. Require a justification >= 20 chars.
//   4. Append a 'pseudonym_resolve_request' row to soc2_auditor_access_log.
//
// Returns 202 Accepted with the access log row id so the auditor UI can
// poll or reference the request in follow-up correspondence.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractRequestMetadata } from '@/lib/soc2/auditor/accessLog';

export const runtime = 'nodejs';

const PSEUDONYM_RE = /^[A-Z2-7]{26}$/;
const MIN_JUSTIFICATION_LEN = 20;

interface Body {
  packetId?: string;
  pseudonym?: string;
  justification?: string;
}

export async function POST(req: NextRequest) {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const packetId = (body.packetId ?? '').trim();
  const pseudonym = (body.pseudonym ?? '').trim().toUpperCase();
  const justification = (body.justification ?? '').trim();

  if (!packetId) {
    return NextResponse.json({ error: 'packetId_required' }, { status: 400 });
  }
  if (!PSEUDONYM_RE.test(pseudonym)) {
    return NextResponse.json({ error: 'invalid_pseudonym_format' }, { status: 400 });
  }
  if (justification.length < MIN_JUSTIFICATION_LEN) {
    return NextResponse.json({ error: 'justification_too_short', minLength: MIN_JUSTIFICATION_LEN }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  const { data: grant } = await sb
    .from('soc2_auditor_grants')
    .select('id')
    .eq('auditor_email', user.email.toLowerCase())
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .contains('packet_ids', [packetId])
    .limit(1)
    .maybeSingle();
  if (!grant) {
    return NextResponse.json({ error: 'no_active_grant' }, { status: 403 });
  }

  const { ipAddress, userAgent } = extractRequestMetadata(req);

  const { data: logRow, error: logErr } = await sb
    .from('soc2_auditor_access_log')
    .insert({
      grant_id: (grant as { id: string }).id,
      packet_id: packetId,
      action: 'pseudonym_resolve_request',
      target_path: null,
      resolved_pseudonym: pseudonym,
      justification,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select('id, occurred_at')
    .single();
  if (logErr) {
    // eslint-disable-next-line no-console
    console.error('[auditor pseudonym-resolve-request] insert failed', { message: logErr.message });
    return NextResponse.json({ error: 'log_insert_failed' }, { status: 500 });
  }

  const row = logRow as { id: number; occurred_at: string };
  return NextResponse.json({
    ok: true,
    requestId: row.id,
    requestedAt: row.occurred_at,
    nextSteps: 'Steve Rica (Compliance) and Thomas Rosengren (Legal) must both approve before the pseudonym can be resolved. You will receive the resolved identity by secure email if approved.',
  }, { status: 202 });
}
