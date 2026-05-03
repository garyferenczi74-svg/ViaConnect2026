/**
 * PdpDesktopTabs renders a unified four-tab strip on desktop only per
 * Prompt #151 §Problem 4. Replaces the inconsistent inline blocks plus
 * pill button mix on the supplement-variant PDP right rail with a single
 * horizontal tab navigation: Description, Formulation, Evidence, FAQ.
 *
 * Mobile is untouched: the parent (PdpRightRail) wraps the inline
 * supplement sections in lg:hidden and mounts this component, which is
 * itself wrapped in hidden lg:block, so the swap only applies above
 * 1024px. Tablet and mobile keep their current treatment.
 *
 * Tabs with no backing content render disabled and are skipped by
 * keyboard navigation. ShopProduct does not currently expose evidence
 * or faq fields, so those tabs always render disabled per spec Step 2
 * ("do not invent content").
 *
 * Keyboard support: ArrowLeft + ArrowRight cycle, Home + End jump to
 * first + last enabled tab. Disabled tabs are skipped by the cycle.
 *
 * Default active tab is the first enabled tab. If no tabs are enabled
 * the component returns null and the parent grid stays clean.
 */
'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { BookOpen, FileText, FlaskConical, HelpCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PdpFormulationTable } from '@/components/shop/PdpFormulationTable'
import type { ShopProduct } from '@/lib/shop/queries'

type TabKey = 'description' | 'formulation' | 'evidence' | 'faq'

interface TabDef {
    key: TabKey
    label: string
    icon: LucideIcon
    enabled: boolean
}

interface PdpDesktopTabsProps {
    product: ShopProduct
}

export function PdpDesktopTabs({ product }: PdpDesktopTabsProps) {
    const tabs: TabDef[] = useMemo(() => {
        const description = (product.description ?? '').trim()
        const ingredients = product.ingredients ?? []
        return [
            {
                key: 'description',
                label: 'Description',
                icon: FileText,
                enabled: description.length > 0,
            },
            {
                key: 'formulation',
                label: 'Formulation',
                icon: FlaskConical,
                enabled: ingredients.length > 0,
            },
            {
                key: 'evidence',
                label: 'Evidence',
                icon: BookOpen,
                enabled: false,
            },
            {
                key: 'faq',
                label: 'FAQ',
                icon: HelpCircle,
                enabled: false,
            },
        ]
    }, [product])

    const enabledKeys = useMemo(
        () => tabs.filter((t) => t.enabled).map((t) => t.key),
        [tabs],
    )

    const [active, setActive] = useState<TabKey | null>(enabledKeys[0] ?? null)

    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLButtonElement>, currentKey: TabKey) => {
            if (enabledKeys.length === 0) return
            const idx = enabledKeys.indexOf(currentKey)
            if (idx < 0) return
            let nextKey: TabKey | null = null
            if (e.key === 'ArrowRight') {
                nextKey = enabledKeys[(idx + 1) % enabledKeys.length]
            } else if (e.key === 'ArrowLeft') {
                nextKey =
                    enabledKeys[(idx - 1 + enabledKeys.length) % enabledKeys.length]
            } else if (e.key === 'Home') {
                nextKey = enabledKeys[0]
            } else if (e.key === 'End') {
                nextKey = enabledKeys[enabledKeys.length - 1]
            }
            if (nextKey) {
                e.preventDefault()
                setActive(nextKey)
                tabRefs.current[nextKey]?.focus()
            }
        },
        [enabledKeys],
    )

    if (enabledKeys.length === 0) {
        return null
    }

    return (
        <div className="hidden lg:block">
            <div
                role="tablist"
                aria-label="Product information"
                className="mt-8 flex items-center gap-1 border-b border-white/10"
            >
                {tabs.map((tab) => {
                    const isActive = tab.key === active
                    const Icon = tab.icon
                    const stateClass = !tab.enabled
                        ? 'text-white/30 cursor-not-allowed pointer-events-none'
                        : isActive
                          ? 'text-white'
                          : 'text-white/55 hover:text-white/85'
                    return (
                        <button
                            key={tab.key}
                            ref={(el) => {
                                tabRefs.current[tab.key] = el
                            }}
                            id={`pdp-tab-${tab.key}`}
                            role="tab"
                            type="button"
                            aria-selected={isActive}
                            aria-controls={`pdp-panel-${tab.key}`}
                            aria-disabled={!tab.enabled}
                            tabIndex={isActive ? 0 : -1}
                            disabled={!tab.enabled}
                            onClick={() => tab.enabled && setActive(tab.key)}
                            onKeyDown={(e) => handleKeyDown(e, tab.key)}
                            className={`relative inline-flex items-center px-4 py-3 text-sm font-medium transition-colors ${stateClass}`}
                        >
                            <Icon
                                className="mr-2 h-4 w-4"
                                strokeWidth={1.5}
                                aria-hidden
                            />
                            {tab.label}
                            {isActive && (
                                <span
                                    aria-hidden
                                    className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#2DA5A0]"
                                />
                            )}
                        </button>
                    )
                })}
            </div>
            <div className="min-h-[180px] pt-6">
                {tabs.map((tab) => {
                    if (!tab.enabled) return null
                    const visible = tab.key === active
                    return (
                        <div
                            key={tab.key}
                            id={`pdp-panel-${tab.key}`}
                            role="tabpanel"
                            aria-labelledby={`pdp-tab-${tab.key}`}
                            tabIndex={0}
                            hidden={!visible}
                            className="text-sm leading-relaxed text-white/80"
                        >
                            {tab.key === 'description' && product.description && (
                                <p className="whitespace-pre-line">{product.description}</p>
                            )}
                            {tab.key === 'formulation' && (
                                <PdpFormulationTable
                                    ingredients={product.ingredients ?? []}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
