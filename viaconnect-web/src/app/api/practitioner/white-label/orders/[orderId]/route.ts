// Prompt #96 Phase 5: Single production order detail.
//
// GET /api/practitioner/white-label/orders/[orderId]
// Practitioner-self read; admin reads via the admin-side route.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.white-label.orders.get.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.orders.get', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.white-label.orders.get.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const orderRes = await withTimeout(
      (async () => sb
        .from('white_label_production_orders')
        .select('*')
        .eq('id', params.orderId)
        .maybeSingle())(),
      8000,
      'api.white-label.orders.get.order-load',
    );
    const order = orderRes.data;
    const error = orderRes.error;
    if (error) {
      safeLog.error('api.white-label.orders.get', 'order load failed', { requestId, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.practitioner_id !== practitioner.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const itemsRes = await withTimeout(
      (async () => sb
        .from('white_label_production_order_items')
        .select(`
          id, label_design_id, product_catalog_id, quantity,
          unit_cost_cents, line_subtotal_cents,
          lot_number, expiration_date, qc_passed, qc_notes,
          product_catalog (id, name, sku),
          white_label_label_designs (id, display_product_name, version_number)
        `)
        .eq('production_order_id', params.orderId))(),
      8000,
      'api.white-label.orders.get.items-load',
    );
    const items = itemsRes.data;

    return NextResponse.json({ order, items: items ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.orders.get', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.orders.get', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
