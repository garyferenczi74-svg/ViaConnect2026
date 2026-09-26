'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BellRing, Check, Loader2, X } from 'lucide-react'
import {
    JOIN_WAITLIST_ARIA,
    JOIN_WAITLIST_ERROR,
    JOIN_WAITLIST_JOINED,
    JOIN_WAITLIST_JOINED_SR,
    JOIN_WAITLIST_LABEL,
    JOIN_WAITLIST_PENDING,
    JOIN_WAITLIST_SIGNED_OUT,
    LEAVE_WAITLIST_ARIA,
    LEAVE_WAITLIST_DONE_SR,
    LEAVE_WAITLIST_ERROR,
    LEAVE_WAITLIST_LABEL,
    LEAVE_WAITLIST_PENDING,
    applyProductName,
} from '@/lib/shop/coming-soon-copy'

export type WaitlistPhase = 'idle' | 'pending' | 'joined' | 'leaving'

export type WaitlistEvent =
    | { type: 'join_click' }
    | { type: 'join_ok' }
    | { type: 'join_fail' }
    | { type: 'leave_click' }
    | { type: 'leave_ok' }
    | { type: 'leave_fail' }

export interface ShopWaitlistState {
    signedIn: boolean
    joined: boolean
}

export function nextState(phase: WaitlistPhase, event: WaitlistEvent): WaitlistPhase {
    switch (phase) {
        case 'idle':
            return event.type === 'join_click' ? 'pending' : phase
        case 'pending':
            if (event.type === 'join_ok') return 'joined'
            if (event.type === 'join_fail') return 'idle'
            return phase
        case 'joined':
            return event.type === 'leave_click' ? 'leaving' : phase
        case 'leaving':
            if (event.type === 'leave_ok') return 'idle'
            if (event.type === 'leave_fail') return 'joined'
            return phase
        default:
            return phase
    }
}

export function guardCardClick(event: { preventDefault(): void; stopPropagation(): void }): void {
    event.preventDefault()
    event.stopPropagation()
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

export function isJoinedPayload(value: unknown): boolean {
    if (!isRecord(value) || value.success !== true) return false
    if (!isRecord(value.data)) return false
    return value.data.status === 'joined'
}

export function isLeftPayload(value: unknown): boolean {
    if (!isRecord(value) || value.success !== true) return false
    if (!isRecord(value.data)) return false
    return value.data.status === 'left'
}

export async function postJoin(
    productId: string,
    source: 'plp' | 'pdp',
    fetchImpl: typeof fetch,
): Promise<'joined' | 'error'> {
    try {
        const response = await fetchImpl('/api/shop/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, source }),
        })
        if (!response.ok) return 'error'
        const payload: unknown = await response.json()
        return isJoinedPayload(payload) ? 'joined' : 'error'
    } catch {
        return 'error'
    }
}

export interface WaitlistSetters {
    setPhase: (phase: WaitlistPhase) => void
    setJoinError: (value: boolean) => void
    setLeaveError: (value: boolean) => void
    setLeftAnnouncement: (value: string | null) => void
}

export function beginSignedOut(
    event: { preventDefault(): void; stopPropagation(): void },
    redirectTo: string,
    push: (href: string) => void,
): void {
    guardCardClick(event)
    push(redirectTo)
}

export function beginJoin(
    event: { preventDefault(): void; stopPropagation(): void },
    phase: WaitlistPhase,
    productId: string,
    source: 'plp' | 'pdp',
    setters: Pick<WaitlistSetters, 'setPhase' | 'setJoinError' | 'setLeftAnnouncement'>,
    fetchImpl: typeof fetch,
): void {
    guardCardClick(event)
    if (phase === 'pending' || phase === 'leaving' || phase === 'joined') return
    setters.setJoinError(false)
    setters.setLeftAnnouncement(null)
    setters.setPhase(nextState('idle', { type: 'join_click' }))
    void postJoin(productId, source, fetchImpl).then((outcome) => {
        if (outcome === 'joined') {
            setters.setJoinError(false)
            setters.setPhase(nextState('pending', { type: 'join_ok' }))
            return
        }
        setters.setPhase(nextState('pending', { type: 'join_fail' }))
        setters.setJoinError(true)
    })
}

export function beginLeave(
    event: { preventDefault(): void; stopPropagation(): void },
    phase: WaitlistPhase,
    productId: string,
    productName: string,
    setters: Pick<WaitlistSetters, 'setPhase' | 'setLeaveError' | 'setLeftAnnouncement'>,
    fetchImpl: typeof fetch,
): void {
    guardCardClick(event)
    if (phase !== 'joined') return
    setters.setLeaveError(false)
    setters.setPhase(nextState('joined', { type: 'leave_click' }))
    void deleteJoin(productId, fetchImpl).then((outcome) => {
        if (outcome === 'left') {
            setters.setLeaveError(false)
            setters.setPhase(nextState('leaving', { type: 'leave_ok' }))
            setters.setLeftAnnouncement(applyProductName(LEAVE_WAITLIST_DONE_SR, productName))
            return
        }
        setters.setPhase(nextState('leaving', { type: 'leave_fail' }))
        setters.setLeaveError(true)
    })
}

