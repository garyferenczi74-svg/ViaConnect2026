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
 *   - Prescription gate: any line with pricing_tier of L3 or L4 requires
 *     a practitioner-issued prescription token. F4 shipped this as a hard
 *     wall pointing at /practitioners. F6b.3d evolved it into a real
 *     eligibility check via serverCheckRxEligibility (lib/prescriptions
 *     /patient-actions). Eligible lines pass and the matched token ids
 *     flow through Stripe session metadata as rx_tokens_json so
 *     finalizeOrderForSession consumes them after the order insert. L3/L4
 *     lines are limited to quantity 1 in F6b.3d; multi-quantity lands in
 *     F6b.3h alongside refills.
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
import { finalizeOrderForSession } from '@/lib/shop/checkout-helpers'
import { serverCheckRxEligibility } from '@/lib/prescriptions/patient-actions'

const MAP_MULTIPLIER = 1.72

// Phase F5d.6: address fields removed from CheckoutFormData. Stripe Checkout
// collects shipping address on its hosted page; the user no longer types
// the same address twice. Only the contact identity fields (name, email,
// phone) are collected on our side and used to pre-create or update a
// Stripe Customer record.
export interface CheckoutFormData {
    email: string
    phone: string
    firstName: string
    lastName: string
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
    // Phase F6b.3d: when L3/L4 cart lines pass eligibility, the matched
    // tokens are returned so createCheckoutSession can embed them in the
    // Stripe session metadata for finalizeOrderForSession to consume after
    // the order insert succeeds.
    rxTokens?: { sku: string; tokenId: string }[]
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

