/**
 * validateCheckout refuses unreleased supplements before the Rx gate.
 * Fixtures are not catalog data. Stripe must not be constructed for a blocked cart.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckoutCartLine } from '@/lib/shop/checkout-actions'

const rx = vi.hoisted(() => vi.fn())
const stripeCtor = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prescriptions/patient-actions', () => ({
    serverCheckRxEligibility: rx,
}))

vi.mock('stripe', () => ({
    default: class Stripe {
        constructor(key: string) {
            stripeCtor(key)
        }
    },
}))

vi.mock('next/headers', () => ({
    headers: async () => ({ get: () => 'http://localhost' }),
}))

interface QueryResult {
    data: Record<string, unknown>[] | null
    error: { code?: string; message?: string } | null
}

const state = {
    phases: { data: [] as Record<string, unknown>[] | null, error: null as QueryResult['error'] },
    products: { data: [] as Record<string, unknown>[] | null, error: null as QueryResult['error'] },
    skus: { data: [] as Record<string, unknown>[] | null, error: null as QueryResult['error'] },
}
const tables: string[] = []

function builder(exec: () => Promise<QueryResult>) {
    const chain = {
        select() {
            return chain
        },
        eq() {
            return chain
        },
        in() {
            return chain
        },
        not() {
            return chain
        },
        then(onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) {
            return exec().then(onFulfilled, onRejected)
        },
    }
    return chain
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
        },
        from(table: string) {
            tables.push(table)
            if (table === 'launch_phases') return builder(async () => state.phases)
            if (table === 'products') return builder(async () => state.products)
            if (table === 'master_skus') return builder(async () => state.skus)
            throw new Error(`unexpected table ${table}`)
        },
    }),
}))

import { CART_LINE_UNAVAILABLE_BADGE } from '@/lib/shop/coming-soon-copy'
import { createCheckoutSession, validateCheckout } from '@/lib/shop/checkout-actions'

function line(partial: Partial<CheckoutCartLine>): CheckoutCartLine {
    return {
        sku: 'FC-CREATINE-001',
        productSlug: 'FC-CREATINE-001',
        productName: 'Client Label',
        productType: 'supplement',
        deliveryForm: null,
        pricingTier: 'L1',
        quantity: 1,
        unitPriceCents: 4800,
        image: null,
        ...partial,
    }
}

function dbRow(partial: Record<string, unknown>): Record<string, unknown> {
    return {
        id: 'id-1',
        sku: 'FC-CREATINE-001',
        name: 'Alpha',
        category: 'supplement',
        product_type: 'supplement',
        active: true,
        pricing_tier: 'L3',
        price: 48,
        price_msrp: 48,
        launch_phase_id: null,
        ...partial,
    }
}

describe('validateCheckout release guard', () => {
    beforeEach(() => {
        tables.length = 0
        stripeCtor.mockReset()
        rx.mockReset()
        rx.mockResolvedValue({
            ok: true,
            rows: [{ sku: 'GX-KIT', hasToken: true, tokenId: 'tok-1', quantityRemaining: 4 }],
        })
        state.phases = { data: [], error: null }
        state.products = { data: [], error: null }
        state.skus = { data: [{ sku: 'GX-KIT', cogs: 10 }], error: null }
        process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
    })

    it('returns the singular string with the cart line name', async () => {
        state.products = { data: [dbRow({ name: 'Alpha' })], error: null }
        const result = await validateCheckout([line({ sku: 'FC-CREATINE-001' })], 0, null)
        expect(result.ok).toBe(false)
        expect(result.error).toBe(
            'This item is not available yet: Client Label. Remove it from your cart to continue.',
        )
        expect(result.error).not.toContain('Alpha')
    })

    it('returns the plural string joined with a comma', async () => {
        state.products = {
            data: [
                dbRow({ id: 'a', sku: 'FC-A', name: 'Alpha' }),
                dbRow({ id: 'b', sku: 'FC-B', name: 'Beta' }),
            ],
            error: null,
        }
        const result = await validateCheckout(
            [
                line({ sku: 'FC-A', productName: 'Client A' }),
                line({ sku: 'FC-B', productName: 'Client B' }),
            ],
            0,
            null,
        )
        expect(result.error).toBe(
            'These items are not available yet: Client A, Client B. Remove them from your cart to continue.',
        )
    })

    it('blocks an unknown SKU using the cart line name', async () => {
        state.products = { data: [], error: null }
        const result = await validateCheckout([line({ sku: 'UNKNOWN-SKU' })], 0, null)
        expect(result.error).toBe(
            'This item is not available yet: Client Label. Remove it from your cart to continue.',
        )
    })

    it('falls back to the raw SKU when the cart line name is blank', async () => {
        state.products = { data: [], error: null }
        const named = await validateCheckout(
            [line({ sku: ' ', productName: 'Named Item' })],
            0,
            null,
        )
        expect(named.error).toBe(
            'This item is not available yet: Named Item. Remove it from your cart to continue.',
        )

        const blankName = await validateCheckout(
            [line({ sku: 'UNKNOWN-SKU', productName: '   ' })],
            0,
            null,
        )
        expect(blankName.error).toBe(
            'This item is not available yet: UNKNOWN-SKU. Remove it from your cart to continue.',
        )
    })

    it('falls back to the SKU when the cart line name is not a string', async () => {
        state.products = { data: [], error: null }
        const result = await validateCheckout(
            [line({ sku: 'UNKNOWN-SKU', productName: 12 as unknown as string })],
            0,
            null,
        )
        expect(result.ok).toBe(false)
        expect(result.error).toBe(
            'This item is not available yet: UNKNOWN-SKU. Remove it from your cart to continue.',
        )
    })

    it('falls back to the SKU when the cart line name is longer than 120 characters', async () => {
        state.products = { data: [], error: null }
        const longName = 'N'.repeat(121)
        const atCap = await validateCheckout(
            [line({ sku: 'UNKNOWN-SKU', productName: 'N'.repeat(120) })],
            0,
            null,
        )
        expect(atCap.error).toBe(
            'This item is not available yet: ' + 'N'.repeat(120) + '. Remove it from your cart to continue.',
        )

        const overCap = await validateCheckout(
            [line({ sku: 'UNKNOWN-SKU', productName: longName })],
            0,
            null,
        )
        expect(overCap.ok).toBe(false)
        expect(overCap.error).toBe(
            'This item is not available yet: UNKNOWN-SKU. Remove it from your cart to continue.',
        )
        expect(overCap.error).not.toContain(longName)
    })

    it('does not use an overlong SKU as the blocked-item label', async () => {
        state.products = { data: [], error: null }
        const longSku = 'S'.repeat(121)
        const atCap = await validateCheckout(
            [line({ sku: 'S'.repeat(120), productName: '   ' })],
            0,
            null,
        )
        expect(atCap.error).toBe(
            'This item is not available yet: ' + 'S'.repeat(120) + '. Remove it from your cart to continue.',
        )

        const overCap = await validateCheckout(
            [line({ sku: longSku, productName: '   ' })],
            0,
            null,
        )
        expect(overCap.ok).toBe(false)
        expect(overCap.error).toBe(
            'This item is not available yet: ' +
                CART_LINE_UNAVAILABLE_BADGE +
                '. Remove it from your cart to continue.',
        )
        expect(overCap.error).not.toContain(longSku)
    })

    it('uses the cart badge when the name and the SKU are both blank', async () => {
        state.products = { data: [], error: null }
        const result = await validateCheckout(
            [line({ sku: '   ', productName: '   ' })],
            0,
            null,
        )
        expect(result.ok).toBe(false)
        expect(result.error).toBe(
            'This item is not available yet: ' +
                CART_LINE_UNAVAILABLE_BADGE +
                '. Remove it from your cart to continue.',
        )
    })

    it('returns the existing cart error when the lookup fails', async () => {
        state.products = { data: null, error: { code: '08000', message: 'down' } }
        const result = await validateCheckout([line({})], 0, null)
        expect(result).toMatchObject({
            ok: false,
            error: 'Could not validate the cart. Please try again.',
        })
    })

    it('lets a GeneX360 kit through when the client type lies and the phase read fails', async () => {
        state.phases = { data: null, error: { code: '42501', message: 'rls' } }
        state.products = {
            data: [
                dbRow({
                    id: 'kit',
                    sku: 'GX-KIT',
                    name: 'Panel Kit',
                    category: 'test_kit',
                    product_type: 'test_kit',
                    pricing_tier: 'L3',
                }),
            ],
            error: null,
        }
        const result = await validateCheckout(
            [
                line({
                    sku: 'GX-KIT',
                    productType: 'supplement',
                    pricingTier: 'L3',
                    unitPriceCents: 28888,
                }),
            ],
            0,
            null,
        )
        expect(rx).toHaveBeenCalled()
        expect(tables).toContain('master_skus')
        expect(result.ok).toBe(true)
    })

    it('still blocks a supplement sent as a testing product', async () => {
        state.products = { data: [dbRow({ name: 'Alpha' })], error: null }
        const result = await validateCheckout(
            [line({ productType: 'testing', pricingTier: 'L3' })],
            0,
            null,
        )
        expect(result.ok).toBe(false)
        expect(result.error).toContain('Client Label')
        expect(rx).not.toHaveBeenCalled()
    })

    it('does not call the Rx gate when an unreleased line is blocked', async () => {
        state.products = { data: [dbRow({ name: 'Alpha', pricing_tier: 'L3' })], error: null }
        await validateCheckout([line({ pricingTier: 'L3' })], 0, null)
        expect(rx).not.toHaveBeenCalled()
    })

    it('does not construct Stripe for an unreleased SKU', async () => {
        state.products = { data: [dbRow({ name: 'Alpha' })], error: null }
        const result = await createCheckoutSession({
            cart: [line({})],
            form: { email: 'a@example.com', phone: '', firstName: 'A', lastName: 'B' },
            appliedHelix: 0,
            appliedPromo: null,
        })
        expect(result.ok).toBe(false)
        expect(stripeCtor).not.toHaveBeenCalled()
    })
})
