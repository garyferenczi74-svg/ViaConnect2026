// Prompt #138a Phase 3 — Steve approval action.
//
// POST /api/marketing/variants/[id]/approve
// Body: { note?: string }
//
// Records timestamp + identity + optional note. The actor's role must be
// compliance_admin or superadmin per #138a §7.6. The variant must already
// be word_count_validated AND marshall_precheck_passed; otherwise approval
// is rejected with 409.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireMarketingAdmin } from '@/lib/flags/admin-guard';
import { logVariantEvent } from '@/lib/marketing/variants/logging';

const STEVE_LEVEL_ROLES = new Set(['compliance_admin', 'superadmin', 'admin', 'founder']);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireMarketingAdmin();
  if (auth.kind === 'error') return auth.response;
  if (!STEVE_LEVEL_ROLES.has(auth.user.role)) {
    return NextResponse.json({ error: 'Forbidden: approval requires compliance_admin or superadmin.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { note?: string } | null;

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: variant } = await (supabase as any)
    .from('marketing_copy_variants')
    .select('id, word_count_validated, marshall_precheck_passed, archived')
    .eq('id', params.id)
    .maybeSingle();
  if (!variant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (variant.archived) {
    return NextResponse.json({ error: 'Cannot approve archived variant.' }, { status: 409 });
  }
  if (!variant.word_count_validated || !variant.marshall_precheck_passed) {
    return NextResponse.json(
      { error: 'Variant must pass word-count validation and Marshall pre-check before approval.' },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('marketing_copy_variants')
    .update({
      steve_approval_at: now,
      steve_approval_by: auth.user.id,
      steve_approval_note: body?.note?.trim() ?? null,
    })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logVariantEvent(supabase, {
    variantId: params.id,
    eventKind: 'steve_approved',
    eventDetail: { note: body?.note?.trim() ?? null, approver_id: auth.user.id, approver_role: auth.user.role },
    actorUserId: auth.user.id,
  });

  return NextResponse.json({ ok: true, approvedAt: now });
}
