/**
 * Client-side cart state for the Via Cura shop per Prompt #141 v3 §5.4.
 *
 * Storage: localStorage under the key `viaconnect-shop-cart`. Survives page
 * refreshes within the same browser. Cross-tab sync via the `storage` event.
 * Custom `viaconnect-cart-updated` event used for same-tab listeners
 * (storage events do not fire on the tab that wrote them).
 *
 * Persistence to Supabase shop_cart_items is deferred to a later phase that
 * wires in the auth context. For Phase F1, anonymous and authenticated
 * sessions both use localStorage; merging logic lands later.
 *
 * Peptide exclusion: Add-to-Cart call sites are restricted to the new shop
 * surfaces (PLP cards, PDP). Those surfaces are already peptide-excluded
 * via lib/shop/queries.ts, so no item that reaches addToCart can be a
 * peptide SKU. The legacy /shop/peptides destination has its own checkout
 * flow which is byte-for-byte unchanged per spec §1B.
 */
'use client'

import { useEffect, useState } from 'react'

const CART_STORAGE_KEY = 'viaconnect-shop-cart'
const CART_UPDATED_EVENT = 'viaconnect-cart-updated'
const CART_OPEN_EVENT = 'viaconnect-cart-open'

export interface CartLine {
    sku: string
    productId: string
    name: string
    format: string | null
    image: string | null
    price: number
    quantity: number
}

function readCart(): CartLine[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as CartLine[]) : []
    } catch {
        return []
    }
}

function writeCart(lines: CartLine[]): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines))
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function addToCart(
    item: Omit<CartLine, 'quantity'> & { quantity?: number },
    options: { openDrawer?: boolean } = {},
): void {
    const lines = readCart()
    const qty = Math.max(1, item.quantity ?? 1)
    const existing = lines.find((l) => l.sku === item.sku)
    if (existing) {
        existing.quantity = Math.min(99, existing.quantity + qty)
    } else {
        lines.push({
            sku: item.sku,
            productId: item.productId,
            name: item.name,
            format: item.format,
            image: item.image,
            price: item.price,
            quantity: qty,
        })
    }
    writeCart(lines)
    if (options.openDrawer && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(CART_OPEN_EVENT))
    }
}

export function updateQuantity(sku: string, quantity: number): void {
    const lines = readCart()
    const idx = lines.findIndex((l) => l.sku === sku)
    if (idx < 0) return
    if (quantity <= 0) {
        lines.splice(idx, 1)
    } else {
        lines[idx].quantity = Math.min(99, quantity)
    }
    writeCart(lines)
}

export function removeFromCart(sku: string): void {
    writeCart(readCart().filter((l) => l.sku !== sku))
}

export function clearCart(): void {
    writeCart([])
}

export function openCartDrawer(): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(CART_OPEN_EVENT))
}

export interface CartSummary {
    lines: CartLine[]
    subtotal: number
    itemCount: number
    helixEarnPreview: number
}

function summarize(lines: CartLine[]): CartSummary {
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0)
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0)
    // Earn preview: 1 Helix per $1 spent, rounded down. Consumer-only gating
    // happens at the display layer (CartChrome reads role from a future auth
    // hook). Phase F1 stub formula; spec §5.4 "Earn X Helix on this order".
    const helixEarnPreview = Math.floor(subtotal)
    return { lines, subtotal, itemCount, helixEarnPreview }
}

export function useCart(): CartSummary & {
    addToCart: typeof addToCart
    updateQuantity: typeof updateQuantity
    removeFromCart: typeof removeFromCart
    clearCart: typeof clearCart
} {
    const [lines, setLines] = useState<CartLine[]>([])

    useEffect(() => {
        setLines(readCart())
        const onUpdated = () => setLines(readCart())
        const onStorage = (e: StorageEvent) => {
            if (e.key === CART_STORAGE_KEY) setLines(readCart())
        }
        window.addEventListener(CART_UPDATED_EVENT, onUpdated)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, onUpdated)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const summary = summarize(lines)
    return {
        ...summary,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
    }
}

export const CART_OPEN_EVENT_NAME = CART_OPEN_EVENT
