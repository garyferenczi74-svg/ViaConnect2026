/**
 * One shared IntersectionObserver for coming soon overlays.
 * At most 12 intersecting overlays run. The rest that are in view get
 * data-cs-static (mid-state). Off-screen overlays get data-cs-paused.
 * Reduced motion never observes and never runs.
 * This module is self-contained so tests can evaluate it in a browser.
 */

export interface MotionNode {
    setAttribute(qualifiedName: string, value: string): void
    removeAttribute(qualifiedName: string): void
    compareDocumentPosition(other: Node): number
}

export interface MotionEntry {
    target: MotionNode
    isIntersecting: boolean
}

export interface MotionObserver {
    observe(target: MotionNode): void
    unobserve(target: MotionNode): void
    disconnect(): void
}

export interface MotionObserverInit {
    rootMargin?: string
}

export type MotionObserverConstructor = new (
    callback: (entries: readonly MotionEntry[]) => void,
    options?: MotionObserverInit,
) => MotionObserver

export interface MotionSchedulerOptions {
    cap?: number
    rootMargin?: string
    IO?: MotionObserverConstructor
    matchMedia?: (query: string) => { matches: boolean }
}

export interface MotionScheduler {
    register(node: MotionNode): void
    unregister(node: MotionNode): void
    sync(node: MotionNode): void
}

export function createMotionScheduler(options?: MotionSchedulerOptions): MotionScheduler {
    const DOCUMENT_POSITION_PRECEDING = 2
    const DOCUMENT_POSITION_FOLLOWING = 4
    const DEFAULT_CAP = 12
    const DEFAULT_ROOT_MARGIN = '100px'
    const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
    const cap = options?.cap ?? DEFAULT_CAP
    const rootMargin = options?.rootMargin ?? DEFAULT_ROOT_MARGIN

    function documentOrder(a: MotionNode, b: MotionNode): number {
        if (a === b) return 0
        const position = a.compareDocumentPosition(b as unknown as Node)
        if (position & DOCUMENT_POSITION_FOLLOWING) return -1
        if (position & DOCUMENT_POSITION_PRECEDING) return 1
        return 0
    }

    function browserObserver(native: typeof IntersectionObserver): MotionObserverConstructor {
        return class BrowserMotionObserver implements MotionObserver {
            private inner: IntersectionObserver

            constructor(
                callback: (entries: readonly MotionEntry[]) => void,
                options?: MotionObserverInit,
            ) {
                this.inner = new native((entries) => {
                    callback(
                        entries.map((entry) => ({
                            target: entry.target,
                            isIntersecting: entry.isIntersecting,
                        })),
                    )
                }, options)
            }

            observe(target: MotionNode): void {
                this.inner.observe(target as unknown as Element)
            }

            unobserve(target: MotionNode): void {
                this.inner.unobserve(target as unknown as Element)
            }

            disconnect(): void {
                this.inner.disconnect()
            }
        }
    }
    const match = options?.matchMedia
        ?? (typeof matchMedia === 'function' ? matchMedia.bind(globalThis) : undefined)
    const reduced = match?.(REDUCED_QUERY).matches === true
    const IO: MotionObserverConstructor | undefined =
        options && 'IO' in options
            ? options.IO
            : typeof IntersectionObserver === 'undefined'
              ? undefined
              : browserObserver(IntersectionObserver)

    const intersecting = new Map<MotionNode, boolean>()
    let observer: MotionObserver | null = null

    function apply(): void {
        const nodes = [...intersecting.keys()].sort(documentOrder)
        if (reduced) {
            for (const node of nodes) {
                node.removeAttribute('data-cs-paused')
                node.setAttribute('data-cs-static', 'true')
            }
            return
        }
        let running = 0
        for (const node of nodes) {
            const inView = intersecting.get(node) === true
            if (inView && running < cap) {
                node.removeAttribute('data-cs-paused')
                node.removeAttribute('data-cs-static')
                running += 1
            } else if (inView) {
                node.removeAttribute('data-cs-paused')
                node.setAttribute('data-cs-static', 'true')
            } else {
                node.removeAttribute('data-cs-static')
                node.setAttribute('data-cs-paused', 'true')
            }
        }
    }

    function ensureObserver(): MotionObserver | null {
        if (reduced || !IO) return null
        if (!observer) {
            observer = new IO((entries) => {
                for (const entry of entries) {
                    if (!intersecting.has(entry.target)) continue
                    intersecting.set(entry.target, entry.isIntersecting)
                }
                apply()
            }, { rootMargin })
        }
        return observer
    }

    return {
        register(node: MotionNode): void {
            if (intersecting.has(node)) return
            intersecting.set(node, false)
            const current = ensureObserver()
            current?.observe(node)
            apply()
        },
        unregister(node: MotionNode): void {
            if (!intersecting.has(node)) return
            intersecting.delete(node)
            observer?.unobserve(node)
            if (intersecting.size === 0 && observer) {
                observer.disconnect()
                observer = null
            }
            apply()
        },
        sync(node: MotionNode): void {
            if (!intersecting.has(node)) return
            apply()
        },
    }
}

let singleton: MotionScheduler | null = null

export function getMotionScheduler(): MotionScheduler {
    if (!singleton) singleton = createMotionScheduler()
    return singleton
}
