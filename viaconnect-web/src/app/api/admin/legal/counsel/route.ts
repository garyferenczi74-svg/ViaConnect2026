// Prompt #104 Phase 6: Outside counsel roster.
//
// GET  /api/admin/legal/counsel?active_only=true
// POST /api/admin/legal/counsel
//   { firm_name, attorney_name, specialty[], jurisdictions[],
//     billing_rate_cents?, retainer_required?, retainer_amount_cents?,
//     contact_info_vault_ref, engagement_letter_vault_ref?, notes? }
//
// RLS: admin only (per spec §3.4 + §7.6 RLS section).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';

export const runtime = 'nodejs';

interface ProfileLite { role: string }

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireAdmin(supabase);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('active_only') === 'true';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let q = sb.from('legal_outside_counsel')
    .select('counsel_id, firm_name, attorney_name, specialty, jurisdictions, billing_rate_cents, retainer_required, retainer_amount_cents, active, performance_history_json, created_at')
    .order('firm_name');
  if (activeOnly) q = q.eq('active', true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireAdmin(supabase);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};
  if (typeof body.firm_name !== 'string' || body.firm_name.length < 2) {
    return NextResponse.json({ error: 'firm_name required' }, { status: 400 });
  }
  if (typeof body.attorney_name !== 'string' || body.attorney_name.length < 2) {
    return NextResponse.json({ error: 'attorney_name required' }, { status: 400 });
  }
  if (typeof body.contact_info_vault_ref !== 'string' || body.contact_info_vault_ref.length < 4) {
    return NextResponse.json({ error: 'contact_info_vault_ref required (vault key for encrypted contact info)' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: created, error } = await sb
    .from('legal_outside_counsel')
    .insert({
      firm_name: body.firm_name,
      attorney_name: body.attorney_name,
      specialty: Array.isArray(body.specialty) ? body.specialty : [],
      jurisdictions: Array.isArray(body.jurisdictions) ? body.jurisdictions : [],
      billing_rate_cents: typeof body.billing_rate_cents === 'number' ? body.billing_rate_cents : null,
      retainer_required: body.retainer_required === true,
      retainer_amount_cents: typeof body.retainer_amount_cents === 'number' ? body.retainer_amount_cents : null,
      contact_info_vault_ref: body.contact_info_vault_ref,
      engagement_letter_vault_ref: typeof body.engagement_letter_vault_ref === 'string' ? body.engagement_letter_vault_ref : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
    })
    .select('counsel_id, firm_name, attorney_name')
    .maybeSingle();
  if (error || !created) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id, actor_role: ctx.role,
    action_category: 'counsel_engagement', action_verb: 'counsel_added',
    target_table: 'legal_outside_counsel', target_id: created.counsel_id,
    after_state_json: { firm_name: created.firm_name, attorney_name: created.attorney_name },
  });

  return NextResponse.json({ counsel: created }, { status: 201 });
}
