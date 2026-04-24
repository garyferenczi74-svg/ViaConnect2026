// Prompt #122 P8: Auditor-grant list + create.
// GET  → list all grants (compliance readers)
// POST → create a grant (compliance_reader, granted_by = auth.uid()).
//
// Expiry window is validated against the P1 CHECK constraint
// (expires_at <= granted_at + 90 days); we also enforce the same in JS.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const MAX_EXPIRY_DAYS = 90;

async function requireCompliance(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!COMPLIANCE_ROLES.has(role)) {
    return { ok: false, response: NextResponse.json({ error: 'Compliance role required' }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}

export async function GET(_req: NextRequest) {
  const auth = await requireCompliance();
  if (!auth.ok) return auth.response;

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('soc2_auditor_grants')
    .select('id, auditor_email, auditor_firm, packet_ids, granted_by, granted_at, expires_at, revoked, revoked_at, revoked_by, access_count')
    .order('granted_at', { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, grants: data ?? [] });
}

interface CreateBody {
  auditorEmail: string;
  auditorFirm: string;
  packetIds: string[];
  expiresAt: string; // ISO
}

export async function POST(req: NextRequest) {
  const auth = await requireCompliance();
  if (!auth.ok) return auth.response;

  let body: CreateBody;
  try { body = (await req.json()) as CreateBody; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const email = (body.auditorEmail ?? '').trim().toLowerCase();
  const firm = (body.auditorFirm ?? '').trim();
  const packetIds = Array.isArray(body.packetIds) ? body.packetIds.filter((s) => typeof s === 'string') : [];

  if (!email || !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email)) {
    return NextResponse.json({ error: 'invalid_auditor_email' }, { status: 400 });
  }
  if (!firm) {
    return NextResponse.json({ error: 'auditor_firm_required' }, { status: 400 });
  }
  if (packetIds.length === 0) {
    return NextResponse.json({ error: 'packet_ids_required' }, { status: 400 });
  }

  const expiresAt = new Date(body.expiresAt ?? '');
  if (Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: 'invalid_expires_at' }, { status: 400 });
  }
  const now = Date.now();
  const maxExpiry = now + MAX_EXPIRY_DAYS * 86_400_000;
  if (expiresAt.getTime() <= now) {
    return NextResponse.json({ error: 'expires_at_must_be_future' }, { status: 400 });
  }
  if (expiresAt.getTime() > maxExpiry) {
    return NextResponse.json({ error: 'expires_at_exceeds_90_days' }, { status: 400 });
  }

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('soc2_auditor_grants')
    .insert({
      auditor_email: email,
      auditor_firm: firm,
      packet_ids: packetIds,
      granted_by: auth.userId,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, granted_at')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[soc2 auditor-grants] insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  const row = data as { id: string; granted_at: string };
  return NextResponse.json({ ok: true, grantId: row.id, grantedAt: row.granted_at });
}
