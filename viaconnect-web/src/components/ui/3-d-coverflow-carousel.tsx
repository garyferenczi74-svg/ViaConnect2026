/**
 * Pattern adapted from: https://21st.dev/@dg.singh252525/components/3-d-coverflow-carousel
 * Original commit SHA: unpublished 21st.dev community component (published 2026-08-23)
 * Original file path: components/ui/3-d-coverflow-carousel.tsx
 * Original license: MIT
 * Date reviewed: 2026-08-31
 * Sherlock research artifact: Gary landing Features coverflow request
 * Re-derivation: Michelangelo via OBRA - ViaConnect Features coverflow
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
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    COVERFLOW_AUTOPLAY_MS_PER_CARD,
    COVERFLOW_CARD_SIZE_CLASS,
    COVERFLOW_STAGE_HEIGHT_CLASS,
    advanceCoverflowProgress,
    coverflowCssTransform,
    coverflowTransform,
    nearestCoverflowIndex,
    nextClockwiseIndex,
    shouldPauseCoverflowAutoplay,
    shortestCarouselOffset,
    wrapCarouselProgress,
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
    const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean | null>(
        () => {
            if (typeof window === 'undefined') return null
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches
        },
    )
    const reactId = useId()
    const stageRef = useRef<HTMLDivElement>(null)
    const dragStartX = useRef<number | null>(null)
    const dragStartY = useRef<number | null>(null)
    const cardEls = useRef(new Map<string, HTMLElement>())
    const progressRef = useRef(
        items.length === 0 ? 0 : wrapCarouselProgress(initialIndex, items.length),
    )
    const [activeIndex, setActiveIndex] = useState(() =>
        items.length === 0 ? 0 : nearestCoverflowIndex(progressRef.current, items.length),
    )
    const [openId, setOpenId] = useState<string | null>(null)
    const [hovering, setHovering] = useState(false)
    const [focusWithin, setFocusWithin] = useState(false)
    const [pointerActive, setPointerActive] = useState(false)
    const [artFailedIds, setArtFailedIds] = useState<ReadonlySet<string>>(
        () => new Set<string>(),
    )

    const count = items.length
    const active = count === 0 ? null : items[activeIndex]
    const reduceMotion = prefersReducedMotion === true
    const autoplayPaused = shouldPauseCoverflowAutoplay({
        reduceMotion: prefersReducedMotion,
        hovering,
        focusWithin,
        pointerActive,
        dropdownOpen: openId !== null,
    })
    const autoplayState =
        prefersReducedMotion !== false ? 'off' : autoplayPaused ? 'paused' : 'on'
    const spinning = autoplayState === 'on'

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)')
        const sync = () => setPrefersReducedMotion(media.matches)
        sync()
        media.addEventListener('change', sync)
        return () => media.removeEventListener('change', sync)
    }, [])

    const paint = useCallback(
        (value: number, withTransition: boolean) => {
            const reduced = !!reduceMotion
            for (const [index, item] of items.entries()) {
                const el = cardEls.current.get(item.id)
                if (!el) continue
                const offset = shortestCarouselOffset(index, value, count)
                const transform = coverflowTransform(offset, reduced)
                el.style.transition = reduced
                    ? 'opacity 0.15s ease'
                    : withTransition
                      ? 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
                      : 'none'
                el.style.transform = coverflowCssTransform(transform)
                el.style.opacity = String(transform.opacity)
                el.style.zIndex = String(transform.zIndex)
            }
        },
        [count, items, reduceMotion],
    )

    const commitIndex = useCallback(
        (value: number) => {
            if (count === 0) return
            const nearest = nearestCoverflowIndex(value, count)
            setActiveIndex((current) => (current === nearest ? current : nearest))
        },
        [count],
    )

    const goTo = useCallback(
        (nextIndex: number) => {
            if (count === 0) return
            const clamped = wrapCarouselProgress(nextIndex, count)
            progressRef.current = clamped
            commitIndex(clamped)
            setOpenId(null)
            paint(clamped, !spinning && !reduceMotion)
        },
        [commitIndex, count, paint, reduceMotion, spinning],
    )

    const goPrev = useCallback(
        () => goTo(nearestCoverflowIndex(progressRef.current, count) - 1),
        [count, goTo],
    )
    const goNext = useCallback(
        () => goTo(nextClockwiseIndex(nearestCoverflowIndex(progressRef.current, count), count)),
        [count, goTo],
    )

    useEffect(() => {
        if (count === 0) return
        progressRef.current = wrapCarouselProgress(progressRef.current, count)
        commitIndex(progressRef.current)
        paint(progressRef.current, false)
    }, [commitIndex, count, paint])

    useEffect(() => {
        if (autoplayPaused || count <= 1) return
        let frame = 0
        let lastTs: number | null = null
        const tick = (ts: number) => {
            if (lastTs !== null) {
                const dt = Math.min(ts - lastTs, 64)
                const next = advanceCoverflowProgress(
                    progressRef.current,
                    dt,
                    COVERFLOW_AUTOPLAY_MS_PER_CARD,
                    count,
                )
                progressRef.current = next
                paint(next, false)
                commitIndex(next)
            }
            lastTs = ts
            frame = window.requestAnimationFrame(tick)
        }
        frame = window.requestAnimationFrame(tick)
        return () => window.cancelAnimationFrame(frame)
    }, [autoplayPaused, commitIndex, count, paint])

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
            data-autoplay={autoplayState}
            data-motion={spinning ? 'continuous' : autoplayState}
            data-motion-pref={
                prefersReducedMotion === null
                    ? 'unknown'
                    : prefersReducedMotion
                      ? 'reduce'
                      : 'allow'
            }
            onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setHovering(true)
            }}
            onPointerLeave={() => {
                setHovering(false)
                setPointerActive(false)
            }}
            onFocusCapture={() => setFocusWithin(true)}
            onBlurCapture={(event) => {
                const next = event.relatedTarget
                if (next instanceof Node && event.currentTarget.contains(next)) return
                setFocusWithin(false)
            }}
            onPointerDown={() => setPointerActive(true)}
            onPointerUp={() => setPointerActive(false)}
            onPointerCancel={() => setPointerActive(false)}
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
                className={cn(
                    'relative w-full overflow-visible bg-transparent outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DA5A0]',
                    COVERFLOW_STAGE_HEIGHT_CLASS,
                )}
                style={{ perspective: reduceMotion ? undefined : '1200px' }}
            >
                <div
                    className="absolute inset-0 bg-transparent"
                    style={{ transformStyle: reduceMotion ? undefined : 'preserve-3d' }}
                >
                    {items.map((item, index) => {
                        const offset = shortestCarouselOffset(index, progressRef.current, count)
                        const transform = coverflowTransform(offset, !!reduceMotion)
                        const isActive = index === activeIndex
                        return (
                            <CoverFlowCard
                                key={item.id}
                                item={item}
                                isActive={isActive}
                                transform={transform}
                                reduceMotion={!!reduceMotion}
                                spinning={spinning}
                                artFailed={artFailedIds.has(item.id)}
                                onArtError={() =>
                                    setArtFailedIds((current) => {
                                        if (current.has(item.id)) return current
                                        const next = new Set(current)
                                        next.add(item.id)
                                        return next
                                    })
                                }
                                registerEl={(el) => {
                                    if (el) cardEls.current.set(item.id, el)
                                    else cardEls.current.delete(item.id)
                                }}
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

            <div className="mt-1.5 flex items-center justify-center gap-1 sm:gap-2">
                <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous feature"
                    className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-[#2DA5A0]/50 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]"
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <div className="flex items-center gap-0" role="tablist" aria-label="Feature slides">
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
                                    'h-11 min-h-[44px] min-w-[44px] px-1 inline-flex items-center justify-center',
                                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]',
                                )}
                            >
                                <span
                                    className={cn(
                                        'block h-1.5 w-1.5 rounded-full transition-colors',
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

function CoverFlowCard({
    item,
    isActive,
    transform,
    reduceMotion,
    spinning,
    artFailed,
    onArtError,
    registerEl,
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
    spinning: boolean
    artFailed: boolean
    onArtError: () => void
    registerEl: (el: HTMLElement | null) => void
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
            ref={registerEl}
            aria-hidden={hidden}
            data-testid={`features-coverflow-card-${item.id}`}
            data-active={isActive ? 'true' : 'false'}
            className={cn(
                'absolute left-1/2 top-1/2 origin-center will-change-transform',
                COVERFLOW_CARD_SIZE_CLASS,
                hidden ? 'pointer-events-none' : 'pointer-events-auto',
            )}
            style={{
                transform: cssTransform,
                opacity: transform.opacity,
                zIndex: transform.zIndex,
                transition: reduceMotion
                    ? 'opacity 0.15s ease'
                    : spinning
                      ? 'none'
                      : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
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
                        {artFailed ? null : (
                            <img
                                src={item.imageSrc}
                                alt={item.imageAlt}
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={onArtError}
                            />
                        )}
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
                                className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto bg-[#111827]/90 px-3 py-2 backdrop-blur-sm"
                            >
                                <p className="text-sm leading-relaxed text-white/80">
                                    {item.description}
                                </p>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>

                <div className="relative border-t border-white/10 bg-[#111827]/70 px-3 py-2">
                    <h3
                        id={headingId}
                        className="pr-10 text-sm font-medium leading-snug text-white sm:text-base md:text-lg"
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
                        className="absolute right-1 top-1/2 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white disabled:cursor-default disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]"
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
