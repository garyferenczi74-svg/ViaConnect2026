// Prompt #138a Phase 3 — Steve approval revocation.
//
// POST /api/marketing/variants/[id]/revoke
// Body: { reason: string }
//
// Per #138a §6.6 and §7.6: revocation immediately deactivates the variant in
// any active test. Compliance_admin / superadmin only.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { logVariantEvent } from '@/lib/marketing/variants/logging';

const STEVE_LEVEL_ROLES = new Set(['compliance_admin', 'superadmin', 'admin', 'founder']);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;
  if (!STEVE_LEVEL_ROLES.has(auth.user.role)) {
    return NextResponse.json({ error: 'Forbidden: revocation requires compliance_admin or superadmin.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = body?.reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 });
  }

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: variant } = await (supabase as any)
    .from('marketing_copy_variants')
    .select('id, steve_approval_at, active_in_test')
    .eq('id', params.id)
    .maybeSingle();
  if (!variant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('marketing_copy_variants')
    .update({
      steve_approval_at: null,
      steve_approval_by: null,
      steve_approval_note: null,
      active_in_test: false,
    })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logVariantEvent(supabase, {
    variantId: params.id,
    eventKind: 'steve_revoked',
    eventDetail: { reason, was_active: variant.active_in_test, revoker_id: auth.user.id, revoker_role: auth.user.role },
    actorUserId: auth.user.id,
  });

  return NextResponse.json({ ok: true });
}
