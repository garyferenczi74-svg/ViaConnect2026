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
        // Phase F5d: expand total_details + shipping_cost so we can capture
        // Stripe Tax + shipping + Stripe-computed discount on the order row.
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['total_details', 'shipping_cost.shipping_rate'],
        })

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

        // Phase F5d.5: prefer Stripe-collected shipping fields when present.
        // The customer may have edited the pre-filled address on Stripe's
        // hosted page; that edit is reflected in session.shipping_details.
        // Fall back to session.metadata.shipping_* (form-collected) for legacy
        // F4-F5d sessions or when shipping_details is absent.
        const stripeShipping = session.shipping_details?.address ?? null
        const stripeShippingName = session.shipping_details?.name ?? null
        const [stripeFirstName, ...stripeLastNameParts] = (stripeShippingName ?? '').split(/\s+/)
        const stripeLastName = stripeLastNameParts.join(' ') || null
        const customerEmail = session.customer_details?.email ?? null
        const customerPhone = session.customer_details?.phone ?? null
        const shipFirstName =
            (stripeFirstName && stripeFirstName.length > 0 ? stripeFirstName : null) ??
            session.metadata?.shipping_first_name ??
            null
        const shipLastName =
            stripeLastName ?? session.metadata?.shipping_last_name ?? null
        const shipAddressLine1 =
            stripeShipping?.line1 ?? session.metadata?.shipping_address_line1 ?? null
        const shipAddressLine2 =
            stripeShipping?.line2 ?? session.metadata?.shipping_address_line2 ?? null
        const shipCity =
            stripeShipping?.city ?? session.metadata?.shipping_city ?? null
        const shipState =
            stripeShipping?.state ?? session.metadata?.shipping_state ?? null
        const shipZip =
            stripeShipping?.postal_code ?? session.metadata?.shipping_zip ?? null
        const shipCountry =
            stripeShipping?.country ?? session.metadata?.shipping_country ?? null
        const shipPhone = customerPhone ?? session.metadata?.shipping_phone ?? null
        const shipEmail = customerEmail ?? session.metadata?.shipping_email ?? null

        const subtotalCents = cart.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0)
        const totalCents = session.amount_total ?? subtotalCents
        // Phase F5d: source tax + shipping + discount from Stripe's
        // authoritative breakdown rather than back-computing. Falls back to
        // 0 when the fields are absent (legacy F4 sessions, anonymous tax,
        // or shipping option opted out).
        const taxCents = session.total_details?.amount_tax ?? 0
        const shippingCents = session.shipping_cost?.amount_total ?? 0
        const discountCents =
            session.total_details?.amount_discount ??
            Math.max(0, subtotalCents - totalCents)
        const orderNumber = `VC${Date.now().toString().slice(-9)}`

        const { data: orderRow, error: orderErr } = await withTimeout(
            sb
                .from('shop_orders')
                .insert({
                    user_id: userId || null,
                    order_number: orderNumber,
                    status: 'paid',
                    shipping_first_name: shipFirstName,
                    shipping_last_name: shipLastName,
                    shipping_address_line1: shipAddressLine1,
                    shipping_address_line2: shipAddressLine2,
                    shipping_city: shipCity,
                    shipping_state: shipState,
                    shipping_zip: shipZip,
                    shipping_country: shipCountry,
                    shipping_phone: shipPhone,
                    shipping_email: shipEmail,
                    subtotal_cents: subtotalCents,
                    discount_cents: discountCents,
                    shipping_cents: shippingCents,
                    tax_cents: taxCents,
                    total_cents: totalCents,
                    discount_code: promoCode,
                    portal_type: 'consumer',
                    metadata: {
                        stripe_session_id: sessionId,
                        // Phase F5c.5: store payment_intent_id so charge.refunded
                        // and charge.dispute.created webhook handlers can find
                        // the order from the Stripe event payload.
                        payment_intent_id:
                            typeof session.payment_intent === 'string'
                                ? session.payment_intent
                                : (session.payment_intent?.id ?? null),
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
            // Phase F5c.5: handle the race where the success URL and the
            // webhook both pass the existence check before either commits.
            // The UNIQUE expression index on metadata->>'stripe_session_id'
            // ensures one wins and the loser gets Postgres 23505. Without
            // this branch the loser would surface "Could not finalize order."
            // to a user whose order was actually created moments before by
            // the racing path.
            const errCode = (orderErr as { code?: string } | null)?.code
            if (errCode === '23505') {
                const { data: raced } = await withTimeout(
                    sb
                        .from('shop_orders')
                        .select('order_number')
                        .filter('metadata->>stripe_session_id', 'eq', sessionId)
                        .maybeSingle(),
                    3000,
                    'shop.checkout.finalize.race_recheck',
                )
                if (raced && raced.order_number) {
                    safeLog.info('shop.checkout', 'finalizeOrderForSession race resolved', {
                        sessionId,
                        orderNumber: raced.order_number,
                    })
                    return { ok: true, orderNumber: raced.order_number }
                }
            }
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
                    // Phase F5c.5: hardened two-arg signature requires the
                    // cited order to be paid with this exact discount_code,
                    // preventing direct-RPC spam against limited codes.
                    await withTimeout(
                        sb.rpc('increment_promo_redemption', {
                            p_code: promoCode,
                            p_order_id: orderRow.id,
                        }),
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

            // Phase F6a: refine Helix earn to merchandise-only (subtotal post
            // discount). Tax + shipping are excluded so customers do not earn
            // Helix on amounts they cannot capture as savings later. Routing
            // through creditEarning() for tier multipliers + family pools
            // remains a F6b deliverable.
            const merchandiseCents = Math.max(0, totalCents - taxCents - shippingCents)
            const earnAmount = Math.floor(merchandiseCents / 100)
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
