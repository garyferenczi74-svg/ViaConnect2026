/**
 * CartChrome mounts the floating cart icon button and the slide-out cart
 * drawer per Prompt #141 v3 §5.4. Single component combines both because
 * they share open/close state.
 *
 * Trigger: fixed top-right glass button with item-count badge. Opens the
 * drawer on click. Also listens for the `viaconnect-cart-open` global
 * event so Add-to-Cart sites elsewhere can pop the drawer open after a
 * successful add.
 *
 * Drawer (slide from right): line items with thumb + name + format + qty
 * stepper + price + remove; subtotal block; applied Helix / promo lines
 * (with Remove buttons); Helix burn input (capped at 20% of subtotal per
 * spec §5.4); promo code input; full-width teal Checkout CTA; link to
 * full-page /shop/cart.
 *
 * Helix earn preview line is gated by the `consumerSession` prop per spec
 * §5.4 ("Consumer-only. Hide for practitioner and naturopath sessions.").
 * The prop is resolved server-side via lib/shop/role.ts and passed in by
 * the bento, the PLP template, and the PDP.
 *
 * Helix and promo Apply buttons now persist to localStorage (Phase F2).
 * Server-side cart persistence and real Helix ledger writes land in F2.5
 * and F5 respectively.
 */
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import {
    CART_OPEN_EVENT_NAME,
    applyHelix,
    applyPromo,
    clearAppliedHelix,
    clearAppliedPromo,
    pushCartToServer,
    removeFromCart,
    updateQuantity,
    useCart,
} from '@/lib/shop/cart-store'
import { useRxEligibility } from '@/lib/shop/use-rx-eligibility'
import { CartLineRxPill } from '@/components/shop/CartLineRxPill'

function formatPrice(value: number): string {
    return `$${value.toFixed(2)}`
}

interface CartChromeProps {
    consumerSession?: boolean
    userId?: string | null
}

export function CartChrome({ consumerSession = true, userId = null }: CartChromeProps) {
    const [isOpen, setIsOpen] = useState(false)
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

    useEffect(() => {
        const onOpen = () => setIsOpen(true)
        window.addEventListener(CART_OPEN_EVENT_NAME, onOpen)
        return () => window.removeEventListener(CART_OPEN_EVENT_NAME, onOpen)
    }, [])

    const closeDrawer = () => {
        setIsOpen(false)
        if (userId) {
            // Best-effort mirror of the local cart up to shop_cart_items so
            // cross-device sessions stay consistent. Failure here is silent;
            // the next mount's serverInitialSync re-syncs.
            void pushCartToServer()
        }
    }

    const subtotal = cart.subtotal
    const helixInputNumeric = Number(helixInput) || 0
    const helixInputCap = Math.floor(subtotal * 0.2)
    const helixInputValid = helixInputNumeric > 0 && helixInputNumeric <= helixInputCap

    const handleApplyHelix = () => {
        if (!helixInputValid) return
        const ok = applyHelix(helixInputNumeric, subtotal)
        if (ok) setHelixInput('')
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
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label={`Open cart, ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}`}
                className="fixed right-6 top-6 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#1A2744]/85 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:bg-[#1A2744]"
            >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                {cart.itemCount > 0 && (
                    <span className="absolute right-0 top-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#2DA5A0] px-1 text-[10px] font-bold text-white">
                        {cart.itemCount > 99 ? '99+' : cart.itemCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-40 flex bg-black/55 backdrop-blur-sm"
                    onClick={() => closeDrawer()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Shopping cart"
                >
                    <div
                        className="ml-auto flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0F1A2E] shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
                            <h2 className="text-lg font-medium text-white">Your Cart</h2>
                            <button
                                type="button"
                                aria-label="Close cart"
                                onClick={() => closeDrawer()}
                                className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                                <X className="h-5 w-5" strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {cart.lines.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <ShoppingBag className="h-10 w-10 text-white/25" strokeWidth={1.25} />
                                    <p className="mt-4 text-sm text-white/65">Your cart is empty.</p>
                                    <Link
                                        href="/shop"
                                        onClick={() => closeDrawer()}
                                        className="mt-3 text-sm text-[#2DA5A0] underline-offset-4 hover:underline"
                                    >
                                        Browse the shop
                                    </Link>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {cart.lines.map((line) => (
                                        <li
                                            key={line.sku}
                                            className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                                        >
                                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                                                {line.image ? (
                                                    <Image
                                                        src={line.image}
                                                        alt={line.name}
                                                        fill
                                                        sizes="80px"
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center">
                                                        <ShoppingBag
                                                            className="h-6 w-6 text-white/25"
                                                            strokeWidth={1.25}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-white">{line.name}</p>
                                                {line.format && (
                                                    <p className="text-xs text-white/55">({line.format.toLowerCase()})</p>
                                                )}
                                                <div className="mt-1.5">
                                                    <CartLineRxPill
                                                        pricingTier={line.pricingTier}
                                                        userId={userId}
                                                        isLoaded={rxEligibility.isLoaded}
                                                        hasToken={rxEligibility.hasToken(line.sku)}
                                                    />
                                                </div>
                                                <div className="mt-2 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
                                                        <button
                                                            type="button"
                                                            aria-label="Decrease quantity"
                                                            onClick={() =>
                                                                updateQuantity(line.sku, line.quantity - 1)
                                                            }
                                                            className="flex h-7 w-7 items-center justify-center text-white/70 transition-colors hover:text-white"
                                                        >
                                                            <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                                                        </button>
                                                        <span className="w-6 text-center text-xs font-medium tabular-nums text-white">
                                                            {line.quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            aria-label="Increase quantity"
                                                            onClick={() =>
                                                                updateQuantity(line.sku, line.quantity + 1)
                                                            }
                                                            className="flex h-7 w-7 items-center justify-center text-white/70 transition-colors hover:text-white"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm font-medium tabular-nums text-white/85">
                                                        {formatPrice(line.price * line.quantity)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${line.name}`}
                                                onClick={() => removeFromCart(line.sku)}
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                                            >
                                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {cart.lines.length > 0 && (
                            <div className="border-t border-white/[0.06] px-6 py-5">
                                <div className="space-y-1.5 text-sm">
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
                                            <span className="tabular-nums">
                                                {formatPrice(-cart.helixDiscount)}
                                            </span>
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
                                            <span className="tabular-nums">
                                                {formatPrice(-cart.promoDiscount)}
                                            </span>
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
                                    {cart.discountTotal > 0 && (
                                        <div className="flex items-center justify-between border-t border-white/[0.06] pt-1.5 text-base font-medium">
                                            <span className="text-white">Total</span>
                                            <span className="tabular-nums text-white">{formatPrice(cart.total)}</span>
                                        </div>
                                    )}
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
                                    onClick={() => closeDrawer()}
                                    className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-3 font-medium text-white transition-colors hover:bg-[#26918d]"
                                >
                                    Checkout
                                </Link>
                                <Link
                                    href="/shop/cart"
                                    onClick={() => closeDrawer()}
                                    className="mt-2 block text-center text-xs text-white/55 underline-offset-4 hover:text-white/85 hover:underline"
                                >
                                    View full cart
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
