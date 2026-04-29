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
 * stepper + price + remove; subtotal block; Helix earn preview line;
 * Helix burn input (capped at 20% of subtotal per spec §5.4); promo code
 * input; full-width teal Checkout CTA; link to full-page /shop/cart.
 *
 * Helix burn / promo code Apply buttons are Phase F1 stubs (write the URL
 * via console.info; persistence and discount math land in later phases).
 * Checkout CTA navigates to /shop/checkout which is created in Phase F4.
 *
 * Helix earn preview is consumer-only per spec; Phase F1 surfaces the line
 * universally because role detection is not yet wired into the shop
 * chrome. The role gate lands in a later phase alongside cart server
 * persistence.
 */
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { CART_OPEN_EVENT_NAME, removeFromCart, updateQuantity, useCart } from '@/lib/shop/cart-store'

function formatPrice(value: number): string {
    return `$${value.toFixed(2)}`
}

export function CartChrome() {
    const [isOpen, setIsOpen] = useState(false)
    const [helixBurn, setHelixBurn] = useState('')
    const [promoCode, setPromoCode] = useState('')
    const cart = useCart()

    useEffect(() => {
        const onOpen = () => setIsOpen(true)
        window.addEventListener(CART_OPEN_EVENT_NAME, onOpen)
        return () => window.removeEventListener(CART_OPEN_EVENT_NAME, onOpen)
    }, [])

    const subtotal = cart.subtotal
    const helixBurnNumeric = Number(helixBurn) || 0
    const helixBurnCap = Math.floor(subtotal * 0.2)
    const helixBurnValid = helixBurnNumeric > 0 && helixBurnNumeric <= helixBurnCap

    const applyHelix = () => {
        if (!helixBurnValid) return
        console.info('[shop] Apply Helix tokens (stub)', { tokens: helixBurnNumeric, cap: helixBurnCap })
    }
    const applyPromo = () => {
        if (!promoCode.trim()) return
        console.info('[shop] Apply promo code (stub)', { code: promoCode.trim() })
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
                    onClick={() => setIsOpen(false)}
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
                                onClick={() => setIsOpen(false)}
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
                                        onClick={() => setIsOpen(false)}
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
                                    <div className="flex items-center justify-between text-xs text-white/45">
                                        <span>Shipping</span>
                                        <span>Calculated at checkout</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-white/45">
                                        <span>Tax</span>
                                        <span>Calculated at checkout</span>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/5 px-3 py-2">
                                    <p className="text-xs text-[#2DA5A0]">
                                        Earn {cart.helixEarnPreview} Helix on this order
                                    </p>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            max={helixBurnCap}
                                            value={helixBurn}
                                            onChange={(e) => setHelixBurn(e.target.value)}
                                            placeholder={`Apply Helix tokens (max ${helixBurnCap})`}
                                            className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            disabled={!helixBurnValid}
                                            onClick={applyHelix}
                                            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value)}
                                            placeholder="Promo code"
                                            className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            disabled={!promoCode.trim()}
                                            onClick={applyPromo}
                                            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>

                                <Link
                                    href="/shop/checkout"
                                    onClick={() => setIsOpen(false)}
                                    className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-3 font-medium text-white transition-colors hover:bg-[#26918d]"
                                >
                                    Checkout
                                </Link>
                                <Link
                                    href="/shop/cart"
                                    onClick={() => setIsOpen(false)}
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
