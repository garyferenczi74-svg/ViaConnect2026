// Prompt #138a Phase 3 — activate / deactivate a variant in active test.
//
// POST /api/marketing/variants/[id]/activate    body: { active: true|false }
//
// The DB activation invariant CHECK constraint enforces the gate; this
// route surfaces the same gate client-side via canActivateClientSide() so
// the UI can fail-fast with a readable reason.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { canActivateClientSide } from '@/lib/marketing/variants/lifecycle';
import { logVariantEvent } from '@/lib/marketing/variants/logging';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as { active?: boolean } | null;
  if (typeof body?.active !== 'boolean') {
    return NextResponse.json({ error: 'active boolean required' }, { status: 400 });
  }

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: variant } = await (supabase as any)
    .from('marketing_copy_variants')
    .select('id, word_count_validated, marshall_precheck_passed, steve_approval_at, archived, active_in_test')
    .eq('id', params.id)
    .maybeSingle();
  if (!variant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.active) {
    const gate = canActivateClientSide(variant);
    if (!gate.ok) {
      return NextResponse.json({ error: 'Activation gate not met', reasons: gate.reasons }, { status: 409 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('marketing_copy_variants')
    .update({ active_in_test: body.active })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logVariantEvent(supabase, {
    variantId: params.id,
    eventKind: body.active ? 'activated' : 'deactivated',
    actorUserId: auth.user.id,
  });

  return NextResponse.json({ ok: true });
}
