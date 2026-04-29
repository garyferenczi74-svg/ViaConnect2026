// Prompt #96 Phase 5: Admin read of single production order detail.
//
// GET /api/admin/white-label/production/[orderId]

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { orderId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.white-label.production-detail.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const profileRes = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.white-label.production-detail.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const orderRes = await withTimeout(
      (async () => sb
        .from('white_label_production_orders')
        .select('*')
        .eq('id', params.orderId)
        .maybeSingle())(),
      8000,
      'api.white-label.production-detail.load-order',
    );
    if (orderRes.error) return NextResponse.json({ error: orderRes.error.message }, { status: 500 });
    if (!orderRes.data) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

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
      10000,
      'api.white-label.production-detail.load-items',
    );

    return NextResponse.json({ order: orderRes.data, items: itemsRes.data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.production-detail', 'database timeout', { orderId: params.orderId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.production-detail', 'unexpected error', { orderId: params.orderId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
