/**
 * Client-side cart state for the Via Cura shop per Prompt #141 v3 §5.4.
 *
 * Storage: localStorage. Three keys:
 *   - viaconnect-shop-cart           array of CartLine
 *   - viaconnect-shop-applied-helix  applied Helix tokens (numeric, 0 = none)
 *   - viaconnect-shop-applied-promo  applied promo code result (or null)
 *
 * Cross-tab sync via the native `storage` event. Same-tab listeners use a
 * custom `viaconnect-cart-updated` event.
 *
 * Phase F2 stubs the Helix to dollar exchange at 1:1 and the promo
 * validator against an in-memory whitelist (WELCOME10 = 10% off,
 * SAVE25 = $25 off). Real ledger writes and server-side promo validation
 * land in Phase F5 alongside Stripe and the MAP enforcement server actions.
 *
 * Persistence to Supabase shop_cart_items is deferred to a later F2.5
 * sub-phase that wires in the auth context and merge-on-sign-in logic.
 *
 * Peptide exclusion is upstream (lib/shop/queries.ts and the legacy
 * /shop/peptides destination has its own untouched checkout flow per §1B).
 */
'use client'

import { useEffect, useState } from 'react'
import {
    serverInitialSync,
    serverReplaceCart,
    type SyncCartLine,
} from '@/lib/shop/cart-actions'
import { serverValidatePromoCode } from '@/lib/shop/promo-actions'

const CART_STORAGE_KEY = 'viaconnect-shop-cart'
const HELIX_STORAGE_KEY = 'viaconnect-shop-applied-helix'
const PROMO_STORAGE_KEY = 'viaconnect-shop-applied-promo'
const CART_UPDATED_EVENT = 'viaconnect-cart-updated'
const CART_OPEN_EVENT = 'viaconnect-cart-open'

const HELIX_TO_DOLLAR = 1 // 1 Helix = $1 (Phase F2 stub; final rate set in F5)

// Phase F5b: promo code validation moved to public.validate_promo_code RPC.
// The previous in-memory STUB_PROMO_CODES whitelist (WELCOME10, SAVE25) has
// been seeded into the live promo_codes table by migration 20260429120000.

export interface CartLine {
    sku: string
    productId: string
    name: string
    format: string | null
    image: string | null
    price: number
    quantity: number
    // Phase F6a: pricingTier carries L1-L4 from products.pricing_tier so the
    // server-side prescription gate in validateCheckout can fire on L3/L4
    // SKUs. productType separates supplement vs testing variants so the
    // GeneX360 lab-draw banner can detect testing kits.
    pricingTier: string | null
    productType: 'supplement' | 'testing'
}

export interface AppliedPromo {
    code: string
    kind: 'percent' | 'amount'
    value: number
}

function readJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return fallback
        const parsed = JSON.parse(raw)
        return parsed === undefined || parsed === null ? fallback : (parsed as T)
    } catch {
        return fallback
    }
}

function writeJson(key: string, value: unknown): void {
    if (typeof window === 'undefined') return
    if (value === null || value === undefined) {
        window.localStorage.removeItem(key)
    } else {
        window.localStorage.setItem(key, JSON.stringify(value))
    }
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

function readCartLines(): CartLine[] {
    const raw = readJson<unknown>(CART_STORAGE_KEY, [])
    if (!Array.isArray(raw)) return []
    // Phase F6a: normalize legacy entries that pre-date pricingTier +
    // productType. Pre-F6a localStorage carts persist with those fields
    // undefined; without normalization the prescription gate and lab-draw
    // warning would never fire on hydrated legacy carts. Re-adding via
    // Add-to-Cart populates them correctly going forward.
    return raw
        .map((entry) => {
            const e = entry as Partial<CartLine>
            if (typeof e.sku !== 'string' || !e.sku) return null
            return {
                sku: e.sku,
                productId: typeof e.productId === 'string' ? e.productId : '',
                name: typeof e.name === 'string' ? e.name : '',
                format: typeof e.format === 'string' ? e.format : null,
                image: typeof e.image === 'string' ? e.image : null,
                price: typeof e.price === 'number' ? e.price : 0,
                quantity: typeof e.quantity === 'number' ? e.quantity : 1,
                pricingTier:
                    typeof e.pricingTier === 'string' ? e.pricingTier : null,
                productType: e.productType === 'testing' ? 'testing' : 'supplement',
            } as CartLine
        })
        .filter((l): l is CartLine => l !== null)
}

function readAppliedHelix(): number {
    const raw = readJson<number | string>(HELIX_STORAGE_KEY, 0)
    const n = typeof raw === 'string' ? Number(raw) : raw
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function readAppliedPromo(): AppliedPromo | null {
    const raw = readJson<AppliedPromo | null>(PROMO_STORAGE_KEY, null)
    if (!raw || typeof raw !== 'object' || !raw.code) return null
    return raw
}

export function addToCart(
    item: Omit<CartLine, 'quantity'> & { quantity?: number },
    options: { openDrawer?: boolean } = {},
): void {
    const lines = readCartLines()
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
            pricingTier: item.pricingTier ?? null,
            productType: item.productType ?? 'supplement',
        })
    }
    writeJson(CART_STORAGE_KEY, lines)
    if (options.openDrawer && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(CART_OPEN_EVENT))
    }
}

