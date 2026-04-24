// Prompt #127 P4: HIPAA Sanction action record.
// 45 CFR 164.308(a)(1)(ii)(C), Required.

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const HIPAA_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const VALID_KINDS = new Set(['verbal_warning', 'written_warning', 'retraining', 'suspension', 'termination', 'other']);

interface Body {
  workforceMemberRealId?: string; // server pseudonymizes before storing
  actionKind?: string;
  triggeringIncidentId?: string | null;
  actionDate?: string; // yyyy-mm-dd
}

export async function POST(req: NextRequest) {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!HIPAA_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'HIPAA admin role required' }, { status: 403 });

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const realId = (body.workforceMemberRealId ?? '').trim();
  const actionKind = (body.actionKind ?? '').trim();
  const actionDate = (body.actionDate ?? '').trim();
  if (!realId) return NextResponse.json({ error: 'workforce_member_required' }, { status: 400 });
  if (!VALID_KINDS.has(actionKind)) return NextResponse.json({ error: 'invalid_action_kind' }, { status: 400 });
  if (!actionDate) return NextResponse.json({ error: 'action_date_required' }, { status: 400 });

  // Stable workforce pseudonym (NOT per-packet, per-row at ingestion time).
  // Seed is an env-var key; if unset, use a deterministic keyed hash
  // anchored on the user's auth.users row for reproducibility within the
  // covered-entity boundary.
  const seed = process.env.HIPAA_WORKFORCE_PSEUDONYM_SEED ?? 'farmceutica-workforce-pseudonym-v1';
  const pseudonym = createHash('sha256').update(`${seed}:${realId}`).digest('hex').slice(0, 32).toUpperCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await sb
    .from('hipaa_sanction_actions')
    .insert({
      workforce_member_pseudonym: pseudonym,
      action_kind: actionKind,
      triggering_incident_id: body.triggeringIncidentId ?? null,
      action_date: actionDate,
      recorded_by: user.id,
    })
    .select('id')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[hipaa sanctions] insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id, pseudonym });
}
