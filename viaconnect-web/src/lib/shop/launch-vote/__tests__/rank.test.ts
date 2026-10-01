import { describe, expect, it } from 'vitest'
import { MIN_VOTES_FOR_TOP3, rankVotes, top3 } from '@/lib/shop/launch-vote/rank'

describe('rankVotes', () => {
    it('ignores null vote times, released products, and zero votes', () => {
        const ranked = rankVotes(
            [
                { productId: 'a', userId: 'u1', votedAt: null },
                { productId: 'b', userId: 'u2', votedAt: '2026-10-01T00:00:00.000Z' },
            ],
            new Set(['b']),
            MIN_VOTES_FOR_TOP3,
        )
        expect(ranked).toEqual([])
        expect(top3(ranked)).toEqual([])
    })

    it('orders by votes, then earliest vote, then product id', () => {
        const ranked = rankVotes(
            [
                { productId: 'c', userId: 'u1', votedAt: '2026-10-02T00:00:00.000Z' },
                { productId: 'a', userId: 'u2', votedAt: '2026-10-03T00:00:00.000Z' },
                { productId: 'a', userId: 'u3', votedAt: '2026-10-01T00:00:00.000Z' },
                { productId: 'b', userId: 'u4', votedAt: '2026-10-01T00:00:00.000Z' },
                { productId: 'b', userId: 'u5', votedAt: '2026-10-04T00:00:00.000Z' },
            ],
            new Set(),
            1,
        )
        expect(ranked.map((row) => row.productId)).toEqual(['a', 'b', 'c'])
        expect(ranked[0].votes).toBe(2)
        expect(ranked[0].firstVoteAt).toBe('2026-10-01T00:00:00.000Z')
        expect(top3(ranked)).toHaveLength(3)
        expect(ranked[0].rank).toBe(1)
    })
})
