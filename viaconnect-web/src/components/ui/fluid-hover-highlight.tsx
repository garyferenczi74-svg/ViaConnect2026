/**
 * Pattern adapted from: https://21st.dev/@educalvolpz/components/fluid-hover-highlight
 * Original commit SHA: unpublished 21st.dev community component
 * Original file path: components/ui/fluid-hover-highlight.tsx
 * Original license: MIT
 * Date reviewed: 2026-11-08
 * Sherlock research artifact: Gary landing Process fluid hover request
 * Re-derivation: Michelangelo via OBRA - ViaConnect Process step highlight
 * Verbatim copy: None (Audit-phase attested)
 *
 * Gliding fill behind the active step. The container is position:relative.
 * Motion comes from framer-motion (already a dependency). prefers-reduced-motion
 * snaps the travel instead of springing.
 */
'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
    FLUID_SPRING_EXIT,
    fluidHighlightTransition,
    highlightRectForState,
    toHighlightTarget,
    type FluidSpring,
    type ItemRect,
} from '@/components/ui/fluid-hover-math'

export interface FluidHoverSource {
    activeIndex: number | null
    itemRects: Array<ItemRect | null>
    isMeasured: boolean
    session: number
}

interface HighlightFromHook {
    hidden?: boolean
    hover: FluidHoverSource
    rect?: never
    session?: never
}

interface HighlightFromRect {
    hidden?: never
    hover?: never
    rect: ItemRect | null
    session: number
}

export type FluidHoverHighlightProps = (HighlightFromHook | HighlightFromRect) & {
    className?: string
    /** Where a fresh session fades in from. Defaults to the destination rect. */
    from?: ItemRect | null
    /** Positional spring. `false` snaps with no travel. */
    transition?: FluidSpring | false
}

function resolveSource(props: FluidHoverHighlightProps): { rect: ItemRect | null; session: number } {
    if (props.hover) {
        return {
            rect: highlightRectForState({
                hidden: props.hidden,
                activeIndex: props.hover.activeIndex,
                itemRects: props.hover.itemRects,
                isMeasured: props.hover.isMeasured,
            }),
            session: props.hover.session,
        }
    }
    return { rect: props.rect, session: props.session }
}

/**
 * Absolute fill that springs between measured step rects.
 * Owns no radius or color. Pass those through className.
 */
export function FluidHoverHighlight(props: FluidHoverHighlightProps) {
    const { from, className, transition } = props
    const { rect, session } = resolveSource(props)
    const reduceMotion = useReducedMotion() ?? false

    return (
        <AnimatePresence>
            {rect ? (
                <motion.div
                    key={session}
                    data-slot="fluid-hover-highlight"
                    aria-hidden="true"
                    className={cn('pointer-events-none absolute top-0 left-0', className)}
                    style={{ position: 'absolute' }}
                    initial={{ opacity: 0, ...toHighlightTarget(from ?? rect) }}
                    animate={{ opacity: 1, ...toHighlightTarget(rect) }}
                    exit={{ opacity: 0, transition: FLUID_SPRING_EXIT }}
                    transition={fluidHighlightTransition(reduceMotion, transition)}
                />
            ) : null}
        </AnimatePresence>
    )
}

export default FluidHoverHighlight
