/**
 * Server actions for the Via Cura shop checkout per Prompt #141 v3 §5.5.
 *
 * Phase F4 implementation: redirect-based Stripe Checkout (Stripe-hosted
 * payment page). Apple Pay and Google Pay are surfaced automatically by
 * Stripe when the domain is verified in the Stripe dashboard. Card is
 * always available. Shop Pay is out of scope (requires Shopify, which is
 * not the underlying platform).
 *
 * Critical preservation rules per spec §5.5:
 *   - MAP pricing floor enforced server-side: final_price >= cogs * 1.72
 *     across the cart. Discount codes that would push below this are
 *     rejected. cogs lives in public.master_skus.
 *   - Prescription gate: any line with pricing_tier of L3 or L4 blocks
 *     checkout until a practitioner-issued prescription token is in cart
 *     metadata. Phase F4 ships the gate as a hard block with messaging
 *     pointing to /practitioners; the practitioner token issuance flow is
 *     a separate F6 deliverable.
 *   - GeneX360 testing kits requiring lab draw show a banner before
 *     payment. Phase F4 ships the banner via the validateCheckout
 *     warnings array; the kit metadata determines whether to show.
 *
 * Phase F5 additions:
 *   - Helix burn + earn writes to public.helix_transactions paired with
 *     the helix_increment_balance(p_user_id, p_points) RPC. Burn deducts
 *     applied Helix from the user's balance and logs `type='spend'` with
 *     a negative amount. Earn credits 1 Helix per $1 of post-discount
 *     total and logs `type='earning'` matching the earning-engine
 *     convention. Best-effort: failures are logged via safeLog and the
 *     order itself is preserved (Helix can be reconciled later).
 *
 * Still deferred (F6+):
 *   - Routing the earn through lib/helix/earning-engine.ts creditEarning()
 *     for tier multipliers, family pool routing, and frequency limits.
 *   - Webhook-based order finalization (current pattern is success-URL
 *     redirect; happy path covered, async edge cases not).
 *   - Real tax + shipping calculation.
 *   - Server-side promo code validation against a Supabase table.
 */
'use server'

import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

const MAP_MULTIPLIER = 1.72

export interface CheckoutFormData {
    email: string
    phone: string
    firstName: string
    lastName: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    zip: string
    country: string
    notes?: string
}

export interface CheckoutCartLine {
    sku: string
    productSlug: string
    productName: string
    productType: string
    deliveryForm: string | null
    pricingTier: string | null
    quantity: number
    unitPriceCents: number
    image: string | null
}

export interface CheckoutValidationResult {
    ok: boolean
    error?: string
    warnings: string[]
}

interface AppliedPromoSnapshot {
    code: string
    discountCents: number
}