    let rxTokensForOrder: { sku: string; tokenId: string }[] | undefined
    const rxItems = cart.filter(
        (l) => l.pricingTier === 'L3' || l.pricingTier === 'L4',
    )
    if (rxItems.length > 0) {
        // F6b.3d launch posture: L3/L4 cart lines limited to quantity 1.
        // Multi-quantity per single prescription token requires a
        // quantity-aware prescription_consume RPC, which lands in F6b.3h
        // alongside refills.
        const overQuantity = rxItems.filter((l) => l.quantity > 1)
        if (overQuantity.length > 0) {
            return {
                ok: false,
                error:
                    'Prescription items can only be ordered one at a time. Please reduce the quantity to 1.',
                warnings,
            }
        }
        const rxSkus = rxItems.map((l) => l.sku)
        const eligibility = await serverCheckRxEligibility(rxSkus)
        if (!eligibility.ok) {
            return { ok: false, error: eligibility.error, warnings }
        }
        const missing = eligibility.rows.filter((r) => !r.hasToken)
        if (missing.length > 0) {
            const missingNames = missing
                .map(
                    (m) =>
                        rxItems.find((l) => l.sku === m.sku)?.productName ?? m.sku,
                )
                .join(', ')
            return {
                ok: false,
                error: `These items require a practitioner-issued prescription: ${missingNames}. Visit /practitioners to find a clinician.`,
                warnings,
            }
        }
        rxTokensForOrder = eligibility.rows
            .filter((r) => r.hasToken && r.tokenId)
            .map((r) => ({ sku: r.sku, tokenId: r.tokenId as string }))
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

        return { ok: true, warnings, rxTokens: rxTokensForOrder }
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

        // Phase F5d.6: address collection moved entirely to Stripe Checkout's
        // hosted page (eliminates the F4-F5d.5 double-entry). Customer is
        // pre-created/updated with identity fields only (name, email, phone);
        // Stripe collects shipping address on its page via the existing
        // shipping_address_collection setting. Customer is deduplicated by
        // email so returning buyers reuse their Stripe Customer record.
        const fullName = `${form.firstName} ${form.lastName}`.trim()
        const customerPayload: Stripe.CustomerCreateParams = {
            email: form.email,
            name: fullName || undefined,
            phone: form.phone || undefined,
            metadata: { app_user_id: userId },
        }
        const existingByEmail = await stripe.customers.list({
            email: form.email,
            limit: 1,
        })
        let customer: Stripe.Customer
        if (existingByEmail.data.length > 0) {
            customer = await stripe.customers.update(existingByEmail.data[0].id, customerPayload)
        } else {
            customer = await stripe.customers.create(customerPayload)
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

        // Phase F5d: shipping options. Three static tiers shown on Stripe's
        // payment page; customer picks one. Free standard shipping unlocks
        // automatically when cart subtotal is at or above the configured
        // threshold (default $100, override via SHOP_FREE_SHIPPING_THRESHOLD_CENTS).
        // Real carrier rate APIs (Shippo / EasyPost / USPS / UPS / FedEx)
        // defer to F5d.6 (needs package.json approval for the carrier SDK).
        const subtotalCents = cart.reduce(
            (s, l) => s + l.unitPriceCents * l.quantity,
            0,
        )
        const freeShippingThresholdCents = Number(
            process.env.SHOP_FREE_SHIPPING_THRESHOLD_CENTS ?? '10000',
        )
        const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = []
        if (subtotalCents >= freeShippingThresholdCents) {
            shippingOptions.push({
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: { amount: 0, currency: 'usd' },
                    display_name: 'Free standard shipping',
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 5 },
                        maximum: { unit: 'business_day', value: 7 },
                    },
                },
            })
        } else {
            shippingOptions.push({
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: { amount: 599, currency: 'usd' },
                    display_name: 'Standard',
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 5 },
                        maximum: { unit: 'business_day', value: 7 },
                    },
                },
            })
        }
        shippingOptions.push({
            shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: { amount: 1499, currency: 'usd' },
                display_name: 'Express',
                delivery_estimate: {
                    minimum: { unit: 'business_day', value: 1 },
                    maximum: { unit: 'business_day', value: 3 },
                },
            },
        })

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
            // Phase F5d.5: customer instead of customer_email so Stripe pre-fills
            // shipping/billing address from the customer record we just built.
            customer: customer.id,
            payment_method_types: ['card'],
            shipping_address_collection: { allowed_countries: ['US', 'CA'] },
            shipping_options: shippingOptions,
            // Phase F5d: enable Stripe Tax for automatic US/CA tax math
            // based on the customer's shipping address. Stripe Tax must be
            // enabled and origin address configured in the dashboard for
            // this to compute non-zero tax.
            automatic_tax: { enabled: true },
            success_url: `${origin}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/shop/cart`,
            metadata: {
                user_id: userId ?? '',
                helix_tokens_burned: String(appliedHelix),
                promo_code: appliedPromo?.code ?? '',
                // Phase F5d.6: contact-only metadata. Address fields removed
                // because Stripe collects them on its page; finalizeOrderForSession
                // reads session.shipping_details for the captured address.
                shipping_first_name: form.firstName,
                shipping_last_name: form.lastName,
                shipping_phone: form.phone,
                shipping_email: form.email,
                cart_json: JSON.stringify(cart),
                // Phase F6b.3d: rx_tokens_json carries the per-SKU token id
                // chosen by validateCheckout's eligibility lookup. Empty
                // string when no L3/L4 lines exist. finalizeOrderForSession
                // parses this and calls prescription_consume per entry after
                // the shop_orders row commits.
                rx_tokens_json:
                    validation.rxTokens && validation.rxTokens.length > 0
                        ? JSON.stringify(validation.rxTokens)
                        : '',
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
    // Phase F5c: finalization logic extracted to lib/shop/checkout-helpers
    // so the Stripe webhook (api/shop/webhook) can call the same code path
    // with a service-role client. This route uses the auth-scoped client so
    // RLS on shop_orders applies (Users create own orders policy enforces
    // user_id = auth.uid() WITH CHECK).
    const supabase = createClient()
    return finalizeOrderForSession(supabase, sessionId)
}
