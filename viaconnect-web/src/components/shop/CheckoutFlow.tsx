/**
 * CheckoutFlow is the multi-step Via Cura checkout UI per Prompt #141 v3
 * §5.5. Steps: Contact, Shipping, Review. After Review, the "Place order"
 * button calls createCheckoutSession (server action) and redirects to
 * Stripe Checkout (Stripe-hosted payment page) where Apple Pay, Google
 * Pay, and card are surfaced automatically when the Stripe domain is
 * verified.
 *
 * Validation:
 *   - Per-step required-field validation client-side.
 *   - MAP enforcement, prescription gate (L3/L4 SKUs), and the GeneX360
 *     lab-draw warning are computed server-side in validateCheckout.
 *     Block messages render at the top of the Review step.
 *
 * Cart sync:
 *   - useCart(userId) fires the F2.5 serverInitialSync once on mount.
 *   - On successful return from Stripe, the success page calls
 *     finalizeShopOrder which clears the server cart. The client-side
 *     localStorage cart is cleared by the success page (not here).
 */
'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { ChevronLeft, Lock } from 'lucide-react'
import { useCart } from '@/lib/shop/cart-store'
import {
    type CheckoutCartLine,
    type CheckoutFormData,
    createCheckoutSession,
} from '@/lib/shop/checkout-actions'

type Step = 'contact' | 'shipping' | 'review'

const STEPS: { key: Step; label: string }[] = [
    { key: 'contact', label: 'Contact' },
    { key: 'shipping', label: 'Shipping' },
    { key: 'review', label: 'Review' },
]

const COUNTRIES = [
    { code: 'US', label: 'United States' },
    { code: 'CA', label: 'Canada' },
]

function formatPrice(value: number): string {
    return `$${value.toFixed(2)}`
}

