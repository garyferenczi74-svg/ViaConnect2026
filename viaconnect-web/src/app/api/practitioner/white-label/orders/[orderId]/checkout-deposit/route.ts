// Prompt #96 Phase 5: Create the deposit Stripe PaymentIntent.
//
// POST /api/practitioner/white-label/orders/[orderId]/checkout-deposit
//
// Returns the PaymentIntent client_secret so the practitioner-side
// Stripe Elements form can confirm the payment. The webhook
// (payment_intent.succeeded) is what advances the order status.
//
// Prompt #140b Layer 3 hardening: timeouts on all Supabase and Stripe calls,
// safeLog instrumentation, structured error responses.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWhiteLabelPaymentIntent } from '@/lib/white-label/stripe-production-payment';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';

const stripeBreaker = getCircuitBreaker('stripe-api');

export const runtime = 'nodejs';

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
        'api.white-label.checkout-deposit.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.checkout-deposit', 'auth timeout', { requestId, orderId: params.orderId, error: err });
        return NextResponse.json({ error: 'Authentication check timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;

    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.white-label.checkout-deposit.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const orderRes = await withTimeout(
      (async () => sb
        .from('white_label_production_orders')
        .select('id, practitioner_id')
        .eq('id', params.orderId)
        .maybeSingle())(),
      8000,
      'api.white-label.checkout-deposit.order-load',
    );
    const order = orderRes.data;
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.practitioner_id !== practitioner.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      const result = await stripeBreaker.execute(() =>
        withTimeout(
          createWhiteLabelPaymentIntent({
            productionOrderId: params.orderId,
            paymentType: 'deposit',
            supabase,
          }),
          15000,
          'api.white-label.checkout-deposit.payment-intent',
        )
      );
      safeLog.info('api.white-label.checkout-deposit', 'payment intent created', { requestId, orderId: params.orderId, userId: user.id });
      return NextResponse.json(result);
    } catch (e) {
      if (isCircuitBreakerError(e)) {
        safeLog.warn('api.white-label.checkout-deposit', 'stripe circuit open', { requestId, orderId: params.orderId, error: e });
        return NextResponse.json({ error: 'Payment service temporarily unavailable. Please retry shortly.' }, { status: 503 });
      }
      if (isTimeoutError(e)) {
        safeLog.error('api.white-label.checkout-deposit', 'payment intent timeout', { requestId, orderId: params.orderId, error: e });
        return NextResponse.json({ error: 'Payment setup took too long. Please try again.' }, { status: 504 });
      }
      safeLog.error('api.white-label.checkout-deposit', 'payment intent failed', { requestId, orderId: params.orderId, error: e });
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.checkout-deposit', 'database timeout', { requestId, orderId: params.orderId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.checkout-deposit', 'unexpected error', { requestId, orderId: params.orderId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
