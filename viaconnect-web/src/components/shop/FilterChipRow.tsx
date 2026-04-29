/**
 * FilterChipRow renders a horizontal chip row that mirrors a single URL
 * search param (primary / delivery / match) per Prompt #141 v3 §6.5.
 * Active chip: teal-filled (bg-[#2DA5A0]/15 border-[#2DA5A0] text-[#2DA5A0]).
 * Resting chip: glass capsule (border-white/15 text-white/80).
 * Counts render after the label as `MTHFR (12)`.
 *
 * URL state writes use `router.replace` so back-button history is not
 * polluted by chip toggles. Other params are preserved when one chip
 * changes; clicking the All chip removes the param entirely.
 */
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { FilterChip } from '@/lib/shop/filters'

interface FilterChipRowProps {
    paramName: string
    chips: FilterChip[]
    counts?: Record<string, number>
    label?: string
    className?: string
}

export function FilterChipRow({
    paramName,
    chips,
    counts,
    label,
    className,
}: FilterChipRowProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = searchParams.get(paramName) ?? 'all'

    const handleClick = (key: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (key === 'all') {
            params.delete(paramName)
        } else {
            params.set(paramName, key)
        }
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }

    return (
        <div className={className}>
            {label && (
                <p className="mb-2 text-xs uppercase tracking-wider text-white/45">{label}</p>
            )}
            <div className="flex flex-wrap gap-2">
                {chips.map((chip) => {
                    const isActive = chip.key === activeKey
                    const count = counts?.[chip.key]
                    return (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={() => handleClick(chip.key)}
                            aria-pressed={isActive}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors ${
                                isActive
                                    ? 'border border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                                    : 'border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white'
                            }`}
                        >
                            {chip.label}
                            {count != null && (
                                <span className={isActive ? 'ml-1.5 text-[#2DA5A0]/75' : 'ml-1.5 text-white/45'}>
                                    ({count})
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
