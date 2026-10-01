/**
 * Pure pill state. Dates are calendar dates in UTC.
 * Never construct a local Date from a bare YYYY-MM-DD string.
 */

import { launchTermsLine } from '@/lib/shop/launch-vote-copy'
import type { LaunchVoteCardModel } from '@/lib/shop/launch-vote/types'

export type PillKind = 'hidden' | 'rest' | 'voted' | 'popular' | 'top3_nodate'

export interface ResolvedPill {
    kind: PillKind
    interactive: boolean
    releaseDateLabel: string | null
    topVoted: boolean
}

export interface TopEntryInput {
    rank: number
    releaseDate: string | null
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatReleaseDate(date: string | null | undefined): string | null {
    if (!date) return null
    const match = DATE_RE.exec(date)
    if (!match) return null
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const utc = new Date(Date.UTC(year, month - 1, day))
    if (
        utc.getUTCFullYear() !== year ||
        utc.getUTCMonth() !== month - 1 ||
        utc.getUTCDate() !== day
    ) {
        return null
    }
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    }).format(utc)
}

export function formatUtcInstantDate(iso: string): string | null {
    const ms = Date.parse(iso)
    if (Number.isNaN(ms)) return null
    const date = new Date(ms)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return formatReleaseDate(`${y}-${m}-${d}`)
}

export function isRealCalendarDate(value: string): boolean {
    return formatReleaseDate(value) !== null
}

export function resolvePillState(input: {
    released: boolean
    voted: boolean
    topEntry: TopEntryInput | null
    enabled: boolean
}): ResolvedPill {
    if (input.released) {
        return { kind: 'hidden', interactive: false, releaseDateLabel: null, topVoted: false }
    }
    if (!input.enabled) {
        return { kind: 'rest', interactive: false, releaseDateLabel: null, topVoted: false }
    }
    const inTop = input.topEntry !== null && input.topEntry.rank >= 1 && input.topEntry.rank <= 3
    const dateLabel =
        inTop && input.topEntry?.releaseDate ? formatReleaseDate(input.topEntry.releaseDate) : null
    if (inTop && dateLabel) {
        return { kind: 'popular', interactive: false, releaseDateLabel: dateLabel, topVoted: false }
    }
    if (input.voted) {
        return {
            kind: 'voted',
            interactive: false,
            releaseDateLabel: null,
            topVoted: Boolean(inTop && !dateLabel),
        }
    }
    if (inTop) {
        return { kind: 'top3_nodate', interactive: true, releaseDateLabel: null, topVoted: true }
    }
    return { kind: 'rest', interactive: true, releaseDateLabel: null, topVoted: false }
}

export type VotePhase = 'rest' | 'confirm' | 'pending' | 'voted'
export type VoteEvent = 'open_confirm' | 'cancel' | 'submit' | 'ok' | 'fail'

/** Opening confirm does not write. Only submit moves to pending. Double submit is ignored. */
export function nextVoteState(phase: VotePhase, event: VoteEvent): VotePhase {
    if (phase === 'voted') return 'voted'
    if (phase === 'pending' && (event === 'submit' || event === 'open_confirm' || event === 'cancel')) {
        return 'pending'
    }
    if (phase === 'rest' && event === 'open_confirm') return 'confirm'
    if (phase === 'confirm' && event === 'cancel') return 'rest'
    if (phase === 'confirm' && event === 'submit') return 'pending'
    if (phase === 'pending' && event === 'ok') return 'voted'
    if (phase === 'pending' && event === 'fail') return 'rest'
    return phase
}

export const PENDING_VOTE_STORAGE_KEY = 'vc_pending_vote'

export function signInVoteRedirect(pathname: string, productId: string): string {
    return `/login?redirectTo=${encodeURIComponent(`${pathname}?vote=${productId}`)}`
}

/** A bare vote query without the stored marker must not open confirm or cast. */
export function shouldOpenConfirmOnReturn(input: {
    signedIn: boolean
    voteParam: string | null
    productId: string
    pendingMarker: string | null
}): boolean {
    return (
        input.signedIn &&
        input.voteParam !== null &&
        input.voteParam.length > 0 &&
        input.voteParam === input.productId &&
        input.pendingMarker === input.productId
    )
}

export function termsForPill(kind: PillKind, enabled: boolean, hasPriorPaidOrder: boolean | null): string | null {
    if (!enabled) return null
    if (kind !== 'rest' && kind !== 'top3_nodate') return null
    return launchTermsLine(hasPriorPaidOrder)
}

export function pillForProduct(input: {
    released: boolean
    productId: string
    model: LaunchVoteCardModel
}): ResolvedPill {
    const top = input.model.top3.find((entry) => entry.productId === input.productId) ?? null
    return resolvePillState({
        released: input.released,
        voted: input.model.votedProductIds.includes(input.productId),
        topEntry: top ? { rank: top.rank, releaseDate: top.releaseDate } : null,
        enabled: input.model.votingEnabled,
    })
}

/** Unknown order history stays null so copy does not claim first or next. */
export function orderScopeFromPrior(
    hasPriorPaidOrder: boolean | null,
): 'first_order' | 'next_order' | null {
    if (hasPriorPaidOrder === true) return 'next_order'
    if (hasPriorPaidOrder === false) return 'first_order'
    return null
}

export function addDaysIso(iso: string, days: number): string {
    const ms = Date.parse(iso)
    return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString()
}
