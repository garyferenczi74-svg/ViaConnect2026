/**
 * BreadcrumbPills renders an N-level breadcrumb as clickable pill buttons
 * matching the visual language of the AdminPortalDetector portal switcher
 * (rounded-full, brand teal active state, transparent inactive state with
 * subtle border) per Prompt #147 2026-05-02.
 *
 * The active pill (last by default, or marked via item.active) is a
 * non-clickable span in brand teal. Inactive pills are Next.js Link
 * components in white/80 with hover preview of the active treatment.
 *
 * Animations via Framer Motion:
 *   - Entrance: opacity + y stagger, 0.05s per index, 0.25s ease-out
 *   - Hover (inactive only): spring scale 1.03
 *   - Tap (inactive only): scale 0.97
 *   - Reduced-motion respected via prefers-reduced-motion media query;
 *     entrance falls back to instant render, hover/tap omitted
 *
 * Accessibility: <nav aria-label="Breadcrumb"> wraps an <ol> with <li>
 * items per WAI-ARIA pattern. Active item carries aria-current="page".
 * Inactive pills are tab-focusable with a visible teal focus ring.
 */
'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

export interface BreadcrumbItem {
    label: string
    href: string
    active?: boolean
}

interface BreadcrumbPillsProps {
    items: BreadcrumbItem[]
    className?: string
}

const INACTIVE_PILL_CLASS =
    'inline-flex items-center rounded-full border border-white/15 bg-transparent px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-200 ease-out hover:border-[#2DA5A0]/50 hover:bg-[#2DA5A0]/5 hover:text-[#2DA5A0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] sm:px-4 sm:py-1.5 sm:text-sm max-sm:px-3 max-sm:py-1 max-sm:text-xs'

const ACTIVE_PILL_CLASS =
    'inline-flex cursor-default items-center rounded-full border border-[#2DA5A0] bg-[#2DA5A0]/12 px-4 py-1.5 text-sm font-medium text-[#2DA5A0] shadow-[0_0_12px_-2px_rgba(45,165,160,0.35)] backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm max-sm:px-3 max-sm:py-1 max-sm:text-xs'

export function BreadcrumbPills({ items, className }: BreadcrumbPillsProps) {
    const reducedMotion = useReducedMotion()

    if (!items || items.length === 0) return null

    const hasExplicitActive = items.some((it) => it.active)
    const lastIndex = items.length - 1

    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                {items.map((item, index) => {
                    const isActive = hasExplicitActive ? !!item.active : index === lastIndex
                    const showSeparator = index < lastIndex
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
                    const hoverTapProps = reducedMotion
                        ? {}
                        : {
                              whileHover: { scale: 1.03 },
                              whileTap: { scale: 0.97 },
                              transition: {
                                  type: 'spring' as const,
                                  stiffness: 400,
                                  damping: 25,
                              },
                          }

                    return (
                        <li key={`${item.href}-${index}`} className="flex items-center gap-2">
                            {isActive ? (
                                <motion.span
                                    {...entranceProps}
                                    aria-current="page"
                                    className={ACTIVE_PILL_CLASS}
                                >
                                    {item.label}
                                </motion.span>
                            ) : (
                                <motion.span {...entranceProps} {...hoverTapProps}>
                                    <Link href={item.href} className={INACTIVE_PILL_CLASS}>
                                        {item.label}
                                    </Link>
                                </motion.span>
                            )}
                            {showSeparator && (
                                <motion.span
                                    {...(reducedMotion
                                        ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
                                        : {
                                              initial: { opacity: 0 },
                                              animate: { opacity: 1 },
                                              transition: {
                                                  duration: 0.25,
                                                  ease: 'easeOut' as const,
                                                  delay: index * 0.05 + 0.025,
                                              },
                                          })}
                                    aria-hidden="true"
                                    className="text-white/40"
                                >
                                    <ChevronRight
                                        className="h-4 w-4 max-sm:h-3 max-sm:w-3"
                                        strokeWidth={1.5}
                                    />
                                </motion.span>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
