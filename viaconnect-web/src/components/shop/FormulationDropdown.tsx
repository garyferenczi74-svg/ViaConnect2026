/**
 * FormulationDropdown renders an inline single-open accordion for the
 * supplement card body per Prompt #144 v2 §3.3. Receives ingredients
 * array, total mg per serving, parent-managed isOpen + onToggle props
 * so PlpProductGrid can enforce single-open behavior across the grid.
 *
 * Renders the FULL ingredient list (no truncation) inside a glass panel
 * that opens BELOW the existing short blurb. The parent card's blurb
 * stays in place; this component pushes layout down rather than swapping
 * content per #144 v2 §1 root cause.
 *
 * Empty ingredients shows a non-clickable "details coming soon" disabled
 * state so new SKUs imported before ingredient backfill do not show an
 * empty void.
 *
 * No slide-down animation: instant expand. Animating height across a
 * methylation PLP grid creates jank. Chevron rotation honored via
 * conditional Lucide ChevronUp/ChevronDown.
 */
'use client'

import { useId } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface FormulationIngredient {
    name: string
    dose: number | null
    unit: string | null
    role?: string | null
}

interface FormulationDropdownProps {
    ingredients: FormulationIngredient[] | null
    totalMgPerServing?: number | null
    isOpen: boolean
    onToggle: () => void
}

export function FormulationDropdown({
    ingredients,
    totalMgPerServing,
    isOpen,
    onToggle,
}: FormulationDropdownProps) {
    const panelId = useId()
    const list = ingredients ?? []

    if (list.length === 0) {
        return (
            <div
                className="flex w-full cursor-not-allowed items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm text-white/40"
                aria-disabled="true"
            >
                <span>Formulation details coming soon</span>
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
                <span className="text-sm font-medium text-white">Formulation</span>
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
                    className="mt-2 rounded-lg border border-white/10 bg-[#1A2744]/60 px-4 py-3 backdrop-blur-sm"
                >
                    <ul className="flex flex-col gap-2">
                        {list.map((ing, idx) => (
                            <li
                                key={`${ing.name}-${idx}`}
                                className="flex justify-between gap-3 text-sm"
                            >
                                <span className="text-white/90">{ing.name}</span>
                                <span className="whitespace-nowrap tabular-nums text-white/60">
                                    {ing.dose != null
                                        ? `${ing.dose}${ing.unit ?? 'mg'}`
                                        : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {totalMgPerServing != null && (
                        <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm">
                            <span className="font-medium text-white/70">Total per serving</span>
                            <span className="tabular-nums font-medium text-white/90">
                                {totalMgPerServing}mg
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
