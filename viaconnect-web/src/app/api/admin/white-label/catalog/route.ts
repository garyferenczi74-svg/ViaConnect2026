// Prompt #96 Phase 2: Admin catalog config API.
//
// GET  /api/admin/white-label/catalog          list all SKUs + their config
// PATCH /api/admin/white-label/catalog          update one SKU's config
//
// Eligibility / retail-exclusive flips require justification text.
// MOQ + timeline changes are admin-only here in Phase 2; Phase 7 wires
// them through the Prompt #95 governance proposal flow.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const patchSchema = z.object({
  product_catalog_id: z.string().uuid(),
  is_white_label_eligible: z.boolean().optional(),
  is_retail_exclusive: z.boolean().optional(),
  retail_exclusive_reason: z.string().min(20).max(500).optional(),
  production_minimum_moq: z.number().int().min(1).max(100_000).optional(),
  standard_production_weeks: z.number().int().min(1).max(52).optional(),
  expedited_production_weeks: z.number().int().min(1).max(52).optional(),
  is_active: z.boolean().optional(),
});

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.white-label.catalog.auth');
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const profileRes = await withTimeout(
    (async () => (supabase as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
    5000,
    'api.white-label.catalog.load-profile',
  );
  const profile = profileRes.data as { role?: string } | null;
  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const auth = await requireAdmin(supabase);
    if (!auth.ok) return auth.response;

    const sb = supabase as any;
    const { data, error } = await withTimeout(
      (async () => sb
        .from('white_label_catalog_config')
        .select(`
          id, product_catalog_id,
          is_white_label_eligible, is_retail_exclusive,
          base_msrp_cents, base_cogs_cents,
          production_minimum_moq, retail_exclusive_reason,
          standard_production_weeks, expedited_production_weeks,
          is_active, flagged_by, flagged_at, updated_at,
          product_catalog (id, name, sku, category, active)
        `)
        .order('updated_at', { ascending: false })
        .limit(500))(),
      10000,
      'api.white-label.catalog.list',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.catalog', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.catalog', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const auth = await requireAdmin(supabase);
    if (!auth.ok) return auth.response;

    const json = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    // Mutual exclusion + justification rule.
    if (parsed.data.is_retail_exclusive === true && !parsed.data.retail_exclusive_reason) {
      return NextResponse.json(
        { error: 'retail_exclusive_reason (20+ chars) is required when flipping is_retail_exclusive on.' },
        { status: 400 },
      );
    }
    if (parsed.data.is_white_label_eligible === true && parsed.data.is_retail_exclusive === true) {
      return NextResponse.json(
        { error: 'A SKU cannot be both white-label eligible and retail-exclusive simultaneously.' },
        { status: 400 },
      );
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of [
      'is_white_label_eligible', 'is_retail_exclusive', 'retail_exclusive_reason',
      'production_minimum_moq', 'standard_production_weeks', 'expedited_production_weeks',
      'is_active',
    ] as const) {
      if (parsed.data[k] !== undefined) update[k] = parsed.data[k];
    }
    if (parsed.data.is_retail_exclusive === true) {
      update.flagged_by = auth.user.id;
      update.flagged_at = new Date().toISOString();
      update.is_white_label_eligible = false;
    }

    const sb = supabase as any;
    const { error } = await withTimeout(
      (async () => sb
        .from('white_label_catalog_config')
        .update(update)
        .eq('product_catalog_id', parsed.data.product_catalog_id))(),
      8000,
      'api.white-label.catalog.update',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.catalog', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.catalog', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
