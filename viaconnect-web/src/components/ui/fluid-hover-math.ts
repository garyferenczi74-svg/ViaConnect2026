/**
 * Pattern adapted from: https://21st.dev/@educalvolpz/components/fluid-hover-highlight
 * Original commit SHA: unpublished 21st.dev community component
 * Original file path: components/ui/fluid-hover-highlight-utils/use-fluid-hover.ts
 * Original license: MIT
 * Date reviewed: 2026-11-08
 * Sherlock research artifact: Gary landing Process fluid hover request
 * Re-derivation: Michelangelo via OBRA - ViaConnect Process step highlight
 * Verbatim copy: None (Audit-phase attested)
 *
 * Pure geometry and session rules for the gliding step highlight.
 * Framer Motion consumes the results; this module stays free of React.
 */

export interface ItemRect {
    top: number
    left: number
    width: number
    height: number
}

export interface HighlightTarget {
    x: number
    y: number
    width: number
    height: number
}

export type FluidHoverSource = 'pointer' | 'focus' | 'auto'

export interface FluidHoverModel {
    activeIndex: number | null
    session: number
    source: FluidHoverSource | null
    pointerIndex: number | null
    focusIndex: number | null
    /** Step the cycle resumes from after hover or focus ends. */
    autoIndex: number | null
    /** False under prefers-reduced-motion: hover and focus only, no cycle. */
    autoplay: boolean
}

export type FluidHoverEvent =
    | { type: 'pointer'; index: number | null }
    | { type: 'focus'; index: number | null }
    | { type: 'blur' }
    | { type: 'leave' }
    | { type: 'auto'; index: number }
    | { type: 'autoplay'; enabled: boolean }

export interface FluidSpring {
    type: 'spring'
    stiffness: number
    damping: number
    mass: number
}

export interface FluidTween {
    duration: number
}

export const FLUID_FADE: FluidTween = { duration: 0.08 }
export const FLUID_SNAP: FluidTween = { duration: 0 }

/** Positional glide between steps. Exit is a separate, slightly softer spring. */
export const FLUID_SPRING: FluidSpring = {
    type: 'spring',
    stiffness: 520,
    damping: 42,
    mass: 0.72,
}

export const FLUID_SPRING_EXIT: FluidSpring = {
    type: 'spring',
    stiffness: 420,
    damping: 40,
    mass: 0.6,
}

export const initialFluidHoverModel = (): FluidHoverModel => ({
    activeIndex: null,
    session: 0,
    source: null,
    pointerIndex: null,
    focusIndex: null,
    autoIndex: null,
    autoplay: false,
})

export function itemRectFromOffset(node: HTMLElement): ItemRect {
    return {
        top: node.offsetTop,
        left: node.offsetLeft,
        width: node.offsetWidth,
        height: node.offsetHeight,
    }
}

export function toHighlightTarget(rect: ItemRect): HighlightTarget {
    return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
    }
}

export function highlightRectForState(input: {
    hidden?: boolean
    activeIndex: number | null
    itemRects: Array<ItemRect | null>
    isMeasured: boolean
}): ItemRect | null {
    if (input.hidden || !input.isMeasured || input.activeIndex === null) return null
    return input.itemRects[input.activeIndex] ?? null
}

/**
 * Pick the step under a point in the container's content box.
 * Gaps fall through to the nearest center so the highlight glides
 * instead of dropping out between columns.
 */
export function indexAtContainerPoint(
    x: number,
    y: number,
    rects: Array<ItemRect | null>,
): number | null {
    let containing: number | null = null
    let closestIndex: number | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    rects.forEach((rect, index) => {
        if (!rect || rect.width <= 0 || rect.height <= 0) return
        const inside =
            x >= rect.left &&
            x <= rect.left + rect.width &&
            y >= rect.top &&
            y <= rect.top + rect.height
        if (inside) containing = index
        const dx = x - (rect.left + rect.width / 2)
        const dy = y - (rect.top + rect.height / 2)
        const distance = dx * dx + dy * dy
        if (distance < closestDistance) {
            closestDistance = distance
            closestIndex = index
        }
    })

    return containing ?? closestIndex
}

