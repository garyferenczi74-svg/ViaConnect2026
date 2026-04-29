/**
 * CardTabStrip renders the in-card tab row used by both supplement and
 * testing variants per Prompt #141 v3 §4.2 slot 5 and §4.3 slot 4. Active
 * tab gets the teal underline (border-b-2 border-[#2DA5A0]); inactive tabs
 * get border-b-2 border-white/10 and dimmed text.
 *
 * The tab buttons stop click propagation so taps inside a card-wide
 * <Link> wrapper do not navigate to the PDP. The card is fully tappable
 * everywhere else.
 */
'use client'

import type { ReactNode } from 'react'

export interface CardTab {
    key: string
    label: ReactNode
}

interface CardTabStripProps {
    tabs: CardTab[]
    activeKey: string
    onChange: (key: string) => void
    className?: string
}

export function CardTabStrip({ tabs, activeKey, onChange, className }: CardTabStripProps) {
    return (
        <div role="tablist" className={`flex gap-4 ${className ?? ''}`}>
            {tabs.map((tab) => {
                const isActive = tab.key === activeKey
                return (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onChange(tab.key)
                        }}
                        className={`text-xs font-medium pb-1.5 transition-colors border-b-2 ${
                            isActive
                                ? 'border-[#2DA5A0] text-white'
                                : 'border-white/10 text-white/50 hover:text-white/75'
                        }`}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
