// Prompt #138a Phase 3 — resume a paused test round.
//
// POST /api/marketing/test-rounds/[id]/resume
//
// Resumes by stamping resumed_at; visitors return to variant rotation.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: round } = await (supabase as any)
    .from('marketing_copy_test_rounds')
    .select('id, paused_at, ended_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!round) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (round.ended_at) return NextResponse.json({ error: 'Round already ended' }, { status: 409 });
  if (!round.paused_at) return NextResponse.json({ error: 'Round is not paused' }, { status: 409 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('marketing_copy_test_rounds')
    .update({ resumed_at: new Date().toISOString(), paused_at: null })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
