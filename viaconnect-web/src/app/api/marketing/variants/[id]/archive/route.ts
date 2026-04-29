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
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireMarketingAdmin();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as { archived?: boolean } | null;
    if (typeof body?.archived !== 'boolean') {
      return NextResponse.json({ error: 'archived boolean required' }, { status: 400 });
    }

    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('marketing_copy_variants')
        .update({
          archived: body.archived,
          archived_at: body.archived ? now : null,
          // Archiving deactivates; restoring does NOT auto-activate.
          ...(body.archived ? { active_in_test: false } : {}),
        })
        .eq('id', params.id))(),
      8000,
      'api.marketing.variants.archive.update',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logVariantEvent(supabase, {
      variantId: params.id,
      eventKind: body.archived ? 'archived' : 'restored',
      actorUserId: auth.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marketing.variants.archive', 'timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.marketing.variants.archive', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
