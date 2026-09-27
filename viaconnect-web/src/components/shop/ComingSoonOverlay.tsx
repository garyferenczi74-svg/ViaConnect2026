'use client'

import { useRef, type CSSProperties } from 'react'
import { COMING_SOON_OVERLAY_TEXT } from '@/lib/shop/coming-soon-copy'
import { comingSoonSerif } from './coming-soon-font'
import { useInViewPause } from './useInViewPause'
import './coming-soon-metal.css'

const STAGGER_STEP = 0.618
const PERIOD_SECONDS = 2.3

interface ComingSoonOverlayProps {
    tone: 'onLight' | 'onDark'
    size: 'card' | 'pdp'
    staggerIndex?: number
}

type ComingSoonStyle = CSSProperties & Record<'--cs-delay' | '--cs-intro-delay', string>

const LAYERS = ['cs-edge', 'cs-deep', 'cs-hi'] as const

function formatSeconds(value: number): string {
    const rounded = Math.round(value * 1000) / 1000
    const negative = rounded < 0
    const fixed = Math.abs(rounded).toFixed(3)
    return `${negative ? '-' : ''}${fixed}s`
}

function delaySeconds(index: number): number {
    const phase = (index * STAGGER_STEP) % 1
    return -phase * PERIOD_SECONDS
}

function introSeconds(index: number): number {
    return (index % 8) * 0.04
}

/**
 * Transparent "Coming soon" over a product image.
 * The visual layer is hidden from assistive tech. A separate sr-only twin
 * carries the same words. Sits under status pills (z-10).
 */
export function ComingSoonOverlay({ tone, size, staggerIndex = 0 }: ComingSoonOverlayProps) {
    const ref = useRef<HTMLDivElement>(null)
    useInViewPause(ref)
    const words = COMING_SOON_OVERLAY_TEXT.split(' ')
    const style: ComingSoonStyle = {
        '--cs-delay': formatSeconds(delaySeconds(staggerIndex)),
        '--cs-intro-delay': formatSeconds(introSeconds(staggerIndex)),
    }

    return (
        <>
            <div
                ref={ref}
                aria-hidden="true"
                data-testid="coming-soon-overlay"
                className={`cs-metal ${comingSoonSerif.variable}`}
                data-size={size}
                data-tone={tone}
                data-cs-paused="true"
                style={style}
            >
                <span className="cs-intro">
                    <span className="cs-refl" />
                    <span className="cs-stage">
                        <span className="cs-bob">
                            <span className="cs-word">
                                {LAYERS.map((layer) => (
                                    <span key={layer} className={`cs-layer ${layer}`}>
                                        {words.map((word) => (
                                            <span key={word} className="cs-line">
                                                {word}
                                            </span>
                                        ))}
                                    </span>
                                ))}
                            </span>
                        </span>
                    </span>
                </span>
            </div>
            <span className="sr-only">{COMING_SOON_OVERLAY_TEXT}</span>
        </>
    )
}
