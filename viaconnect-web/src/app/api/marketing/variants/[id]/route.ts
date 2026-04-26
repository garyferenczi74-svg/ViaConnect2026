// Prompt #138a Phase 3 — single-variant read / update / delete.
//
// GET    /api/marketing/variants/[id]   detail + recent events
// PATCH  /api/marketing/variants/[id]   update editable text fields (only on draft / word_validated stage)
// DELETE /api/marketing/variants/[id]   blocked — variants are archived, never deleted
//
// Editing post-pre-check resets the marshall_precheck_passed flag and the
// word_count_validated flag, since the new copy needs to be re-validated.
// The DB activation invariant prevents accidental publication of stale gates.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireMarketingAdmin } from '@/lib/flags/admin-guard';
import { logVariantEvent } from '@/lib/marketing/variants/logging';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireMarketingAdmin();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: variant, error } = await (supabase as any)
    .from('marketing_copy_variants')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (supabase as any)
    .from('marketing_copy_variant_events')
    .select('*')
    .eq('variant_id', params.id)
    .order('occurred_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ variant, events: events ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireMarketingAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as {
    variant_label?: string;
    headline_text?: string;
    subheadline_text?: string;
    cta_label?: string;
    cta_destination?: string | null;
    framing?: string;
  } | null;
  if (!body) return NextResponse.json({ error: 'Empty body' }, { status: 400 });

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('marketing_copy_variants')
    .select('id, active_in_test, archived')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.active_in_test) {
    return NextResponse.json(
      { error: 'Cannot edit an active variant. Deactivate first.' },
      { status: 409 },
    );
  }
  if (existing.archived) {
    return NextResponse.json({ error: 'Cannot edit an archived variant.' }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    word_count_validated: false,
    marshall_precheck_passed: false,
    marshall_precheck_session_id: null,
    steve_approval_at: null,
    steve_approval_by: null,
    steve_approval_note: null,
  };
  if (body.variant_label !== undefined) updates.variant_label = body.variant_label;
  if (body.headline_text !== undefined) updates.headline_text = body.headline_text;
  if (body.subheadline_text !== undefined) updates.subheadline_text = body.subheadline_text;
  if (body.cta_label !== undefined) updates.cta_label = body.cta_label;
  if (body.cta_destination !== undefined) updates.cta_destination = body.cta_destination;
  if (body.framing !== undefined) updates.framing = body.framing;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('marketing_copy_variants')
    .update(updates)
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logVariantEvent(supabase, {
    variantId: params.id,
    eventKind: 'created', // re-draft event
    eventDetail: { reason: 'edit_resets_gates', fields: Object.keys(body) },
    actorUserId: auth.user.id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Per #138a §6.5 + activation invariant: variants are archived, never deleted.
  // Returning 405 surfaces the policy to misuse rather than silently allowing it.
  return NextResponse.json(
    { error: 'Variants are archived, not deleted. Use POST /[id]/archive instead.', variantId: params.id },
    { status: 405 },
  );
}
