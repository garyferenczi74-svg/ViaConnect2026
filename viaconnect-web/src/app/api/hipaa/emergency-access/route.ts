// Prompt #127 P4: HIPAA emergency access invocation record.
// 45 CFR 164.312(a)(2)(ii), Required.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const HIPAA_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

interface Body {
  justification?: string;
  scopeOfAccess?: string;
  invokedAt?: string;
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

  const justification = (body.justification ?? '').trim();
  const scopeOfAccess = (body.scopeOfAccess ?? '').trim();
  const invokedAt = (body.invokedAt ?? new Date().toISOString()).trim();
  if (justification.length < 30) return NextResponse.json({ error: 'justification_too_short', minLength: 30 }, { status: 400 });
  if (scopeOfAccess.length < 10) return NextResponse.json({ error: 'scope_too_short', minLength: 10 }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await sb
    .from('hipaa_emergency_access_invocations')
    .insert({
      invoked_at: invokedAt,
      invoked_by: user.id,
      justification,
      scope_of_access: scopeOfAccess,
    })
    .select('id')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[hipaa emergency-access] insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
