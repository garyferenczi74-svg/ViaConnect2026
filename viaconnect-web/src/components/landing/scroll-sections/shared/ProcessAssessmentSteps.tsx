'use client'

import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Activity, Dna, FlaskConical, Heart, Pill, Sun, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FluidHoverHighlight } from '@/components/ui/fluid-hover-highlight'
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

interface AutoplayGate {
    inView: boolean
    tabVisible: boolean
    reduceMotion: boolean
}

export interface ProcessAssessmentPhase {
    icon: LucideIcon
    label: string
    optional?: boolean
    sub?: readonly string[]
}

export const PROCESS_ASSESSMENT_PHASES: readonly ProcessAssessmentPhase[] = [
    { icon: User, label: 'Demographics' },
    { icon: Heart, label: 'Health History' },
    { icon: Activity, label: 'Symptoms', sub: ['Physical', 'Neuro', 'Emotional'] },
    { icon: Pill, label: 'Medications and Supplements' },
    { icon: Sun, label: 'Lifestyle' },
    { icon: Dna, label: 'Genetics Upload', optional: true },
    { icon: FlaskConical, label: 'Lab Upload', optional: true },
]

function stepAriaLabel(phase: ProcessAssessmentPhase): string {
    const parts = [phase.label]
    if (phase.optional) parts.push('optional')
    if (phase.sub && phase.sub.length > 0) parts.push(phase.sub.join(', '))
    return parts.join(', ')
}

export function ProcessAssessmentSteps() {
    const containerRef = useRef<HTMLUListElement>(null)
    const hover = useFluidHover(containerRef)
    const [gate, setGate] = useState<AutoplayGate>({
        inView: false,
        tabVisible: true,
        reduceMotion: false,
    })
    const interacting = hover.source === 'pointer' || hover.source === 'focus'
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

    return (
        <ul
            ref={containerRef}
            data-testid="process-steps"
            data-autoplay={autoplayMode}
            data-active-index={hover.activeIndex === null ? '' : String(hover.activeIndex)}
            aria-label="Assessment steps"
            className="process-step-row relative flex w-full max-w-full flex-col gap-2 min-[1000px]:grid min-[1000px]:grid-cols-7 min-[1000px]:gap-2"
            {...hover.handlers}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute z-0 hidden h-px bg-gradient-to-r from-transparent via-[#2DA5A0]/40 to-transparent min-[1000px]:block"
                style={{ top: 'var(--process-line-y, 1.7rem)', left: '4%', right: '4%' }}
            />
            <FluidHoverHighlight
                className="z-[1] rounded-2xl bg-[#2DA5A0]/10 shadow-[0_0_22px_rgba(45,165,160,0.22)] ring-1 ring-[#2DA5A0]/40"
                hover={hover}
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

    return (
        <li
            ref={itemRef}
            data-fluid-index={index}
            className="relative z-10 w-full min-w-0 min-[1000px]:w-auto"
        >
            <button
                type="button"
                data-testid={`process-step-${index}`}
                data-active={active ? 'true' : 'false'}
                aria-label={stepAriaLabel(phase)}
                className="process-step-button flex h-full w-full cursor-pointer flex-row items-center gap-3 rounded-2xl px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0] min-[1000px]:flex-col min-[1000px]:items-center min-[1000px]:gap-0 min-[1000px]:px-1 min-[1000px]:py-2 min-[1000px]:text-center"
            >
                <div
                    className={cn(
                        'process-icon mb-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-[#0d1225] transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none min-[1000px]:mb-2',
                        active
                            ? 'border-[#2DA5A0] shadow-[0_0_16px_rgba(45,165,160,0.55)]'
                            : 'border-[#2DA5A0]/40',
                    )}
                >
                    <Icon strokeWidth={1.5} className="process-icon-glyph h-5 w-5 text-[#2DA5A0]" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start min-[1000px]:w-full min-[1000px]:flex-none min-[1000px]:items-center">
                    <p
                        className={cn(
                            'process-label max-w-full text-sm font-medium leading-snug text-white transition-[filter] duration-200 motion-reduce:transition-none min-[1000px]:text-xs',
                            active && 'drop-shadow-[0_0_8px_rgba(45,165,160,0.9)]',
                        )}
                    >
                        {phase.label}
                    </p>
                    {phase.optional ? (
                        <span className="process-optional mt-1 text-xs uppercase tracking-wider text-[#B75E18] min-[1000px]:mt-2">
                            Optional
                        </span>
                    ) : null}
                    {phase.sub ? (
                        <div className="process-chips mt-1.5 flex flex-wrap justify-start gap-1.5 min-[1000px]:mt-3 min-[1000px]:justify-center">
                            {phase.sub.map((chip) => (
                                <span
                                    key={chip}
                                    className="process-chip rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
            </button>
        </li>
    )
}
