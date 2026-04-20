// Prompt #96 Phase 5: Create the final-payment Stripe PaymentIntent.
//
// POST /api/practitioner/white-label/orders/[orderId]/checkout-final
//
// Created automatically by the admin when the order reaches the
// final_payment_pending milestone. Practitioner sees the prompt to pay
// from the order detail page.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWhiteLabelPaymentIntent } from '@/lib/white-label/stripe-production-payment';

export const runtime = 'nodejs';

export async function POST(
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

  const { data: order } = await sb
    .from('white_label_production_orders')
    .select('id, practitioner_id')
    .eq('id', params.orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.practitioner_id !== practitioner.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await createWhiteLabelPaymentIntent({
      productionOrderId: params.orderId,
      paymentType: 'final',
      supabase,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
