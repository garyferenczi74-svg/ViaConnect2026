// Prompt #96 Phase 4: Compliance reviewer inbox.
//
// GET /api/admin/white-label/compliance/inbox?role=compliance_officer|medical_director
//
// Returns all pending reviewer assignments for the requested role,
// SLA-decorated via the wl_pending_reviews_with_sla view. Admin-only.
// When role is omitted we include every role the calling admin holds
// per white_label_compliance_reviewer_roles.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const VALID_ROLES = new Set(['compliance_officer', 'medical_director']);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const roleParam = url.searchParams.get('role');
  let roles: string[] = [];
  if (roleParam) {
    if (!VALID_ROLES.has(roleParam)) {
      return NextResponse.json({ error: `Unknown role: ${roleParam}` }, { status: 400 });
    }
    roles = [roleParam];
  } else {
    const { data: held } = await sb
      .from('white_label_compliance_reviewer_roles')
      .select('reviewer_role')
      .eq('user_id', user.id)
      .eq('is_active', true);
    roles = (held ?? []).map((r: { reviewer_role: string }) => r.reviewer_role);
    if (roles.length === 0) roles = Array.from(VALID_ROLES); // admin without explicit role assignment sees all
  }

  const { data, error } = await sb
    .from('wl_pending_reviews_with_sla')
    .select('*')
    .in('reviewer_role', roles)
    .order('assigned_at', { ascending: true })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data ?? [], roles });
}
