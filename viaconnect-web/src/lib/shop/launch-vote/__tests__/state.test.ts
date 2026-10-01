import { describe, expect, it } from 'vitest'
import {
    formatReleaseDate,
    nextVoteState,
    orderScopeFromPrior,
    resolvePillState,
    shouldOpenConfirmOnReturn,
} from '@/lib/shop/launch-vote/state'

describe('resolvePillState', () => {
    it('hides a released product', () => {
        expect(resolvePillState({ released: true, voted: true, topEntry: null, enabled: true }).kind).toBe('hidden')
    })

    it('stays a static rest pill when voting is off', () => {
        const pill = resolvePillState({
            released: false,
            voted: true,
            topEntry: { rank: 1, releaseDate: '2026-10-05' },
            enabled: false,
        })
        expect(pill).toMatchObject({ kind: 'rest', interactive: false, releaseDateLabel: null })
    })

    it('lets a dated top-3 beat a personal vote', () => {
        const pill = resolvePillState({
            released: false,
            voted: true,
            topEntry: { rank: 1, releaseDate: '2026-10-05' },
            enabled: true,
        })
        expect(pill.kind).toBe('popular')
        expect(pill.releaseDateLabel).toBe('Oct 5')
        expect(pill.interactive).toBe(false)
    })

    it('keeps a top-3 without a date votable and does not invent a date', () => {
        const pill = resolvePillState({
            released: false,
            voted: false,
            topEntry: { rank: 2, releaseDate: null },
            enabled: true,
        })
        expect(pill.kind).toBe('top3_nodate')
        expect(pill.topVoted).toBe(true)
        expect(pill.releaseDateLabel).toBeNull()
        expect(pill.interactive).toBe(true)
    })

    it('rejects an impossible calendar date', () => {
        expect(formatReleaseDate('2026-02-31')).toBeNull()
    })
})

describe('vote confirm state', () => {
    it('does not write on open and ignores a second submit while pending', () => {
        expect(nextVoteState('rest', 'open_confirm')).toBe('confirm')
        expect(nextVoteState('confirm', 'submit')).toBe('pending')
        expect(nextVoteState('pending', 'submit')).toBe('pending')
        expect(nextVoteState('pending', 'fail')).toBe('rest')
        expect(nextVoteState('pending', 'ok')).toBe('voted')
    })

    it('opens confirm on return only when the stored marker matches', () => {
        expect(
            shouldOpenConfirmOnReturn({
                signedIn: true,
                voteParam: 'p1',
                productId: 'p1',
                pendingMarker: 'p1',
            }),
        ).toBe(true)
        expect(
            shouldOpenConfirmOnReturn({
                signedIn: true,
                voteParam: 'p1',
                productId: 'p1',
                pendingMarker: null,
            }),
        ).toBe(false)
    })

    it('does not claim first or next when order history is unknown', () => {
        expect(orderScopeFromPrior(null)).toBeNull()
        expect(orderScopeFromPrior(false)).toBe('first_order')
        expect(orderScopeFromPrior(true)).toBe('next_order')
    })
})
