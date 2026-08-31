/**
 * Pattern adapted from: https://21st.dev/@dg.singh252525/components/3-d-coverflow-carousel
 * Original commit SHA: unpublished 21st.dev community component (published 2026-08-23)
 * Original file path: components/ui/3-d-coverflow-carousel.tsx
 * Original license: MIT
 * Date reviewed: 2026-08-31
 * Sherlock research artifact: Gary landing Features coverflow request
 * Re-derivation: Michelangelo via OBRA — ViaConnect Features coverflow
 * Verbatim copy: None (Audit-phase attested)
 */
'use client'

import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    coverflowCssTransform,
    coverflowTransform,
    shortestCarouselOffset,
} from '@/components/ui/coverflow-math'

export interface CoverFlowCarouselItem {
    id: string
    title: string
    description: string
    imageSrc: string
    imageAlt: string
}

export interface CoverFlowCarouselProps {
    items: CoverFlowCarouselItem[]
    className?: string
    initialIndex?: number
}

const SWIPE_PX = 40

export function CoverFlowCarousel({
    items,
    className,
    initialIndex = 0,
}: CoverFlowCarouselProps) {
    const reduceMotion = useReducedMotion()
    const reactId = useId()
    const stageRef = useRef<HTMLDivElement>(null)
    const dragStartX = useRef<number | null>(null)
    const dragStartY = useRef<number | null>(null)
    const [activeIndex, setActiveIndex] = useState(() =>
        items.length === 0 ? 0 : clampIndex(initialIndex, items.length),
    )
    const [openId, setOpenId] = useState<string | null>(null)

    const count = items.length
    const active = count === 0 ? null : items[clampIndex(activeIndex, count)]

    const goTo = useCallback(
        (nextIndex: number) => {
            if (count === 0) return
            const clamped = ((nextIndex % count) + count) % count
            setActiveIndex(clamped)
            setOpenId(null)
        },
        [count],
    )

    const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
    const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

    useEffect(() => {
        if (count === 0) return
        setActiveIndex((current) => clampIndex(current, count))
    }, [count])

    const onStageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            goPrev()
        } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            goNext()
        } else if (event.key === 'Escape' && openId) {
            setOpenId(null)
        }
    }

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        dragStartX.current = event.clientX
        dragStartY.current = event.clientY
    }

    const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        const startX = dragStartX.current
        const startY = dragStartY.current
        dragStartX.current = null
        dragStartY.current = null
        if (startX === null || startY === null) return
        const dx = event.clientX - startX
        const dy = event.clientY - startY
        if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
        if (dx > 0) goPrev()
        else goNext()
    }

    if (count === 0) return null

    return (
        <div
            className={cn('relative w-full bg-transparent', className)}
            data-testid="features-coverflow"
        >
            <div
                ref={stageRef}
                role="region"
                aria-roledescription="carousel"
                aria-label="ViaConnect features"
                tabIndex={0}
                onKeyDown={onStageKeyDown}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                className="relative h-[420px] sm:h-[460px] md:h-[500px] w-full overflow-visible bg-transparent outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DA5A0]"
                style={{ perspective: reduceMotion ? undefined : '1200px' }}
            >
                <div
                    className="absolute inset-0 bg-transparent"
                    style={{ transformStyle: reduceMotion ? undefined : 'preserve-3d' }}
                >
                    {items.map((item, index) => {
                        const offset = shortestCarouselOffset(index, activeIndex, count)
                        const transform = coverflowTransform(offset, !!reduceMotion)
                        const isActive = offset === 0
                        return (
                            <CoverFlowCard
                                key={item.id}
                                item={item}
                                isActive={isActive}
                                transform={transform}
                                reduceMotion={!!reduceMotion}
                                isOpen={openId === item.id}
                                onActivate={() => goTo(index)}
                                onToggleDescription={() =>
                                    setOpenId((current) => (current === item.id ? null : item.id))
                                }
                                headingId={`${reactId}-heading-${item.id}`}
                                bodyId={`${reactId}-body-${item.id}`}
                            />
                        )
                    })}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4">
                <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous feature"
                    className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-[#2DA5A0]/50 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]"
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <div className="flex items-center gap-2" role="tablist" aria-label="Feature slides">
                    {items.map((item, index) => {
                        const selected = index === activeIndex
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                aria-label={`Show ${item.title}`}
                                onClick={() => goTo(index)}
                                className={cn(
                                    'h-11 min-h-[44px] min-w-[44px] px-2 inline-flex items-center justify-center',
                                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]',
                                )}
                            >
                                <span
                                    className={cn(
                                        'block h-2 w-2 rounded-full transition-colors',
                                        selected ? 'bg-[#2DA5A0]' : 'bg-white/30',
                                    )}
                                />
                            </button>
                        )
                    })}
                </div>
                <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next feature"
                    className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-[#2DA5A0]/50 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]"
                >
                    <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                </button>
            </div>

            {active ? (
                <p className="sr-only" aria-live="polite">
                    {active.title}
                </p>
            ) : null}
        </div>
    )
}

