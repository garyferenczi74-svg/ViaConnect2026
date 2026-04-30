/**
 * CartPageView is the full /shop/cart page UI per Prompt #141 v3 §5.4
 * "Link to full-page /shop/cart for users who prefer it." Renders the same
 * cart contents as the slide drawer (CartChrome) in a wider page-aware
 * layout: line items in an 8-col list with larger thumbnails on desktop,
 * sticky 4-col summary panel on the right with subtotal, applied
 * discount lines, totals, Helix earn preview, Helix burn input, promo
 * code input, and Checkout CTA. Mobile collapses to single column.
 *
 * The /shop/cart route does NOT mount CartChrome alongside this view.
 * Reasons: (a) the floating cart icon is redundant on the cart page,
 * (b) mounting both with userId would trigger two simultaneous
 * serverInitialSync calls and risk a write race. CartPageView owns the
 * sync on this route.
 *
 * Helix earn preview is gated by `consumerSession` per spec §5.4. Apply
 * Helix and Apply Promo persist to the same localStorage keys as the
 * drawer; the discount math + post-discount earn preview matches F2.
 */
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import {
    applyHelix,
    applyPromo,
    clearAppliedHelix,
    clearAppliedPromo,
    removeFromCart,
    updateQuantity,
    useCart,
} from '@/lib/shop/cart-store'
import { useRxEligibility } from '@/lib/shop/use-rx-eligibility'
import { CartLineRxPill } from '@/components/shop/CartLineRxPill'

function formatPrice(value: number): string {
    return `$${value.toFixed(2)}`
}

interface CartPageViewProps {
    consumerSession?: boolean
    userId?: string | null
}

