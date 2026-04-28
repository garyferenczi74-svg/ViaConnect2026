'use client'
import { useCallback } from 'react'

export function useSmoothScrollAnchor(navOffsetPx: number = 80) {
    return useCallback((id: string) => {
        // Path X dual-tree: pick the visible (non display:none) duplicate.
        // offsetParent is null for elements inside a display:none ancestor.
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[id="${id}"]`))
        const target =
            candidates.find((c) => c.offsetParent !== null) ??
            (document.getElementById(id) as HTMLElement | null)

        if (!target) {
            console.warn(`[useSmoothScrollAnchor] No element with id="${id}" found.`)
            return
        }

        const top = target.getBoundingClientRect().top + window.scrollY - navOffsetPx
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
        history.pushState(null, '', `#${id}`)

        if (process.env.NODE_ENV === 'development') {
            console.log(`[useSmoothScrollAnchor] Scrolled to #${id} at ${top}px`)
        }

        const moveFocus = () => {
            try {
                const heading = target.querySelector('h2, h3, [tabindex]') as HTMLElement | null
                if (heading) {
                    heading.setAttribute('tabindex', heading.getAttribute('tabindex') ?? '-1')
                    heading.focus({ preventScroll: true })
                }
            } catch {
                /* older browsers may throw on focus options; ignore */
            }
        }

        if ('onscrollend' in window) {
            const handleEnd = () => {
                window.removeEventListener('scrollend', handleEnd)
                moveFocus()
            }
            window.addEventListener('scrollend', handleEnd)
            window.setTimeout(() => {
                window.removeEventListener('scrollend', handleEnd)
            }, 1500)
        } else {
            window.setTimeout(() => {
                window.requestAnimationFrame(moveFocus)
            }, 120)
        }
    }, [navOffsetPx])
}
