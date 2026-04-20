// Prompt #96 Phase 5: Single production order detail.
//
// GET /api/practitioner/white-label/orders/[orderId]
// Practitioner-self read; admin reads via the admin-side route.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { orderId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners').select('id').eq('user_id', user.id).maybeSingle();
  if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

  const { data: order, error } = await sb
    .from('white_label_production_orders')
    .select('*')
    .eq('id', params.orderId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.practitioner_id !== practitioner.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: items } = await sb
    .from('white_label_production_order_items')
    .select(`
      id, label_design_id, product_catalog_id, quantity,
      unit_cost_cents, line_subtotal_cents,
      lot_number, expiration_date, qc_passed, qc_notes,
      product_catalog (id, name, sku),
      white_label_label_designs (id, display_product_name, version_number)
    `)
    .eq('production_order_id', params.orderId);

  return NextResponse.json({ order, items: items ?? [] });
}
