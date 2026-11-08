/**
 * Pattern adapted from: https://21st.dev/@educalvolpz/components/fluid-hover-highlight
 * Original commit SHA: unpublished 21st.dev community component
 * Original file path: components/ui/fluid-hover-highlight-utils/use-fluid-hover.ts
 * Original license: MIT
 * Date reviewed: 2026-11-08
 * Sherlock research artifact: Gary landing Process fluid hover request
 * Re-derivation: Michelangelo via OBRA - ViaConnect Process step highlight
 * Verbatim copy: None (Audit-phase attested)
 */
'use client'

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FocusEvent,
    type PointerEvent as ReactPointerEvent,
    type RefObject,
} from 'react'
import {
    fluidModelsEqual,
    indexAtContainerPoint,
    initialFluidHoverModel,
    itemRectFromOffset,
    reduceFluidHover,
    sameItemRects,
    type FluidHoverEvent,
    type FluidHoverModel,
    type ItemRect,
} from '@/components/ui/fluid-hover-math'

export type { FluidHoverModel }

export interface FluidHoverHandlers {
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => void
    onFocusCapture: (event: FocusEvent<HTMLElement>) => void
    onBlurCapture: (event: FocusEvent<HTMLElement>) => void
}

export interface UseFluidHoverReturn {
    activeIndex: number | null
    itemRects: Array<ItemRect | null>
    isMeasured: boolean
    session: number
    source: FluidHoverModel['source']
    autoIndex: number | null
    /** Session at the moment of the latest committed model. */
    sessionRef: RefObject<number>
    handlers: FluidHoverHandlers
    registerItem: (index: number, node: HTMLElement | null) => void
    /** Allow the idle cycle. Reduced motion turns this off and clears it. */
    setAutoplay: (enabled: boolean) => void
    /** Glide the idle highlight to a step. Ignored while hovered or focused. */
    showAutoStep: (index: number) => void
    /** Move the highlight to a step, including while a pointer or focus is active. */
    syncStep: (index: number) => void
    focusStep: (index: number) => void
    blurStep: () => void
}

function readIndex(container: HTMLElement, clientX: number, clientY: number, rects: Array<ItemRect | null>): number | null {
    const stack = document.elementsFromPoint(clientX, clientY)
    for (const el of stack) {
        const host = el.closest('[data-fluid-index]')
        if (host instanceof HTMLElement && container.contains(host)) {
            const index = Number(host.dataset.fluidIndex)
            if (Number.isInteger(index)) return index
        }
    }

    const bounds = container.getBoundingClientRect()
    const inside =
        clientX >= bounds.left &&
        clientX <= bounds.right &&
        clientY >= bounds.top &&
        clientY <= bounds.bottom
    if (!inside) return null

    return indexAtContainerPoint(
        clientX - bounds.left + container.scrollLeft,
        clientY - bounds.top + container.scrollTop,
        rects,
    )
}

function focusIsVisible(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const host = target.closest('[data-fluid-index]')
    if (!(host instanceof HTMLElement)) return false
    return target.matches(':focus-visible') || host.querySelector(':focus-visible') === target
}

