/**
 * CheckoutFlow is the multi-step Via Cura checkout UI per Prompt #141 v3
 * §5.5, refactored at Phase F5d.6 to two steps (Contact, Review). The
 * Shipping step was dropped because Stripe Checkout collects shipping
 * address on its hosted page; eliminating the form on our side removes
 * the F4-F5d.5 double-entry where the user typed the same address twice.
 *
 * Steps: Contact (email, phone, first/last name) -> Review (cart + totals).
 * After Review, the "Place order" button calls createCheckoutSession
 * (server action) and redirects to Stripe Checkout where shipping
 * address, payment method (Apple Pay / Google Pay / card), and tax math
 * are all handled.
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
import { useEffect, useMemo, useState, useTransition } from 'react'
import { AlertTriangle, ChevronLeft, Lock } from 'lucide-react'
import { useCart } from '@/lib/shop/cart-store'
import {
    type CheckoutCartLine,
    type CheckoutFormData,
    createCheckoutSession,
    validateCheckout,
} from '@/lib/shop/checkout-actions'

type Step = 'contact' | 'review'

const STEPS: { key: Step; label: string }[] = [
    { key: 'contact', label: 'Contact' },
    { key: 'review', label: 'Review' },
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
                productType: l.productType,
                deliveryForm: l.format,
                pricingTier: l.pricingTier,
                quantity: l.quantity,
                unitPriceCents: Math.round(l.price * 100),
                image: l.image,
            })),
        [cart.lines],
    )

    // Phase F6a: validate the cart server-side when the user reaches Review.
    // Surfaces the prescription gate (L3/L4 SKUs hard-block until a
    // practitioner-issued token is in cart, deferred to F6b) and the
    // GeneX360 lab-draw warning before the user clicks Place order. The
    // server action runs the same validateCheckout that createCheckoutSession
    // calls internally, so we never see a different result post-click.
    const [validation, setValidation] = useState<{
        ok: boolean
        error?: string
        warnings: string[]
    } | null>(null)
    useEffect(() => {
        if (step !== 'review' || lines.length === 0) {
            setValidation(null)
            return
        }
        let cancelled = false
        validateCheckout(
            lines,
            cart.appliedHelix,
            cart.appliedPromo
                ? {
                      code: cart.appliedPromo.code,
                      discountCents: Math.round(cart.promoDiscount * 100),
                  }
                : null,
        )
            .then((result) => {
                if (!cancelled) setValidation(result)
            })
            .catch(() => {
                if (!cancelled) setValidation(null)
            })
        return () => {
            cancelled = true
        }
    }, [step, lines, cart.appliedHelix, cart.appliedPromo, cart.promoDiscount])

    const set = <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => {
        setForm((f) => ({ ...f, [key]: value }))
    }

    const contactValid =
        emailValid(form.email) &&
        nonEmpty(form.phone) &&
        nonEmpty(form.firstName) &&
        nonEmpty(form.lastName)

    const goNext = () => {
        if (step === 'contact' && contactValid) setStep('review')
    }
    const goBack = () => {
        if (step === 'review') setStep('contact')
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
                            <p className="text-xs text-white/55">
                                Stripe collects your shipping address securely on the next page.
                            </p>
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

                    {step === 'review' && (
                        <div className="space-y-5">
                            <h2 className="text-lg font-medium text-white">Review</h2>

                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                <p className="text-xs uppercase tracking-wider text-white/45">Contact</p>
                                <p className="mt-2 text-sm text-white">
                                    {form.firstName} {form.lastName}
                                </p>
                                <p className="text-xs text-white/55">{form.email}</p>
                                <p className="text-xs text-white/55">{form.phone}</p>
                                <p className="mt-2 text-xs text-white/45">
                                    Shipping address collected by Stripe at payment.
                                </p>
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

                            {validation && !validation.ok && validation.error && (
                                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                    <p>{validation.error}</p>
                                    {validation.error.toLowerCase().includes('practitioner') && (
                                        <Link
                                            href="/practitioners"
                                            className="mt-1 inline-block text-xs text-[#2DA5A0] underline-offset-4 hover:underline"
                                        >
                                            Find a practitioner
                                        </Link>
                                    )}
                                </div>
                            )}

                            {validation && validation.ok && validation.warnings.length > 0 && (
                                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle
                                            className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                                            strokeWidth={1.5}
                                        />
                                        <ul className="space-y-1">
                                            {validation.warnings.map((w, i) => (
                                                <li key={i}>{w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

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
                            disabled={!contactValid}
                            className="rounded-xl bg-[#2DA5A0] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#26918d] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={placeOrder}
                            disabled={isPending || (validation !== null && !validation.ok)}
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