function emailValid(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function nonEmpty(s: string): boolean {
    return s.trim().length > 0
}

interface CheckoutFlowProps {
    consumerSession?: boolean
    userId?: string | null
}

export function CheckoutFlow({ consumerSession = true, userId = null }: CheckoutFlowProps) {
    const cart = useCart(userId)
    const [step, setStep] = useState<Step>('contact')
    const [form, setForm] = useState<CheckoutFormData>({
        email: '',
        phone: '',
        firstName: '',
        lastName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
        notes: '',
    })
    const [serverError, setServerError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const stepIndex = STEPS.findIndex((s) => s.key === step)

    const lines: CheckoutCartLine[] = useMemo(
        () =>
            cart.lines.map((l) => ({
                sku: l.sku,
                productSlug: l.sku,
                productName: l.name,
                productType: 'supplement',
                deliveryForm: l.format,
                pricingTier: null,
                quantity: l.quantity,
                unitPriceCents: Math.round(l.price * 100),
                image: l.image,
            })),
        [cart.lines],
    )

    const set = <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => {
        setForm((f) => ({ ...f, [key]: value }))
    }

    const contactValid = emailValid(form.email) && nonEmpty(form.phone)
    const shippingValid =
        nonEmpty(form.firstName) &&
        nonEmpty(form.lastName) &&
        nonEmpty(form.addressLine1) &&
        nonEmpty(form.city) &&
        nonEmpty(form.state) &&
        nonEmpty(form.zip) &&
        nonEmpty(form.country)

    const goNext = () => {
        if (step === 'contact' && contactValid) setStep('shipping')
        else if (step === 'shipping' && shippingValid) setStep('review')
    }
    const goBack = () => {
        if (step === 'shipping') setStep('contact')
        else if (step === 'review') setStep('shipping')
    }

    const placeOrder = () => {
        setServerError(null)
        startTransition(async () => {
            const result = await createCheckoutSession({
                cart: lines,
                form,
                appliedHelix: cart.appliedHelix,
                appliedPromo: cart.appliedPromo
                    ? {
                          code: cart.appliedPromo.code,
                          discountCents: Math.round(cart.promoDiscount * 100),
                      }
                    : null,
            })
            if (!result.ok || !result.url) {
                setServerError(result.error ?? 'Could not start checkout. Please try again.')
                return
            }
            window.location.href = result.url
        })
    }

    if (cart.lines.length === 0) {
        return (
            <div className="min-h-screen bg-[#0F1A2E] pb-12 text-white">
                <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
                    <h1 className="text-3xl font-light text-white md:text-4xl">Checkout</h1>
                    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                        <p className="text-base text-white/65">Your cart is empty.</p>
                        <Link
                            href="/shop"
                            className="mt-4 inline-block rounded-xl bg-[#2DA5A0] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#26918d]"
                        >
                            Browse the shop
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    // Hard gate: shop_orders.user_id is NOT NULL on the live schema. An
    // anonymous Stripe session would charge the card before the order insert
    // could run. Block the form up front and route to sign in.
    if (!userId) {
        return (
            <div className="min-h-screen bg-[#0F1A2E] pb-12 text-white">
                <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
                    <h1 className="text-3xl font-light text-white md:text-4xl">Checkout</h1>
                    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                        <p className="text-base text-white/85">Please sign in to complete checkout.</p>
                        <p className="mt-2 text-sm text-white/55">
                            Your cart will be waiting for you when you return.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Link
                                href="/login?redirectTo=%2Fshop%2Fcheckout"
                                className="rounded-xl bg-[#2DA5A0] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#26918d]"
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/signup?redirectTo=%2Fshop%2Fcheckout"
                                className="rounded-xl border border-white/15 bg-white/[0.02] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
                            >
                                Create account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0F1A2E] pb-12 text-white">
            <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
                <Link
                    href="/shop/cart"
                    className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/55 transition-colors hover:text-white"
                >
                    <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
                    Back to cart
                </Link>

                <h1 className="mb-6 text-3xl font-light text-white md:text-4xl">Checkout</h1>

                <ol className="mb-8 flex items-center gap-2 text-xs">
                    {STEPS.map((s, i) => {
                        const isActive = i === stepIndex
                        const isComplete = i < stepIndex
                        return (
                            <li key={s.key} className="flex items-center gap-2">
                                <span
                                    className={`flex h-6 w-6 items-center justify-center rounded-full border tabular-nums ${
                                        isActive
                                            ? 'border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                                            : isComplete
                                              ? 'border-[#2DA5A0]/50 text-[#2DA5A0]'
                                              : 'border-white/15 text-white/45'
                                    }`}
                                >
                                    {i + 1}
                                </span>
                                <span
                                    className={
                                        isActive ? 'text-white' : isComplete ? 'text-white/85' : 'text-white/45'
                                    }
                                >
                                    {s.label}
                                </span>
                                {i < STEPS.length - 1 && (
                                    <span className="ml-1 h-px w-6 bg-white/15" aria-hidden="true" />
                                )}
                            </li>
                        )
                    })}
                </ol>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
                    {step === 'contact' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-white">Contact</h2>
                            <div>
                                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => set('email', e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => set('phone', e.target.value)}
                                    placeholder="(555) 555 5555"
                                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {step === 'shipping' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-white">Shipping</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                        First name
                                    </label>
                                    <input
                                        type="text"
                                        value={form.firstName}
                                        onChange={(e) => set('firstName', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                        Last name
                                    </label>
                                    <input
                                        type="text"
                                        value={form.lastName}
                                        onChange={(e) => set('lastName', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                    Address line 1
                                </label>
                                <input
                                    type="text"
                                    value={form.addressLine1}
                                    onChange={(e) => set('addressLine1', e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                    Address line 2 (optional)
                                </label>
                                <input
                                    type="text"
                                    value={form.addressLine2 ?? ''}
                                    onChange={(e) => set('addressLine2', e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div>
                                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={form.city}
                                        onChange={(e) => set('city', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        value={form.state}
                                        onChange={(e) => set('state', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                        ZIP
                                    </label>
                                    <input
                                        type="text"
                                        value={form.zip}
                                        onChange={(e) => set('zip', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/45">
                                    Country
                                </label>
                                <select
                                    value={form.country}
                                    onChange={(e) => set('country', e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none"
                                >
                                    {COUNTRIES.map((c) => (
                                        <option key={c.code} value={c.code} className="bg-[#0F1A2E]">
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-5">
                            <h2 className="text-lg font-medium text-white">Review</h2>

                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                <p className="text-xs uppercase tracking-wider text-white/45">Ship to</p>
                                <p className="mt-2 text-sm text-white">
                                    {form.firstName} {form.lastName}
                                </p>
                                <p className="text-xs text-white/65">{form.addressLine1}</p>
                                {form.addressLine2 && (
                                    <p className="text-xs text-white/65">{form.addressLine2}</p>
                                )}
                                <p className="text-xs text-white/65">
                                    {form.city}, {form.state} {form.zip} {form.country}
                                </p>
                                <p className="mt-2 text-xs text-white/45">{form.email}</p>
                                <p className="text-xs text-white/45">{form.phone}</p>
                            </div>

                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                <p className="text-xs uppercase tracking-wider text-white/45">Order</p>
                                <ul className="mt-2 space-y-1.5 text-sm">
                                    {cart.lines.map((line) => (
                                        <li key={line.sku} className="flex items-center justify-between gap-3">
                                            <span className="min-w-0 truncate text-white/85">
                                                {line.name}
                                                {line.format ? ` (${line.format.toLowerCase()})` : ''}
                                                <span className="text-white/45"> x{line.quantity}</span>
                                            </span>
                                            <span className="tabular-nums text-white/85">
                                                {formatPrice(line.price * line.quantity)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/65">Subtotal</span>
                                        <span className="tabular-nums text-white">
                                            {formatPrice(cart.subtotal)}
                                        </span>
                                    </div>
                                    {cart.appliedHelix > 0 && (
                                        <div className="flex items-center justify-between text-[#2DA5A0]">
                                            <span>{cart.appliedHelix} Helix tokens</span>
                                            <span className="tabular-nums">{formatPrice(-cart.helixDiscount)}</span>
                                        </div>
                                    )}
                                    {cart.appliedPromo && (
                                        <div className="flex items-center justify-between text-[#2DA5A0]">
                                            <span>Promo {cart.appliedPromo.code}</span>
                                            <span className="tabular-nums">{formatPrice(-cart.promoDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-white/45">
                                        <span>Shipping</span>
                                        <span>Calculated by carrier</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-white/45">
                                        <span>Tax</span>
                                        <span>Calculated at payment</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-base font-medium">
                                        <span className="text-white">Total</span>
                                        <span className="tabular-nums text-white">{formatPrice(cart.total)}</span>
                                    </div>
                                </div>
                                {consumerSession && (
                                    <p className="mt-3 text-xs text-[#2DA5A0]">
                                        Earn {cart.helixEarnPreview} Helix on this order
                                    </p>
                                )}
                            </div>

                            {serverError && (
                                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                    {serverError}
                                </div>
                            )}

                            <p className="flex items-center gap-2 text-xs text-white/55">
                                <Lock className="h-3 w-3" strokeWidth={1.5} />
                                Payment is processed securely by Stripe. Apple Pay and Google Pay are available
                                on supported devices.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                    {step !== 'contact' ? (
                        <button
                            type="button"
                            onClick={goBack}
                            className="rounded-xl border border-white/15 bg-white/[0.02] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
                        >
                            Back
                        </button>
                    ) : (
                        <span />
                    )}
                    {step !== 'review' ? (
                        <button
                            type="button"
                            onClick={goNext}
                            disabled={
                                (step === 'contact' && !contactValid) ||
                                (step === 'shipping' && !shippingValid)
                            }
                            className="rounded-xl bg-[#2DA5A0] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#26918d] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={placeOrder}
                            disabled={isPending}
                            className="flex items-center gap-2 rounded-xl bg-[#2DA5A0] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#26918d] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {isPending ? 'Redirecting to Stripe...' : 'Place order'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
