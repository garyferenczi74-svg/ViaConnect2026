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

        // Bare setTimeout / requestAnimationFrame avoid the TS narrowing issue
        // where `'onscrollend' in window` narrows `window` weirdly in the else branch.
        const supportsScrollEnd = 'onscrollend' in window
        if (supportsScrollEnd) {
            const handleEnd = () => {
                window.removeEventListener('scrollend' as keyof WindowEventMap, handleEnd)
                moveFocus()
            }
            window.addEventListener('scrollend' as keyof WindowEventMap, handleEnd)
            setTimeout(() => {
                window.removeEventListener('scrollend' as keyof WindowEventMap, handleEnd)
            }, 1500)
        } else {
            setTimeout(() => {
                requestAnimationFrame(moveFocus)
            }, 120)
        }
    }, [navOffsetPx])
}
