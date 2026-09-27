'use client'

import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { getMotionScheduler } from './coming-soon-motion'

/**
 * Registers the overlay with the shared scheduler after mount.
 * The markup always renders data-cs-paused so server and client match.
 * useLayoutEffect writes the remembered pose back before paint when a
 * parent re-render resets that attribute from the virtual DOM.
 */
export function useInViewPause(ref: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const node = ref.current
        if (!node) return undefined
        const scheduler = getMotionScheduler()
        scheduler.register(node)
        return () => {
            scheduler.unregister(node)
        }
    }, [ref])

    useLayoutEffect(() => {
        const node = ref.current
        if (!node) return
        getMotionScheduler().sync(node)
    })
}
