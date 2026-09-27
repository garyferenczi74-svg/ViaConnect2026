/**
 * Release lookup failure modes. Rows are not catalog data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
    createClient: mocks.createClient,
}))

import { getReleasedShopPhaseIds, getReleaseLookupBySkus } from '@/lib/shop/release'
import { safeLog } from '@/lib/utils/safe-log'

interface QueryResult {
    data: Record<string, unknown>[] | null
    error: { code?: string; message?: string } | null
}

const selects: string[] = []
let productQueries = 0
let phaseExec: () => Promise<QueryResult> = async () => ({ data: [], error: null })
let productExec: () => Promise<QueryResult> = async () => ({ data: [], error: null })

function builder(exec: () => Promise<QueryResult>) {
    const chain = {
        select(columns: string) {
            selects.push(columns)
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
        then(
            onFulfilled: (value: QueryResult) => unknown,
            onRejected?: (reason: unknown) => unknown,
        ) {
            return exec().then(onFulfilled, onRejected)
        },
    }
    return chain
}

function installClient() {
    mocks.createClient.mockImplementation(async () => ({
        from(table: string) {
            if (table === 'launch_phases') return builder(phaseExec)
            if (table === 'products') {
                productQueries += 1
                return builder(productExec)
            }
            throw new Error(`unexpected table ${table}`)
        },
    }))
}

function row(partial: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: '11111111-1111-4111-8111-111111111111',
        sku: 'FC-NAD-001',
        name: 'Alpha Supplement',
        category: 'supplement',
        product_type: 'supplement',
        active: true,
        pricing_tier: 'L1',
        price: 10,
        price_msrp: 12,
        launch_phase_id: 'shop_release_phase_1',
        ...partial,
    }
}

describe('getReleasedShopPhaseIds', () => {
    beforeEach(() => {
        selects.length = 0
        mocks.createClient.mockReset()
        installClient()
        vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined)
        vi.spyOn(safeLog, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it.each(['42703', 'PGRST200', '42501'])('returns null on supabase error %s', async (code) => {
        phaseExec = async () => ({ data: null, error: { code, message: code } })
        await expect(getReleasedShopPhaseIds()).resolves.toBeNull()
        expect(safeLog.warn).toHaveBeenCalledWith(
            'shop.release',
            'getReleasedShopPhaseIds failed',
            expect.objectContaining({ reason: code }),
        )
    })

    it('returns null on a thrown network error', async () => {
        mocks.createClient.mockRejectedValue(new Error('ECONNRESET'))
        await expect(getReleasedShopPhaseIds()).resolves.toBeNull()
        expect(safeLog.warn).toHaveBeenCalledWith(
            'shop.release',
            'getReleasedShopPhaseIds failed',
            expect.objectContaining({ reason: 'network' }),
        )
    })

    it('returns null when the phase read exceeds 1.5 seconds', async () => {
        vi.useFakeTimers()
        phaseExec = () => new Promise<QueryResult>(() => undefined)
        let result: Awaited<ReturnType<typeof getReleasedShopPhaseIds>> | undefined
        const pending = getReleasedShopPhaseIds().then((value) => {
            result = value
        })
        await vi.advanceTimersByTimeAsync(0)
        expect(result).toBeUndefined()
        await vi.advanceTimersByTimeAsync(1499)
        expect(result).toBeUndefined()
        await vi.advanceTimersByTimeAsync(1)
        await pending
        expect(result).toBeNull()
        expect(safeLog.warn).toHaveBeenCalledWith(
            'shop.release',
            'getReleasedShopPhaseIds failed',
            expect.objectContaining({ reason: 'timeout' }),
        )
    })

    it('returns the ids of active and completed phases', async () => {
        phaseExec = async () => ({
            data: [
                { id: 'shop_release_phase_1', activation_status: 'active' },
                { id: 'other', activation_status: 'planned' },
            ],
            error: null,
        })
        const ids = await getReleasedShopPhaseIds()
        expect(ids).toEqual(new Set(['shop_release_phase_1']))
        expect(selects).toContain('id, activation_status')
    })
})

describe('getReleaseLookupBySkus', () => {
    beforeEach(() => {
        selects.length = 0
        productQueries = 0
        mocks.createClient.mockReset()
        installClient()
        phaseExec = async () => ({
            data: [{ id: 'shop_release_phase_1', activation_status: 'active' }],
            error: null,
        })
        productExec = async () => ({ data: [], error: null })
        vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined)
        vi.spyOn(safeLog, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('trims a SKU and matches it exactly', async () => {
        productExec = async () => ({ data: [row()], error: null })
        const result = await getReleaseLookupBySkus([' FC-NAD-001 '])
        expect(result.status).toBe('ok')
        if (result.status !== 'ok') return
        expect(result.bySku.get('FC-NAD-001')?.released).toBe(true)
        expect(result.bySku.get('FC-NAD-001')?.unitPriceCents).toBe(1200)
        expect(selects).toContain('*')
    })

    it('does not match a case-different SKU', async () => {
        productExec = async () => ({ data: [row()], error: null })
        const result = await getReleaseLookupBySkus(['fc-nad-001'])
        expect(result.status).toBe('ok')
        if (result.status !== 'ok') return
        expect(result.bySku.has('fc-nad-001')).toBe(false)
        expect(result.bySku.get('fc-nad-001')?.released ?? false).toBe(false)
    })

    it('treats zero rows as unknown and unreleased', async () => {
        productExec = async () => ({ data: [], error: null })
        const result = await getReleaseLookupBySkus(['FC-MISSING'])
        expect(result.status).toBe('ok')
        if (result.status !== 'ok') return
        expect(result.bySku.has('FC-MISSING')).toBe(false)
    })

    it('treats two rows for one SKU as unreleased', async () => {
        productExec = async () => ({
            data: [row({ id: 'a' }), row({ id: 'b' })],
            error: null,
        })
        const result = await getReleaseLookupBySkus(['FC-NAD-001'])
        expect(result.status).toBe('ok')
        if (result.status !== 'ok') return
        expect(result.bySku.get('FC-NAD-001')?.released ?? false).toBe(false)
        expect(result.bySku.has('FC-NAD-001')).toBe(false)
    })

    it('excludes an inactive row', async () => {
        productExec = async () => ({ data: [row({ active: false })], error: null })
        const result = await getReleaseLookupBySkus(['FC-NAD-001'])
        expect(result.status).toBe('ok')
        if (result.status !== 'ok') return
        expect(result.bySku.has('FC-NAD-001')).toBe(false)
    })

    it('excludes a peptide row', async () => {
        productExec = async () => ({
            data: [row({ category: 'peptide', product_type: 'peptide' })],
            error: null,
        })
        const result = await getReleaseLookupBySkus(['FC-NAD-001'])
        expect(result.status).toBe('ok')
        if (result.status !== 'ok') return
        expect(result.bySku.has('FC-NAD-001')).toBe(false)
    })

    it('returns error when the products read fails', async () => {
        productExec = async () => ({ data: null, error: { code: '57014', message: 'timeout' } })
        const result = await getReleaseLookupBySkus(['FC-NAD-001'])
        expect(result).toEqual({ status: 'error' })
    })

    it('returns an empty map for blank SKUs without reading products', async () => {
        let productReads = 0
        const previous = productExec
        productExec = async () => {
            productReads += 1
            return previous()
        }
        const result = await getReleaseLookupBySkus([' ', ''])
        expect(result).toEqual({ status: 'ok', bySku: new Map() })
        expect(productReads).toBe(0)
    })

    it('returns error when the products payload is not an array or the read throws', async () => {
        productExec = async () => ({ data: { sku: 'FC-NAD-001' } as unknown as Record<string, unknown>[], error: null })
        const badShape = await getReleaseLookupBySkus(['FC-NAD-001'])
        expect(badShape).toEqual({ status: 'error' })

        productExec = async () => {
            throw new Error('network')
        }
        const thrown = await getReleaseLookupBySkus(['FC-NAD-001'])
        expect(thrown).toEqual({ status: 'error' })
    })

    it('skips a row with a blank name and reads a string price', async () => {
        productExec = async () => ({
            data: [
                row({ name: '', sku: 'FC-BLANK' }),
                row({ sku: 'FC-NAD-001', price_msrp: '12.40', price: 1 }),
            ],
            error: null,
        })
        const result = await getReleaseLookupBySkus(['FC-BLANK', 'FC-NAD-001'])
        expect(result.status).toBe('ok')
        if (result.status !== 'ok') return
        expect(result.bySku.has('FC-BLANK')).toBe(false)
        expect(result.bySku.get('FC-NAD-001')?.unitPriceCents).toBe(1240)
    })

    it('keeps kits released and supplements unreleased when the phase read fails', async () => {
        phaseExec = async () => ({ data: null, error: { code: '42501', message: 'rls' } })
        productExec = async () => ({
            data: [
                row({
                    id: 'kit-1',
                    sku: 'GX-KIT',
                    name: 'Panel Kit',
                    category: 'test_kit',
                    product_type: 'test_kit',
                    launch_phase_id: null,
                }),
                row({
                    id: 'sup-1',
                    sku: 'FC-CREATINE-001',
                    name: 'Creatine Fixture',
                    launch_phase_id: 'shop_release_phase_1',
                }),
            ],
            error: null,
        })
        const result = await getReleaseLookupBySkus(['GX-KIT', 'FC-CREATINE-001'])
        expect(result.status).toBe('ok')
        if (result.status !== 'ok') return
        expect(result.bySku.get('GX-KIT')).toMatchObject({ exempt: true, released: true })
        expect(result.bySku.get('FC-CREATINE-001')).toMatchObject({ exempt: false, released: false })
    })

    it('starts every SKU chunk together and fails closed on the shared 1.5s timeout', async () => {
        vi.useFakeTimers()
        productExec = () => new Promise<QueryResult>(() => undefined)
        const skus = Array.from({ length: 101 }, (_, index) => `SKU-${index}`)
        let result: Awaited<ReturnType<typeof getReleaseLookupBySkus>> | undefined
        const pending = getReleaseLookupBySkus(skus).then((value) => {
            result = value
        })
        await vi.advanceTimersByTimeAsync(0)
        expect(productQueries).toBe(2)
        expect(result).toBeUndefined()
        await vi.advanceTimersByTimeAsync(1499)
        expect(result).toBeUndefined()
        await vi.advanceTimersByTimeAsync(1)
        await pending
        expect(result).toEqual({ status: 'error' })
    })
})
