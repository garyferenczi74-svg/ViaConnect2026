/**
 * FilterSortDrawer renders the floating "Filter and sort" capsule at the
 * bottom of the PLP and the slide-up drawer it triggers per Prompt #141
 * v3 §5.2 + §6.4. Drawer contents:
 *   - Sort dropdown (Featured, Price low to high, Price high to low,
 *     Newest, Best gene match when CAQ on file)
 *   - Price range slider (min and max numeric inputs for v1; slider polish
 *     deferred)
 *   - Ingredient keyword search (text input)
 *   - In-stock-only toggle
 *   - Prescription-required toggle
 *
 * All controls write to URL search params so the state is shareable and
 * back-button safe per spec §6.5. Drawer state itself (open vs closed)
 * is local to this component and does not persist in URL.
 */
'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import { SORT_OPTIONS } from '@/lib/shop/filters'

interface FilterSortDrawerProps {
    hasCaqOnFile?: boolean
}

export function FilterSortDrawer({ hasCaqOnFile }: FilterSortDrawerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const sort = searchParams.get('sort') ?? 'featured'
    const q = searchParams.get('q') ?? ''
    const priceMin = searchParams.get('price_min') ?? ''
    const priceMax = searchParams.get('price_max') ?? ''
    const inStock = searchParams.get('in_stock') === '1'
    const rxRequired = searchParams.get('rx_required') === '1'

    const visibleSort = SORT_OPTIONS.filter((o) => !o.requiresCaq || hasCaqOnFile)

    const setParam = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === null || value === '' || value === '0') {
            params.delete(key)
        } else {
            params.set(key, value)
        }
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }

    const clearAll = () => {
        router.replace(pathname, { scroll: false })
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#1A2744]/85 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:bg-[#1A2744]"
            >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
                Filter and sort
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-40 flex flex-col justify-end bg-black/55 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filter and sort"
                >
                    <div
                        className="relative max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0F1A2E] p-6 md:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-medium text-white">Filter and sort</h2>
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={() => setIsOpen(false)}
                                className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                                <X className="h-5 w-5" strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs uppercase tracking-wider text-white/45">
                                    Sort
                                </label>
                                <select
                                    value={sort}
                                    onChange={(e) => setParam('sort', e.target.value === 'featured' ? null : e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none"
                                >
                                    {visibleSort.map((opt) => (
                                        <option key={opt.key} value={opt.key} className="bg-[#0F1A2E]">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs uppercase tracking-wider text-white/45">
                                    Search ingredients
                                </label>
                                <input
                                    type="search"
                                    value={q}
                                    onChange={(e) => setParam('q', e.target.value)}
                                    placeholder="e.g. magnesium, riboflavin"
                                    className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs uppercase tracking-wider text-white/45">
                                    Price range
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        value={priceMin}
                                        onChange={(e) => setParam('price_min', e.target.value)}
                                        placeholder="Min"
                                        className="w-1/2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                    />
                                    <span className="text-white/45">to</span>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        value={priceMax}
                                        onChange={(e) => setParam('price_max', e.target.value)}
                                        placeholder="Max"
                                        className="w-1/2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#2DA5A0] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                                    <span className="text-sm text-white/85">In stock only</span>
                                    <input
                                        type="checkbox"
                                        checked={inStock}
                                        onChange={(e) => setParam('in_stock', e.target.checked ? '1' : null)}
                                        className="h-4 w-4 accent-[#2DA5A0]"
                                    />
                                </label>
                                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                                    <span className="text-sm text-white/85">Prescription required</span>
                                    <input
                                        type="checkbox"
                                        checked={rxRequired}
                                        onChange={(e) => setParam('rx_required', e.target.checked ? '1' : null)}
                                        className="h-4 w-4 accent-[#2DA5A0]"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-sm text-white/65 transition-colors hover:text-white"
                            >
                                Clear all
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-xl bg-[#2DA5A0] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#26918d]"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
