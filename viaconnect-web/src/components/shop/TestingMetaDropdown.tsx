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
import { ChevronDown, ChevronUp } from 'lucide-react'

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
            <div
                className="flex w-full cursor-not-allowed items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm text-white/40"
                aria-disabled="true"
            >
                <span>Panel details coming soon</span>
            </div>
        )
    }

    return (
        <div className="w-full">
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggle()
                }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="group flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#2DA5A0]/40 hover:bg-white/10"
            >
                <span className="text-sm font-medium text-white">Panel Details</span>
                {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-[#2DA5A0]" aria-hidden="true" />
                ) : (
                    <ChevronDown
                        className="h-4 w-4 text-white/60 transition-colors group-hover:text-[#2DA5A0]"
                        aria-hidden="true"
                    />
                )}
            </button>
            {isOpen && (
                <div
                    id={panelId}
                    className="mt-2 flex flex-col gap-4 rounded-lg border border-white/10 bg-[#1A2744]/60 px-4 py-3 backdrop-blur-sm"
                >
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
        </div>
    )
}
