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
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    COVERFLOW_AUTOPLAY_MS_PER_CARD,
    COVERFLOW_CARD_SIZE_CLASS,
    COVERFLOW_STAGE_HEIGHT_CLASS,
    COVERFLOW_STEP_MS,
    coverflowCssTransform,
    coverflowDisplayedProgress,
    coverflowHoldMs,
    coverflowProgressIsSettled,
    coverflowStepProgress,
    coverflowTransform,
    nearestCoverflowIndex,
    nextClockwiseIndex,
    releaseCoverflowInteraction,
    shouldPauseCoverflowAutoplay,
    shortestCarouselOffset,
    wrapCarouselProgress,
    type CoverflowInteractionFlags,
} from '@/components/ui/coverflow-math'

export interface CoverFlowCarouselItem {
    id: string
    title: string
    description: string
    imageSrc: string
    imageAlt: string
    /** Decorative photo painted under the brand gradient. */
    imageUnderGradient?: boolean
    imageObjectPosition?: string
    /** Decorative looping clip. No audio. Poster is the still when motion is reduced. */
    videoMp4Src?: string
    videoWebmSrc?: string
    videoPosterSrc?: string
    videoObjectPosition?: string
    /**
     * Below 640px the card is wider than this portrait clip, so cover would
     * crop the phone. The frame is 132% of the media height and centered,
     * which keeps the phone and trims only the kitchen.
     */
    videoPhoneFrame?: boolean
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
        null,
    )
    const reactId = useId()
    const rootRef = useRef<HTMLDivElement>(null)
    const dragStartX = useRef<number | null>(null)
    const dragStartY = useRef<number | null>(null)
    const suppressClick = useRef(false)
    const cardEls = useRef(new Map<string, HTMLElement>())
    const progressRef = useRef(
        items.length === 0 ? 0 : wrapCarouselProgress(initialIndex, items.length),
    )
    const modeRef = useRef<'hold' | 'step'>('hold')
    const modeStartRef = useRef(0)
    const stepFromRef = useRef(progressRef.current)
    const stepToRef = useRef(progressRef.current)
    const wasPausedRef = useRef(true)
    const [motionEpoch, setMotionEpoch] = useState(0)
    const [activeIndex, setActiveIndex] = useState(() =>
        items.length === 0 ? 0 : nearestCoverflowIndex(progressRef.current, items.length),
    )
    const [openId, setOpenId] = useState<string | null>(null)
    const [hovering, setHovering] = useState(false)
    const [focusWithin, setFocusWithin] = useState(false)
    const [pointerActive, setPointerActive] = useState(false)
    const [inView, setInView] = useState(false)
    const [tabVisible, setTabVisible] = useState(true)
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
        inView,
        tabVisible,
    })
    const autoplayState =
        prefersReducedMotion !== false ? 'off' : autoplayPaused ? 'paused' : 'on'
    const pausedRef = useRef(autoplayPaused)
    pausedRef.current = autoplayPaused

    const applyInteraction = useCallback((next: CoverflowInteractionFlags) => {
        setHovering(next.hovering)
        setFocusWithin(next.focusWithin)
        setPointerActive(next.pointerActive)
    }, [])

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)')
        const sync = () => setPrefersReducedMotion(media.matches)
        sync()
        media.addEventListener('change', sync)
        return () => media.removeEventListener('change', sync)
    }, [])

    const publish = useCallback((value: number) => {
        const root = rootRef.current
        if (!root) return
        root.dataset.progress = value.toFixed(4)
        root.dataset.settled = coverflowProgressIsSettled(value) ? 'true' : 'false'
        root.dataset.phase = modeRef.current
    }, [])

    const paint = useCallback(
        (value: number) => {
            const reduced = !!reduceMotion
            for (const [index, item] of items.entries()) {
                const el = cardEls.current.get(item.id)
                if (!el) continue
                const offset = shortestCarouselOffset(index, value, count)
                const transform = coverflowTransform(offset, reduced)
                el.style.transition = reduced ? 'opacity 0.15s ease' : 'none'
                el.style.transform = coverflowCssTransform(transform)
                el.style.opacity = String(transform.opacity)
                el.style.zIndex = String(transform.zIndex)
            }
            publish(value)
        },
        [count, items, publish, reduceMotion],
    )

    const commitIndex = useCallback(
        (value: number) => {
            if (count === 0) return
            const nearest = nearestCoverflowIndex(value, count)
            setActiveIndex((current) => (current === nearest ? current : nearest))
        },
        [count],
    )

    const finishStepNow = useCallback(() => {
        if (modeRef.current !== 'step' || count === 0) return
        const value = wrapCarouselProgress(stepToRef.current, count)
        progressRef.current = value
        modeRef.current = 'hold'
        modeStartRef.current = performance.now()
        paint(value)
        commitIndex(value)
    }, [commitIndex, count, paint])

    const goTo = useCallback(
        (nextIndex: number) => {
            if (count === 0) return
            const target = wrapCarouselProgress(nextIndex, count)
            const from = progressRef.current
            setOpenId(null)
            const alreadyThere =
                coverflowProgressIsSettled(from) &&
                nearestCoverflowIndex(from, count) === target
            if (reduceMotion || alreadyThere) {
                progressRef.current = target
                modeRef.current = 'hold'
                modeStartRef.current = performance.now()
                paint(target)
                commitIndex(target)
                return
            }
            modeRef.current = 'step'
            modeStartRef.current = performance.now()
            stepFromRef.current = from
            stepToRef.current = target
            setMotionEpoch((current) => current + 1)
        },
        [commitIndex, count, paint, reduceMotion],
    )

    const goPrev = useCallback(
        () => goTo(nearestCoverflowIndex(progressRef.current, count) - 1),
        [count, goTo],
    )
    const goNext = useCallback(
        () => goTo(nextClockwiseIndex(nearestCoverflowIndex(progressRef.current, count), count)),
        [count, goTo],
    )

    const resolveDrag = useCallback((x: number, y: number) => {
        const startX = dragStartX.current
        const startY = dragStartY.current
        dragStartX.current = null
        dragStartY.current = null
        if (startX === null || startY === null) return
        const dx = x - startX
        const dy = y - startY
        if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
        suppressClick.current = true
        if (dx > 0) goPrev()
        else goNext()
    }, [goNext, goPrev])

    useEffect(() => {
        if (count === 0) return
        progressRef.current = wrapCarouselProgress(progressRef.current, count)
        commitIndex(progressRef.current)
        paint(progressRef.current)
    }, [commitIndex, count, paint])

    useEffect(() => {
        if (prefersReducedMotion !== false || count <= 1) return
        let frame = 0
        let stopped = false
        if (modeStartRef.current === 0) modeStartRef.current = performance.now()
        const tick = (ts: number) => {
            if (stopped) return
            const paused = pausedRef.current
            if (modeRef.current === 'step') {
                const amount = coverflowStepProgress(ts - modeStartRef.current, COVERFLOW_STEP_MS)
                const value =
                    amount >= 1
                        ? wrapCarouselProgress(stepToRef.current, count)
                        : coverflowDisplayedProgress(
                              stepFromRef.current,
                              stepToRef.current,
                              amount,
                              count,
                          )
                progressRef.current = value
                paint(value)
                commitIndex(value)
                if (amount >= 1) {
                    modeRef.current = 'hold'
                    modeStartRef.current = ts
                    publish(value)
                }
            } else if (paused) {
                wasPausedRef.current = true
            } else {
                if (wasPausedRef.current) {
                    wasPausedRef.current = false
                    modeStartRef.current = ts
                } else if (ts - modeStartRef.current >= coverflowHoldMs(COVERFLOW_AUTOPLAY_MS_PER_CARD, COVERFLOW_STEP_MS)) {
                    const from = wrapCarouselProgress(progressRef.current, count)
                    modeRef.current = 'step'
                    modeStartRef.current = ts
                    stepFromRef.current = from
                    stepToRef.current = nextClockwiseIndex(
                        nearestCoverflowIndex(from, count),
                        count,
                    )
                }
            }
            frame = window.requestAnimationFrame(tick)
        }
        frame = window.requestAnimationFrame(tick)
        return () => {
            stopped = true
            window.cancelAnimationFrame(frame)
        }
    }, [commitIndex, count, motionEpoch, paint, prefersReducedMotion, publish])

    useEffect(() => {
        const node = rootRef.current
        if (!node || typeof IntersectionObserver === 'undefined') {
            setInView(true)
            return
        }
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                const visible = Boolean(
                    entry && entry.isIntersecting && entry.intersectionRatio >= 0.2,
                )
                if (!visible) {
                    finishStepNow()
                    const released = releaseCoverflowInteraction(
                        {
                            hovering: true,
                            focusWithin: false,
                            pointerActive: true,
                        },
                        'left-viewport',
                    )
                    setHovering(released.hovering)
                    setPointerActive(released.pointerActive)
                } else {
                    setHovering(node.matches(':hover'))
                }
                setInView(visible)
            },
            { threshold: [0, 0.2, 0.5] },
        )
        observer.observe(node)
        return () => observer.disconnect()
    }, [finishStepNow])

    useEffect(() => {
        const onVisibility = () => {
            const visible = document.visibilityState !== 'hidden'
            if (!visible) {
                finishStepNow()
                const released = releaseCoverflowInteraction(
                    {
                        hovering,
                        focusWithin,
                        pointerActive,
                    },
                    'visibility-hidden',
                )
                applyInteraction(released)
                wasPausedRef.current = true
            } else if (rootRef.current) {
                setHovering(rootRef.current.matches(':hover'))
                setPointerActive(false)
                setMotionEpoch((current) => current + 1)
            }
            setTabVisible(visible)
        }
        document.addEventListener('visibilitychange', onVisibility)
        return () => document.removeEventListener('visibilitychange', onVisibility)
    }, [applyInteraction, finishStepNow, focusWithin, hovering, pointerActive])

    useEffect(() => {
        const releasePointer = (event: PointerEvent) => {
            resolveDrag(event.clientX, event.clientY)
            setPointerActive((current) => {
                if (!current) return current
                return releaseCoverflowInteraction(
                    { hovering, focusWithin, pointerActive: current },
                    'pointer-up',
                ).pointerActive
            })
        }
        const onBlur = () => {
            setPointerActive(false)
            wasPausedRef.current = true
        }
        window.addEventListener('pointerup', releasePointer)
        window.addEventListener('pointercancel', releasePointer)
        window.addEventListener('blur', onBlur)
        return () => {
            window.removeEventListener('pointerup', releasePointer)
            window.removeEventListener('pointercancel', releasePointer)
            window.removeEventListener('blur', onBlur)
        }
    }, [focusWithin, hovering, resolveDrag])

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
        if (event.target instanceof Element && event.target.closest('button[aria-expanded]')) {
            dragStartX.current = null
            dragStartY.current = null
            return
        }
        dragStartX.current = event.clientX
        dragStartY.current = event.clientY
    }

    const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        resolveDrag(event.clientX, event.clientY)
    }

    const indexAtClientPoint = (x: number, y: number) => {
        let bestIndex: number | null = null
        let bestDistance = Number.POSITIVE_INFINITY
        items.forEach((item, index) => {
            const el = cardEls.current.get(item.id)
            if (!el || Number(getComputedStyle(el).opacity) < 0.2) return
            const rect = el.getBoundingClientRect()
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return
            const dx = x - (rect.left + rect.width / 2)
            const dy = y - (rect.top + rect.height / 2)
            const distance = dx * dx + dy * dy
            if (distance < bestDistance) {
                bestDistance = distance
                bestIndex = index
            }
        })
        return bestIndex
    }

    const onStageClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (suppressClick.current) {
            suppressClick.current = false
            return
        }
        if (event.target instanceof Element && event.target.closest('button[aria-expanded]')) return
        const index = indexAtClientPoint(event.clientX, event.clientY)
        if (index === null) return
        if (index === nearestCoverflowIndex(progressRef.current, count)) return
        goTo(index)
    }

    const markKeyboardFocus = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return
        const sync = () => {
            if (target.isConnected && target.matches(':focus-visible')) setFocusWithin(true)
        }
        sync()
        window.requestAnimationFrame(sync)
    }

    if (count === 0) return null

    return (
        <div
            ref={rootRef}
            className={cn('relative w-full bg-transparent', className)}
            data-testid="features-coverflow"
            data-autoplay={autoplayState}
            data-motion={autoplayState === 'on' ? 'hold' : autoplayState}
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
                const released = releaseCoverflowInteraction(
                    { hovering: true, focusWithin, pointerActive },
                    'pointer-up',
                )
                setHovering(false)
                setPointerActive(released.pointerActive)
            }}
            onFocusCapture={(event) => markKeyboardFocus(event.target)}
            onBlurCapture={(event) => {
                const next = event.relatedTarget
                if (next instanceof Node && event.currentTarget.contains(next)) return
                setFocusWithin(false)
            }}
            onPointerDown={() => setPointerActive(true)}
            onPointerUp={() => setPointerActive(false)}
            onPointerCancel={() => setPointerActive(false)}
        >
            <style>{`
              @media (max-width: 639px) {
                .features-phone-frame {
                  inset: auto !important;
                  top: 50% !important;
                  left: 50% !important;
                  width: auto !important;
                  height: 132% !important;
                  max-width: none !important;
                  aspect-ratio: 784 / 1168;
                  transform: translate(-50%, -50%);
                  object-fit: cover;
                }
              }
            `}</style>
            <div
                role="region"
                aria-roledescription="carousel"
                aria-label="ViaConnect features"
                tabIndex={0}
                onKeyDown={onStageKeyDown}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onClick={onStageClick}
                className={cn(
                    'relative w-full overflow-visible bg-transparent outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DA5A0]',
                    COVERFLOW_STAGE_HEIGHT_CLASS,
                )}
                style={{
                    perspective: reduceMotion ? undefined : '1200px',
                    touchAction: 'pan-y',
                }}
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
                                playVideo={
                                    isActive &&
                                    inView &&
                                    tabVisible &&
                                    prefersReducedMotion === false
                                }
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

            {active ? (
                <p className="sr-only" aria-live="polite" aria-atomic="true">
                    {`${active.title}, ${activeIndex + 1} of ${count}`}
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
    playVideo,
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
    playVideo: boolean
    artFailed: boolean
    onArtError: () => void
    registerEl: (el: HTMLElement | null) => void
    isOpen: boolean
    onActivate: () => void
    onToggleDescription: () => void
    headingId: string
    bodyId: string
}) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const node = videoRef.current
        if (!node || !item.videoMp4Src) return
        if (playVideo) {
            node.muted = true
            const pending = node.play()
            if (pending) void pending.catch(() => {})
            return
        }
        node.pause()
    }, [item.videoMp4Src, playVideo])
    const cssTransform = coverflowCssTransform(transform)
    const hidden = transform.opacity === 0

    return (
        <article
            ref={registerEl}
            aria-hidden={hidden}
            data-testid={`features-coverflow-card-${item.id}`}
            data-active={isActive ? 'true' : 'false'}
            className={cn(
                'absolute left-1/2 top-1/2 origin-center',
                COVERFLOW_CARD_SIZE_CLASS,
                hidden ? 'pointer-events-none' : 'pointer-events-auto',
            )}
            style={{
                transform: cssTransform,
                opacity: transform.opacity,
                zIndex: transform.zIndex,
                transition: reduceMotion ? 'opacity 0.15s ease' : 'none',
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
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                        className="absolute inset-0 block overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2DA5A0]"
                        aria-label={isActive ? item.title : `Show ${item.title}`}
                    >
                        {item.videoMp4Src ? (
                            <>
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#224852] to-[#111827]"
                                />
                                {reduceMotion ? (
                                    <img
                                        src={item.videoPosterSrc}
                                        alt=""
                                        aria-hidden="true"
                                        draggable={false}
                                        data-testid={`features-coverflow-poster-${item.id}`}
                                        className={cn(
                                            'pointer-events-none absolute inset-0 z-0 h-full w-full object-cover',
                                            item.videoPhoneFrame && 'features-phone-frame',
                                        )}
                                        style={{ objectPosition: item.videoObjectPosition ?? 'center 45%' }}
                                        onDragStart={(event) => event.preventDefault()}
                                    />
                                ) : (
                                    <video
                                        ref={videoRef}
                                        aria-hidden="true"
                                        muted
                                        loop
                                        playsInline
                                        autoPlay={playVideo}
                                        preload="metadata"
                                        poster={item.videoPosterSrc}
                                        controls={false}
                                        tabIndex={-1}
                                        draggable={false}
                                        data-testid={`features-coverflow-video-${item.id}`}
                                        className={cn(
                                            'pointer-events-none absolute inset-0 z-0 h-full w-full object-cover',
                                            item.videoPhoneFrame && 'features-phone-frame',
                                        )}
                                        style={{ objectPosition: item.videoObjectPosition ?? 'center 45%' }}
                                        onDragStart={(event) => event.preventDefault()}
                                    >
                                        {item.videoWebmSrc ? (
                                            <source src={item.videoWebmSrc} type="video/webm" />
                                        ) : null}
                                        <source src={item.videoMp4Src} type="video/mp4" />
                                    </video>
                                )}
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 z-[1]"
                                    style={{
                                        backgroundImage:
                                            'linear-gradient(to bottom right, rgba(26,39,68,0.22) 0%, rgba(22,52,58,0.16) 48%, rgba(17,24,39,0.30) 100%)',
                                    }}
                                />
                                <svg
                                    aria-hidden="true"
                                    data-testid={`features-coverflow-orbs-${item.id}`}
                                    className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                                    viewBox="0 0 640 800"
                                    preserveAspectRatio="xMidYMid slice"
                                >
                                    <defs>
                                        <filter id={`${item.id}-video-orb-blur`} x="-45%" y="-45%" width="190%" height="190%">
                                            <feGaussianBlur stdDeviation="26" />
                                        </filter>
                                    </defs>
                                    <g filter={`url(#${item.id}-video-orb-blur)`}>
                                        <circle cx="150" cy="150" r="150" fill="#2DA5A0" fillOpacity="0.72" />
                                        <circle cx="520" cy="170" r="120" fill="#06B6D4" fillOpacity="0.68" />
                                        <circle cx="100" cy="690" r="145" fill="#76866F" fillOpacity="0.7" />
                                    </g>
                                </svg>
                            </>
                        ) : item.imageUnderGradient ? (
                            <>
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#224852] to-[#111827]"
                                />
                                <span
                                    aria-hidden="true"
                                    data-testid={`features-coverflow-underlay-${item.id}`}
                                    className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat"
                                    style={{
                                        backgroundImage: `url("${item.imageSrc}")`,
                                        backgroundPosition: item.imageObjectPosition ?? 'center center',
                                        backgroundSize: 'cover',
                                        backgroundRepeat: 'no-repeat',
                                    }}
                                />
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0"
                                    style={{
                                        backgroundImage:
                                            'linear-gradient(to bottom right, rgba(26,39,68,0.34) 0%, rgba(34,72,82,0.28) 48%, rgba(17,24,39,0.42) 100%)',
                                    }}
                                />
                                <svg
                                    aria-hidden="true"
                                    data-testid={`features-coverflow-orbs-${item.id}`}
                                    className="pointer-events-none absolute inset-0 h-full w-full"
                                    viewBox="0 0 640 800"
                                    preserveAspectRatio="xMidYMid slice"
                                >
                                    <defs>
                                        <filter id={`${item.id}-orb-blur`} x="-45%" y="-45%" width="190%" height="190%">
                                            <feGaussianBlur stdDeviation="26" />
                                        </filter>
                                    </defs>
                                    <g filter={`url(#${item.id}-orb-blur)`}>
                                        <circle cx="150" cy="150" r="150" fill="#2DA5A0" fillOpacity="0.72" />
                                        <circle cx="520" cy="170" r="120" fill="#06B6D4" fillOpacity="0.68" />
                                        <circle cx="100" cy="690" r="145" fill="#76866F" fillOpacity="0.7" />
                                    </g>
                                </svg>
                            </>
                        ) : (
                            <>
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#224852] to-[#111827]"
                                />
                                {artFailed ? null : (
                                    <img
                                        src={item.imageSrc}
                                        alt={item.imageAlt}
                                        draggable={false}
                                        className="absolute inset-0 h-full w-full object-cover"
                                        onError={onArtError}
                                        onDragStart={(event) => event.preventDefault()}
                                    />
                                )}
                            </>
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

                <div className="features-card-title-bar relative min-h-11 border-t border-white/10 bg-[#111827]/70 px-3 py-2">
                    <h3
                        id={headingId}
                        className="features-card-title pr-10 text-sm font-medium leading-snug text-white sm:text-base md:text-lg lg:text-xl"
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
