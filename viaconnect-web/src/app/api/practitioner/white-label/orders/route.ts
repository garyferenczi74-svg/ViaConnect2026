// Prompt #96 Phase 5: Practitioner production-order create + list.
//
// GET  /api/practitioner/white-label/orders                  list practitioner's orders
// POST /api/practitioner/white-label/orders
//   body: { items: [{ label_design_id, quantity }], timeline }
//   - Verifies all label_design_ids belong to the practitioner and are
//     in status='approved' (production_ready also accepted).
//   - Pulls base_msrp from white_label_catalog_config so the practitioner
//     cannot inject an unfair price.
//   - Calls calculateProductionQuote (pure).
//   - Inserts the production order at status='quote' with order_number
//     from next_white_label_order_number RPC.
//   - Inserts one production_order_items row per line.
//   - Refuses when below the $15K minimum order value.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calculateProductionQuote } from '@/lib/white-label/production-quote';
import { loadGovernedWhiteLabelParameters } from '@/lib/white-label/governed-params';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const createSchema = z.object({
  items: z.array(z.object({
    label_design_id: z.string().uuid(),
    quantity: z.number().int().min(100),
  })).min(1).max(56),
  timeline: z.enum(['standard', 'expedited']),
});

async function loadPractitioner(supabase: ReturnType<typeof createClient>) {
  const authResult = await withTimeout(
    supabase.auth.getUser(),
    5000,
    'api.white-label.orders.auth',
  );
  const user = authResult.data.user;
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as any;
  const practitionerRes = await withTimeout(
    (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
    8000,
    'api.white-label.orders.practitioner-load',
  );
  const practitioner = practitionerRes.data;
  if (!practitioner) return { ok: false as const, response: NextResponse.json({ error: 'No practitioner record' }, { status: 404 }) };
  return { ok: true as const, user, practitionerId: practitioner.id };
}

function handleOuterError(err: unknown, requestId: string): NextResponse {
  if (isTimeoutError(err)) {
    safeLog.error('api.white-label.orders', 'database timeout', { requestId, error: err });
    return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
  }
  safeLog.error('api.white-label.orders', 'unexpected error', { requestId, error: err });
  return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    const ctx = await loadPractitioner(supabase);
    if (!ctx.ok) return ctx.response;

    const sb = supabase as any;
    const res = await withTimeout(
      (async () => sb
        .from('white_label_production_orders')
        .select(`
          id, order_number, status, production_timeline,
          total_units, subtotal_cents, expedited_surcharge_applied_cents,
          total_cents, applied_discount_tier, applied_discount_percent,
          deposit_amount_cents, final_payment_amount_cents,
          deposit_paid_at, final_payment_paid_at,
          quoted_at, shipped_at, delivered_at, canceled_at,
          created_at, updated_at
        `)
        .eq('practitioner_id', ctx.practitionerId)
        .order('created_at', { ascending: false })
        .limit(100))(),
      8000,
      'api.white-label.orders.list',
    );
    const data = res.data;
    const error = res.error;
    if (error) {
      safeLog.error('api.white-label.orders', 'list failed', { requestId, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data ?? [] });
  } catch (err) {
    return handleOuterError(err, requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    const ctx = await loadPractitioner(supabase);
    if (!ctx.ok) return ctx.response;

    const json = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const sb = supabase as any;

    const enrollmentRes = await withTimeout(
      (async () => sb.from('white_label_enrollments').select('id, status').eq('practitioner_id', ctx.practitionerId).maybeSingle())(),
      8000,
      'api.white-label.orders.post-enrollment-load',
    );
    const enrollment = enrollmentRes.data;
    if (!enrollment) {
      return NextResponse.json({ error: 'No active enrollment' }, { status: 403 });
    }

    // Resolve labels + catalog pricing in one batch.
    const labelIds = parsed.data.items.map((i) => i.label_design_id);
    const labelsRes = await withTimeout(
      (async () => sb
        .from('white_label_label_designs')
        .select('id, practitioner_id, status, product_catalog_id, is_current_version')
        .in('id', labelIds))(),
      8000,
      'api.white-label.orders.post-labels-load',
    );
    const labels = labelsRes.data;
    const labelsErr = labelsRes.error;
    if (labelsErr) {
      safeLog.error('api.white-label.orders', 'labels load failed', { requestId, error: labelsErr });
      return NextResponse.json({ error: labelsErr.message }, { status: 500 });
    }

  type LabelLite = { id: string; practitioner_id: string; status: string; product_catalog_id: string; is_current_version: boolean };
  const labelById = new Map<string, LabelLite>(((labels ?? []) as LabelLite[]).map((l) => [l.id, l] as const));
  for (const item of parsed.data.items) {
    const label = labelById.get(item.label_design_id);
    if (!label) {
      return NextResponse.json({ error: `Label ${item.label_design_id} not found` }, { status: 404 });
    }
    if (label.practitioner_id !== ctx.practitionerId) {
      return NextResponse.json({ error: `Label ${item.label_design_id} does not belong to this practitioner` }, { status: 403 });
    }
    if (!['approved', 'production_ready'].includes(label.status)) {
      return NextResponse.json({
        error: `Label ${item.label_design_id} is in status ${label.status}; only approved labels can enter production.`,
      }, { status: 400 });
    }
    if (!label.is_current_version) {
      return NextResponse.json({ error: `Label ${item.label_design_id} is a stale version` }, { status: 400 });
    }
  }

    const productIds = ((labels ?? []) as LabelLite[]).map((l) => l.product_catalog_id);
    const configsRes = await withTimeout(
      (async () => sb
        .from('white_label_catalog_config')
        .select('product_catalog_id, base_msrp_cents, is_white_label_eligible, is_active')
        .in('product_catalog_id', productIds))(),
      8000,
      'api.white-label.orders.post-configs-load',
    );
    const configs = configsRes.data;
  type ConfigLite = { product_catalog_id: string; base_msrp_cents: number; is_white_label_eligible: boolean; is_active: boolean };
  const configByProduct = new Map<string, ConfigLite>(((configs ?? []) as ConfigLite[]).map((c) => [c.product_catalog_id, c] as const));

  const quoteItems = parsed.data.items.map((item) => {
    const label = labelById.get(item.label_design_id)!;
    const config = configByProduct.get(label.product_catalog_id);
    if (!config?.is_white_label_eligible || !config?.is_active) {
      throw new Error(`Product ${label.product_catalog_id} is not white-label eligible`);
    }
    return {
      label_design_id: item.label_design_id,
      product_catalog_id: label.product_catalog_id,
      quantity: item.quantity,
      base_msrp_cents: config.base_msrp_cents as number,
    };
  });

  // Load governance-controlled parameters; fall back to spec defaults
  // when Phase 7 tables are absent or empty.
  const { params, tiers } = await loadGovernedWhiteLabelParameters(supabase);

  let quote;
  try {
    quote = calculateProductionQuote({
      items: quoteItems,
      timeline: parsed.data.timeline,
      tiers,
      params,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!quote.meets_minimum_order_value) {
    return NextResponse.json({
      error: `Total $${(quote.total_cents / 100).toFixed(0)} below the minimum order value of $${(quote.minimum_order_value_cents / 100).toFixed(0)}.`,
      quote,
    }, { status: 400 });
  }

    const orderNumberRes = await withTimeout(
      (async () => sb.rpc('next_white_label_order_number'))(),
      8000,
      'api.white-label.orders.post-order-number',
    );
    const orderNumber = orderNumberRes.data;
    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number generation failed' }, { status: 500 });
    }

    const orderInsertRes = await withTimeout(
      (async () => sb
        .from('white_label_production_orders')
        .insert({
          order_number: orderNumber,
          practitioner_id: ctx.practitionerId,
          enrollment_id: enrollment.id,
          production_timeline: parsed.data.timeline,
          expedited_surcharge_cents: parsed.data.timeline === 'expedited' ? 15 : 0,
          total_units: quote.total_units,
          subtotal_cents: quote.subtotal_cents,
          expedited_surcharge_applied_cents: quote.expedited_surcharge_cents,
          total_cents: quote.total_cents,
          applied_discount_tier: quote.applied_discount_tier,
          applied_discount_percent: quote.applied_discount_percent,
          status: 'quote',
          deposit_amount_cents: quote.deposit_cents,
          final_payment_amount_cents: quote.final_payment_cents,
          quoted_at: new Date().toISOString(),
        })
        .select('id, order_number')
        .maybeSingle())(),
      8000,
      'api.white-label.orders.post-insert',
    );
    const order = orderInsertRes.data;
    const insertErr = orderInsertRes.error;
    if (insertErr || !order) {
      safeLog.error('api.white-label.orders', 'order create failed', { requestId, error: insertErr });
      return NextResponse.json({ error: 'Order create failed', details: insertErr?.message }, { status: 500 });
    }

    // Insert line items.
    const itemRows = quote.line_items.map((li) => ({
      production_order_id: order.id,
      label_design_id: li.label_design_id,
      product_catalog_id: li.product_catalog_id,
      quantity: li.quantity,
      unit_cost_cents: li.unit_cost_cents,
      line_subtotal_cents: li.line_subtotal_cents,
    }));
    const itemsRes = await withTimeout(
      (async () => sb
        .from('white_label_production_order_items')
        .insert(itemRows))(),
      8000,
      'api.white-label.orders.post-items',
    );
    const itemsErr = itemsRes.error;
    if (itemsErr) {
      safeLog.error('api.white-label.orders', 'order items insert failed', { requestId, error: itemsErr });
      return NextResponse.json({ error: 'Order item insert failed', details: itemsErr.message }, { status: 500 });
    }

    return NextResponse.json({ order, quote }, { status: 201 });
  } catch (err) {
    return handleOuterError(err, requestId);
  }
}
