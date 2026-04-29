// Prompt #138a Phase 3 — test rounds list + create.
//
// GET  /api/marketing/test-rounds                  list rounds (optionally for a surface)
// POST /api/marketing/test-rounds                  create a new round
//                                                  body: { test_id, surface, active_slot_ids }

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireMarketingAdmin } from '@/lib/flags/admin-guard';
import type { VariantSurface } from '@/lib/marketing/variants/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const VALID_SURFACES: VariantSurface[] = ['hero'];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMarketingAdmin();
    if (auth.kind === 'error') return auth.response;

    const url = new URL(request.url);
    const surface = url.searchParams.get('surface');
    const includeEnded = url.searchParams.get('includeEnded') === 'true';

    const supabase = createClient();
    const { data, error } = await withTimeout(
      (async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabase as any).from('marketing_copy_test_rounds').select('*');
        if (surface) q = q.eq('surface', surface);
        if (!includeEnded) q = q.is('ended_at', null);
        return q.order('started_at', { ascending: false });
      })(),
      8000,
      'api.marketing.test-rounds.list',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rounds: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marketing.test-rounds', 'list timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.marketing.test-rounds', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMarketingAdmin();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as {
      test_id?: string;
      surface?: string;
      active_slot_ids?: string[];
    } | null;

    if (!body?.test_id || !body.surface || !Array.isArray(body.active_slot_ids) || body.active_slot_ids.length === 0) {
      return NextResponse.json(
        { error: 'test_id, surface, and at least one active_slot_id are required' },
        { status: 400 },
      );
    }
    if (!VALID_SURFACES.includes(body.surface as VariantSurface)) {
      return NextResponse.json({ error: 'Invalid surface' }, { status: 400 });
    }

    // Verify every cited slot is currently active_in_test.
    const supabase = createClient();
    const { data: variants } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('marketing_copy_variants')
        .select('slot_id, active_in_test, surface')
        .in('slot_id', body.active_slot_ids))(),
      8000,
      'api.marketing.test-rounds.verify',
    );
    const inactive = (variants ?? []).filter((v: { active_in_test: boolean }) => !v.active_in_test);
    if (inactive.length > 0 || (variants ?? []).length !== body.active_slot_ids.length) {
      return NextResponse.json(
        { error: 'All active_slot_ids must reference variants currently active_in_test=true', inactive },
        { status: 409 },
      );
    }

    const { data, error } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('marketing_copy_test_rounds')
        .insert({
          test_id: body.test_id,
          surface: body.surface,
          active_slot_ids: body.active_slot_ids,
        })
        .select('id')
        .single())(),
      8000,
      'api.marketing.test-rounds.create',
    );
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marketing.test-rounds', 'create timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.marketing.test-rounds', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
