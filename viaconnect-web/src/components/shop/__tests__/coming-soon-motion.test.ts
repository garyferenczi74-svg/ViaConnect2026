/**
 * Scheduler: one observer, 12 running, static over the cap, paused off-screen.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
    COMING_SOON_ZOOM_MARGIN_MS,
    COMING_SOON_ZOOM_MS,
    createMotionScheduler,
    type MotionEntry,
    type MotionIntroStyle,
    type MotionNode,
    type MotionObserver,
} from '@/components/shop/coming-soon-motion'

interface FakeNode extends MotionNode {
    index: number
    intro: { style: MotionIntroStyle }
    getAttribute(name: string): string | null
    emit(animationName: string): void
}

class FakeIO implements MotionObserver {
    static instances: FakeIO[] = []
    readonly observed: MotionNode[] = []
    disconnected = false

    constructor(
        readonly callback: (entries: readonly MotionEntry[]) => void,
        readonly options?: { rootMargin?: string },
    ) {
        FakeIO.instances.push(this)
    }

    observe(target: MotionNode): void {
        this.observed.push(target)
    }

    unobserve(target: MotionNode): void {
        const index = this.observed.indexOf(target)
        if (index >= 0) this.observed.splice(index, 1)
    }

    disconnect(): void {
        this.disconnected = true
        this.observed.splice(0, this.observed.length)
    }
}

function makeNode(index: number, delay = ''): FakeNode {
    const attrs = new Map<string, string>()
    const intro = { style: { animation: '', opacity: '', transform: '' } }
    const listeners: Array<(event: Event) => void> = []
    return {
        index,
        intro,
        setAttribute(name: string, value: string) {
            attrs.set(name, value)
        },
        removeAttribute(name: string) {
            attrs.delete(name)
        },
        getAttribute(name: string) {
            return attrs.has(name) ? attrs.get(name) ?? null : null
        },
        compareDocumentPosition(other: Node) {
            const next = other as unknown as FakeNode
            if (next.index > index) return 4
            if (next.index < index) return 2
            return 0
        },
        querySelector(selector: string) {
            return selector === '.cs-intro' ? intro : null
        },
        addEventListener(_type: string, listener: (event: Event) => void) {
            listeners.push(listener)
        },
        removeEventListener(_type: string, listener: (event: Event) => void) {
            const at = listeners.indexOf(listener)
            if (at >= 0) listeners.splice(at, 1)
        },
        emit(animationName: string) {
            const event = { animationName } as unknown as Event
            for (const listener of [...listeners]) listener(event)
        },
        style: {
            getPropertyValue(property: string) {
                return property === '--cs-delay' ? delay : ''
            },
        },
    }
}

function isRunning(node: FakeNode): boolean {
    return node.getAttribute('data-cs-paused') === null && node.getAttribute('data-cs-static') === null
}

function runningCount(nodes: readonly FakeNode[]): number {
    return nodes.filter(isRunning).length
}

describe('coming soon motion scheduler', () => {
    beforeEach(() => {
        FakeIO.instances = []
    })

    it('counts unfinished overlays right after mount, then runs the first 12', () => {
        const nodes = Array.from({ length: 20 }, (_, index) => makeNode(index))
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        for (let index = nodes.length - 1; index >= 0; index -= 1) scheduler.register(nodes[index])
        expect(FakeIO.instances).toHaveLength(1)
        expect(FakeIO.instances[0].options?.rootMargin).toBe('100px')
        expect(runningCount(nodes)).toBe(0)

        FakeIO.instances[0].callback(nodes.map((node) => ({ target: node, isIntersecting: true })))
        expect(runningCount(nodes)).toBe(12)
        for (let index = 0; index < 12; index += 1) {
            expect(isRunning(nodes[index]), `index ${index}`).toBe(true)
            expect(nodes[index].getAttribute('data-cs-paused')).toBeNull()
            expect(nodes[index].getAttribute('data-cs-static')).toBeNull()
        }
        for (let index = 12; index < 20; index += 1) {
            expect(nodes[index].getAttribute('data-cs-static')).toBe('true')
            expect(nodes[index].getAttribute('data-cs-paused')).toBeNull()
        }

        FakeIO.instances[0].callback(nodes.map((node) => ({ target: node, isIntersecting: false })))
        expect(runningCount(nodes)).toBe(0)
        for (const node of nodes) {
            expect(node.getAttribute('data-cs-paused')).toBe('true')
            expect(node.getAttribute('data-cs-static')).toBeNull()
        }
    })

    it('pauses an overlay that leaves and hands the slot to the next in document order', () => {
        const nodes = Array.from({ length: 20 }, (_, index) => makeNode(index))
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        for (const node of nodes) scheduler.register(node)
        const io = FakeIO.instances[0]
        io.callback(nodes.map((node) => ({ target: node, isIntersecting: true })))
        io.callback([{ target: nodes[0], isIntersecting: false }])
        expect(nodes[0].getAttribute('data-cs-paused')).toBe('true')
        expect(nodes[0].getAttribute('data-cs-static')).toBeNull()
        expect(isRunning(nodes[12])).toBe(true)
        expect(runningCount(nodes)).toBe(12)
        expect(nodes[13].getAttribute('data-cs-static')).toBe('true')
    })

    it('uses static only past the cap and paused only when off-screen', () => {
        const nodes = Array.from({ length: 20 }, (_, index) => makeNode(index))
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        for (const node of nodes) scheduler.register(node)
        FakeIO.instances[0].callback(
            nodes.map((node) => ({ target: node, isIntersecting: node.index < 14 })),
        )
        expect(runningCount(nodes)).toBe(12)
        expect(nodes.filter((node) => node.getAttribute('data-cs-static') === 'true').map((node) => node.index)).toEqual([12, 13])
        expect(nodes.filter((node) => node.getAttribute('data-cs-paused') === 'true').map((node) => node.index)).toEqual([14, 15, 16, 17, 18, 19])
    })

    it('disconnects when the last node unregisters and frees a running slot', () => {
        const alone = makeNode(0)
        const single = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        single.register(alone)
        single.unregister(alone)
        expect(FakeIO.instances[0].disconnected).toBe(true)
        expect(() => single.unregister(alone)).not.toThrow()

        FakeIO.instances = []
        const nodes = Array.from({ length: 14 }, (_, index) => makeNode(index))
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        for (const node of nodes) scheduler.register(node)
        const io = FakeIO.instances[0]
        io.callback(nodes.map((node) => ({ target: node, isIntersecting: true })))
        scheduler.unregister(nodes[0])
        expect(io.disconnected).toBe(false)
        expect(io.observed).not.toContain(nodes[0])
        expect(isRunning(nodes[12])).toBe(true)
        expect(runningCount(nodes.slice(1))).toBe(12)
    })

    it('does nothing animated under reduced motion and never constructs an observer', () => {
        const queries: string[] = []
        const nodes = [makeNode(0), makeNode(1)]
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: (query: string) => {
                queries.push(query)
                return { matches: query === '(prefers-reduced-motion: reduce)' }
            },
        })
        for (const node of nodes) scheduler.register(node)
        expect(FakeIO.instances).toHaveLength(0)
        expect(queries).toContain('(prefers-reduced-motion: reduce)')
        expect(runningCount(nodes)).toBe(0)
        for (const node of nodes) expect(node.getAttribute('data-cs-static')).toBe('true')
    })

    it('does not throw when IntersectionObserver is missing', () => {
        const node = makeNode(0)
        const scheduler = createMotionScheduler({
            IO: undefined,
            matchMedia: () => ({ matches: false }),
        })
        expect(() => scheduler.register(node)).not.toThrow()
        expect(FakeIO.instances).toHaveLength(0)
        expect(node.getAttribute('data-cs-paused')).toBe('true')
        expect(runningCount([node])).toBe(0)
    })

    it('restores the running pose when sync runs after a render resets the attribute', () => {
        const node = makeNode(0)
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        scheduler.register(node)
        FakeIO.instances[0].callback([{ target: node, isIntersecting: true }])
        expect(isRunning(node)).toBe(true)
        node.setAttribute('data-cs-paused', 'true')
        scheduler.sync(node)
        expect(isRunning(node)).toBe(true)
    })

    it('gives viewport slots before rootMargin pre-load slots', () => {
        const nodes = Array.from({ length: 13 }, (_, index) => makeNode(index))
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        for (const node of nodes) scheduler.register(node)
        FakeIO.instances[0].callback([
            ...nodes.slice(0, 12).map((node) => ({
                target: node,
                isIntersecting: true,
                intersectionRatio: 0,
            })),
            { target: nodes[12], isIntersecting: true, intersectionRatio: 1 },
        ])
        expect(isRunning(nodes[12])).toBe(true)
        expect(runningCount(nodes)).toBe(12)
        const preload = nodes.slice(0, 12)
        expect(preload.filter(isRunning)).toHaveLength(11)
        const waiting = preload.find((node) => !isRunning(node))
        expect(waiting?.getAttribute('data-cs-paused')).toBe('true')
        expect(waiting?.getAttribute('data-cs-static')).toBeNull()
    })

    it('does not replay the intro when a static overlay starts running again', () => {
        const nodes = Array.from({ length: 13 }, (_, index) => makeNode(index))
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        for (const node of nodes) scheduler.register(node)
        const io = FakeIO.instances[0]
        io.callback(nodes.map((node) => ({ target: node, isIntersecting: true, intersectionRatio: 1 })))
        expect(isRunning(nodes[0])).toBe(true)
        expect(nodes[0].intro.style.animation).toBe('')
        expect(nodes[12].getAttribute('data-cs-static')).toBe('true')
        scheduler.unregister(nodes[0])
        expect(isRunning(nodes[12])).toBe(true)
        expect(nodes[12].intro.style.animation).toBe('none')
        expect(nodes[12].intro.style.opacity).toBe('1')
        expect(nodes[12].intro.style.transform).toBe('none')
    })

    it('follows a live prefers-reduced-motion change', () => {
        let listener: ((event: { matches: boolean }) => void) | null = null
        const node = makeNode(0)
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({
                matches: false,
                addEventListener(_type, next) {
                    listener = next
                },
            }),
        })
        scheduler.register(node)
        const io = FakeIO.instances[0]
        io.callback([{ target: node, isIntersecting: true, intersectionRatio: 1 }])
        expect(isRunning(node)).toBe(true)
        expect(listener).toBeTruthy()
        listener?.({ matches: true })
        expect(node.getAttribute('data-cs-static')).toBe('true')
        expect(io.disconnected).toBe(true)
        listener?.({ matches: false })
        expect(FakeIO.instances).toHaveLength(2)
        FakeIO.instances[1].callback([{ target: node, isIntersecting: true, intersectionRatio: 1 }])
        expect(isRunning(node)).toBe(true)
        expect(node.intro.style.animation).toBe('none')
    })

    it('sets static when cs-zoom ends, after the card delay plus 3.0s plus margin', () => {
        vi.useFakeTimers()
        try {
            expect(COMING_SOON_ZOOM_MS).toBe(3000)
            expect(COMING_SOON_ZOOM_MARGIN_MS).toBe(75)
            const fallback = COMING_SOON_ZOOM_MS + COMING_SOON_ZOOM_MARGIN_MS
            const node = makeNode(0, '0s')
            const scheduler = createMotionScheduler({
                IO: FakeIO,
                matchMedia: () => ({ matches: false }),
            })
            scheduler.register(node)
            FakeIO.instances[0].callback([{ target: node, isIntersecting: true, intersectionRatio: 1 }])
            expect(isRunning(node)).toBe(true)
            node.emit('cs-intro')
            expect(isRunning(node)).toBe(true)
            expect(node.getAttribute('data-cs-static')).toBeNull()
            vi.advanceTimersByTime(COMING_SOON_ZOOM_MS)
            expect(isRunning(node)).toBe(true)
            vi.advanceTimersByTime(COMING_SOON_ZOOM_MARGIN_MS - 1)
            expect(isRunning(node)).toBe(true)
            vi.advanceTimersByTime(1)
            expect(node.getAttribute('data-cs-static')).toBe('true')
            expect(isRunning(node)).toBe(false)

            const early = makeNode(1, '0.400s')
            scheduler.register(early)
            FakeIO.instances[0].callback([{ target: early, isIntersecting: true, intersectionRatio: 1 }])
            expect(isRunning(early)).toBe(true)
            expect(vi.getTimerCount()).toBe(1)
            early.emit('cs-zoom')
            expect(early.getAttribute('data-cs-static')).toBe('true')
            expect(vi.getTimerCount()).toBe(0)

            const staggered = makeNode(2, '0.400s')
            scheduler.register(staggered)
            FakeIO.instances[0].callback([{ target: staggered, isIntersecting: true, intersectionRatio: 1 }])
            vi.advanceTimersByTime(fallback + 400 - 1)
            expect(isRunning(staggered)).toBe(true)
            vi.advanceTimersByTime(1)
            expect(staggered.getAttribute('data-cs-static')).toBe('true')
            scheduler.unregister(staggered)
            expect(vi.getTimerCount()).toBe(0)
        } finally {
            vi.useRealTimers()
        }
    })

    it('finishes every in-view overlay by about 3.5s', () => {
        vi.useFakeTimers()
        try {
            const delays = [0, 0.247, 0.094, 0.342, 0.189, 0.036, 0.283, 0.13, 0.378, 0.225, 0.072, 0.319]
            const nodes = delays.map((delay, index) => makeNode(index, `${delay.toFixed(3)}s`))
            const scheduler = createMotionScheduler({
                IO: FakeIO,
                matchMedia: () => ({ matches: false }),
            })
            for (const node of nodes) scheduler.register(node)
            FakeIO.instances[0].callback(
                nodes.map((node) => ({ target: node, isIntersecting: true, intersectionRatio: 1 })),
            )
            expect(runningCount(nodes)).toBe(12)
            vi.advanceTimersByTime(3500)
            for (const node of nodes) {
                expect(node.getAttribute('data-cs-static'), `index ${node.index}`).toBe('true')
            }
        } finally {
            vi.useRealTimers()
        }
    })

    it('frees a cap slot as soon as a running overlay goes static', () => {
        const nodes = Array.from({ length: 13 }, (_, index) => makeNode(index))
        const scheduler = createMotionScheduler({
            IO: FakeIO,
            matchMedia: () => ({ matches: false }),
        })
        for (const node of nodes) scheduler.register(node)
        FakeIO.instances[0].callback(
            nodes.map((node) => ({ target: node, isIntersecting: true, intersectionRatio: 1 })),
        )
        expect(runningCount(nodes)).toBe(12)
        expect(nodes[12].getAttribute('data-cs-static')).toBe('true')
        nodes[0].emit('cs-zoom')
        expect(nodes[0].getAttribute('data-cs-static')).toBe('true')
        expect(isRunning(nodes[12])).toBe(true)
        expect(runningCount(nodes)).toBe(12)
    })

    it('is static immediately under reduced motion without waiting out the cap', () => {
        vi.useFakeTimers()
        try {
            const node = makeNode(0)
            const scheduler = createMotionScheduler({
                IO: FakeIO,
                matchMedia: () => ({ matches: true }),
            })
            scheduler.register(node)
            expect(node.getAttribute('data-cs-static')).toBe('true')
            expect(isRunning(node)).toBe(false)
            expect(FakeIO.instances).toHaveLength(0)
            vi.advanceTimersByTime(0)
            expect(node.getAttribute('data-cs-static')).toBe('true')
        } finally {
            vi.useRealTimers()
        }
    })
})
