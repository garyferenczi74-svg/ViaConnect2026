'use client'
import { useEffect, useState } from 'react'

export function useActiveSection(sectionIds: readonly string[], navOffsetPx: number = 80): string | null {
    const [activeId, setActiveId] = useState<string | null>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
                if (visible[0]) {
                    const nextId = visible[0].target.id
                    setActiveId(nextId)
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[useActiveSection] Active section changed to: ${nextId}`)
                    }
                }
            },
            {
                rootMargin: `-${navOffsetPx}px 0px -50% 0px`,
                threshold: [0.25, 0.5, 0.75],
            }
        )

        // Path X dual-tree: both Desktop and Mobile trees mount with duplicate
        // ids. Observe all matching elements; only the visible (non display:none)
        // tree's intersections actually fire, so activeId stays unambiguous.
        sectionIds.forEach((id) => {
            document.querySelectorAll(`[id="${id}"]`).forEach((el) => observer.observe(el))
        })

        return () => observer.disconnect()
    }, [sectionIds, navOffsetPx])

    return activeId
}
