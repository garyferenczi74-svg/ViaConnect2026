// Prompt #96 Phase 5: Cancel a production order.
//
// POST /api/practitioner/white-label/orders/[orderId]/cancel
//   body: { reason: string, admin_override?: boolean }
//
// admin_override is admin-only and short-circuits the fee calculation
// to a full deposit refund. Refund is enqueued via Stripe; the actual
// refund settlement is handled by Stripe's async pipeline.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { computeCancellationOutcome } from '@/lib/white-label/cancellation-fees';
import { mapStatusToCancellationStage, isValidTransition } from '@/lib/white-label/production-state-machine';
import { getStripe } from '@/lib/pricing/stripe';

export const runtime = 'nodejs';

const schema = z.object({
  reason: z.string().min(10).max(500),
  admin_override: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const sb = supabase as any;
  const { data: profile } = await sb
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';

  if (parsed.data.admin_override && !isAdmin) {
    return NextResponse.json({ error: 'admin_override requires admin role' }, { status: 403 });
  }

  // Resolve practitioner ownership unless admin.
  const { data: order } = await sb
    .from('white_label_production_orders')
    .select('id, practitioner_id, status, total_cents, deposit_amount_cents, deposit_paid_at, stripe_deposit_payment_intent_id')
    .eq('id', params.orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (!isAdmin) {
    const { data: practitioner } = await sb
      .from('practitioners').select('id').eq('user_id', user.id).maybeSingle();
    if (!practitioner || order.practitioner_id !== practitioner.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!isValidTransition(order.status, 'canceled')) {
    return NextResponse.json({
      error: `Cancellation not allowed from status ${order.status}.`,
    }, { status: 400 });
  }

  const stage = mapStatusToCancellationStage(order.status);
  const depositPaid = order.deposit_paid_at ? order.deposit_amount_cents : 0;
  const outcome = computeCancellationOutcome({
    stage,
    total_cents: order.total_cents,
    deposit_paid_cents: depositPaid,
    admin_override: !!parsed.data.admin_override,
  });

  if (!outcome.allowed) {
    return NextResponse.json({ error: outcome.reason, outcome }, { status: 400 });
  }

  // Stripe refund (best-effort; Stripe handles async settlement).
  let refundId: string | null = null;
  if (outcome.refund_cents > 0 && order.stripe_deposit_payment_intent_id) {
    try {
      const stripe = getStripe();
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_deposit_payment_intent_id,
        amount: outcome.refund_cents,
        reason: parsed.data.admin_override ? 'requested_by_customer' : 'requested_by_customer',
        metadata: {
          production_order_id: params.orderId,
          cancellation_stage: stage,
          admin_override: String(!!parsed.data.admin_override),
        },
      });
      refundId = refund.id;
    } catch (e) {
      console.warn('[wl-cancel] Stripe refund failed', (e as Error).message);
      return NextResponse.json({ error: 'Refund failed', details: (e as Error).message }, { status: 502 });
    }
  }

  await sb
    .from('white_label_production_orders')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      canceled_by: user.id,
      canceled_reason: parsed.data.reason,
      deposit_refunded: outcome.refund_cents > 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId);

  return NextResponse.json({ outcome, stripe_refund_id: refundId });
}
