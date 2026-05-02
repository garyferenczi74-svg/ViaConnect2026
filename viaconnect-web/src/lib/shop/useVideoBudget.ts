/**
 * Video budget hook per Prompt #143 §4.
 *
 * Centralizes the three gates that decide whether a tile video is allowed
 * to load on the current device + session: prefers-reduced-motion, network
 * effective type, and Save-Data preference. The connection check runs once
 * per page load; mid-session connection changes do not affect already
 * loaded videos per §4.2.
 *
 * Hook returns boolean shouldRenderVideo. CollectionTileVideoLayer short
 * circuits to null when this is false so no <video> element ever enters
 * the DOM, keeping the static tile path lean.
 */
'use client'

import { useEffect, useState } from 'react'

interface NavigatorConnection {
    effectiveType?: string
    saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
    connection?: NavigatorConnection
    mozConnection?: NavigatorConnection
    webkitConnection?: NavigatorConnection
}

const SLOW_NETWORK_TYPES = new Set(['slow-2g', '2g', '3g'])

function readConnection(): NavigatorConnection | undefined {
    if (typeof navigator === 'undefined') return undefined
    const nav = navigator as NavigatorWithConnection
    return nav.connection ?? nav.mozConnection ?? nav.webkitConnection
}

export function useVideoBudget(): boolean {
    const [allowed, setAllowed] = useState<boolean>(false)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reducedMotion) {
            setAllowed(false)
            return
        }

        const conn = readConnection()
        if (conn?.saveData) {
            setAllowed(false)
            return
        }
        if (conn?.effectiveType && SLOW_NETWORK_TYPES.has(conn.effectiveType)) {
            setAllowed(false)
            return
        }

        setAllowed(true)
    }, [])

    return allowed
}

interface UseInViewportOptions {
    rootMarginEnter: string
    rootMarginExit: string
}

/**
 * IntersectionObserver-driven viewport state per Prompt #143 §4.1.
 *
 * Returns isInViewport boolean. The asymmetric rootMargin (200px for
 * enter, 400px for exit) lets the video begin loading slightly before
 * the user sees the tile and stays loaded across short scroll-by gestures
 * to avoid thrash.
 *
 * Caller decides what to do with the boolean. Typical wiring: when true,
 * inject <source> tags + load() + play(); when false, pause(). Component
 * may also choose to release source tags on exit for memory pressure.
 */
export function useInViewport(
    ref: React.RefObject<Element | null>,
    options: UseInViewportOptions = {
        rootMarginEnter: '200px',
        rootMarginExit: '400px',
    },
): boolean {
    const [inView, setInView] = useState<boolean>(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const node = ref.current
        if (!node) return

        let entered = false
        const enterObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && !entered) {
                        entered = true
                        setInView(true)
                    }
                }
            },
            { rootMargin: options.rootMarginEnter, threshold: 0 },
        )
        const exitObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting && entered) {
                        setInView(false)
                        entered = false
                    }
                }
            },
            { rootMargin: options.rootMarginExit, threshold: 0 },
        )

        enterObserver.observe(node)
        exitObserver.observe(node)
        return () => {
            enterObserver.disconnect()
            exitObserver.disconnect()
        }
    }, [ref, options.rootMarginEnter, options.rootMarginExit])

    return inView
}