export function useFluidHover(containerRef: RefObject<HTMLElement | null>): UseFluidHoverReturn {
    const nodesRef = useRef(new Map<number, HTMLElement>())
    const modelRef = useRef<FluidHoverModel>(initialFluidHoverModel())
    const rectsRef = useRef<Array<ItemRect | null>>([])
    const sessionRef = useRef(0)
    const touchStopRef = useRef<(() => void) | null>(null)
    const [model, setModel] = useState<FluidHoverModel>(initialFluidHoverModel)
    const [itemRects, setItemRects] = useState<Array<ItemRect | null>>([])
    const [isMeasured, setIsMeasured] = useState(false)

    const measure = useCallback((): Array<ItemRect | null> => {
        const next: Array<ItemRect | null> = []
        nodesRef.current.forEach((node, index) => {
            if (!node.isConnected) return
            next[index] = itemRectFromOffset(node)
        })
        return next
    }, [])

    const commit = useCallback((event: FluidHoverEvent) => {
        const next = reduceFluidHover(modelRef.current, event)
        const rects = measure()
        if (fluidModelsEqual(modelRef.current, next) && sameItemRects(rectsRef.current, rects)) return
        modelRef.current = next
        rectsRef.current = rects
        sessionRef.current = next.session
        setModel(next)
        setItemRects(rects)
        setIsMeasured(true)
    }, [measure])

    const registerItem = useCallback((index: number, node: HTMLElement | null) => {
        if (node) nodesRef.current.set(index, node)
        else nodesRef.current.delete(index)
    }, [])

    const setAutoplay = useCallback((enabled: boolean) => {
        commit({ type: 'autoplay', enabled })
    }, [commit])

    const showAutoStep = useCallback((index: number) => {
        commit({ type: 'auto', index })
    }, [commit])

    const syncStep = useCallback((index: number) => {
        commit({ type: 'sync', index })
    }, [commit])

    const focusStep = useCallback((index: number) => {
        commit({ type: 'focus', index })
    }, [commit])

    const blurStep = useCallback(() => {
        commit({ type: 'blur' })
    }, [commit])

    const armTouchRelease = useCallback(() => {
        touchStopRef.current?.()
        const stop = () => {
            window.removeEventListener('pointerup', stop)
            window.removeEventListener('pointercancel', stop)
            touchStopRef.current = null
            commit({ type: 'leave' })
        }
        touchStopRef.current = () => {
            window.removeEventListener('pointerup', stop)
            window.removeEventListener('pointercancel', stop)
        }
        window.addEventListener('pointerup', stop)
        window.addEventListener('pointercancel', stop)
    }, [commit])

    useEffect(() => () => {
        touchStopRef.current?.()
        touchStopRef.current = null
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const observer = new ResizeObserver(() => {
            if (modelRef.current.activeIndex === null) return
            const rects = measure()
            if (sameItemRects(rectsRef.current, rects)) return
            rectsRef.current = rects
            setItemRects(rects)
            setIsMeasured(true)
        })
        observer.observe(container)
        return () => observer.disconnect()
    }, [containerRef, measure])

    const pointIndex = useCallback((event: ReactPointerEvent<HTMLElement>): number | null => {
        const container = containerRef.current
        if (!container) return null
        return readIndex(container, event.clientX, event.clientY, measure())
    }, [containerRef, measure])

    const handlers: FluidHoverHandlers = {
        onPointerMove(event) {
            if (event.pointerType === 'touch') return
            commit({ type: 'pointer', index: pointIndex(event) })
        },
        onPointerDown(event) {
            const index = pointIndex(event)
            if (index === null) return
            commit({ type: 'pointer', index })
            if (event.pointerType === 'touch') armTouchRelease()
        },
        onPointerLeave(event) {
            if (event.pointerType === 'touch') return
            commit({ type: 'leave' })
        },
        onFocusCapture(event) {
            if (!focusIsVisible(event.target)) return
            const host = event.target instanceof HTMLElement
                ? event.target.closest('[data-fluid-index]')
                : null
            if (!(host instanceof HTMLElement)) return
            const index = Number(host.dataset.fluidIndex)
            if (!Number.isInteger(index)) return
            commit({ type: 'focus', index })
            const container = containerRef.current
            if (container && container.scrollWidth > container.clientWidth + 1) {
                const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                container.scrollTo({
                    left: host.offsetLeft,
                    behavior: reduce ? 'auto' : 'smooth',
                })
            }
        },
        onBlurCapture(event) {
            const next = event.relatedTarget
            const container = containerRef.current
            if (next instanceof Node && container?.contains(next)) return
            commit({ type: 'blur' })
        },
    }

    return {
        activeIndex: model.activeIndex,
        itemRects,
        isMeasured,
        session: model.session,
        source: model.source,
        autoIndex: model.autoIndex,
        sessionRef,
        handlers,
        registerItem,
        setAutoplay,
        showAutoStep,
        syncStep,
        focusStep,
        blurStep,
    }
}

export function useRegisterFluidHoverItem(
    registerItem: (index: number, node: HTMLElement | null) => void,
    index: number,
    ref: RefObject<HTMLElement | null>,
): void {
    useEffect(() => {
        registerItem(index, ref.current)
        return () => registerItem(index, null)
    }, [registerItem, index, ref])
}
