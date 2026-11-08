'use client'

import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Activity, ChevronLeft, ChevronRight, Dna, FlaskConical, Heart, Pill, Sun, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    useFluidHover,
    useRegisterFluidHoverItem,
    type UseFluidHoverReturn,
} from '@/components/ui/use-fluid-hover'
import {
    PROCESS_STEP_DWELL_MS,
    nextProcessStep,
    shouldRunProcessAutoplay,
} from '@/components/landing/scroll-sections/shared/process-step-cycle'
import { tierIndexForStep } from '@/components/landing/scroll-sections/shared/processTierCards'

interface AutoplayGate {
    inView: boolean
    tabVisible: boolean
    reduceMotion: boolean
}

export interface ProcessAssessmentPhase {
    icon: LucideIcon
    label: string
    optional?: boolean
}

export const PROCESS_ASSESSMENT_PHASES: readonly ProcessAssessmentPhase[] = [
    { icon: User, label: 'Demographics' },
    { icon: Heart, label: 'Health History' },
    { icon: Activity, label: 'Symptoms' },
    { icon: Pill, label: 'Medications and Supplements' },
    { icon: Sun, label: 'Lifestyle' },
    { icon: Dna, label: 'Genetics Upload', optional: true },
    { icon: FlaskConical, label: 'Lab Upload', optional: true },
]

function nearestSlideIndex(container: HTMLElement): number | null {
    const slides = container.querySelectorAll<HTMLElement>('[data-fluid-index]')
    let bestIndex: number | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    slides.forEach((slide) => {
        const distance = Math.abs(slide.offsetLeft - container.scrollLeft)
        if (distance < bestDistance) {
            bestDistance = distance
            const index = Number(slide.dataset.fluidIndex)
            bestIndex = Number.isInteger(index) ? index : bestIndex
        }
    })
    return bestIndex
}

function stepAriaLabel(phase: ProcessAssessmentPhase): string {
    return phase.optional ? `${phase.label}, optional` : phase.label
}

