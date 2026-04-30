/**
 * Order finalization helper shared by the success-URL server action
 * (finalizeShopOrder) and the Stripe webhook route (api/shop/webhook).
 * Both paths must produce identical results so a user can leave the
 * /shop/checkout/success page closed and have the order appear via
 * webhook, or vice versa.
 *
 * Idempotency is enforced by the existing-row check on
 * `shop_orders.metadata->>stripe_session_id` (backed by the partial
 * expression index added in F5). First call wins; second call returns
 * the existing order_number.
 *
 * Client parameter: the helper accepts the Supabase client to operate
 * under. Auth-scoped client (success URL) writes shop_orders under the
 * user's auth.uid() and passes RLS. Service-role client (webhook) bypasses
 * RLS — user_id comes from Stripe-verified session.metadata, which is
 * the same source the auth path used for the WITH CHECK match anyway.
 *
 * Inlined RPC calls (helix_increment_balance, increment_promo_redemption)
 * use the passed client. Auth-scoped client has the authenticated GRANT;
 * service-role bypasses GRANTs. Both paths work.
 */
import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import type { CheckoutCartLine } from '@/lib/shop/checkout-actions'

export interface FinalizeOrderResult {
    ok: boolean
    orderNumber?: string
    error?: string
}

export async function finalizeOrderForSession(
    supabase: SupabaseClient,
    sessionId: string,
): Promise<FinalizeOrderResult> {
    if (!sessionId || !sessionId.startsWith('cs_')) {
        return { ok: false, error: 'Invalid session id.' }
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
        return { ok: false, error: 'Payment processing is not yet configured.' }
    }

    try {
        const stripe = new Stripe(stripeKey)
        const session = await stripe.checkout.sessions.retrieve(sessionId)

        if (session.payment_status !== 'paid') {
            return { ok: false, error: 'Payment not yet confirmed.' }
        }

        const sb = supabase as unknown as {
            from: (t: string) => any
            rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
        }

        const { data: existing } = await withTimeout(
            sb
                .from('shop_orders')
                .select('order_number, metadata')
                .filter('metadata->>stripe_session_id', 'eq', sessionId)
                .maybeSingle(),
            3000,
            'shop.checkout.finalize.idempotency',
        )
        if (existing && existing.order_number) {
            return { ok: true, orderNumber: existing.order_number }
        }

        const cartJson = session.metadata?.cart_json
        if (!cartJson) {
            safeLog.error('shop.checkout', 'finalizeOrderForSession missing cart_json', { sessionId })
            return { ok: false, error: 'Order data missing.' }
        }

        let cart: CheckoutCartLine[]
        try {
            cart = JSON.parse(cartJson) as CheckoutCartLine[]
        } catch {
            safeLog.error('shop.checkout', 'finalizeOrderForSession cart_json parse failed', {
                sessionId,
            })
            return { ok: false, error: 'Order data corrupted.' }
        }

        const userId = session.metadata?.user_id || null
        const helixBurned = Number(session.metadata?.helix_tokens_burned ?? 0)
        const promoCode = session.metadata?.promo_code || null

        const subtotalCents = cart.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0)
        const totalCents = session.amount_total ?? subtotalCents
        const discountCents = Math.max(0, subtotalCents - totalCents)
        const orderNumber = `VC${Date.now().toString().slice(-9)}`

        const { data: orderRow, error: orderErr } = await withTimeout(
            sb
                .from('shop_orders')
                .insert({
                    user_id: userId || null,
                    order_number: orderNumber,
                    status: 'paid',
                    shipping_first_name: session.metadata?.shipping_first_name || null,
                    shipping_last_name: session.metadata?.shipping_last_name || null,
                    shipping_address_line1: session.metadata?.shipping_address_line1 || null,
                    shipping_address_line2: session.metadata?.shipping_address_line2 || null,
                    shipping_city: session.metadata?.shipping_city || null,
                    shipping_state: session.metadata?.shipping_state || null,
                    shipping_zip: session.metadata?.shipping_zip || null,
                    shipping_country: session.metadata?.shipping_country || null,
                    shipping_phone: session.metadata?.shipping_phone || null,
                    shipping_email: session.metadata?.shipping_email || null,
                    subtotal_cents: subtotalCents,
                    discount_cents: discountCents,
                    shipping_cents: 0,
                    tax_cents: 0,
                    total_cents: totalCents,
                    discount_code: promoCode,
                    portal_type: 'consumer',
                    metadata: {
                        stripe_session_id: sessionId,
                        helix_tokens_burned: helixBurned,
                        promo_code: promoCode,
                    },
                })
                .select('id, order_number')
                .single(),
            3000,
            'shop.checkout.finalize.insert_order',
        )

        if (orderErr || !orderRow) {
            safeLog.error('shop.checkout', 'finalizeOrderForSession create order failed', {
                error: orderErr,
                sessionId,
            })
            return { ok: false, error: 'Could not finalize order.' }
        }

        const orderItems = cart.map((l) => ({
            order_id: orderRow.id,
            product_slug: l.productSlug,
            product_name: l.productName,
            product_type: l.productType,
            delivery_form: l.deliveryForm,
            quantity: l.quantity,
            unit_price_cents: l.unitPriceCents,
            line_total_cents: l.unitPriceCents * l.quantity,
            metadata: { sku: l.sku, image: l.image },
        }))
        const { error: itemsErr } = await withTimeout(
            sb.from('shop_order_items').insert(orderItems),
            3000,
            'shop.checkout.finalize.insert_items',
        )
        if (itemsErr) {
            safeLog.warn('shop.checkout', 'finalizeOrderForSession items insert error', {
                error: itemsErr,
                sessionId,
            })
        }

        if (userId) {
            await withTimeout(
                sb.from('shop_cart_items').delete().eq('user_id', userId),
                3000,
                'shop.checkout.finalize.clear_cart',
            ).catch((error: unknown) => {
                safeLog.warn('shop.checkout', 'finalizeOrderForSession cart clear failed', {
                    error,
                })
            })

            if (helixBurned > 0) {
                try {
                    await withTimeout(
                        sb.from('helix_transactions').insert({
                            user_id: userId,
                            type: 'spend',
                            amount: -helixBurned,
                            source: 'shop_order',
                            description: `Helix burn for order ${orderNumber}`,
                            related_entity_id: orderRow.id,
                            metadata: {
                                order_number: orderNumber,
                                stripe_session_id: sessionId,
                            },
                        }),
                        3000,
                        'shop.checkout.finalize.helix_burn_log',
                    )
                    await withTimeout(
                        sb.rpc('helix_increment_balance', {
                            p_user_id: userId,
                            p_points: -helixBurned,
                        }),
                        3000,
                        'shop.checkout.finalize.helix_burn_rpc',
                    )
                } catch (error) {
                    safeLog.warn('shop.checkout', 'finalizeOrderForSession helix burn failed', {
                        error,
                        orderNumber,
                    })
                }
            }

            if (promoCode) {
                try {
                    await withTimeout(
                        sb.rpc('increment_promo_redemption', { p_code: promoCode }),
                        3000,
                        'shop.checkout.finalize.promo_increment',
                    )
                } catch (error) {
                    safeLog.warn('shop.checkout', 'finalizeOrderForSession promo increment failed', {
                        error,
                        promoCode,
                        orderNumber,
                    })
                }
            }

            const earnAmount = Math.floor(totalCents / 100)
            if (earnAmount > 0) {
                try {
                    await withTimeout(
                        sb.from('helix_transactions').insert({
                            user_id: userId,
                            type: 'earning',
                            amount: earnAmount,
                            source: 'shop_order',
                            description: `Earn for order ${orderNumber}`,
                            related_entity_id: orderRow.id,
                            metadata: {
                                order_number: orderNumber,
                                stripe_session_id: sessionId,
                            },
                        }),
                        3000,
                        'shop.checkout.finalize.helix_earn_log',
                    )
                    await withTimeout(
                        sb.rpc('helix_increment_balance', {
                            p_user_id: userId,
                            p_points: earnAmount,
                        }),
                        3000,
                        'shop.checkout.finalize.helix_earn_rpc',
                    )
                } catch (error) {
                    safeLog.warn('shop.checkout', 'finalizeOrderForSession helix earn failed', {
                        error,
                        orderNumber,
                    })
                }
            }
        }

        return { ok: true, orderNumber: orderRow.order_number }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.checkout', 'finalizeOrderForSession timed out', { error, sessionId })
        } else {
            safeLog.error('shop.checkout', 'finalizeOrderForSession failed', { error, sessionId })
        }
        return { ok: false, error: 'Could not finalize order.' }
    }
}