function clampIndex(index: number, length: number): number {
    if (length <= 0) return 0
    return ((index % length) + length) % length
}

function CoverFlowCard({
    item,
    isActive,
    transform,
    reduceMotion,
    isOpen,
    onActivate,
    onToggleDescription,
    headingId,
    bodyId,
}: {
    item: CoverFlowCarouselItem
    isActive: boolean
    transform: ReturnType<typeof coverflowTransform>
    reduceMotion: boolean
    isOpen: boolean
    onActivate: () => void
    onToggleDescription: () => void
    headingId: string
    bodyId: string
}) {
    const cssTransform = coverflowCssTransform(transform)
    const hidden = transform.opacity === 0

    return (
        <article
            aria-hidden={hidden}
            data-testid={`features-coverflow-card-${item.id}`}
            data-active={isActive ? 'true' : 'false'}
            className={cn(
                'absolute left-1/2 top-1/2 w-[240px] sm:w-[280px] md:w-[320px]',
                'h-[340px] sm:h-[380px] md:h-[400px]',
                'origin-center will-change-transform',
                hidden ? 'pointer-events-none' : 'pointer-events-auto',
            )}
            style={{
                transform: cssTransform,
                opacity: transform.opacity,
                zIndex: transform.zIndex,
                transition: reduceMotion
                    ? 'opacity 0.15s ease'
                    : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
            }}
        >
            <div
                className={cn(
                    'flex h-full flex-col overflow-hidden rounded-2xl border bg-white/5 backdrop-blur-sm',
                    isActive
                        ? 'border-[#2DA5A0]/50 shadow-[0_0_24px_rgba(45,165,160,0.18)]'
                        : 'border-white/10',
                )}
            >
                <div className="relative min-h-0 flex-1">
                    <button
                        type="button"
                        tabIndex={hidden ? -1 : 0}
                        onClick={() => {
                            if (!isActive) onActivate()
                        }}
                        className="absolute inset-0 block overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2DA5A0]"
                        aria-label={isActive ? item.title : `Show ${item.title}`}
                    >
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#224852] to-[#111827]"
                        />
                        <img
                            src={item.imageSrc}
                            alt={item.imageAlt}
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    </button>
                    <AnimatePresence initial={false}>
                        {isOpen && isActive ? (
                            <motion.div
                                id={bodyId}
                                role="region"
                                aria-labelledby={headingId}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: reduceMotion
                                        ? { duration: 0 }
                                        : { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                                }}
                                exit={{
                                    opacity: 0,
                                    y: 8,
                                    transition: reduceMotion
                                        ? { duration: 0 }
                                        : { duration: 0.18, ease: [0.4, 0, 1, 1] },
                                }}
                                className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto bg-[#111827]/90 px-4 py-3 backdrop-blur-sm"
                            >
                                <p className="text-sm leading-relaxed text-white/80">
                                    {item.description}
                                </p>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>

                <div className="relative border-t border-white/10 bg-[#111827]/70 px-4 py-3">
                    <h3
                        id={headingId}
                        className="pr-10 text-base font-medium leading-snug text-white sm:text-lg"
                    >
                        {item.title}
                    </h3>
                    <button
                        type="button"
                        tabIndex={isActive && !hidden ? 0 : -1}
                        disabled={!isActive}
                        aria-expanded={isOpen}
                        aria-controls={bodyId}
                        onClick={(event) => {
                            event.stopPropagation()
                            if (isActive) onToggleDescription()
                        }}
                        className="absolute right-2 top-1/2 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white disabled:cursor-default disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]"
                        aria-label={isOpen ? `Hide ${item.title} details` : `Show ${item.title} details`}
                    >
                        <ChevronDown
                            className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')}
                            strokeWidth={1.5}
                        />
                    </button>
                </div>
            </div>
        </article>
    )
}
