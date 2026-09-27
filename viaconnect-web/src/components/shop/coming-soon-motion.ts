/**
 * One shared IntersectionObserver for coming soon overlays.
 * At most 12 overlays run. On-screen cards take those slots before the
 * rootMargin pre-load band. The rest that are on screen get data-cs-static.
 * Off-screen overlays, including pre-load cards that did not get a slot,
 * get data-cs-paused. Reduced motion never observes and never runs.
 * COMING_SOON_MAX_RUN_MS is the only switch for a future duration stop.
 * This module is self-contained so tests can evaluate it in a browser.
 */

export interface MotionIntroStyle {
    animation: string
    opacity: string
    transform: string
}

export interface MotionNode {
    setAttribute(qualifiedName: string, value: string): void
    removeAttribute(qualifiedName: string): void
    compareDocumentPosition(other: Node): number
    querySelector?(selector: string): { style: MotionIntroStyle } | null
}

export interface MotionEntry {
    target: MotionNode
    isIntersecting: boolean
    intersectionRatio?: number
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

export interface MotionMediaQuery {
    matches: boolean
    addEventListener?(type: 'change', listener: (event: { matches: boolean }) => void): void
}

export interface MotionSchedulerOptions {
    cap?: number
    rootMargin?: string
    IO?: MotionObserverConstructor
    matchMedia?: (query: string) => MotionMediaQuery
    /** Test clock. Production uses Date.now. */
    now?: () => number
    /** Overrides COMING_SOON_MAX_RUN_MS. Infinity does not stop the bob. */
    maxRunMs?: number
}

export interface MotionScheduler {
    register(node: MotionNode): void
    unregister(node: MotionNode): void
    sync(node: MotionNode): void
}

/**
 * WCAG 2.2.2 is open for Gary. Infinity means the bob does not stop.
 * Set this to a finite duration in milliseconds to stop every overlay
 * at the static mid pose. No other edit is required.
 */
export const COMING_SOON_MAX_RUN_MS = Number.POSITIVE_INFINITY

interface ViewState {
    onScreen: boolean
    near: boolean
}

export function createMotionScheduler(options?: MotionSchedulerOptions): MotionScheduler {
    const DOCUMENT_POSITION_PRECEDING = 2
    const DOCUMENT_POSITION_FOLLOWING = 4
    const DEFAULT_CAP = 12
    const DEFAULT_ROOT_MARGIN = '100px'
    const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
    const cap = options?.cap ?? DEFAULT_CAP
    const rootMargin = options?.rootMargin ?? DEFAULT_ROOT_MARGIN
    const maxRunMs = options?.maxRunMs ?? COMING_SOON_MAX_RUN_MS
    const now = options?.now ?? Date.now

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
                            intersectionRatio: entry.intersectionRatio,
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
    const media = match?.(REDUCED_QUERY)
    let reduced = media?.matches === true
    const IO: MotionObserverConstructor | undefined =
        options && 'IO' in options
            ? options.IO
            : typeof IntersectionObserver === 'undefined'
              ? undefined
              : browserObserver(IntersectionObserver)

    const view = new Map<MotionNode, ViewState>()
    const introduced = new WeakSet<MotionNode>()
    let observer: MotionObserver | null = null
    let runStartedAt: number | null = null

    function pastMax(): boolean {
        if (!Number.isFinite(maxRunMs)) return false
        if (runStartedAt === null) runStartedAt = now()
        return now() - runStartedAt >= maxRunMs
    }

    function settleIntro(node: MotionNode): void {
        const intro = node.querySelector?.('.cs-intro')
        if (!intro) return
        intro.style.animation = 'none'
        intro.style.opacity = '1'
        intro.style.transform = 'none'
    }

    function holdStatic(node: MotionNode): void {
        introduced.add(node)
        node.removeAttribute('data-cs-paused')
        node.setAttribute('data-cs-static', 'true')
    }

    function classify(entry: MotionEntry): ViewState {
        if (!entry.isIntersecting) return { onScreen: false, near: false }
        if (entry.intersectionRatio === undefined || entry.intersectionRatio > 0) {
            return { onScreen: true, near: true }
        }
        return { onScreen: false, near: true }
    }

    function apply(): void {
        const nodes = [...view.keys()].sort(documentOrder)
        if (reduced || pastMax()) {
            for (const node of nodes) holdStatic(node)
            return
        }
        const onScreen = nodes.filter((node) => view.get(node)?.onScreen === true)
        const preload = nodes.filter((node) => {
            const state = view.get(node)
            return state?.near === true && state.onScreen !== true
        })
        const runningNodes = new Set([...onScreen, ...preload].slice(0, cap))
        for (const node of nodes) {
            const state = view.get(node)
            const on = state?.onScreen === true
            if (runningNodes.has(node)) {
                if (introduced.has(node)) settleIntro(node)
                node.removeAttribute('data-cs-paused')
                node.removeAttribute('data-cs-static')
            } else if (on) {
                holdStatic(node)
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
                    if (!view.has(entry.target)) continue
                    view.set(entry.target, classify(entry))
                }
                apply()
            }, { rootMargin })
        }
        return observer
    }

    media?.addEventListener?.('change', (event) => {
        reduced = event.matches
        if (reduced && observer) {
            observer.disconnect()
            observer = null
        }
        if (!reduced) {
            const current = ensureObserver()
            if (current) {
                for (const node of view.keys()) current.observe(node)
            }
        }
        apply()
    })

    return {
        register(node: MotionNode): void {
            if (view.has(node)) return
            view.set(node, { onScreen: false, near: false })
            const current = ensureObserver()
            current?.observe(node)
            apply()
        },
        unregister(node: MotionNode): void {
            if (!view.has(node)) return
            view.delete(node)
            observer?.unobserve(node)
            if (view.size === 0 && observer) {
                observer.disconnect()
                observer = null
            }
            apply()
        },
        sync(node: MotionNode): void {
            if (!view.has(node)) return
            apply()
        },
    }
}

let singleton: MotionScheduler | null = null

export function getMotionScheduler(): MotionScheduler {
    if (!singleton) singleton = createMotionScheduler()
    return singleton
}