export function ProcessAssessmentSteps() {
    const containerRef = useRef<HTMLUListElement>(null)
    const programmaticScroll = useRef(false)
    const hover = useFluidHover(containerRef)
    const [gate, setGate] = useState<AutoplayGate>({
        inView: false,
        tabVisible: true,
        reduceMotion: false,
    })
    const userScrollRef = useRef(false)
    const [userScrolling, setUserScrolling] = useState(false)
    const interacting = hover.source === 'pointer' || hover.source === 'focus' || userScrolling
    const autoplayMode = gate.reduceMotion
        ? 'off'
        : !gate.inView || !gate.tabVisible || interacting
            ? 'paused'
            : 'running'

    useEffect(() => {
        const node = containerRef.current
        const section = node?.closest('section') ?? node
        if (!section) return

        let current: AutoplayGate = {
            inView: false,
            tabVisible: document.visibilityState !== 'hidden',
            reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        }
        const publish = (patch: Partial<AutoplayGate>) => {
            const next = { ...current, ...patch }
            if (
                next.inView === current.inView &&
                next.tabVisible === current.tabVisible &&
                next.reduceMotion === current.reduceMotion
            ) {
                return
            }
            current = next
            setGate(next)
        }
        setGate(current)

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0]
            const visible = Boolean(entry && entry.isIntersecting && entry.intersectionRatio >= 0.08)
            publish({ inView: visible })
        }, { threshold: [0, 0.08, 0.25] })
        observer.observe(section)

        const onVisibility = () => {
            publish({ tabVisible: document.visibilityState !== 'hidden' })
        }
        document.addEventListener('visibilitychange', onVisibility)

        const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
        const onMotion = () => publish({ reduceMotion: motion.matches })
        motion.addEventListener('change', onMotion)

        return () => {
            observer.disconnect()
            document.removeEventListener('visibilitychange', onVisibility)
            motion.removeEventListener('change', onMotion)
        }
    }, [])

    useEffect(() => {
        hover.setAutoplay(!gate.reduceMotion)
    }, [gate.reduceMotion, hover.setAutoplay])

    useEffect(() => {
        if (!shouldRunProcessAutoplay({
            reduceMotion: gate.reduceMotion,
            inView: gate.inView,
            tabVisible: gate.tabVisible,
            interacting,
        })) {
            return
        }
        const count = PROCESS_ASSESSMENT_PHASES.length
        const current = hover.autoIndex ?? 0
        if (hover.source !== 'auto' || hover.activeIndex !== current) {
            hover.showAutoStep(current)
        }
        const timer = window.setTimeout(() => {
            hover.showAutoStep(nextProcessStep(current, count))
        }, PROCESS_STEP_DWELL_MS)
        return () => window.clearTimeout(timer)
    }, [
        gate.reduceMotion,
        gate.inView,
        gate.tabVisible,
        interacting,
        hover.autoIndex,
        hover.activeIndex,
        hover.source,
        hover.showAutoStep,
    ])

    useEffect(() => {
        const container = containerRef.current
        if (!container || hover.activeIndex === null) return
        if (userScrollRef.current) return
        if (window.matchMedia('(min-width: 1000px)').matches) return
        const slide = container.querySelector<HTMLElement>(`[data-fluid-index="${hover.activeIndex}"]`)
        if (!slide) return
        if (Math.abs(container.scrollLeft - slide.offsetLeft) < 2) return
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        programmaticScroll.current = true
        container.scrollTo({
            left: slide.offsetLeft,
            behavior: reduce ? 'auto' : 'smooth',
        })
    }, [hover.activeIndex])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const onScroll = () => {
            if (programmaticScroll.current) return
            if (window.matchMedia('(min-width: 1000px)').matches) return
            if (!userScrollRef.current) {
                userScrollRef.current = true
                setUserScrolling(true)
            }
            const index = nearestSlideIndex(container)
            if (index === null || index === hover.activeIndex) return
            hover.syncStep(index)
        }
        const onScrollEnd = () => {
            const wasProgrammatic = programmaticScroll.current
            programmaticScroll.current = false
            if (wasProgrammatic) return
            onScroll()
            userScrollRef.current = false
            setUserScrolling(false)
        }
        container.addEventListener('scroll', onScroll, { passive: true })
        container.addEventListener('scrollend', onScrollEnd)
        return () => {
            container.removeEventListener('scroll', onScroll)
            container.removeEventListener('scrollend', onScrollEnd)
        }
    }, [hover.activeIndex, hover.syncStep])

    const selectSlide = (index: number, hold: boolean) => {
        const count = PROCESS_ASSESSMENT_PHASES.length
        const next = ((index % count) + count) % count
        if (hold) hover.focusStep(next)
        else hover.syncStep(next)
    }

    const activeDot = hover.activeIndex ?? 0

    return (
        <div data-testid="process-carousel" className="min-w-0">
        <ul
            ref={containerRef}
            data-testid="process-steps"
            data-autoplay={autoplayMode}
            data-active-index={hover.activeIndex === null ? '' : String(hover.activeIndex)}
            aria-roledescription="carousel"
            aria-label="Assessment steps"
            className="process-step-row relative flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[1000px]:grid min-[1000px]:snap-none min-[1000px]:grid-cols-7 min-[1000px]:overflow-visible min-[1000px]:pb-0"
            {...hover.handlers}
            onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
                const target = event.target
                if (!(target instanceof HTMLElement) || !target.closest('[data-fluid-index]')) return
                event.preventDefault()
                const count = PROCESS_ASSESSMENT_PHASES.length
                const current = hover.activeIndex ?? 0
                const next = event.key === 'ArrowRight'
                    ? (current + 1) % count
                    : event.key === 'ArrowLeft'
                        ? (current + count - 1) % count
                        : event.key === 'Home'
                            ? 0
                            : count - 1
                selectSlide(next, true)
                containerRef.current?.querySelector<HTMLButtonElement>(`[data-testid="process-step-${next}"]`)?.focus()
            }}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute z-0 hidden h-px bg-gradient-to-r from-transparent via-[#2DA5A0]/40 to-transparent min-[1000px]:block"
                style={{ top: 'var(--process-line-y, 1.7rem)', left: '4%', right: '4%' }}
            />
            {PROCESS_ASSESSMENT_PHASES.map((phase, index) => (
                <ProcessAssessmentStep
                    key={phase.label}
                    hover={hover}
                    index={index}
                    phase={phase}
                />
            ))}
        </ul>
        <div
            data-testid="process-carousel-controls"
            className="mt-3 flex items-center justify-center gap-3 min-[1000px]:hidden"
        >
            <button
                type="button"
                data-testid="process-carousel-prev"
                aria-label="Previous step"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#2DA5A0]/40 bg-[#0d1225] text-[#2DA5A0]"
                onClick={() => selectSlide(activeDot - 1, false)}
            >
                <ChevronLeft strokeWidth={1.5} className="h-5 w-5" aria-hidden="true" />
            </button>
            <div role="tablist" aria-label="Choose an assessment step" className="flex items-center gap-1">
                {PROCESS_ASSESSMENT_PHASES.map((phase, index) => {
                    const selected = activeDot === index
                    return (
                        <button
                            key={phase.label}
                            type="button"
                            role="tab"
                            data-testid={`process-dot-${index}`}
                            aria-label={phase.label}
                            aria-selected={selected}
                            tabIndex={selected ? 0 : -1}
                            className="inline-flex h-11 w-6 items-center justify-center"
                            onClick={() => selectSlide(index, false)}
                            onFocus={() => hover.focusStep(index)}
                            onBlur={(event) => {
                                const next = event.relatedTarget
                                if (next instanceof Element && next.closest('[data-testid="process-carousel-controls"]')) return
                                hover.blurStep()
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                                event.preventDefault()
                                const delta = event.key === 'ArrowRight' ? 1 : -1
                                const count = PROCESS_ASSESSMENT_PHASES.length
                                const next = (index + delta + count) % count
                                selectSlide(next, true)
                                event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-testid="process-dot-${next}"]`)?.focus()
                            }}
                        >
                            <span
                                className={cn(
                                    'block h-1.5 rounded-full',
                                    selected ? 'w-4 bg-[#2DA5A0]' : 'w-1.5 bg-white/30',
                                )}
                            />
                        </button>
                    )
                })}
            </div>
            <button
                type="button"
                data-testid="process-carousel-next"
                aria-label="Next step"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#2DA5A0]/40 bg-[#0d1225] text-[#2DA5A0]"
                onClick={() => selectSlide(activeDot + 1, false)}
            >
                <ChevronRight strokeWidth={1.5} className="h-5 w-5" aria-hidden="true" />
            </button>
        </div>
        </div>
    )
}

function ProcessAssessmentStep({
    hover,
    index,
    phase,
}: {
    hover: UseFluidHoverReturn
    index: number
    phase: ProcessAssessmentPhase
}) {
    const itemRef = useRef<HTMLLIElement>(null)
    useRegisterFluidHoverItem(hover.registerItem, index, itemRef)
    const Icon = phase.icon
    const active = hover.activeIndex === index
    const tier = tierIndexForStep(index)

    return (
        <li
            ref={itemRef}
            data-fluid-index={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${PROCESS_ASSESSMENT_PHASES.length}`}
            className="relative z-10 w-[80%] shrink-0 snap-start min-[1000px]:w-auto min-[1000px]:shrink"
        >
            <button
                type="button"
                data-testid={`process-step-${index}`}
                data-active={active ? 'true' : 'false'}
                aria-label={stepAriaLabel(phase)}
                className="process-step-button group flex h-full w-full cursor-pointer flex-row items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-left focus-visible:outline-none min-[1000px]:flex-col min-[1000px]:items-center min-[1000px]:gap-0 min-[1000px]:border-0 min-[1000px]:px-1 min-[1000px]:py-2 min-[1000px]:text-center"
            >
                <div
                    data-icon-active={active ? 'true' : 'false'}
                    data-tier={tier}
                    className={cn(
                        'process-icon mb-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-[#0d1225] transition-[border-color,box-shadow,background-color,transform] duration-300 ease-out motion-reduce:transition-none min-[1000px]:mb-2 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2',
                        active ? 'scale-[1.08]' : 'scale-100 border-[#2DA5A0]/40',
                    )}
                >
                    <Icon strokeWidth={1.5} className="process-icon-glyph h-5 w-5 text-[#2DA5A0]" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start min-[1000px]:w-full min-[1000px]:flex-none min-[1000px]:items-center">
                    <p className="process-label max-w-full text-sm font-medium leading-snug text-white min-[1000px]:text-xs">
                        {phase.label}
                    </p>
                    {phase.optional ? (
                        <span className="process-optional mt-1 text-xs uppercase tracking-wider text-[#B75E18] min-[1000px]:mt-2">
                            Optional
                        </span>
                    ) : null}
                </div>
            </button>
        </li>
    )
}
