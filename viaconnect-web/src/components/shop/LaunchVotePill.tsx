/**
 * VOTE CONTROL ONLY. Shown on unreleased products.
 * Does not replace Join the Revolution (email sign-up) or Add to Cart (purchase).
 * A tap opens confirm. Only Submit vote writes a vote.
 */
'use client'

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { Check, Sparkles, ThumbsUp } from 'lucide-react'
import { StardustButton, type StardustSize } from '@/components/ui/stardust-button'
import { guardCardClick } from '@/components/shop/JoinWaitlistButton'
import {
    LAUNCH_CONFIRM_BODY,
    LAUNCH_CONFIRM_CANCEL,
    LAUNCH_CONFIRM_SUBMIT,
    LAUNCH_CONFIRM_TITLE,
    LAUNCH_PILL_HOVER,
    LAUNCH_PILL_POPULAR,
    LAUNCH_PILL_RELEASES,
    LAUNCH_PILL_REST,
    LAUNCH_PILL_VOTED,
    LAUNCH_TOP_VOTED,
    LAUNCH_VOTE_ARIA,
    LAUNCH_VOTE_ERROR,
    LAUNCH_VOTE_SIGNIN_ARIA,
    fillLaunchTemplate,
} from '@/lib/shop/launch-vote-copy'
import {
    PENDING_VOTE_STORAGE_KEY,
    nextVoteState,
    orderScopeFromPrior,
    shouldOpenConfirmOnReturn,
    signInVoteRedirect,
    termsForPill,
    type ResolvedPill,
    type VotePhase,
} from '@/lib/shop/launch-vote/state'
import './launch-vote-pill.css'

export interface LaunchVotePillViewProps {
    productId: string
    productName: string
    size: StardustSize
    pill: ResolvedPill
    phase: VotePhase
    signedIn: boolean
    votingEnabled: boolean
    hasPriorPaidOrder: boolean | null
    error: string | null
    onOpen: (event: MouseEvent<HTMLButtonElement>) => void
    onCancel: () => void
    onSubmit: () => void
}

export function LaunchVotePillView({
    productName,
    size,
    pill,
    phase,
    signedIn,
    votingEnabled,
    hasPriorPaidOrder,
    error,
    onOpen,
    onCancel,
    onSubmit,
}: LaunchVotePillViewProps) {
    const titleId = useId()
    const terms = termsForPill(pill.kind, votingEnabled, hasPriorPaidOrder)
    const dialogOpen = phase === 'confirm' || phase === 'pending'
    let control: ReactNode = null

    if (pill.kind === 'popular' && pill.releaseDateLabel) {
        control = (
            <StardustButton
                as="span"
                size={size}
                state="popular"
                label={LAUNCH_PILL_POPULAR}
                detail={fillLaunchTemplate(LAUNCH_PILL_RELEASES, { date: pill.releaseDateLabel })}
            />
        )
    } else if (pill.kind === 'voted' || phase === 'voted') {
        control = (
            <StardustButton
                as="span"
                size={size}
                state="voted"
                role="status"
                label={LAUNCH_PILL_VOTED}
                glyph={<Check className="h-3 w-3" strokeWidth={1.5} />}
            />
        )
    } else if (!pill.interactive) {
        control = (
            <StardustButton
                as="span"
                size={size}
                state="rest"
                label={LAUNCH_PILL_REST}
                ariaDisabled
            />
        )
    } else {
        const aria = signedIn
            ? fillLaunchTemplate(LAUNCH_VOTE_ARIA, { productName })
            : fillLaunchTemplate(LAUNCH_VOTE_SIGNIN_ARIA, { productName })
        control = (
            <StardustButton
                as="button"
                size={size}
                state="rest"
                label={LAUNCH_PILL_REST}
                altLabel={LAUNCH_PILL_HOVER}
                ariaLabel={aria}
                ariaHaspopup="dialog"
                ariaExpanded={dialogOpen}
                glyph={<Sparkles className="h-3 w-3" strokeWidth={1.5} />}
                altGlyph={<ThumbsUp className="h-3 w-3" strokeWidth={1.5} />}
                onClick={onOpen}
            />
        )
    }

    const dialog = dialogOpen ? (
        <div className="vc-vote-dialog" role="presentation">
            <div
                className="vc-vote-dialog-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-testid="launch-vote-confirm"
            >
                <h2 id={titleId}>{fillLaunchTemplate(LAUNCH_CONFIRM_TITLE, { productName })}</h2>
                <p>{LAUNCH_CONFIRM_BODY}</p>
                {error ? <p role="alert">{error}</p> : null}
                <div className="vc-vote-dialog-actions">
                    <button type="button" className="vc-vote-dialog-submit" onClick={onSubmit} disabled={phase === 'pending'}>
                        {LAUNCH_CONFIRM_SUBMIT}
                    </button>
                    <button type="button" className="vc-vote-dialog-cancel" onClick={onCancel} disabled={phase === 'pending'}>
                        {LAUNCH_CONFIRM_CANCEL}
                    </button>
                </div>
            </div>
        </div>
    ) : null

    const portaled =
        dialog && typeof document !== 'undefined' ? createPortal(dialog, document.body) : dialog

    return (
        <div className="vc-launch-vote" data-size={size} data-testid="launch-vote-overlay">
            {control}
            {pill.topVoted ? <span className="vc-stardust-note">{LAUNCH_TOP_VOTED}</span> : null}
            {terms ? <span className="vc-stardust-note">{terms}</span> : null}
            {portaled}
        </div>
    )
}