export async function validateCheckout(
    cart: CheckoutCartLine[],
    appliedHelix: number,
    appliedPromo: AppliedPromoSnapshot | null,
): Promise<CheckoutValidationResult> {
    const warnings: string[] = []

    if (cart.length === 0) {
        return { ok: false, error: 'Your cart is empty.', warnings }
    }

    const rxItems = cart.filter(
        (l) => l.pricingTier === 'L3' || l.pricingTier === 'L4',
    )
    if (rxItems.length > 0) {
        return {
            ok: false,
            error:
                'Some items in your cart require a practitioner-issued prescription. Visit our practitioners page to find a clinician.',
            warnings,
        }
    }

    const labDrawItems = cart.filter(
        (l) => l.productType === 'testing' && l.deliveryForm === 'lab_draw',
    )
    if (labDrawItems.length > 0) {
        warnings.push(
            'Some testing kits in your cart require a lab draw. We will coordinate with a partner lab after purchase.',
        )
    }

    try {
        const supabase = createClient()
        const sb = supabase as unknown as {
            from: (t: string) => any
        }
        const skus = Array.from(new Set(cart.map((l) => l.sku)))
        const { data: skuRows, error: skuError } = await withTimeout(
            sb.from('master_skus').select('sku, cogs').in('sku', skus),
            3000,
            'shop.checkout.validate.master_skus',
        )
        if (skuError) {
            safeLog.warn('shop.checkout', 'master_skus lookup error during MAP check', {
                error: skuError,
            })
            return {
                ok: false,
                error: 'Could not validate pricing. Please try again.',
                warnings,
            }
        }

        const cogsBySku = new Map<string, number>()
        for (const row of (skuRows ?? []) as { sku: string; cogs: number | null }[]) {
            cogsBySku.set(row.sku, Number(row.cogs ?? 0))
        }

        const subtotalCents = cart.reduce(
            (s, l) => s + l.unitPriceCents * l.quantity,
            0,
        )
        const helixDiscountCents = Math.max(0, appliedHelix * 100)
        const promoDiscountCents = Math.max(0, appliedPromo?.discountCents ?? 0)
        const finalTotalCents = Math.max(
            0,
            subtotalCents - helixDiscountCents - promoDiscountCents,
        )

        let minTotalCents = 0
        for (const line of cart) {
            const cogs = cogsBySku.get(line.sku) ?? 0
            minTotalCents += Math.round(cogs * MAP_MULTIPLIER * 100) * line.quantity
        }

        if (finalTotalCents < minTotalCents) {
            return {
                ok: false,
                error: 'This code cannot be combined with the current items.',
                warnings,
            }
        }

        return { ok: true, warnings }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.checkout', 'validateCheckout timed out', { error })
        } else {
            safeLog.error('shop.checkout', 'validateCheckout failed', { error })
        }
        return {
            ok: false,
            error: 'Could not validate the cart. Please try again.',
            warnings,
        }
    }
}

export async function createCheckoutSession(args: {
    cart: CheckoutCartLine[]
    form: CheckoutFormData
    appliedHelix: number
    appliedPromo: AppliedPromoSnapshot | null
}): Promise<{ ok: boolean; url?: string; error?: string }> {
    const { cart, form, appliedHelix, appliedPromo } = args

    const validation = await validateCheckout(cart, appliedHelix, appliedPromo)
    if (!validation.ok) {
        return { ok: false, error: validation.error }
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
        safeLog.error('shop.checkout', 'STRIPE_SECRET_KEY not configured')
        return { ok: false, error: 'Payment processing is not yet configured.' }
    }

    try {
        const stripe = new Stripe(stripeKey)
        const supabase = createClient()
        const userResult = await withTimeout(
            supabase.auth.getUser(),
            2000,
            'shop.checkout.createSession.getUser',
        )
        const userId = userResult?.data?.user?.id ?? null

        // Hard gate: shop_orders.user_id is NOT NULL on the live schema, so an
        // anonymous Stripe Checkout session would charge the card and then
        // throw at the order insert in finalizeShopOrder. Prevent the
        // "money taken, no order recorded" scenario by blocking the session
        // creation up front.
        if (!userId) {
            return {
                ok: false,
                error: 'Please sign in to complete checkout.',
            }
        }

        const headersList = headers()
        const origin = headersList.get('origin') ?? 'https://viaconnectapp.com'

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.map(
            (l) => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: l.productName,
                        metadata: { sku: l.sku, slug: l.productSlug },
                    },
                    unit_amount: l.unitPriceCents,
                },
                quantity: l.quantity,
            }),
        )

        const helixDiscountCents = Math.max(0, appliedHelix * 100)
        const promoDiscountCents = Math.max(0, appliedPromo?.discountCents ?? 0)
        const totalDiscountCents = helixDiscountCents + promoDiscountCents

        const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = []
        if (totalDiscountCents > 0) {
            const coupon = await stripe.coupons.create({
                amount_off: totalDiscountCents,
                currency: 'usd',
                duration: 'once',
                name: appliedPromo
                    ? `${appliedPromo.code}${appliedHelix > 0 ? ` plus ${appliedHelix} Helix` : ''}`
                    : `${appliedHelix} Helix tokens`,
                metadata: {
                    helix_tokens: String(appliedHelix),
                    promo_code: appliedPromo?.code ?? '',
                },
            })
            discounts.push({ coupon: coupon.id })
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: lineItems,
            discounts,
            customer_email: form.email,
            payment_method_types: ['card'],
            shipping_address_collection: { allowed_countries: ['US', 'CA'] },
            success_url: `${origin}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/shop/cart`,
            metadata: {
                user_id: userId ?? '',
                helix_tokens_burned: String(appliedHelix),
                promo_code: appliedPromo?.code ?? '',
                shipping_first_name: form.firstName,
                shipping_last_name: form.lastName,
                shipping_address_line1: form.addressLine1,
                shipping_address_line2: form.addressLine2 ?? '',
                shipping_city: form.city,
                shipping_state: form.state,
                shipping_zip: form.zip,
                shipping_country: form.country,
                shipping_phone: form.phone,
                shipping_email: form.email,
                cart_json: JSON.stringify(cart),
            },
        })

        if (!session.url) {
            return { ok: false, error: 'Could not create checkout session.' }
        }
        return { ok: true, url: session.url }
    } catch (error) {
        safeLog.error('shop.checkout', 'createCheckoutSession failed', { error })
        return {
            ok: false,
            error: 'Could not start checkout. Please try again.',
        }
    }
}

