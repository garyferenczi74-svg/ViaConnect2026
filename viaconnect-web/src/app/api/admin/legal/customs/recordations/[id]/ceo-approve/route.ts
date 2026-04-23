// Prompt #114 P2b: CEO approval endpoint.
//
// POST /api/admin/legal/customs/recordations/[id]/ceo-approve
//   -> invokes the SECURITY DEFINER approve_customs_recordation_ceo RPC.
//
// The RPC derives ceo_approved_by from auth.uid() inside the DB so the
// caller cannot impersonate the CEO via request body. The RPC also
// re-asserts role='ceo' + aal='aal2' at DB level. Matches precedent from
// grant_customs_counsel_session (20260424000230).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';

export const runtime = 'nodejs';

interface ProfileLite {
  role: string;
}

async function requireAuthed(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{ data: ProfileLite | null }>;
        };
      };
    };
  };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return {
    ok: true as const,
    user_id: user.id,
    role: profile?.role ?? 'unknown',
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireAuthed(supabase);
  if (!ctx.ok) return ctx.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data, error } = await sb.rpc('approve_customs_recordation_ceo', {
    p_recordation_id: params.id,
  });

  if (error) {
    const msg = error.message ?? 'CEO approval failed';
    const status =
      msg.includes('Only the CEO') ? 403 :
      msg.includes('MFA-verified') ? 403 :
      msg.includes('not found') ? 404 :
      msg.includes('terminal status') ? 409 :
      500;
    return NextResponse.json({ error: msg }, { status });
  }

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id,
    actor_role: ctx.role,
    action_category: 'customs_recordation',
    action_verb: 'ceo_approved',
    target_table: 'customs_recordations',
    target_id: params.id,
    after_state_json: { ceo_approved_at: new Date().toISOString() },
  });

  return NextResponse.json({ recordation_id: data });
}
