// Prompt #122 P8: Auditor signed-URL download for a packet ZIP.
//
// Auth: authenticated Supabase user whose email matches an active grant
// covering the packet ID. The P1 soc2_has_auditor_access(packet_id) helper
// enforces this at the RLS layer; we also check in-route so the 403 is
// explicit. Writes an access_log 'packet_download' event then redirects
// to a short-lived signed URL from the 'soc2-packets' bucket.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditorAccess, extractRequestMetadata } from '@/lib/soc2/auditor/accessLog';

export const runtime = 'nodejs';

const SIGNED_URL_TTL_SECONDS = 5 * 60;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.redirect(new URL('/auditor', req.url));
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  // Find an active grant for this user's email that includes the packet.
  const { data: grant } = await sb
    .from('soc2_auditor_grants')
    .select('id, expires_at, revoked, packet_ids')
    .eq('auditor_email', user.email.toLowerCase())
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .contains('packet_ids', [params.id])
    .limit(1)
    .maybeSingle();
  if (!grant) {
    return NextResponse.json({ error: 'no_active_grant' }, { status: 403 });
  }

  const { data: packet } = await sb
    .from('soc2_packets')
    .select('storage_key')
    .eq('id', params.id)
    .maybeSingle();
  if (!packet?.storage_key) {
    return NextResponse.json({ error: 'packet_not_found' }, { status: 404 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from('soc2-packets')
    .createSignedUrl(packet.storage_key, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    // eslint-disable-next-line no-console
    console.error('[auditor download] signed URL failed', { packetId: params.id, message: signErr?.message });
    return NextResponse.json({ error: 'signed_url_failed' }, { status: 500 });
  }

  const { ipAddress, userAgent } = extractRequestMetadata(req);
  await logAuditorAccess({
    supabase: admin,
    grantId: (grant as { id: string }).id,
    packetId: params.id,
    action: 'packet_download',
    targetPath: packet.storage_key,
    ipAddress,
    userAgent,
  });

  return NextResponse.redirect(signed.signedUrl, 302);
}