export function sameItemRects(
    left: Array<ItemRect | null>,
    right: Array<ItemRect | null>,
): boolean {
    if (left.length !== right.length) return false
    for (let index = 0; index < left.length; index += 1) {
        const a = left[index]
        const b = right[index]
        if (a === b) continue
        if (!a || !b) return false
        if (a.top !== b.top || a.left !== b.left || a.width !== b.width || a.height !== b.height) {
            return false
        }
    }
    return true
}

function displayedIndex(model: FluidHoverModel): number | null {
    if (model.source === 'focus') return model.focusIndex
    if (model.source === 'pointer') return model.pointerIndex
    if (model.source === 'auto' && model.autoplay) return model.autoIndex
    return null
}

function withActive(model: FluidHoverModel, patch: Partial<FluidHoverModel>): FluidHoverModel {
    const draft: FluidHoverModel = { ...model, ...patch }
    const activeIndex = displayedIndex(draft)
    const session = model.activeIndex === null && activeIndex !== null ? model.session + 1 : model.session
    if (
        activeIndex === model.activeIndex &&
        session === model.session &&
        draft.source === model.source &&
        draft.pointerIndex === model.pointerIndex &&
        draft.focusIndex === model.focusIndex &&
        draft.autoIndex === model.autoIndex &&
        draft.autoplay === model.autoplay
    ) {
        return model
    }
    return { ...draft, activeIndex, session }
}

/**
 * Pointer hover wins until a focus event. Keyboard focus then wins
 * until the pointer moves again. Auto-advance fills in only while
 * nothing is hovered or focused. A fresh session starts only when the
 * highlight appears after being hidden, so travel between steps glides.
 */
export function reduceFluidHover(model: FluidHoverModel, event: FluidHoverEvent): FluidHoverModel {
    if (event.type === 'autoplay') {
        if (model.autoplay === event.enabled) return model
        if (!event.enabled && model.source === 'auto') {
            return withActive(model, { autoplay: false, source: null })
        }
        return withActive(model, { autoplay: event.enabled })
    }

    if (event.type === 'auto') {
        if (!model.autoplay) return model
        if (model.source === 'pointer' || model.source === 'focus') return model
        if (!Number.isInteger(event.index) || event.index < 0) return model
        return withActive(model, { source: 'auto', autoIndex: event.index })
    }

    if (event.type === 'pointer') {
        if (event.index === null) return reduceFluidHover(model, { type: 'leave' })
        return withActive(model, {
            pointerIndex: event.index,
            source: 'pointer',
            autoIndex: event.index,
        })
    }

    if (event.type === 'focus') {
        if (event.index === null) return reduceFluidHover(model, { type: 'blur' })
        return withActive(model, {
            focusIndex: event.index,
            source: 'focus',
            autoIndex: event.index,
        })
    }

    if (event.type === 'leave') {
        const source: FluidHoverSource | null = model.focusIndex !== null
            ? 'focus'
            : model.autoplay && model.autoIndex !== null
                ? 'auto'
                : null
        return withActive(model, { pointerIndex: null, source })
    }

    const source: FluidHoverSource | null = model.pointerIndex !== null
        ? 'pointer'
        : model.autoplay && model.autoIndex !== null
            ? 'auto'
            : null
    return withActive(model, { focusIndex: null, source })
}

export function fluidModelsEqual(left: FluidHoverModel, right: FluidHoverModel): boolean {
    return (
        left.activeIndex === right.activeIndex &&
        left.session === right.session &&
        left.source === right.source &&
        left.pointerIndex === right.pointerIndex &&
        left.focusIndex === right.focusIndex &&
        left.autoIndex === right.autoIndex &&
        left.autoplay === right.autoplay
    )
}

export type FluidHighlightTransition = FluidSpring | FluidTween | (FluidSpring & { opacity: FluidTween }) | (FluidTween & { opacity: FluidTween })

/**
 * Reduced motion snaps. Otherwise the position springs and opacity fades.
 * `travel === false` also snaps, matching a caller that wants no glide.
 */
export function fluidHighlightTransition(
    reduceMotion: boolean,
    travel?: FluidSpring | false,
): FluidHighlightTransition {
    if (reduceMotion || travel === false) return FLUID_SNAP
    return { ...(travel ?? FLUID_SPRING), opacity: FLUID_FADE }
}