export async function deleteJoin(
    productId: string,
    fetchImpl: typeof fetch,
): Promise<'left' | 'error'> {
    try {
        const response = await fetchImpl('/api/shop/waitlist', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId }),
        })
        if (!response.ok) return 'error'
        const payload: unknown = await response.json()
        return isLeftPayload(payload) ? 'left' : 'error'
    } catch {
        return 'error'
    }
}

const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1A2E]'

const tealButton =
    `mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-3 font-medium text-white transition-colors hover:bg-[#26918d] ${focusRing}`

const ghostButton =
    `mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-3 font-medium text-white transition-colors hover:bg-white/[0.08] ${focusRing}`

const joinedBanner =
    'mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 py-3 font-medium text-[#2DA5A0]'

const leaveButton =
    `flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-white/80 transition-colors hover:text-white ${focusRing}`

const alertLine =
    'mt-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100'

export interface JoinWaitlistButtonViewProps {
    productName: string
    signedIn: boolean
    phase: WaitlistPhase
    joinError: boolean
    leaveError: boolean
    leftAnnouncement: string | null
    redirectTo: string
    onSignedOut: (event: { preventDefault(): void; stopPropagation(): void }) => void
    onJoin: (event: { preventDefault(): void; stopPropagation(): void }) => void
    onLeave: (event: { preventDefault(): void; stopPropagation(): void }) => void
}

export function JoinWaitlistButtonView({
    productName,
    signedIn,
    phase,
    joinError,
    leaveError,
    leftAnnouncement,
    redirectTo,
    onSignedOut,
    onJoin,
    onLeave,
}: JoinWaitlistButtonViewProps) {
    if (!signedIn) {
        return (
            <button
                type="button"
                onClick={onSignedOut}
                className={ghostButton}
                data-redirect={redirectTo}
            >
                {JOIN_WAITLIST_SIGNED_OUT}
            </button>
        )
    }

    if (phase === 'joined' || phase === 'leaving') {
        return (
            <div className="flex flex-col">
                <div role="status" aria-live="polite" className={joinedBanner}>
                    <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    <span>{JOIN_WAITLIST_JOINED}</span>
                    <span className="sr-only">{applyProductName(JOIN_WAITLIST_JOINED_SR, productName)}</span>
                </div>
                <button
                    type="button"
                    onClick={onLeave}
                    disabled={phase === 'leaving'}
                    aria-busy={phase === 'leaving' ? true : undefined}
                    aria-label={applyProductName(LEAVE_WAITLIST_ARIA, productName)}
                    className={leaveButton}
                >
                    <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    {phase === 'leaving' ? LEAVE_WAITLIST_PENDING : LEAVE_WAITLIST_LABEL}
                </button>
                {leaveError ? (
                    <p role="alert" className={alertLine}>
                        {LEAVE_WAITLIST_ERROR}
                    </p>
                ) : null}
            </div>
        )
    }

    const pending = phase === 'pending'
    return (
        <div className="flex flex-col">
            <button
                type="button"
                onClick={onJoin}
                disabled={pending}
                aria-busy={pending ? true : undefined}
                aria-label={applyProductName(JOIN_WAITLIST_ARIA, productName)}
                className={tealButton}
            >
                {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                    <BellRing className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                )}
                {pending ? JOIN_WAITLIST_PENDING : JOIN_WAITLIST_LABEL}
            </button>
            {joinError ? (
                <p role="alert" className={alertLine}>
                    {JOIN_WAITLIST_ERROR}
                </p>
            ) : null}
            {leftAnnouncement ? (
                <span className="sr-only" role="status" aria-live="polite">
                    {leftAnnouncement}
                </span>
            ) : null}
        </div>
    )
}

interface JoinWaitlistButtonProps {
    productId: string
    productName: string
    source: 'plp' | 'pdp'
    signedIn: boolean
    joined: boolean
}

export function JoinWaitlistButton({
    productId,
    productName,
    source,
    signedIn,
    joined,
}: JoinWaitlistButtonProps) {
    const router = useRouter()
    const pathname = usePathname() || '/shop'
    const redirectTo = `/login?redirectTo=${encodeURIComponent(pathname)}`
    const [phase, setPhase] = useState<WaitlistPhase>(joined ? 'joined' : 'idle')
    const [joinError, setJoinError] = useState(false)
    const [leaveError, setLeaveError] = useState(false)
    const [leftAnnouncement, setLeftAnnouncement] = useState<string | null>(null)

    return (
        <JoinWaitlistButtonView
            productName={productName}
            signedIn={signedIn}
            phase={phase}
            joinError={joinError}
            leaveError={leaveError}
            leftAnnouncement={leftAnnouncement}
            redirectTo={redirectTo}
            onSignedOut={(event) => beginSignedOut(event, redirectTo, (href) => router.push(href))}
            onJoin={(event) =>
                beginJoin(
                    event,
                    phase,
                    productId,
                    source,
                    { setPhase, setJoinError, setLeftAnnouncement },
                    fetch,
                )
            }
            onLeave={(event) =>
                beginLeave(
                    event,
                    phase,
                    productId,
                    productName,
                    { setPhase, setLeaveError, setLeftAnnouncement },
                    fetch,
                )
            }
        />
    )
}
