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
 * No slide-down animation: instant expand. The trailing chevron is one
 * ChevronRight that rotates 90 degrees while the panel is open.
 */
'use client'

import { useId } from 'react'
import { ChevronRight, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHEVRON_SLOT, OPEN_PANEL, emptyPillClass, openPillClass } from './cardOpenPill'

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
            <div className={emptyPillClass()} aria-disabled="true">
                <span className="whitespace-normal">Formulation details coming soon</span>
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
                <span>Formulation</span>
                <span className={cn(CHEVRON_SLOT, isOpen && 'rotate-90')}>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                </span>
            </button>
            {isOpen && (
                <div id={panelId} className={OPEN_PANEL}>
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
        </>
    )
}
