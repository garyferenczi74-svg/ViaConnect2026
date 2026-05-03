/**
 * TabPills renders a horizontal row of mutually-exclusive content selector
 * pills matching the BreadcrumbPills visual family per Prompt #148 §D.
 *
 * Both pill components consume the shared pill-styles module
 * (components/ui/pill-styles.ts) so they cannot drift visually over time.
 *
 * ARIA: container is role="tablist", each pill is role="tab" with
 * aria-selected reflecting the active state. Arrow-key navigation
 * (Left/Right/Home/End) cycles between pills per WAI-ARIA tab pattern.
 *
 * Framer Motion: entrance opacity + y stagger, hover spring scale 1.03,
 * tap 0.97 (inactive only). Reduced-motion respected via useReducedMotion.
 *
 * The caller wraps content panels in role="tabpanel" with aria-labelledby
 * pointing at the matching tab. AnimatePresence with mode="wait" handles
 * the cross-fade between panels.
 */
'use client'

import { useId, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { pillActive, pillInactive, pillSizing } from './pill-styles'

export interface TabPillsOption {
    label: string
    value: string
    icon?: LucideIcon
}

interface TabPillsProps {
    options: TabPillsOption[]
    value: string
    onChange: (value: string) => void
    className?: string
    ariaLabel?: string
}

export function TabPills({ options, value, onChange, className, ariaLabel }: TabPillsProps) {
    const reducedMotion = useReducedMotion()
    const tablistId = useId()
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

    const focusByIndex = (index: number) => {
        const next = (index + options.length) % options.length
        buttonRefs.current[next]?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            focusByIndex(index + 1)
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            focusByIndex(index - 1)
        } else if (e.key === 'Home') {
            e.preventDefault()
            focusByIndex(0)
        } else if (e.key === 'End') {
            e.preventDefault()
            focusByIndex(options.length - 1)
        }
    }

    return (
        <div
            id={tablistId}
            role="tablist"
            aria-label={ariaLabel}
            className={`flex flex-wrap items-center gap-2 sm:flex-nowrap ${className ?? ''}`}
        >
            {options.map((option, index) => {
                const isActive = option.value === value
                const Icon = option.icon
                const entranceProps = reducedMotion
                    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
                    : {
                          initial: { opacity: 0, y: 4 },
                          animate: { opacity: 1, y: 0 },
                          transition: {
                              duration: 0.25,
                              ease: 'easeOut' as const,
                              delay: index * 0.05,
                          },
                      }
                const hoverTapProps =
                    reducedMotion || isActive
                        ? {}
                        : {
                              whileHover: { scale: 1.03 },
                              whileTap: { scale: 0.97 },
                          }

                return (
                    <motion.button
                        key={option.value}
                        ref={(el) => {
                            buttonRefs.current[index] = el
                        }}
                        type="button"
                        role="tab"
                        id={`${tablistId}-tab-${option.value}`}
                        aria-selected={isActive}
                        aria-controls={`${tablistId}-panel-${option.value}`}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => {
                            if (!isActive) onChange(option.value)
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={`${isActive ? pillActive : pillInactive} ${pillSizing}`}
                        {...entranceProps}
                        {...hoverTapProps}
                    >
                        {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                        {option.label}
                    </motion.button>
                )
            })}
        </div>
    )
}
