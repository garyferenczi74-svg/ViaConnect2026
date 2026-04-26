// Prompt #138a Phase 3 — archive / restore a variant.
//
// POST /api/marketing/variants/[id]/archive    body: { archived: true|false }
//
// Archived variants are preserved indefinitely (per #138a §6.5 — losers are
// archived, not deleted). Archiving an active variant first deactivates it.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireMarketingAdmin } from '@/lib/flags/admin-guard';
import { logVariantEvent } from '@/lib/marketing/variants/logging';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireMarketingAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as { archived?: boolean } | null;
  if (typeof body?.archived !== 'boolean') {
    return NextResponse.json({ error: 'archived boolean required' }, { status: 400 });
  }

  const supabase = createClient();
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('marketing_copy_variants')
    .update({
      archived: body.archived,
      archived_at: body.archived ? now : null,
      // Archiving deactivates; restoring does NOT auto-activate.
      ...(body.archived ? { active_in_test: false } : {}),
    })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logVariantEvent(supabase, {
    variantId: params.id,
    eventKind: body.archived ? 'archived' : 'restored',
    actorUserId: auth.user.id,
  });

  return NextResponse.json({ ok: true });
}
