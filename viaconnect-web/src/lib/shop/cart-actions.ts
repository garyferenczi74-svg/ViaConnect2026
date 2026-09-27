/**
 * Server actions for the Via Cura shop cart per Prompt #141 v3 §5.4 + F2.5
 * persistence sub-phase. The client-side cart in lib/shop/cart-store stays
 * canonical for instant UX; these actions mirror to public.shop_cart_items
 * so the cart survives device + browser changes for authenticated users.
 *
 * Sync model:
 *   - Anonymous: localStorage only, no server interaction.
 *   - Authenticated: on mount, serverInitialSync merges local + server
 *     (local wins on conflicts, server-only items preserved). On cart
 *     drawer close, serverReplaceCart pushes the local state up.
 *
 * Atomicity: serverReplaceCart does a delete-then-insert. Not transactional
 * via Supabase JS. On partial failure the user re-syncs on next mount and
 * the system is eventually consistent. Acceptable for F2.5; a strict
 * transactional path lands in F5 alongside Stripe.
 *
 * Peptide exclusion: cart items are user-driven and pass through the new
 * shop surfaces only. Add-to-Cart sites are already peptide-excluded at
 * the query layer (lib/shop/queries.ts). The legacy /shop/peptides
 * destination has its own untouched checkout flow per spec §1B.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { getReleaseLookupBySkus, type ReleaseLookupResult } from '@/lib/shop/release'

export interface SyncCartLine {
    productSlug: string
    productName: string
    productType: string
    deliveryForm: string | null
    quantity: number
    unitPriceCents: number | null
    metadata: Record<string, unknown>
}

interface RawCartRow {
    product_slug: string
    product_name: string
    product_type: string | null
    delivery_form: string | null
    quantity: number | null
    unit_price_cents: number | null
    metadata: Record<string, unknown> | null
}

function rowToSyncLine(row: RawCartRow): SyncCartLine {
    return {
        productSlug: row.product_slug,
        productName: row.product_name,
        productType: row.product_type ?? 'supplement',
        deliveryForm: row.delivery_form ?? null,
        quantity: row.quantity ?? 1,
        unitPriceCents: row.unit_price_cents ?? null,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
    }
}

export async function serverGetCart(): Promise<SyncCartLine[]> {
    try {
        const supabase = await createClient()
        const userResult = await withTimeout(
            supabase.auth.getUser(),
            2000,
            'cart-actions.getCart.getUser',
        )
        if (userResult.error || !userResult.data.user) return []
        const userId = userResult.data.user.id

        const sb = supabase as unknown as {
            from: (t: string) => any
        }
        const { data, error } = await withTimeout(
            sb
                .from('shop_cart_items')
                .select(
                    'product_slug, product_name, product_type, delivery_form, quantity, unit_price_cents, metadata',
                )
                .eq('user_id', userId)
                .order('created_at', { ascending: true }) as Promise<{
                data: RawCartRow[] | null
                error: unknown
            }>,
            3000,
            'cart-actions.getCart.select',
        )
        if (error) {
            safeLog.warn('shop.cart-actions', 'serverGetCart supabase error', { error })
            return []
        }
        return (data ?? []).map(rowToSyncLine)
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.cart-actions', 'serverGetCart timed out', { error })
        } else {
            safeLog.warn('shop.cart-actions', 'serverGetCart failed', { error })
        }
        return []
    }
}

interface CartInsertRow {
    user_id: string
    product_slug: string
    product_name: string
    product_type: string
    delivery_form: string | null
    quantity: number
    unit_price_cents: number | null
    metadata: Record<string, unknown>
}

interface CartWriteQuery {
    delete: () => {
        eq: (column: string, value: string) => Promise<{ error: unknown }>
    }
    insert: (rows: CartInsertRow[]) => Promise<{ error: unknown }>
}

interface CartWriter {
    from: (table: string) => CartWriteQuery
}

function purchasableLines(lines: SyncCartLine[], lookup: ReleaseLookupResult): SyncCartLine[] | null {
    if (lookup.status === 'error') return null
    return lines.filter((line) => {
        const key = line.productSlug.trim()
        const state = lookup.bySku.get(key)
        return !!state && (state.exempt || state.released)
    })
}

const UNAVAILABLE_SKU_CAP = 100

export async function serverUnavailableCartSkus(skus: string[]): Promise<string[]> {
    try {
        const uniqueKeys: string[] = []
        const seen = new Set<string>()
        for (const sku of skus) {
            const key = typeof sku === 'string' ? sku.trim() : ''
            if (!key || seen.has(key)) continue
            seen.add(key)
            uniqueKeys.push(key)
        }
        if (uniqueKeys.length > UNAVAILABLE_SKU_CAP) {
            const blocked = [...uniqueKeys]
            for (const sku of skus) {
                const key = typeof sku === 'string' ? sku.trim() : ''
                if (!key) blocked.push(sku)
            }
            return blocked
        }
        const lookup = await getReleaseLookupBySkus(uniqueKeys)
        if (lookup.status === 'error') return []
        const unavailable: string[] = []
        const reported = new Set<string>()
        for (const sku of skus) {
            const key = typeof sku === 'string' ? sku.trim() : ''
            if (!key) {
                unavailable.push(sku)
                continue
            }
            if (reported.has(key)) continue
            reported.add(key)
            const state = lookup.bySku.get(key)
            if (!state || (!state.exempt && !state.released)) unavailable.push(sku)
        }
        return unavailable
    } catch (error) {
        safeLog.warn('shop.cart-actions', 'serverUnavailableCartSkus failed', {
            reason: 'error',
            error,
        })
        return []
    }
}

export async function serverReplaceCart(lines: SyncCartLine[]): Promise<SyncCartLine[]> {
    try {
        const supabase = await createClient()
        const userResult = await withTimeout(
            supabase.auth.getUser(),
            2000,
            'cart-actions.replaceCart.getUser',
        )
        if (userResult.error || !userResult.data.user) return []
        const userId = userResult.data.user.id

        let lookup: ReleaseLookupResult
        try {
            lookup = await getReleaseLookupBySkus(lines.map((line) => line.productSlug))
        } catch (error) {
            safeLog.warn('shop.cart-actions', 'serverReplaceCart skipped write', {
                reason: 'release_lookup_error',
                error,
            })
            return lines
        }
        const kept = purchasableLines(lines, lookup)
        if (kept === null) {
            safeLog.warn('shop.cart-actions', 'serverReplaceCart skipped write', { reason: 'release_lookup_error' })
            return lines
        }

        const sb = supabase as unknown as CartWriter

        await withTimeout(
            sb.from('shop_cart_items').delete().eq('user_id', userId),
            3000,
            'cart-actions.replaceCart.delete',
        )

        if (kept.length > 0) {
            const rows = kept.map((line) => ({
                user_id: userId,
                product_slug: line.productSlug,
                product_name: line.productName,
                product_type: line.productType || 'supplement',
                delivery_form: line.deliveryForm,
                quantity: Math.max(1, Math.min(99, Math.floor(line.quantity))),
                unit_price_cents: line.unitPriceCents,
                metadata: line.metadata ?? {},
            }))
            const { error } = await withTimeout(
                sb.from('shop_cart_items').insert(rows),
                3000,
                'cart-actions.replaceCart.insert',
            )
            if (error) {
                safeLog.warn('shop.cart-actions', 'serverReplaceCart insert error', { error })
            }
        }

        return await serverGetCart()
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.cart-actions', 'serverReplaceCart timed out', { error })
        } else {
            safeLog.warn('shop.cart-actions', 'serverReplaceCart failed', { error })
        }
        return []
    }
}

export async function serverInitialSync(localLines: SyncCartLine[]): Promise<SyncCartLine[]> {
    try {
        const serverLines = await serverGetCart()
        if (serverLines.length === 0 && localLines.length === 0) return []

        const keyOf = (l: SyncCartLine) => `${l.productSlug}|${l.deliveryForm ?? ''}`
        const localMap = new Map(localLines.map((l) => [keyOf(l), l]))
        const merged: SyncCartLine[] = [...localLines]
        for (const sl of serverLines) {
            if (!localMap.has(keyOf(sl))) merged.push(sl)
        }

        return await serverReplaceCart(merged)
    } catch (error) {
        safeLog.warn('shop.cart-actions', 'serverInitialSync failed', { error })
        return localLines
    }
}

export async function serverClearCart(): Promise<void> {
    try {
        const supabase = await createClient()
        const userResult = await withTimeout(
            supabase.auth.getUser(),
            2000,
            'cart-actions.clearCart.getUser',
        )
        if (userResult.error || !userResult.data.user) return
        const userId = userResult.data.user.id

        const sb = supabase as unknown as {
            from: (t: string) => any
        }
        await withTimeout(
            sb.from('shop_cart_items').delete().eq('user_id', userId),
            3000,
            'cart-actions.clearCart.delete',
        )
    } catch (error) {
        safeLog.warn('shop.cart-actions', 'serverClearCart failed', { error })
    }
}