export function updateQuantity(sku: string, quantity: number): void {
    const lines = readCartLines()
    const idx = lines.findIndex((l) => l.sku === sku)
    if (idx < 0) return
    if (quantity <= 0) {
        lines.splice(idx, 1)
    } else {
        lines[idx].quantity = Math.min(99, quantity)
    }
    writeJson(CART_STORAGE_KEY, lines)
}

export function removeFromCart(sku: string): void {
    writeJson(
        CART_STORAGE_KEY,
        readCartLines().filter((l) => l.sku !== sku),
    )
}

export function clearCart(): void {
    writeJson(CART_STORAGE_KEY, [])
    writeJson(HELIX_STORAGE_KEY, null)
    writeJson(PROMO_STORAGE_KEY, null)
}

export function applyHelix(tokens: number, subtotal: number): boolean {
    const cap = Math.floor(subtotal * 0.2)
    const safe = Math.max(0, Math.min(cap, Math.floor(tokens)))
    if (safe <= 0) return false
    writeJson(HELIX_STORAGE_KEY, safe)
    return true
}

export function clearAppliedHelix(): void {
    writeJson(HELIX_STORAGE_KEY, null)
}

export type ApplyPromoResult =
    | { ok: true; promo: AppliedPromo }
    | { ok: false; error: string }

export async function applyPromo(code: string, subtotal: number): Promise<ApplyPromoResult> {
    const trimmed = code.trim()
    if (!trimmed) {
        return { ok: false, error: 'Code is empty.' }
    }
    const result = await serverValidatePromoCode(trimmed, Math.round(subtotal * 100))
    if (!result.ok || !result.kind || result.value == null) {
        return { ok: false, error: result.error ?? 'Code not recognized.' }
    }
    const promo: AppliedPromo = {
        code: result.normalizedCode ?? trimmed.toUpperCase(),
        kind: result.kind,
        value: result.value,
    }
    writeJson(PROMO_STORAGE_KEY, promo)
    return { ok: true, promo }
}

export function clearAppliedPromo(): void {
    writeJson(PROMO_STORAGE_KEY, null)
}

export function openCartDrawer(): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(CART_OPEN_EVENT))
}

function localToSync(lines: CartLine[]): SyncCartLine[] {
    return lines.map((l) => ({
        productSlug: l.sku,
        productName: l.name,
        productType: l.productType,
        deliveryForm: l.format,
        quantity: l.quantity,
        unitPriceCents: Math.round(l.price * 100),
        metadata: {
            sku: l.sku,
            productId: l.productId,
            image: l.image ?? null,
            pricingTier: l.pricingTier ?? null,
        },
    }))
}

function syncToLocal(lines: SyncCartLine[]): CartLine[] {
    return lines.map((l) => {
        const meta = (l.metadata ?? {}) as {
            sku?: string
            productId?: string
            image?: string | null
            pricingTier?: string | null
        }
        return {
            sku: meta.sku ?? l.productSlug,
            productId: meta.productId ?? '',
            name: l.productName,
            format: l.deliveryForm,
            image: meta.image ?? null,
            price: (l.unitPriceCents ?? 0) / 100,
            quantity: l.quantity,
            pricingTier: meta.pricingTier ?? null,
            productType: l.productType === 'testing' ? 'testing' : 'supplement',
        }
    })
}

