import { beforeEach, describe, expect, it, vi } from 'vitest'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'

const state = {
    enabled: false,
    userId: USER_ID as string | null,
    result: { status: 'voted', votedAt: '2026-10-01T12:00:00.000Z' } as
        | { status: 'voted'; votedAt: string }
        | { status: 'already_voted'; votedAt: string }
        | { status: 'released' }
        | { status: 'error'; reason: 'schema_missing' },
}

vi.mock('@/lib/shop/launch-vote/flags', () => ({
    launchVoteEnabled: () => state.enabled,
}))

vi.mock('@/lib/shop/launch-vote/cast', () => ({
    castLaunchVote: async () => state.result,
}))

vi.mock('@/lib/shop/launch-vote/email/confirm', () => ({
    sendVoteConfirmation: async () => ({ status: 'skipped', reason: 'flag_off' }),
}))

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            getUser: async () =>
                state.userId
                    ? { data: { user: { id: state.userId } }, error: null }
                    : { data: { user: null }, error: { message: 'signed out' } },
        },
    }),
}))

import { POST } from '@/app/api/shop/launch-vote/route'

function post(body: unknown) {
    return POST(
        new Request('http://localhost/api/shop/launch-vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }),
    )
}

describe('POST /api/shop/launch-vote', () => {
    beforeEach(() => {
        state.enabled = true
        state.userId = USER_ID
        state.result = { status: 'voted', votedAt: '2026-10-01T12:00:00.000Z' }
    })

    it('returns 404 when the vote flag is off before auth', async () => {
        state.enabled = false
        state.userId = null
        const response = await post({ productId: PRODUCT_ID, source: 'pdp' })
        expect(response.status).toBe(404)
        const body = (await response.json()) as { errorCode?: string }
        expect(body.errorCode).toBe('VOTE_DISABLED')
    })

    it('returns 401 when signed out', async () => {
        state.userId = null
        const response = await post({ productId: PRODUCT_ID, source: 'pdp' })
        expect(response.status).toBe(401)
    })

    it('returns 400 for a bad product id', async () => {
        const response = await post({ productId: 'nope', source: 'pdp' })
        expect(response.status).toBe(400)
    })

    it('returns 409 when the product is already released', async () => {
        state.result = { status: 'released' }
        const response = await post({ productId: PRODUCT_ID, source: 'plp', productName: 'Fixture' })
        expect(response.status).toBe(409)
    })

    it('returns 500 when the vote table is missing and does not throw', async () => {
        state.result = { status: 'error', reason: 'schema_missing' }
        const response = await post({ productId: PRODUCT_ID, source: 'pdp', productName: 'Fixture' })
        expect(response.status).toBe(500)
    })

    it('returns the same voted time for an already recorded vote', async () => {
        state.result = { status: 'already_voted', votedAt: '2026-10-01T12:00:00.000Z' }
        const response = await post({ productId: PRODUCT_ID, source: 'pdp', productName: 'Fixture' })
        expect(response.status).toBe(200)
        const body = (await response.json()) as { data: { votedAt: string; status: string } }
        expect(body.data.status).toBe('already_voted')
        expect(body.data.votedAt).toBe('2026-10-01T12:00:00.000Z')
    })
})
