import { describe, expect, it } from 'vitest'
import { EARLY_VOTER_EXPIRE_DAYS, EARLY_VOTER_PERCENT, planReleaseCodes } from '@/lib/shop/launch-vote/release'

const RELEASED = '2026-10-01T15:00:00.000Z'

describe('planReleaseCodes', () => {
    it('plans nothing before a release and skips rows that are not votes', () => {
        expect(
            planReleaseCodes({
                votes: [{ userId: 'u1', productId: 'p1', votedAt: '2026-09-01T00:00:00.000Z' }],
                releasedAt: null,
                existingCodeUserIds: new Set(),
                priorPaidOrderUserIds: new Set(),
            }),
        ).toEqual([])
        expect(
            planReleaseCodes({
                votes: [{ userId: 'u1', productId: 'p1', votedAt: null }],
                releasedAt: RELEASED,
                existingCodeUserIds: new Set(),
                priorPaidOrderUserIds: new Set(),
            }),
        ).toEqual([])
    })

    it('creates one 25 percent code per voter, expires exactly 7 days later, and does not duplicate', () => {
        const first = planReleaseCodes({
            votes: [
                { userId: 'new', productId: 'p1', votedAt: '2026-09-01T00:00:00.000Z' },
                { userId: 'paid', productId: 'p1', votedAt: '2026-09-02T00:00:00.000Z' },
                { userId: 'new', productId: 'p1', votedAt: '2026-09-03T00:00:00.000Z' },
            ],
            releasedAt: RELEASED,
            existingCodeUserIds: new Set(),
            priorPaidOrderUserIds: new Set(['paid']),
        })
        expect(first).toHaveLength(2)
        expect(first.every((row) => row.percentOff === EARLY_VOTER_PERCENT)).toBe(true)
        expect(first.every((row) => row.percentOff === 25)).toBe(true)
        const expectedExpiry = new Date(Date.parse(RELEASED) + EARLY_VOTER_EXPIRE_DAYS * 86400000).toISOString()
        expect(first[0].expiresAt).toBe(expectedExpiry)
        expect(first.find((row) => row.userId === 'new')?.orderScope).toBe('first_order')
        expect(first.find((row) => row.userId === 'paid')?.orderScope).toBe('next_order')
        const second = planReleaseCodes({
            votes: [
                { userId: 'new', productId: 'p1', votedAt: '2026-09-01T00:00:00.000Z' },
                { userId: 'paid', productId: 'p1', votedAt: '2026-09-02T00:00:00.000Z' },
            ],
            releasedAt: RELEASED,
            existingCodeUserIds: new Set(first.map((row) => row.userId)),
            priorPaidOrderUserIds: new Set(['paid']),
        })
        expect(second).toEqual([])
    })
})
