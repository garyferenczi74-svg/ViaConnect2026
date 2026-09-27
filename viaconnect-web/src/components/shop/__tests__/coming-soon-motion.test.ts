/**
 * Scheduler: one observer, 12 running, static over the cap, paused off-screen.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
    createMotionScheduler,
    type MotionEntry,
    type MotionNode,
    type MotionObserver,
} from '@/components/shop/coming-soon-motion'

interface FakeNode extends MotionNode {
    index: number
    getAttribute(name: string): string | null
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

function makeNode(index: number): FakeNode {
    const attrs = new Map<string, string>()
    return {
        index,
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

    it('runs the first 12 intersecting nodes in document order and holds the rest static', () => {
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
})
