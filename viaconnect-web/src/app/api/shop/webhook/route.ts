/**
 * Stripe webhook for the Via Cura shop checkout per Prompt #141 v3 §5.5.
 * Phase F5c v1 handles `checkout.session.completed` only; the same
 * finalization helper (lib/shop/checkout-helpers.finalizeOrderForSession)
 * runs whether the user reaches /shop/checkout/success in the browser or
 * Stripe pings this webhook asynchronously. Idempotency is enforced by
 * the existing-row check on shop_orders.metadata->>'stripe_session_id'.
 *
 * Refund + dispute handling deferred to F5c.5. They will read
 * `charge.refunded` and `charge.dispute.created` events, look up the
 * order by stripe_session_id, and update status (and trigger Helix
 * reversal in F6 alongside the creditEarning() integration).
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

        // F5c.5 will add charge.refunded and charge.dispute.created handlers.
        // For now, log the event type and acknowledge.
        safeLog.info('shop.webhook', 'unhandled event type', { type: event.type })
        return NextResponse.json({ ok: true, ignored: true })
    } catch (error) {
        safeLog.error('shop.webhook', 'handler unexpected error', { error, eventType: event.type })
        return NextResponse.json({ ok: false, error: 'handler failure' }, { status: 200 })
    }
}
