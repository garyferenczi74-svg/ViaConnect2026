/**
 * TestingMetaDropdown is the GeneX360 sibling to FormulationDropdown per
 * Prompt #144 v2 §3.4. Same accordion behavior; renders 3 sections from
 * products.testing_meta: What's Tested, Who It's For, What You Get.
 *
 * Empty testing_meta renders the same "details coming soon" disabled
 * state. Single-open behavior is parent-managed via isOpen + onToggle.
 */
'use client'

import { useId } from 'react'
import { ChevronRight, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHEVRON_SLOT, OPEN_PANEL, emptyPillClass, openPillClass } from './cardOpenPill'

interface TestingMeta {
    what_is_tested?: string
    who_its_for?: string
    what_you_get?: string
}

interface TestingMetaDropdownProps {
    testingMeta: TestingMeta | null
    isOpen: boolean
    onToggle: () => void
}

export function TestingMetaDropdown({
    testingMeta,
    isOpen,
    onToggle,
}: TestingMetaDropdownProps) {
    const panelId = useId()
    const meta = testingMeta ?? {}
    const sections: Array<{ heading: string; body: string | undefined }> = [
        { heading: "What's Tested", body: meta.what_is_tested },
        { heading: "Who It's For", body: meta.who_its_for },
        { heading: 'What You Get', body: meta.what_you_get },
    ]
    const hasAnyBody = sections.some((s) => s.body && s.body.length > 0)

    if (!hasAnyBody) {
        return (
            <div className={emptyPillClass()} aria-disabled="true">
                <span className="whitespace-normal">Panel details coming soon</span>
            </div>
        )
    }

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggle()
                }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className={openPillClass(isOpen)}
            >
                <FlaskConical className="h-3.5 w-3.5 shrink-0 text-white/80" strokeWidth={1.5} aria-hidden />
                <span>Panel Details</span>
                <span className={cn(CHEVRON_SLOT, isOpen && 'rotate-90')}>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                </span>
            </button>
            {isOpen && (
                <div id={panelId} className={cn(OPEN_PANEL, 'flex flex-col gap-4')}>
                    {sections.map(
                        (section) =>
                            section.body && (
                                <div key={section.heading}>
                                    <h4 className="text-xs font-medium uppercase tracking-wide text-[#2DA5A0]">
                                        {section.heading}
                                    </h4>
                                    <p className="mt-1 text-sm leading-relaxed text-white/85">
                                        {section.body}
                                    </p>
                                </div>
                            ),
                    )}
                </div>
            )}
        </>
    )
}
