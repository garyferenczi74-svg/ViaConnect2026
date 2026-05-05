'use client'

/**
 * Accordion is the canonical collapsible-disclosure component for PDP
 * Description and Formulation sections per Prompt #152p. SSR-expanded /
 * hydrate-collapse pattern: the server renders the panel expanded so all
 * content is in the initial HTML for SEO + JS-disabled accessibility,
 * then a useEffect on first mount toggles it to the desired collapsed
 * default. Each accordion instance is independent (opening one does not
 * close the other). Per-PDP-load state only; no localStorage / cookies.
 *
 * Implementation choices documented in #152p §Component design notes.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
    /** Heading text rendered in the trigger row, e.g. "Full Description" or "Formulation" */
    heading: string
    /** Body content to be revealed/hidden when toggled */
    children: ReactNode
    /** Optional id for SSR/test selectors and aria-controls wiring */
    id?: string
    /**
     * Initial expanded state for the very first render (server-side).
     * For the SSR-safe pattern, this is true (rendered expanded server-side),
     * then collapsed on hydration via a useEffect. Default: true.
     */
    defaultExpandedSSR?: boolean
    /**
     * Accessibility: an optional aria-label override. If omitted, the heading text is used.
     */
    ariaLabel?: string
}

export function Accordion({
    heading,
    children,
    id,
    defaultExpandedSSR = true,
    ariaLabel,
}: AccordionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpandedSSR)
    const [hasHydrated, setHasHydrated] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
    const reducedMotion = useReducedMotion()

    useEffect(() => {
        setHasHydrated(true)
        setIsExpanded(false)
    }, [])

    const headingId = id ? `${id}-heading` : undefined
    const panelId = id ? `${id}-panel` : undefined

    const toggle = () => setIsExpanded((prev) => !prev)

    return (
        <div className="border-b border-white/10 last:border-b-0" data-accordion-section={id}>
            <button
                type="button"
                id={headingId}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                aria-label={ariaLabel ?? heading}
                onClick={toggle}
                className="flex w-full items-center justify-between gap-3 py-4 text-left text-base font-medium uppercase tracking-wide text-white transition-colors hover:text-[#2DA5A0] focus-visible:text-[#2DA5A0] focus-visible:outline-none md:py-5 md:text-lg"
            >
                <span>{heading}</span>
                <motion.span
                    aria-hidden="true"
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
                    className="text-[#2DA5A0]"
                >
                    <ChevronDown size={20} strokeWidth={1.5} />
                </motion.span>
            </button>

            {!hasHydrated ? (
                <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headingId}
                    ref={contentRef}
                    className="overflow-hidden pb-4 md:pb-6"
                >
                    {children}
                </div>
            ) : (
                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            key="accordion-panel"
                            id={panelId}
                            role="region"
                            aria-labelledby={headingId}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={
                                reducedMotion
                                    ? { duration: 0 }
                                    : {
                                          height: { duration: 0.3, ease: 'easeOut' },
                                          opacity: { duration: 0.2, ease: 'easeOut' },
                                      }
                            }
                            className="overflow-hidden"
                        >
                            <div className="pb-4 md:pb-6">{children}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    )
}
