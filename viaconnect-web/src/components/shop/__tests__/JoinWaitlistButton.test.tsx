/**
 * Join and leave reducer plus markup. Not catalog data.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({
    usePathname: () => '/shop/advanced-formulas',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))
import {
    JOIN_WAITLIST_ERROR,
    JOIN_WAITLIST_JOINED,
    JOIN_WAITLIST_LABEL,
    LEAVE_WAITLIST_DONE_SR,
    LEAVE_WAITLIST_ERROR,
    LEAVE_WAITLIST_LABEL,
    applyProductName,
} from '@/lib/shop/coming-soon-copy'
import {
    JoinWaitlistButton,
    JoinWaitlistButtonView,
    beginJoin,
    beginLeave,
    beginSignedOut,
    deleteJoin,
    guardCardClick,
    nextState,
    postJoin,
} from '@/components/shop/JoinWaitlistButton'

const PRODUCT = 'Alpha Supplement'
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'

function view(
    partial: Partial<Parameters<typeof JoinWaitlistButtonView>[0]> = {},
) {
    return renderToStaticMarkup(
        <JoinWaitlistButtonView
            productName={PRODUCT}
            signedIn
            phase="idle"
            joinError={false}
            leaveError={false}
            leftAnnouncement={null}
            redirectTo="/login?redirectTo=%2Fshop"
            onSignedOut={() => undefined}
            onJoin={() => undefined}
            onLeave={() => undefined}
            {...partial}
        />,
    )
}

describe('nextState', () => {
    it('moves join success to joined and join failure back to idle', () => {
        expect(nextState('idle', { type: 'join_click' })).toBe('pending')
        expect(nextState('pending', { type: 'join_ok' })).toBe('joined')
        expect(nextState('pending', { type: 'join_fail' })).toBe('idle')
    })

    it('moves a successful leave to idle and a failed leave back to joined', () => {
        expect(nextState('joined', { type: 'leave_click' })).toBe('leaving')
        expect(nextState('leaving', { type: 'leave_ok' })).toBe('idle')
        expect(nextState('leaving', { type: 'leave_fail' })).toBe('joined')
        expect(nextState('idle', { type: 'leave_ok' })).toBe('idle')
        expect(nextState('pending', { type: 'leave_click' })).toBe('pending')
        expect(nextState('joined', { type: 'join_ok' })).toBe('joined')
        expect(nextState('leaving', { type: 'join_click' })).toBe('leaving')
    })
})

describe('beginJoin and beginLeave', () => {
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() }

    it('joins from idle and ignores a second click while pending', async () => {
        const setPhase = vi.fn()
        const setJoinError = vi.fn()
        const setLeftAnnouncement = vi.fn()
        const fetchImpl = vi.fn(async () =>
            new Response(JSON.stringify({ success: true, data: { status: 'joined' } }), { status: 200 }),
        )
        beginJoin(click, 'idle', PRODUCT_ID, 'plp', { setPhase, setJoinError, setLeftAnnouncement }, fetchImpl)
        expect(click.preventDefault).toHaveBeenCalled()
        expect(setPhase).toHaveBeenCalledWith('pending')
        await vi.waitFor(() => expect(setPhase).toHaveBeenCalledWith('joined'))

        setPhase.mockClear()
        beginJoin(click, 'pending', PRODUCT_ID, 'plp', { setPhase, setJoinError, setLeftAnnouncement }, fetchImpl)
        expect(setPhase).not.toHaveBeenCalled()
    })

    it('sets the join error when the request fails', async () => {
        const setPhase = vi.fn()
        const setJoinError = vi.fn()
        const setLeftAnnouncement = vi.fn()
        const fetchImpl = vi.fn(async () => new Response('{}', { status: 500 }))
        beginJoin(click, 'idle', PRODUCT_ID, 'pdp', { setPhase, setJoinError, setLeftAnnouncement }, fetchImpl)
        await vi.waitFor(() => expect(setJoinError).toHaveBeenCalledWith(true))
        expect(setPhase).toHaveBeenCalledWith('idle')
    })

    it('leaves the list and announces it, and stays joined when delete throws', async () => {
        const setPhase = vi.fn()
        const setLeaveError = vi.fn()
        const setLeftAnnouncement = vi.fn()
        const ok = vi.fn(async () =>
            new Response(JSON.stringify({ success: true, data: { status: 'left' } }), { status: 200 }),
        )
        beginLeave(click, 'joined', PRODUCT_ID, PRODUCT, { setPhase, setLeaveError, setLeftAnnouncement }, ok)
        expect(setPhase).toHaveBeenCalledWith('leaving')
        await vi.waitFor(() =>
            expect(setLeftAnnouncement).toHaveBeenCalledWith(
                applyProductName(LEAVE_WAITLIST_DONE_SR, PRODUCT),
            ),
        )
        expect(setPhase).toHaveBeenCalledWith('idle')

        setPhase.mockClear()
        beginLeave(click, 'idle', PRODUCT_ID, PRODUCT, { setPhase, setLeaveError, setLeftAnnouncement }, ok)
        expect(setPhase).not.toHaveBeenCalled()

        const down = vi.fn(async () => {
            throw new Error('network')
        })
        beginLeave(click, 'joined', PRODUCT_ID, PRODUCT, { setPhase, setLeaveError, setLeftAnnouncement }, down)
        await vi.waitFor(() => expect(setLeaveError).toHaveBeenCalledWith(true))
        expect(setPhase).toHaveBeenCalledWith('joined')
    })

    it('sends a signed-out shopper to login and renders the button', () => {
        const push = vi.fn()
        beginSignedOut(click, '/login?redirectTo=%2Fshop', push)
        expect(push).toHaveBeenCalledWith('/login?redirectTo=%2Fshop')
        const html = renderToStaticMarkup(
            <JoinWaitlistButton
                productId={PRODUCT_ID}
                productName={PRODUCT}
                source="plp"
                signedIn
                joined={false}
            />,
        )
        expect(html).toContain(JOIN_WAITLIST_LABEL)
    })
})

describe('JoinWaitlistButtonView sheen', () => {
    it('adds jr-sheen only while idle and keeps the label, aria-label, and ListPlus stroke', () => {
        const idle = view({ phase: 'idle' })
        expect(idle).toContain('jr-sheen')
        expect(idle).toContain(JOIN_WAITLIST_LABEL)
        expect(idle).toContain('Join the Revolution waiting list for Alpha Supplement')
        expect(idle).toContain('stroke-width="1.5"')
        expect(idle).toContain('list-plus')

        expect(view({ phase: 'pending' })).not.toContain('jr-sheen')
        expect(view({ phase: 'joined' })).not.toContain('jr-sheen')
        expect(view({ phase: 'leaving' })).not.toContain('jr-sheen')
        expect(view({ signedIn: false })).not.toContain('jr-sheen')
    })
})

describe('guardCardClick', () => {
    it('calls preventDefault and stopPropagation', () => {
        const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() }
        guardCardClick(event)
        expect(event.preventDefault).toHaveBeenCalledOnce()
        expect(event.stopPropagation).toHaveBeenCalledOnce()
        const source = readFileSync(
            join(process.cwd(), 'src/components/shop/JoinWaitlistButton.tsx'),
            'utf8',
        )
        expect(source).toContain('guardCardClick(event)')
        expect(source).not.toMatch(/\bany\b/)
        for (const icon of ['ListPlus', 'Check', 'Loader2', 'X']) {
            expect(source).toContain(icon)
        }
        expect(source.split('strokeWidth={1.5}').length - 1).toBeGreaterThanOrEqual(4)
    })
})

describe('postJoin', () => {
    it('goes to joined on 200 and back to idle with the error line on 409 or a network failure', async () => {
        const okFetch = vi.fn(async () =>
            new Response(JSON.stringify({ success: true, data: { status: 'joined' } }), { status: 200 }),
        )
        expect(await postJoin(PRODUCT_ID, 'plp', okFetch)).toBe('joined')
        let phase = nextState('pending', { type: 'join_ok' })
        expect(phase).toBe('joined')

        const denied = vi.fn(async () =>
            new Response(JSON.stringify({ success: false, errorCode: 'PRODUCT_RELEASED' }), { status: 409 }),
        )
        expect(await postJoin(PRODUCT_ID, 'plp', denied)).toBe('error')
        phase = nextState('pending', { type: 'join_fail' })
        expect(phase).toBe('idle')
        const errorHtml = view({ phase: 'idle', joinError: true })
        expect(errorHtml).toContain(JOIN_WAITLIST_ERROR.replaceAll("'", '&#x27;'))
        expect(errorHtml).toContain(JOIN_WAITLIST_LABEL)
        expect(errorHtml).toContain('role="alert"')

        const down = vi.fn(async () => {
            throw new Error('network')
        })
        expect(await postJoin(PRODUCT_ID, 'pdp', down)).toBe('error')
    })
})

describe('deleteJoin', () => {
    it('returns to idle with the left line on 200 and stays joined with the leave error on failure', async () => {
        const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
            const parsed = JSON.parse(String(init?.body)) as Record<string, unknown>
            expect(parsed).toEqual({ productId: PRODUCT_ID })
            expect(Object.keys(parsed)).toEqual(['productId'])
            expect(init?.method).toBe('DELETE')
            return new Response(JSON.stringify({ success: true, data: { status: 'left' } }), { status: 200 })
        })
        expect(await deleteJoin(PRODUCT_ID, fetchImpl)).toBe('left')
        expect(nextState('leaving', { type: 'leave_ok' })).toBe('idle')
        const leftHtml = view({
            phase: 'idle',
            leftAnnouncement: applyProductName(LEAVE_WAITLIST_DONE_SR, PRODUCT),
        })
        expect(leftHtml).toContain('You left the waiting list for Alpha Supplement')
        expect(leftHtml).toContain('class="sr-only"')

        const failed = vi.fn(async () => new Response('{}', { status: 500 }))
        expect(await deleteJoin(PRODUCT_ID, failed)).toBe('error')
        expect(nextState('leaving', { type: 'leave_fail' })).toBe('joined')
        const stayHtml = view({ phase: 'joined', leaveError: true })
        expect(stayHtml).toContain(JOIN_WAITLIST_JOINED.replaceAll("'", '&#x27;'))
        expect(stayHtml).toContain(LEAVE_WAITLIST_LABEL)
        expect(stayHtml).toContain(LEAVE_WAITLIST_ERROR.replaceAll("'", '&#x27;'))
        expect(stayHtml).toContain('role="alert"')
        expect(stayHtml).toContain('role="status"')
    })
})