export async function finalizeShopOrder(
    sessionId: string,
): Promise<{ ok: boolean; orderNumber?: string; error?: string }> {
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

        const supabase = createClient()
        const sb = supabase as unknown as {
            from: (t: string) => any
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
            safeLog.error('shop.checkout', 'finalizeShopOrder missing cart_json', {
                sessionId,
            })
            return { ok: false, error: 'Order data missing.' }
        }

        let cart: CheckoutCartLine[]
        try {
            cart = JSON.parse(cartJson) as CheckoutCartLine[]
        } catch {
            safeLog.error('shop.checkout', 'finalizeShopOrder cart_json parse failed', {
                sessionId,
            })
            return { ok: false, error: 'Order data corrupted.' }
        }

        const userId = session.metadata?.user_id || null
        const helixBurned = Number(session.metadata?.helix_tokens_burned ?? 0)
        const promoCode = session.metadata?.promo_code || null

        const subtotalCents = cart.reduce(
            (s, l) => s + l.unitPriceCents * l.quantity,
            0,
        )
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
            safeLog.error('shop.checkout', 'create order failed', {
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
            safeLog.warn('shop.checkout', 'create order items error (non-blocking)', {
                error: itemsErr,
                sessionId,
            })
        }

        if (userId) {
            await withTimeout(
                sb.from('shop_cart_items').delete().eq('user_id', userId),
                3000,
                'shop.checkout.finalize.clear_cart',
            ).catch((error) => {
                safeLog.warn('shop.checkout', 'clear server cart on success failed', {
                    error,
                })
            })

            // Phase F5: Helix ledger writes. Best-effort; if any of these fail
            // the order is still recorded. A reconciliation job can re-derive
            // missing balance changes from helix_transactions later.
            //
            // Audit-trail-first ordering: log the transaction row, then call
            // the helix_increment_balance RPC. If the RPC fails after a
            // successful log row insert, the row exists with the intent; the
            // balance is repairable. The other order (RPC first) leaves no
            // record if the log insert fails.
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
                    safeLog.warn('shop.checkout', 'helix burn ledger write failed', {
                        error,
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
                    safeLog.warn('shop.checkout', 'helix earn ledger write failed', {
                        error,
                        orderNumber,
                    })
                }
            }
        }

        return { ok: true, orderNumber: orderRow.order_number }
    } catch (error) {
        safeLog.error('shop.checkout', 'finalizeShopOrder failed', { error })
        return { ok: false, error: 'Could not finalize order.' }
    }
}