export async function pushCartToServer(): Promise<void> {
    if (typeof window === 'undefined') return
    try {
        await serverReplaceCart(localToSync(readCartLines()))
    } catch {
        // best-effort; localStorage stays canonical and the next mount will retry
    }
}

export interface CartSummary {
    lines: CartLine[]
    subtotal: number
    itemCount: number
    appliedHelix: number
    helixDiscount: number
    appliedPromo: AppliedPromo | null
    promoDiscount: number
    discountTotal: number
    total: number
    helixEarnPreview: number
}

function summarize(
    lines: CartLine[],
    appliedHelix: number,
    appliedPromo: AppliedPromo | null,
): CartSummary {
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0)
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0)
    const helixCap = Math.floor(subtotal * 0.2)
    const helixCapped = Math.min(appliedHelix, helixCap)
    const helixDiscount = helixCapped * HELIX_TO_DOLLAR
    let promoDiscount = 0
    if (appliedPromo) {
        if (appliedPromo.kind === 'percent') {
            promoDiscount = (subtotal * appliedPromo.value) / 100
        } else {
            promoDiscount = Math.min(appliedPromo.value, subtotal)
        }
    }
    const discountTotal = helixDiscount + promoDiscount
    const total = Math.max(0, subtotal - discountTotal)
    // Earn preview: 1 Helix per $1 spent (post-discount). Stub formula;
    // real formula and ledger writes land in Phase F5.
    const helixEarnPreview = Math.floor(total)
    return {
        lines,
        subtotal,
        itemCount,
        appliedHelix: helixCapped,
        helixDiscount,
        appliedPromo,
        promoDiscount,
        discountTotal,
        total,
        helixEarnPreview,
    }
}

export function useCart(userId?: string | null): CartSummary & {
    addToCart: typeof addToCart
    updateQuantity: typeof updateQuantity
    removeFromCart: typeof removeFromCart
    clearCart: typeof clearCart
    applyHelix: typeof applyHelix
    clearAppliedHelix: typeof clearAppliedHelix
    applyPromo: typeof applyPromo
    clearAppliedPromo: typeof clearAppliedPromo
} {
    const [lines, setLines] = useState<CartLine[]>([])
    const [appliedHelix, setAppliedHelixState] = useState(0)
    const [appliedPromo, setAppliedPromoState] = useState<AppliedPromo | null>(null)

    useEffect(() => {
        const reread = () => {
            setLines(readCartLines())
            setAppliedHelixState(readAppliedHelix())
            setAppliedPromoState(readAppliedPromo())
        }
        reread()
        const onUpdated = () => reread()
        const onStorage = (e: StorageEvent) => {
            if (
                e.key === CART_STORAGE_KEY ||
                e.key === HELIX_STORAGE_KEY ||
                e.key === PROMO_STORAGE_KEY
            ) {
                reread()
            }
        }
        window.addEventListener(CART_UPDATED_EVENT, onUpdated)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, onUpdated)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    // Phase F2.5: server-side cart sync when authenticated. Mounts run once
    // per userId; merge favors local on conflicts (user just modified
    // locally, that intent wins) and preserves server-only items added on
    // other devices.
    useEffect(() => {
        if (!userId) return
        let cancelled = false
        const localSync = localToSync(readCartLines())
        serverInitialSync(localSync)
            .then((merged) => {
                if (cancelled) return
                writeJson(CART_STORAGE_KEY, syncToLocal(merged))
            })
            .catch(() => {
                // swallow; local stays canonical and we retry on next mount
            })
        return () => {
            cancelled = true
        }
    }, [userId])

    const summary = summarize(lines, appliedHelix, appliedPromo)
    return {
        ...summary,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyHelix,
        clearAppliedHelix,
        applyPromo,
        clearAppliedPromo,
    }
}

export const CART_OPEN_EVENT_NAME = CART_OPEN_EVENT