function isVotePayload(value: unknown): value is { success: true; data: { status: string } } {
    if (!value || typeof value !== 'object') return false
    const row = value as { success?: unknown; data?: { status?: unknown } }
    return row.success === true && (row.data?.status === 'voted' || row.data?.status === 'already_voted')
}

export function LaunchVotePill({
    productId,
    productName,
    productPath,
    source,
    size,
    pill,
    signedIn,
    votingEnabled,
    hasPriorPaidOrder,
}: {
    productId: string
    productName: string
    productPath: string
    source: 'plp' | 'pdp'
    size: StardustSize
    pill: ResolvedPill
    signedIn: boolean
    votingEnabled: boolean
    hasPriorPaidOrder: boolean | null
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [phase, setPhase] = useState<VotePhase>(pill.kind === 'voted' ? 'voted' : 'rest')
    const [error, setError] = useState<string | null>(null)
    const submitLock = useRef(false)

    useEffect(() => {
        if (!pill.interactive || typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const marker = window.sessionStorage.getItem(PENDING_VOTE_STORAGE_KEY)
        if (
            shouldOpenConfirmOnReturn({
                signedIn,
                voteParam: params.get('vote'),
                productId,
                pendingMarker: marker,
            })
        ) {
            setPhase((current) => (current === 'voted' ? current : 'confirm'))
        }
    }, [pill.interactive, productId, signedIn])

    useEffect(() => {
        if (phase !== 'confirm' && phase !== 'pending') return
        const root = document.querySelector('[data-testid="launch-vote-confirm"]')
        const node = root instanceof HTMLElement ? root : null
        const focusable = node?.querySelectorAll<HTMLElement>('button:not([disabled])')
        focusable?.[0]?.focus()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && phase === 'confirm') {
                event.preventDefault()
                setPhase('rest')
                return
            }
            if (event.key !== 'Tab' || !focusable || focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [phase])

    const clearReturn = () => {
        if (typeof window === 'undefined') return
        window.sessionStorage.removeItem(PENDING_VOTE_STORAGE_KEY)
        if (window.location.search.includes('vote=')) {
            router.replace(pathname)
        }
    }

    const onOpen = (event: MouseEvent<HTMLButtonElement>) => {
        guardCardClick(event)
        setError(null)
        setPhase((current) => nextVoteState(current, 'open_confirm'))
    }

    const onCancel = () => {
        setPhase((current) => nextVoteState(current, 'cancel'))
        clearReturn()
    }

    const onSubmit = () => {
        if (submitLock.current || phase === 'pending' || phase === 'voted') return
        submitLock.current = true
        setPhase((current) => nextVoteState(current, 'submit'))
        if (!signedIn) {
            window.sessionStorage.setItem(PENDING_VOTE_STORAGE_KEY, productId)
            router.push(signInVoteRedirect(pathname || productPath, productId))
            return
        }
        const scope = orderScopeFromPrior(hasPriorPaidOrder)
        void fetch('/api/shop/launch-vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId,
                source,
                productName,
                productPath,
                ...(scope ? { orderScope: scope } : {}),
            }),
        })
            .then(async (response) => {
                const body: unknown = await response.json().catch(() => null)
                if (response.ok && isVotePayload(body)) {
                    setError(null)
                    setPhase('voted')
                    clearReturn()
                    return
                }
                submitLock.current = false
                setPhase('rest')
                setError(LAUNCH_VOTE_ERROR)
            })
            .catch(() => {
                submitLock.current = false
                setPhase('rest')
                setError(LAUNCH_VOTE_ERROR)
            })
    }

    if (pill.kind === 'hidden') return null

    return (
        <LaunchVotePillView
            productId={productId}
            productName={productName}
            size={size}
            pill={pill}
            phase={phase}
            signedIn={signedIn}
            votingEnabled={votingEnabled}
            hasPriorPaidOrder={hasPriorPaidOrder}
            error={error}
            onOpen={onOpen}
            onCancel={onCancel}
            onSubmit={onSubmit}
        />
    )
}
