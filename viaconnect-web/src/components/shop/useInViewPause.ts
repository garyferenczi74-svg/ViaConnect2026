'use client'

import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { getMotionScheduler } from './coming-soon-motion'

/**
 * Thin wrapper. Cap, document order, reduced motion, and the cs-zoom
 * end listener stay in the shared scheduler. This hook only registers,
 * unregisters, and syncs. Markup renders data-cs-paused so server and
 * client match. useLayoutEffect writes the remembered pose back before
 * paint when a parent re-render resets that attribute.
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
