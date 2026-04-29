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
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';

const stripeBreaker = getCircuitBreaker('stripe-api');

export const runtime = 'nodejs';

const schema = z.object({
  reason: z.string().min(10).max(500),
  admin_override: z.boolean().optional(),
});

export async function POST(
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
        'api.white-label.orders.cancel.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.orders.cancel', 'auth timeout', { requestId, orderId: params.orderId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const sb = supabase as any;
    const profileRes = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.white-label.orders.cancel.profile-load',
    );
    const profile = profileRes.data;
    const isAdmin = profile?.role === 'admin';

    if (parsed.data.admin_override && !isAdmin) {
      return NextResponse.json({ error: 'admin_override requires admin role' }, { status: 403 });
    }

    // Resolve practitioner ownership unless admin.
    const orderRes = await withTimeout(
      (async () => sb
        .from('white_label_production_orders')
        .select('id, practitioner_id, status, total_cents, deposit_amount_cents, deposit_paid_at, stripe_deposit_payment_intent_id')
        .eq('id', params.orderId)
        .maybeSingle())(),
      8000,
      'api.white-label.orders.cancel.order-load',
    );
    const order = orderRes.data;
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (!isAdmin) {
      const practitionerRes = await withTimeout(
        (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
        8000,
        'api.white-label.orders.cancel.practitioner-load',
      );
      const practitioner = practitionerRes.data;
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

    // Refund flow (Jeffery audit fix):
    //   1. Mark the order canceled FIRST. If Stripe fails after, the order
    //      is in a terminal state and a recovery cron / manual replay can
    //      attempt the refund again.
    //   2. Use a deterministic Stripe idempotency_key derived from the
    //      order id + cancellation_stage so a retry never double-refunds.
    //   3. Persist the refund id back to the order before returning.
    const nowIso = new Date().toISOString();
    await withTimeout(
      (async () => sb
        .from('white_label_production_orders')
        .update({
          status: 'canceled',
          canceled_at: nowIso,
          canceled_by: user.id,
          canceled_reason: parsed.data.reason,
          deposit_refunded: false,
          updated_at: nowIso,
        })
        .eq('id', params.orderId))(),
      8000,
      'api.white-label.orders.cancel.cancel-update',
    );

    let refundId: string | null = null;
    if (outcome.refund_cents > 0 && order.stripe_deposit_payment_intent_id) {
      try {
        const stripe = getStripe();
        const refund = await stripeBreaker.execute(() =>
          withTimeout(
            stripe.refunds.create(
              {
                payment_intent: order.stripe_deposit_payment_intent_id,
                amount: outcome.refund_cents,
                reason: 'requested_by_customer',
                metadata: {
                  production_order_id: params.orderId,
                  cancellation_stage: stage,
                  admin_override: String(!!parsed.data.admin_override),
                },
              },
              {
                idempotencyKey: `wl-cancel-${params.orderId}-${stage}-${parsed.data.admin_override ? 'admin' : 'self'}`,
              },
            ),
            15000,
            'api.white-label.orders.cancel.stripe-refund',
          )
        );
        refundId = refund.id;
        await withTimeout(
          (async () => sb
            .from('white_label_production_orders')
            .update({
              deposit_refunded: true,
              stripe_refund_id: refund.id,
              refund_amount_cents: outcome.refund_cents,
              refund_recorded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', params.orderId))(),
          8000,
          'api.white-label.orders.cancel.refund-record',
        );
      } catch (e) {
        if (isCircuitBreakerError(e)) {
          safeLog.warn('api.white-label.orders.cancel', 'stripe circuit open', { requestId, orderId: params.orderId, error: e });
        } else if (isTimeoutError(e)) {
          safeLog.error('api.white-label.orders.cancel', 'stripe refund timeout', { requestId, orderId: params.orderId, error: e });
        } else {
          safeLog.error('api.white-label.orders.cancel', 'Stripe refund failed; order is canceled but deposit refund pending', {
            requestId,
            orderId: params.orderId,
            error: e,
          });
        }
        // The order is canceled; the practitioner sees a soft warning so
        // they know to expect a follow-up rather than re-cancelling.
        return NextResponse.json({
          outcome,
          stripe_refund_id: null,
          warning: 'Order is canceled. The deposit refund could not be issued automatically. Operations will reach out within one business day.',
        }, { status: 200 });
      }
    }

    return NextResponse.json({ outcome, stripe_refund_id: refundId });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.orders.cancel', 'database timeout', { requestId, orderId: params.orderId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.orders.cancel', 'unexpected error', { requestId, orderId: params.orderId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
