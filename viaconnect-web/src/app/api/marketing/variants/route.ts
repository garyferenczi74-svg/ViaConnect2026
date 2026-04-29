// Prompt #138a Phase 3 — variant catalog list + create.
//
// GET  /api/marketing/variants           list all variants with optional filters
// POST /api/marketing/variants           create a draft variant
//
// Admin-gated. Activation invariant is enforced at the DB layer; this route
// only writes the draft skeleton and logs a 'created' event.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireMarketingAdmin } from '@/lib/flags/admin-guard';
import { logVariantEvent } from '@/lib/marketing/variants/logging';
import type { VariantFraming, VariantSurface } from '@/lib/marketing/variants/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const VALID_FRAMINGS: VariantFraming[] = [
  'process_narrative', 'outcome_first', 'proof_first', 'time_to_value', 'other',
];
const VALID_SURFACES: VariantSurface[] = ['hero'];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMarketingAdmin();
    if (auth.kind === 'error') return auth.response;

    const url = new URL(request.url);
    const surface = url.searchParams.get('surface');
    const includeArchived = url.searchParams.get('includeArchived') === 'true';

    const supabase = createClient();
    const { data, error } = await withTimeout(
      (async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabase as any).from('marketing_copy_variants').select('*');
        if (surface) q = q.eq('surface', surface);
        if (!includeArchived) q = q.eq('archived', false);
        return q.order('created_at', { ascending: false });
      })(),
      8000,
      'api.marketing.variants.list',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ variants: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marketing.variants', 'list timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.marketing.variants', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMarketingAdmin();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as {
      slot_id?: string;
      surface?: string;
      variant_label?: string;
      framing?: string;
      headline_text?: string;
      subheadline_text?: string;
      cta_label?: string;
      cta_destination?: string | null;
    } | null;

    if (!body?.slot_id || !body.variant_label || !body.framing
        || !body.headline_text || !body.subheadline_text || !body.cta_label) {
      return NextResponse.json(
        { error: 'slot_id, variant_label, framing, headline_text, subheadline_text, cta_label are required' },
        { status: 400 },
      );
    }
    const surface = (body.surface ?? 'hero') as VariantSurface;
    if (!VALID_SURFACES.includes(surface)) {
      return NextResponse.json({ error: 'Invalid surface' }, { status: 400 });
    }
    if (!VALID_FRAMINGS.includes(body.framing as VariantFraming)) {
      return NextResponse.json({ error: 'Invalid framing' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('marketing_copy_variants')
        .insert({
          slot_id: body.slot_id,
          surface,
          variant_label: body.variant_label,
          framing: body.framing,
          headline_text: body.headline_text,
          subheadline_text: body.subheadline_text,
          cta_label: body.cta_label,
          cta_destination: body.cta_destination ?? null,
        })
        .select('id')
        .single())(),
      8000,
      'api.marketing.variants.create',
    );
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    }

    await logVariantEvent(supabase, {
      variantId: data.id,
      eventKind: 'created',
      actorUserId: auth.user.id,
    });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marketing.variants', 'create timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.marketing.variants', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
