import { describe, expect, it } from 'vitest'
import {
    FLUID_SNAP,
    fluidHighlightTransition,
    fluidModelsEqual,
    highlightRectForState,
    indexAtContainerPoint,
    initialFluidHoverModel,
    reduceFluidHover,
    toHighlightTarget,
    type ItemRect,
} from '@/components/ui/fluid-hover-math'

const row: Array<ItemRect | null> = [
    { top: 0, left: 0, width: 100, height: 80 },
    { top: 0, left: 108, width: 100, height: 80 },
    { top: 0, left: 216, width: 100, height: 120 },
]

describe('fluid hover geometry', () => {
    it('maps a rect onto the highlight target', () => {
        expect(toHighlightTarget({ top: 4, left: 12, width: 40, height: 64 })).toEqual({
            x: 12,
            y: 4,
            width: 40,
            height: 64,
        })
    })

    it('hides the highlight until a measured step is active', () => {
        expect(highlightRectForState({
            activeIndex: 1,
            itemRects: row,
            isMeasured: false,
        })).toBeNull()
        expect(highlightRectForState({
            hidden: true,
            activeIndex: 1,
            itemRects: row,
            isMeasured: true,
        })).toBeNull()
        expect(highlightRectForState({
            activeIndex: null,
            itemRects: row,
            isMeasured: true,
        })).toBeNull()
        expect(highlightRectForState({
            activeIndex: 2,
            itemRects: row,
            isMeasured: true,
        })).toEqual(row[2])
    })

    it('chooses the column under the pointer and the nearest column in a gap', () => {
        expect(indexAtContainerPoint(20, 10, row)).toBe(0)
        expect(indexAtContainerPoint(104, 40, row)).toBe(0)
        expect(indexAtContainerPoint(112, 40, row)).toBe(1)
        expect(indexAtContainerPoint(300, 10, row)).toBe(2)
        expect(indexAtContainerPoint(10, 10, [])).toBeNull()
    })
})

describe('fluid hover session', () => {
    it('glides between steps in one session and fades in on a new entry', () => {
        const idle = initialFluidHoverModel()
        const first = reduceFluidHover(idle, { type: 'pointer', index: 0 })
        const second = reduceFluidHover(first, { type: 'pointer', index: 4 })
        const left = reduceFluidHover(second, { type: 'leave' })
        const again = reduceFluidHover(left, { type: 'pointer', index: 5 })

        expect(first.activeIndex).toBe(0)
        expect(first.session).toBe(1)
        expect(second.activeIndex).toBe(4)
        expect(second.session).toBe(first.session)
        expect(left.activeIndex).toBeNull()
        expect(left.session).toBe(second.session)
        expect(again.session).toBe(left.session + 1)
        expect(fluidModelsEqual(second, second)).toBe(true)
        expect(fluidModelsEqual(second, left)).toBe(false)
    })

    it('keeps a keyboard focus highlight after the pointer leaves', () => {
        const pointed = reduceFluidHover(initialFluidHoverModel(), { type: 'pointer', index: 1 })
        const focused = reduceFluidHover(pointed, { type: 'focus', index: 3 })
        const left = reduceFluidHover(focused, { type: 'leave' })
        const blurred = reduceFluidHover(left, { type: 'blur' })

        expect(focused.source).toBe('focus')
        expect(focused.activeIndex).toBe(3)
        expect(focused.session).toBe(pointed.session)
        expect(left.activeIndex).toBe(3)
        expect(left.source).toBe('focus')
        expect(blurred.activeIndex).toBeNull()
    })

    it('pauses the cycle on hover and resumes from that step', () => {
        const armed = reduceFluidHover(initialFluidHoverModel(), { type: 'autoplay', enabled: true })
        const first = reduceFluidHover(armed, { type: 'auto', index: 0 })
        const third = reduceFluidHover(first, { type: 'auto', index: 2 })
        const hovered = reduceFluidHover(third, { type: 'pointer', index: 4 })
        const ignored = reduceFluidHover(hovered, { type: 'auto', index: 5 })
        const resumed = reduceFluidHover(hovered, { type: 'leave' })
        const wrapped = reduceFluidHover(resumed, { type: 'auto', index: 0 })

        expect(first.session).toBe(1)
        expect(third.session).toBe(first.session)
        expect(third.activeIndex).toBe(2)
        expect(hovered.source).toBe('pointer')
        expect(hovered.activeIndex).toBe(4)
        expect(hovered.autoIndex).toBe(4)
        expect(hovered.session).toBe(third.session)
        expect(ignored).toBe(hovered)
        expect(resumed.source).toBe('auto')
        expect(resumed.activeIndex).toBe(4)
        expect(resumed.session).toBe(hovered.session)
        expect(wrapped.activeIndex).toBe(0)
        expect(wrapped.session).toBe(resumed.session)
    })

    it('follows a swiped slide without dropping the pause', () => {
        const armed = reduceFluidHover(initialFluidHoverModel(), { type: 'autoplay', enabled: true })
        const showing = reduceFluidHover(armed, { type: 'auto', index: 1 })
        const held = reduceFluidHover(showing, { type: 'pointer', index: 1 })
        const swiped = reduceFluidHover(held, { type: 'sync', index: 2 })
        expect(swiped.source).toBe('pointer')
        expect(swiped.activeIndex).toBe(2)
        expect(swiped.autoIndex).toBe(2)
        expect(swiped.session).toBe(showing.session)
    })

    it('drops the idle highlight when reduced motion disables the cycle', () => {
        const cycling = reduceFluidHover(
            reduceFluidHover(initialFluidHoverModel(), { type: 'autoplay', enabled: true }),
            { type: 'auto', index: 3 },
        )
        const stopped = reduceFluidHover(cycling, { type: 'autoplay', enabled: false })
        const hovered = reduceFluidHover(stopped, { type: 'pointer', index: 1 })
        const left = reduceFluidHover(hovered, { type: 'leave' })

        expect(stopped.activeIndex).toBeNull()
        expect(stopped.autoplay).toBe(false)
        expect(hovered.activeIndex).toBe(1)
        expect(left.activeIndex).toBeNull()
        expect(left.source).toBeNull()
    })

    it('snaps when reduced motion is requested and springs otherwise', () => {
        expect(fluidHighlightTransition(true)).toEqual(FLUID_SNAP)
        expect(fluidHighlightTransition(false, false)).toEqual(FLUID_SNAP)
        const travel = fluidHighlightTransition(false)
        expect(travel).toMatchObject({ type: 'spring', opacity: { duration: 0.08 } })
        expect(travel).not.toEqual(FLUID_SNAP)
    })
})
