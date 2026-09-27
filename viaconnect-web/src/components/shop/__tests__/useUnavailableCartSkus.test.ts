/**
 * Cart badge lookup. A thrown server action yields an empty set.
 * Checkout still refuses the lines.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    serverUnavailableCartSkus: vi.fn(),
}))

vi.mock('@/lib/shop/cart-actions', () => ({
    serverUnavailableCartSkus: mocks.serverUnavailableCartSkus,
}))

import { fetchUnavailableSkuSet, unavailableCartEffect } from '@/components/shop/useUnavailableCartSkus'

describe('fetchUnavailableSkuSet', () => {
    beforeEach(() => {
        mocks.serverUnavailableCartSkus.mockReset()
    })

    it('returns the server SKUs', async () => {
        mocks.serverUnavailableCartSkus.mockResolvedValue(['SOON'])
        const set = await fetchUnavailableSkuSet(['SOON', 'REL'])
        expect([...set]).toEqual(['SOON'])
        expect(mocks.serverUnavailableCartSkus).toHaveBeenCalledWith(['SOON', 'REL'])
    })

    it('returns an empty set when the server action throws', async () => {
        mocks.serverUnavailableCartSkus.mockRejectedValue(new Error('network'))
        const set = await fetchUnavailableSkuSet(['SOON'])
        expect(set.size).toBe(0)
    })
})

describe('unavailableCartEffect', () => {
    beforeEach(() => {
        mocks.serverUnavailableCartSkus.mockReset()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('clears the set when the drawer is closed or the cart is empty', () => {
        const setUnavailable = vi.fn()
        unavailableCartEffect(['SOON'], false, setUnavailable)
        unavailableCartEffect([], true, setUnavailable)
        expect(setUnavailable).toHaveBeenCalledTimes(2)
        expect(mocks.serverUnavailableCartSkus).not.toHaveBeenCalled()
    })

    it('debounces the lookup and ignores a result after cleanup', async () => {
        mocks.serverUnavailableCartSkus.mockResolvedValue(['SOON'])
        const setUnavailable = vi.fn()
        const cancel = unavailableCartEffect(['SOON'], true, setUnavailable)
        expect(mocks.serverUnavailableCartSkus).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(300)
        await vi.waitFor(() => expect(setUnavailable).toHaveBeenCalled())
        const applied = setUnavailable.mock.calls.at(-1)?.[0] as ReadonlySet<string>
        expect([...applied]).toEqual(['SOON'])

        setUnavailable.mockClear()
        const late = unavailableCartEffect(['SOON'], true, setUnavailable)
        late()
        await vi.advanceTimersByTimeAsync(300)
        expect(setUnavailable).not.toHaveBeenCalled()
        cancel()
    })
})
