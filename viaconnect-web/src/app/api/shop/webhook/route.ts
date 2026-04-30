/**
 * Stripe webhook for the Via Cura shop checkout per Prompt #141 v3 §5.5.
 * Phase F5c v1 handles `checkout.session.completed` only; the same
 * finalization helper (lib/shop/checkout-helpers.finalizeOrderForSession)
 * runs whether the user reaches /shop/checkout/success in the browser or
 * Stripe pings this webhook asynchronously. Idempotency is enforced by
 * the existing-row check on shop_orders.metadata->>'stripe_session_id'.
 *
 * Phase F5c.5 additions:
 *   - charge.refunded: marks the matching shop_orders row status='refunded'.
 *     Lookup by metadata->>'payment_intent_id' (now stored on order at
 *     finalize time). Helix reversal still deferred to F6 alongside
 *     creditEarning() integration.
 *   - charge.dispute.created: retrieves the underlying charge to extract
 *     payment_intent, then marks the order status='disputed'. No automatic
 *     resolution; Stripe radar alerts handle the human escalation.
 *
 * Configuration:
 *   - Add `STRIPE_SHOP_WEBHOOK_SECRET` to env (separate from any existing
 *     subscription webhook secret so each endpoint has its own signing
 *     secret).
 *   - In the Stripe dashboard, create a webhook endpoint pointing at
 *     `https://<domain>/api/shop/webhook` and subscribe to
 *     `checkout.session.completed`.
 *
 * The route always returns 2xx after signature verification so Stripe
 * doesn't retry on application-level failures (those are logged and a
 * cron reconciler will re-derive). Returns 4xx only on signature failure.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { finalizeOrderForSession } from '@/lib/shop/checkout-helpers'
import { reverseHelixForOrder } from '@/lib/shop/helix-reversal'
import { safeLog } from '@/lib/utils/safe-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_SHOP_WEBHOOK_SECRET
    if (!stripeKey || !webhookSecret) {
        safeLog.error('shop.webhook', 'STRIPE_SECRET_KEY or STRIPE_SHOP_WEBHOOK_SECRET not configured')
        return NextResponse.json({ ok: false, error: 'webhook not configured' }, { status: 503 })
    }

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
        safeLog.warn('shop.webhook', 'missing stripe-signature header')
        return NextResponse.json({ ok: false, error: 'missing signature' }, { status: 400 })
    }

    const rawBody = await request.text()
    const stripe = new Stripe(stripeKey)

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (error) {
        safeLog.warn('shop.webhook', 'signature verification failed', { error })
        return NextResponse.json({ ok: false, error: 'bad signature' }, { status: 400 })
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session
            // Only finalize completed shop checkouts. Sessions from other flows
            // (subscriptions, practitioner billing, etc.) lack our cart_json
            // metadata and the finalize helper short-circuits cleanly on the
            // missing-cart_json branch, but skip the call entirely for clarity.
            if (!session.metadata?.cart_json) {
                safeLog.info('shop.webhook', 'skipping non-shop checkout.session.completed', {
                    sessionId: session.id,
                })
                return NextResponse.json({ ok: true, skipped: true })
            }

            const supabase = createAdminClient()
            const result = await finalizeOrderForSession(supabase, session.id)
            if (!result.ok) {
                safeLog.warn('shop.webhook', 'finalizeOrderForSession returned error', {
                    sessionId: session.id,
                    error: result.error,
                })
                // Return 2xx so Stripe does not retry; the cron reconciler will
                // re-derive missing orders from helix_transactions and Stripe
                // sessions.
                return NextResponse.json({ ok: false, error: result.error })
            }
            safeLog.info('shop.webhook', 'order finalized via webhook', {
                sessionId: session.id,
                orderNumber: result.orderNumber,
            })
            return NextResponse.json({ ok: true, orderNumber: result.orderNumber })
        }

        if (event.type === 'charge.refunded') {
            const charge = event.data.object as Stripe.Charge
            const piId =
                typeof charge.payment_intent === 'string'
                    ? charge.payment_intent
                    : (charge.payment_intent?.id ?? null)
            if (!piId) {
                safeLog.info('shop.webhook', 'charge.refunded missing payment_intent', {
                    chargeId: charge.id,
                })
                return NextResponse.json({ ok: true, skipped: true })
            }
            const supabase = createAdminClient()
            const sb = supabase as unknown as { from: (t: string) => any }
            const { data, error } = await sb
                .from('shop_orders')
                .update({ status: 'refunded' })
                .filter('metadata->>payment_intent_id', 'eq', piId)
                .select('id, order_number')
            if (error) {
                safeLog.warn('shop.webhook', 'refund status update failed', { error, piId })
                return NextResponse.json({ ok: true })
            }
            const matched = Array.isArray(data) ? data : []
            safeLog.info('shop.webhook', 'order marked refunded', {
                piId,
                matched: matched.length,
            })

            // Phase F6b.2: Helix reversal on full refund. Stripe charge.refunded
            // fires for each refund event; check amount_refunded against amount
            // and only reverse on a full refund. Partial-refund accounting
            // (proportional Helix reversal) is F6b.5.
            const fullRefund =
                typeof charge.amount === 'number' &&
                typeof charge.amount_refunded === 'number' &&
                charge.amount > 0 &&
                charge.amount_refunded === charge.amount
            if (fullRefund) {
                for (const order of matched as Array<{ id: string; order_number: string }>) {
                    const reversal = await reverseHelixForOrder(supabase, order.id, order.order_number)
                    // priorAmountRefunded + chargeAmount help operators spot the
                    // partial-then-top-up path where amount_refunded climbs to
                    // amount across multiple events. F6b.5 will replace this
                    // log with proportional-reversal accounting keyed on
                    // refund_id rather than this aggregate snapshot.
                    safeLog.info('shop.webhook', 'helix reversal result', {
                        orderId: order.id,
                        orderNumber: order.order_number,
                        chargeAmount: charge.amount,
                        priorAmountRefunded: charge.amount_refunded,
                        ...reversal,
                    })
                }
            } else {
                safeLog.info('shop.webhook', 'partial refund: helix reversal deferred to F6b.5', {
                    piId,
                    amount: charge.amount,
                    amountRefunded: charge.amount_refunded,
                })
            }
            return NextResponse.json({ ok: true })
        }

        if (event.type === 'charge.dispute.created') {
            const dispute = event.data.object as Stripe.Dispute
            const chargeId =
                typeof dispute.charge === 'string' ? dispute.charge : (dispute.charge?.id ?? null)
            if (!chargeId) {
                safeLog.info('shop.webhook', 'charge.dispute.created missing charge id', {
                    disputeId: dispute.id,
                })
                return NextResponse.json({ ok: true, skipped: true })
            }
            const stripeForCharge = new Stripe(stripeKey)
            const chargeObj = await stripeForCharge.charges.retrieve(chargeId)
            const piId =
                typeof chargeObj.payment_intent === 'string'
                    ? chargeObj.payment_intent
                    : (chargeObj.payment_intent?.id ?? null)
            if (!piId) {
                safeLog.info('shop.webhook', 'charge.dispute.created could not resolve payment_intent', {
                    chargeId,
                })
                return NextResponse.json({ ok: true, skipped: true })
            }
            const supabase = createAdminClient()
            const sb = supabase as unknown as { from: (t: string) => any }
            const { data, error } = await sb
                .from('shop_orders')
                .update({ status: 'disputed' })
                .filter('metadata->>payment_intent_id', 'eq', piId)
                .select('order_number')
            if (error) {
                safeLog.warn('shop.webhook', 'dispute status update failed', { error, piId })
            } else {
                safeLog.info('shop.webhook', 'order marked disputed', {
                    piId,
                    matched: Array.isArray(data) ? data.length : 0,
                })
            }
            return NextResponse.json({ ok: true })
        }

        safeLog.info('shop.webhook', 'unhandled event type', { type: event.type })
        return NextResponse.json({ ok: true, ignored: true })
    } catch (error) {
        safeLog.error('shop.webhook', 'handler unexpected error', { error, eventType: event.type })
        return NextResponse.json({ ok: false, error: 'handler failure' }, { status: 200 })
    }
}