export function CartPageView({ consumerSession = true, userId = null }: CartPageViewProps) {
    const [helixInput, setHelixInput] = useState('')
    const [promoInput, setPromoInput] = useState('')
    const [promoError, setPromoError] = useState<string | null>(null)
    const cart = useCart(userId)

    const rxSkus = useMemo(
        () =>
            cart.lines
                .filter((l) => l.pricingTier === 'L3' || l.pricingTier === 'L4')
                .map((l) => l.sku),
        [cart.lines],
    )
    const rxEligibility = useRxEligibility(rxSkus, userId)

    const subtotal = cart.subtotal
    const helixInputCap = Math.floor(subtotal * 0.2)
    const helixInputNumeric = Number(helixInput) || 0
    const helixInputValid = helixInputNumeric > 0 && helixInputNumeric <= helixInputCap

    const handleApplyHelix = () => {
        if (!helixInputValid) return
        if (applyHelix(helixInputNumeric, subtotal)) setHelixInput('')
    }
    const handleApplyPromo = async () => {
        const code = promoInput.trim()
        if (!code) return
        const result = await applyPromo(code, subtotal)
        if (result.ok) {
            setPromoInput('')
            setPromoError(null)
        } else {
            setPromoError(result.error)
        }
    }

    return (
        <div className="min-h-screen bg-[#0F1A2E] pb-12 text-white">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:py-16">
                <Link
                    href="/shop"
                    className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/55 transition-colors hover:text-white"
                >
                    <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
                    Continue shopping
                </Link>

                <header className="mb-8 flex items-baseline justify-between">
                    <h1 className="text-3xl font-light text-white md:text-4xl">Your Cart</h1>
                    {cart.itemCount > 0 && (
                        <span className="text-sm text-white/55">
                            {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
                        </span>
                    )}
                </header>

                {cart.lines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-20 text-center">
                        <ShoppingBag className="h-12 w-12 text-white/25" strokeWidth={1.25} />
                        <p className="mt-4 text-base text-white/65">Your cart is empty.</p>
                        <Link
                            href="/shop"
                            className="mt-4 rounded-xl bg-[#2DA5A0] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#26918d]"
                        >
                            Browse the shop
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
                        <div className="lg:col-span-8">
                            <ul className="space-y-4">
                                {cart.lines.map((line) => (
                                    <li
                                        key={line.sku}
                                        className="flex gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:gap-6 md:p-6"
                                    >
                                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white/[0.04] md:h-32 md:w-32">
                                            {line.image ? (
                                                <Image
                                                    src={line.image}
                                                    alt={line.name}
                                                    fill
                                                    sizes="(min-width: 768px) 128px, 96px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <ShoppingBag
                                                        className="h-8 w-8 text-white/25"
                                                        strokeWidth={1.25}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                                            <div>
                                                <h3 className="text-base font-medium text-white md:text-lg">
                                                    {line.name}
                                                </h3>
                                                {line.format && (
                                                    <p className="text-xs text-white/55 md:text-sm">
                                                        ({line.format.toLowerCase()})
                                                    </p>
                                                )}
                                                <p className="mt-2 text-sm font-medium tabular-nums text-white/85">
                                                    {formatPrice(line.price)} each
                                                </p>
                                                <div className="mt-2">
                                                    <CartLineRxPill
                                                        pricingTier={line.pricingTier}
                                                        userId={userId}
                                                        isLoaded={rxEligibility.isLoaded}
                                                        hasToken={rxEligibility.hasToken(line.sku)}
                                                        quantityRemaining={rxEligibility.quantityRemaining(line.sku)}
                                                        lineQuantity={line.quantity}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
                                                    <button
                                                        type="button"
                                                        aria-label="Decrease quantity"
                                                        onClick={() => updateQuantity(line.sku, line.quantity - 1)}
                                                        className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
                                                    >
                                                        <Minus className="h-4 w-4" strokeWidth={1.5} />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-medium tabular-nums text-white">
                                                        {line.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        aria-label="Increase quantity"
                                                        onClick={() => updateQuantity(line.sku, line.quantity + 1)}
                                                        className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
                                                    >
                                                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                                                    </button>
                                                </div>
                                                <p className="text-base font-medium tabular-nums text-white">
                                                    {formatPrice(line.price * line.quantity)}
                                                </p>
                                                <button
                                                    type="button"
                                                    aria-label={`Remove ${line.name}`}
                                                    onClick={() => removeFromCart(line.sku)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                                                >
                                                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <aside className="lg:col-span-4">
                            <div className="lg:sticky lg:top-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h2 className="mb-4 text-lg font-medium text-white">Order Summary</h2>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/65">Subtotal</span>
                                        <span className="tabular-nums text-white">{formatPrice(subtotal)}</span>
                                    </div>
                                    {cart.appliedHelix > 0 && (
                                        <div className="flex items-center justify-between text-[#2DA5A0]">
                                            <span className="flex items-center gap-2">
                                                <span>{cart.appliedHelix} Helix tokens</span>
                                                <button
                                                    type="button"
                                                    onClick={() => clearAppliedHelix()}
                                                    aria-label="Remove Helix tokens"
                                                    className="text-xs text-white/45 underline-offset-4 hover:text-white/85 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </span>
                                            <span className="tabular-nums">{formatPrice(-cart.helixDiscount)}</span>
                                        </div>
                                    )}
                                    {cart.appliedPromo && (
                                        <div className="flex items-center justify-between text-[#2DA5A0]">
                                            <span className="flex items-center gap-2">
                                                <span>Promo {cart.appliedPromo.code}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => clearAppliedPromo()}
                                                    aria-label="Remove promo code"
                                                    className="text-xs text-white/45 underline-offset-4 hover:text-white/85 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </span>
                                            <span className="tabular-nums">{formatPrice(-cart.promoDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-white/45">
                                        <span>Shipping</span>
                                        <span>Calculated at checkout</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-white/45">
                                        <span>Tax</span>
                                        <span>Calculated at checkout</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-base font-medium">
                                        <span className="text-white">Total</span>
                                        <span className="tabular-nums text-white">{formatPrice(cart.total)}</span>
                                    </div>
                                </div>

                                {consumerSession && (
                                    <div className="mt-4 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/5 px-3 py-2">
                                        <p className="text-xs text-[#2DA5A0]">
                                            Earn {cart.helixEarnPreview} Helix on this order
                                        </p>
                                    </div>
                                )}

                                <div className="mt-4 grid grid-cols-1 gap-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            max={helixInputCap}
                                            value={helixInput}
                                            onChange={(e) => setHelixInput(e.target.value)}
                                            placeholder={`Apply Helix tokens (max ${helixInputCap})`}
                                            className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            disabled={!helixInputValid}
                                            onClick={handleApplyHelix}
                                            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                    <div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={promoInput}
                                                onChange={(e) => {
                                                    setPromoInput(e.target.value)
                                                    if (promoError) setPromoError(null)
                                                }}
                                                placeholder="Promo code"
                                                className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                disabled={!promoInput.trim()}
                                                onClick={handleApplyPromo}
                                                className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                        {promoError && (
                                            <p className="mt-1 text-xs text-rose-400/85">{promoError}</p>
                                        )}
                                    </div>
                                </div>

                                <Link
                                    href="/shop/checkout"
                                    className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-3 font-medium text-white transition-colors hover:bg-[#26918d]"
                                >
                                    Checkout
                                </Link>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    )
}
