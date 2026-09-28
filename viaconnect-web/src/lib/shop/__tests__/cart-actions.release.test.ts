/**
 * Cart mirror drops unreleased lines. A lookup error skips the write.
 * Fixtures are not catalog data.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SyncCartLine } from '@/lib/shop/cart-actions'
import type { ReleaseLookupResult, ReleaseSkuState } from '@/lib/shop/release'

const lookup = vi.hoisted(() => vi.fn())
const calls = vi.hoisted(() => ({
    deletes: 0,
    inserts: [] as unknown[],
}))

vi.mock('@/lib/shop/release', () => ({
    getReleaseLookupBySkus: lookup,
}))

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
        },
        from() {
            return {
                delete() {
                    calls.deletes += 1
                    return { eq: async () => ({ error: null }) }
                },
                insert: async (rows: unknown) => {
                    calls.inserts.push(rows)
                    return { error: null }
                },
                select() {
                    return {
                        eq() {
                            return { order: async () => ({ data: [], error: null }) }
                        },
                    }
                },
            }
        },
    }),
}))

import { serverReplaceCart, serverUnavailableCartSkus } from '@/lib/shop/cart-actions'
import { safeLog } from '@/lib/utils/safe-log'

function state(partial: Partial<ReleaseSkuState> & { sku: string }): [string, ReleaseSkuState] {
    return [
        partial.sku,
        {
            productId: partial.productId ?? partial.sku,
            name: partial.name ?? partial.sku,
            exempt: partial.exempt ?? false,
            released: partial.released ?? false,
            pricingTier: 'L1',
            unitPriceCents: 1000,
        },
    ]
}

function line(sku: string): SyncCartLine {
    return {
        productSlug: sku,
        productName: `Name ${sku}`,
        productType: 'supplement',
        deliveryForm: null,
        quantity: 1,
        unitPriceCents: 1000,
        metadata: {},
    }
}

describe('cart release filter', () => {
    beforeEach(() => {
        calls.deletes = 0
        calls.inserts = []
        lookup.mockReset()
        vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined)
    })

    it('inserts only released and exempt lines', async () => {
        const bySku = new Map<string, ReleaseSkuState>([
            state({ sku: 'REL', released: true, name: 'Released' }),
            state({ sku: 'KIT', exempt: true, released: true, name: 'Kit' }),
            state({ sku: 'SOON', released: false, name: 'Soon' }),
        ])
        lookup.mockResolvedValue({ status: 'ok', bySku } satisfies ReleaseLookupResult)
        await serverReplaceCart([line('REL'), line('SOON'), line('KIT')])
        expect(calls.deletes).toBe(1)
        expect(calls.inserts).toHaveLength(1)
        const rows = calls.inserts[0] as { product_slug: string }[]
        expect(rows.map((row) => row.product_slug)).toEqual(['REL', 'KIT'])
    })

    it('skips delete and insert and returns the input when the lookup errors', async () => {
        lookup.mockResolvedValue({ status: 'error' } satisfies ReleaseLookupResult)
        const input = [line('SOON'), line('REL')]
        const returned = await serverReplaceCart(input)
        expect(calls.deletes).toBe(0)
        expect(calls.inserts).toEqual([])
        expect(returned).toEqual(input)
    })

    it('returns unreleased SKUs and an empty list on error', async () => {
        const bySku = new Map<string, ReleaseSkuState>([
            state({ sku: 'REL', released: true }),
            state({ sku: 'KIT', exempt: true, released: true }),
            state({ sku: 'SOON', released: false }),
        ])
        lookup.mockResolvedValue({ status: 'ok', bySku } satisfies ReleaseLookupResult)
        await expect(serverUnavailableCartSkus(['REL', 'SOON', 'KIT', 'UNKNOWN'])).resolves.toEqual([
            'SOON',
            'UNKNOWN',
        ])

        lookup.mockResolvedValue({ status: 'error' } satisfies ReleaseLookupResult)
        await expect(serverUnavailableCartSkus(['SOON'])).resolves.toEqual([])

        lookup.mockRejectedValue(new Error('network'))
        await expect(serverUnavailableCartSkus(['SOON'])).resolves.toEqual([])
    })

    it('dedupes SKUs and fails closed past 100 without a lookup', async () => {
        lookup.mockResolvedValue({ status: 'ok', bySku: new Map() } satisfies ReleaseLookupResult)
        await expect(serverUnavailableCartSkus(['SOON', ' SOON ', 'SOON'])).resolves.toEqual(['SOON'])
        expect(lookup).toHaveBeenCalledWith(['SOON'])

        lookup.mockClear()
        const many = Array.from({ length: 101 }, (_, index) => `SKU-${index}`)
        await expect(serverUnavailableCartSkus(many)).resolves.toEqual(many)
        expect(lookup).not.toHaveBeenCalled()
    })

    it('returns the original SKUs, not the trimmed ones, when the input is over the cap', async () => {
        lookup.mockClear()
        const originals = Array.from({ length: 101 }, (_, index) => ` SKU-${index} `)
        originals.push(' SKU-0 ')
        await expect(serverUnavailableCartSkus(originals)).resolves.toEqual(originals)
        expect(lookup).not.toHaveBeenCalled()
    })
})
