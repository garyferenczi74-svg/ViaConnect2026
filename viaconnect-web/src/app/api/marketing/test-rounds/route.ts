// Prompt #138a Phase 3 — test rounds list + create.
//
// GET  /api/marketing/test-rounds                  list rounds (optionally for a surface)
// POST /api/marketing/test-rounds                  create a new round
//                                                  body: { test_id, surface, active_slot_ids }

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import type { VariantSurface } from '@/lib/marketing/variants/types';

const VALID_SURFACES: VariantSurface[] = ['hero'];

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const url = new URL(request.url);
  const surface = url.searchParams.get('surface');
  const includeEnded = url.searchParams.get('includeEnded') === 'true';

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any).from('marketing_copy_test_rounds').select('*');
  if (surface) q = q.eq('surface', surface);
  if (!includeEnded) q = q.is('ended_at', null);
  const { data, error } = await q.order('started_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rounds: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: variants } = await (supabase as any)
    .from('marketing_copy_variants')
    .select('slot_id, active_in_test, surface')
    .in('slot_id', body.active_slot_ids);
  const inactive = (variants ?? []).filter((v: { active_in_test: boolean }) => !v.active_in_test);
  if (inactive.length > 0 || (variants ?? []).length !== body.active_slot_ids.length) {
    return NextResponse.json(
      { error: 'All active_slot_ids must reference variants currently active_in_test=true', inactive },
      { status: 409 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('marketing_copy_test_rounds')
    .insert({
      test_id: body.test_id,
      surface: body.surface,
      active_slot_ids: body.active_slot_ids,
    })
    .select('id')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
