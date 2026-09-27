/**
 * One shared IntersectionObserver for coming soon overlays.
 * At most 12 overlays run. On-screen cards take those slots before the
 * rootMargin pre-load band. The rest that are on screen get data-cs-static.
 * Off-screen overlays, including pre-load cards that did not get a slot,
 * get data-cs-paused. Reduced motion never observes and never runs.
 * COMING_SOON_MAX_RUN_MS stops each overlay at the static mid pose.
 * One timer per registered node, cleared on unregister. The intro delay
 * sits inside that window. The settle transition finishes by the cap.
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
    /** Overrides COMING_SOON_SETTLE_MS. The attribute flips this long before the cap. */
    settleMs?: number
}

export interface MotionScheduler {
    register(node: MotionNode): void
    unregister(node: MotionNode): void
    sync(node: MotionNode): void
}

/**
 * Motion ends by this many milliseconds after the overlay registers.
 * The intro delay is inside the window, not added after it.
 * Reversible: set this to Infinity to restore the endless bob.
 */
export const COMING_SOON_MAX_RUN_MS = 5000

/**
 * Length of the static-pose transition appended to the stylesheet.
 * The attribute flips this early so the transition finishes by the cap.
 */
export const COMING_SOON_SETTLE_MS = 200

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
    const settleMs = options?.settleMs ?? COMING_SOON_SETTLE_MS
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

    interface Tracked {
        view: ViewState
        mountedAt: number
        settled: boolean
        timer: ReturnType<typeof setTimeout> | null
    }

    const tracked = new Map<MotionNode, Tracked>()
    const introduced = new WeakSet<MotionNode>()
    let observer: MotionObserver | null = null

    function settleAtMs(): number {
        if (!Number.isFinite(maxRunMs)) return Number.POSITIVE_INFINITY
        return Math.max(0, maxRunMs - Math.max(0, settleMs))
    }

    function clearTimer(entry: Tracked): void {
        if (entry.timer === null) return
        clearTimeout(entry.timer)
        entry.timer = null
    }

    function arm(node: MotionNode, entry: Tracked): void {
        clearTimer(entry)
        const fireAt = settleAtMs()
        if (!Number.isFinite(fireAt)) return
        const delay = Math.max(0, fireAt - (now() - entry.mountedAt))
        if (delay === 0) {
            entry.settled = true
            return
        }
        const handle = setTimeout(() => {
            entry.timer = null
            if (!tracked.has(node)) return
            entry.settled = true
            apply()
        }, delay)
        const maybe = handle as { unref?: () => void }
        maybe.unref?.()
        entry.timer = handle
    }

    function expired(entry: Tracked): boolean {
        if (entry.settled) return true
        const fireAt = settleAtMs()
        if (!Number.isFinite(fireAt)) return false
        if (now() - entry.mountedAt < fireAt) return false
        entry.settled = true
        clearTimer(entry)
        return true
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
        const nodes = [...tracked.keys()].sort(documentOrder)
        const eligible = reduced
            ? []
            : nodes.filter((node) => {
                const entry = tracked.get(node)
                return Boolean(entry) && !expired(entry as Tracked)
            })
        const onScreen = eligible.filter((node) => tracked.get(node)?.view.onScreen === true)
        const preload = eligible.filter((node) => {
            const state = tracked.get(node)?.view
            return state?.near === true && state.onScreen !== true
        })
        const runningNodes = new Set([...onScreen, ...preload].slice(0, cap))
        for (const node of nodes) {
            const entry = tracked.get(node)
            if (!entry) continue
            if (reduced || entry.settled) {
                holdStatic(node)
                continue
            }
            const on = entry.view.onScreen === true
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
                    const trackedNode = tracked.get(entry.target)
                    if (!trackedNode) continue
                    trackedNode.view = classify(entry)
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
                for (const node of tracked.keys()) current.observe(node)
            }
        }
        apply()
    })

    return {
        register(node: MotionNode): void {
            if (tracked.has(node)) return
            const entry: Tracked = {
                view: { onScreen: false, near: false },
                mountedAt: now(),
                settled: false,
                timer: null,
            }
            tracked.set(node, entry)
            arm(node, entry)
            const current = ensureObserver()
            current?.observe(node)
            apply()
        },
        unregister(node: MotionNode): void {
            const entry = tracked.get(node)
            if (!entry) return
            clearTimer(entry)
            tracked.delete(node)
            observer?.unobserve(node)
            if (tracked.size === 0 && observer) {
                observer.disconnect()
                observer = null
            }
            apply()
        },
        sync(node: MotionNode): void {
            if (!tracked.has(node)) return
            apply()
        },
    }
}

let singleton: MotionScheduler | null = null

export function getMotionScheduler(): MotionScheduler {
    if (!singleton) singleton = createMotionScheduler()
    return singleton
}
