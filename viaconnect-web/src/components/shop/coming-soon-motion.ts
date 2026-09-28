/**
 * One shared IntersectionObserver for coming soon overlays.
 * At most 12 unfinished overlays run. On-screen cards take those slots
 * before the rootMargin pre-load band. On-screen cards past the cap get
 * data-cs-static. Off-screen overlays, including pre-load cards that did
 * not get a slot, get data-cs-paused. A finished zoom frees its slot.
 * data-cs-static is set after cs-zoom ends (animationend on .cs-word when
 * animationName === 'cs-zoom', or a fallback of the card's --cs-delay plus
 * COMING_SOON_ZOOM_MS plus COMING_SOON_ZOOM_MARGIN_MS). The margin keeps
 * the timeout from firing mid-zoom. Reduced motion never observes and is
 * static from the start.
 * The 12 slots count unfinished zooms only (playState !== 'finished':
 * running, or still waiting out --cs-delay). A finished zoom frees its slot.
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
    addEventListener?(type: string, listener: (event: Event) => void): void
    removeEventListener?(type: string, listener: (event: Event) => void): void
    style?: { getPropertyValue(property: string): string }
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
    /** Overrides COMING_SOON_ZOOM_MS. Fallback is --cs-delay plus this many ms plus the margin. */
    zoomMs?: number
}

export interface MotionScheduler {
    register(node: MotionNode): void
    unregister(node: MotionNode): void
    sync(node: MotionNode): void
}

/**
 * cs-zoom duration. Settles and holds LARGE by 3.0 s after its delay
 * (≤ 3.4 s per grid); no overshoot; continuous speed.
 * The fallback waits this long, plus the card delay, plus the margin.
 */
export const COMING_SOON_ZOOM_MS = 3000

/** Extra time so the fallback never fires while cs-zoom is still running. */
export const COMING_SOON_ZOOM_MARGIN_MS = 75

interface ViewState {
    onScreen: boolean
    near: boolean
}

function animationNameOf(event: Event): string {
    if (!('animationName' in event)) return ''
    const name = (event as Event & { animationName?: unknown }).animationName
    return typeof name === 'string' ? name : ''
}

function delayMsOf(node: MotionNode): number {
    const raw = node.style?.getPropertyValue('--cs-delay') ?? ''
    const seconds = Number.parseFloat(raw)
    if (!Number.isFinite(seconds) || seconds <= 0) return 0
    return seconds * 1000
}

export function createMotionScheduler(options?: MotionSchedulerOptions): MotionScheduler {
    const DOCUMENT_POSITION_PRECEDING = 2
    const DOCUMENT_POSITION_FOLLOWING = 4
    const DEFAULT_CAP = 12
    const DEFAULT_ROOT_MARGIN = '100px'
    const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
    const cap = options?.cap ?? DEFAULT_CAP
    const rootMargin = options?.rootMargin ?? DEFAULT_ROOT_MARGIN
    const zoomMs = options?.zoomMs ?? COMING_SOON_ZOOM_MS
    const marginMs = COMING_SOON_ZOOM_MARGIN_MS
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
        settled: boolean
        timer: ReturnType<typeof setTimeout> | null
        segmentStart: number | null
        ranMs: number
        onZoomEnd: (event: Event) => void
    }

    const tracked = new Map<MotionNode, Tracked>()
    const introduced = new WeakSet<MotionNode>()
    let observer: MotionObserver | null = null
    let applying = false
    let applyAgain = false

    function clearTimer(entry: Tracked): void {
        if (entry.timer === null) return
        clearTimeout(entry.timer)
        entry.timer = null
    }

    function pauseClock(entry: Tracked): void {
        if (entry.segmentStart !== null) {
            entry.ranMs += Math.max(0, now() - entry.segmentStart)
            entry.segmentStart = null
        }
        clearTimer(entry)
    }

    function finish(node: MotionNode): void {
        const entry = tracked.get(node)
        if (!entry || entry.settled) return
        entry.settled = true
        pauseClock(entry)
        apply()
    }

    function armFallback(node: MotionNode, entry: Tracked): void {
        if (entry.settled || entry.timer !== null) return
        if (entry.segmentStart === null) entry.segmentStart = now()
        const total = delayMsOf(node) + zoomMs + marginMs
        const elapsed = entry.ranMs + Math.max(0, now() - entry.segmentStart)
        if (elapsed >= total) {
            entry.settled = true
            pauseClock(entry)
            return
        }
        const handle = setTimeout(() => {
            const current = tracked.get(node)
            if (!current || current.timer !== handle) return
            current.timer = null
            if (current.settled) return
            current.settled = true
            pauseClock(current)
            apply()
        }, total - elapsed)
        const maybe = handle as { unref?: () => void }
        maybe.unref?.()
        entry.timer = handle
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

    function applyOnce(): boolean {
        const nodes = [...tracked.keys()].sort(documentOrder)
        const eligible = reduced
            ? []
            : nodes.filter((node) => tracked.get(node)?.settled !== true)
        const onScreen = eligible.filter((node) => tracked.get(node)?.view.onScreen === true)
        const preload = eligible.filter((node) => {
            const state = tracked.get(node)?.view
            return state?.near === true && state.onScreen !== true
        })
        const runningNodes = new Set([...onScreen, ...preload].slice(0, cap))
        let newlySettled = false
        for (const node of nodes) {
            const entry = tracked.get(node)
            if (!entry) continue
            if (reduced) {
                pauseClock(entry)
                entry.ranMs = 0
                holdStatic(node)
                continue
            }
            if (entry.settled) {
                pauseClock(entry)
                holdStatic(node)
                continue
            }
            const running = runningNodes.has(node)
            if (running) {
                armFallback(node, entry)
                if (entry.settled) {
                    newlySettled = true
                    holdStatic(node)
                    continue
                }
                if (introduced.has(node)) settleIntro(node)
                node.removeAttribute('data-cs-paused')
                node.removeAttribute('data-cs-static')
            } else if (entry.view.onScreen === true) {
                pauseClock(entry)
                holdStatic(node)
            } else {
                pauseClock(entry)
                node.removeAttribute('data-cs-static')
                node.setAttribute('data-cs-paused', 'true')
            }
        }
        return newlySettled
    }

    function apply(): void {
        if (applying) {
            applyAgain = true
            return
        }
        applying = true
        try {
            let spins = 0
            let again = true
            while (again && spins < 8) {
                spins += 1
                again = applyOnce()
            }
        } finally {
            applying = false
        }
        if (applyAgain) {
            applyAgain = false
            apply()
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
                settled: false,
                timer: null,
                segmentStart: null,
                ranMs: 0,
                onZoomEnd(event: Event) {
                    if (animationNameOf(event) !== 'cs-zoom') return
                    finish(node)
                },
            }
            tracked.set(node, entry)
            node.addEventListener?.('animationend', entry.onZoomEnd)
            const current = ensureObserver()
            current?.observe(node)
            apply()
        },
        unregister(node: MotionNode): void {
            const entry = tracked.get(node)
            if (!entry) return
            clearTimer(entry)
            node.removeEventListener?.('animationend', entry.onZoomEnd)
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
