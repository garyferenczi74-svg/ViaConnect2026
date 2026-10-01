import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = {
    product: {
        id: 'p1',
        active: true,
        category: 'supplement',
        product_type: 'supplement',
    } as Record<string, unknown> | null,
    votedAt: null as string | null,
    rpcAt: '2026-10-01T12:00:00.000Z',
    rpcError: null as { code?: string } | null,
    rpcCalls: 0,
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        from(table: string) {
            const chain = {
                select() {
                    return chain
                },
                eq() {
                    return chain
                },
                not() {
                    return chain
                },
                maybeSingle: async () => {
                    if (table === 'products') return { data: state.product, error: null }
                    return { data: state.votedAt ? { voted_at: state.votedAt } : null, error: null }
                },
            }
            return chain
        },
        rpc: async () => {
            state.rpcCalls += 1
            return { data: state.rpcAt, error: state.rpcError }
        },
    }),
}))

vi.mock('@/lib/shop/release', () => ({
    getReleasedShopPhaseIds: async () => new Set<string>(),
}))

import { castLaunchVote } from '@/lib/shop/launch-vote/cast'

describe('castLaunchVote', () => {
    beforeEach(() => {
        state.product = { id: 'p1', active: true, category: 'supplement', product_type: 'supplement' }
        state.votedAt = null
        state.rpcAt = '2026-10-01T12:00:00.000Z'
        state.rpcError = null
        state.rpcCalls = 0
    })

    it('returns the first voted time on a second call', async () => {
        const first = await castLaunchVote('user-1', 'p1', 'pdp')
        expect(first).toEqual({ status: 'voted', votedAt: state.rpcAt })
        state.votedAt = state.rpcAt
        const second = await castLaunchVote('user-1', 'p1', 'pdp')
        expect(second).toEqual({ status: 'already_voted', votedAt: state.rpcAt })
    })

    it('refuses a released kit before the rpc', async () => {
        state.product = { id: 'kit', active: true, category: 'test_kit', product_type: 'test_kit' }
        const result = await castLaunchVote('user-1', 'kit', 'plp')
        expect(result).toEqual({ status: 'released' })
        expect(state.rpcCalls).toBe(0)
    })

    it('maps a missing vote table to schema_missing', async () => {
        state.rpcError = { code: '42P01' }
        const result = await castLaunchVote('user-1', 'p1', 'pdp')
        expect(result).toEqual({ status: 'error', reason: 'schema_missing' })
    })
})
