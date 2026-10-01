/**
 * Stardust vote pill. Vote control only. Not Join the Revolution and not Add to Cart.
 */
import type { MouseEvent, ReactNode } from 'react'
import './stardust-button.css'

export type StardustSize = 'card' | 'pdp'
export type StardustState = 'rest' | 'voted' | 'popular'

interface StardustButtonProps {
    as: 'button' | 'span'
    size: StardustSize
    state: StardustState
    label: string
    altLabel?: string | null
    detail?: string | null
    glyph?: ReactNode
    altGlyph?: ReactNode
    ariaLabel?: string
    ariaDisabled?: boolean
    ariaHaspopup?: 'dialog'
    ariaExpanded?: boolean
    role?: 'status'
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

export function StardustButton({
    as,
    size,
    state,
    label,
    altLabel,
    detail,
    glyph,
    altGlyph,
    ariaLabel,
    ariaDisabled,
    ariaHaspopup,
    ariaExpanded,
    role,
    onClick,
}: StardustButtonProps) {
    const className = 'vc-stardust'
    const body = (
        <>
            {state === 'popular' ? (
                <span className="vc-stardust-labels vc-stardust-labels-stack">
                    <span className="vc-stardust-label">{label}</span>
                    {detail ? <span className="vc-stardust-detail">{detail}</span> : null}
                </span>
            ) : (
                <span className="vc-stardust-labels">
                    <span className="vc-stardust-label vc-stardust-label-rest">{label}</span>
                    {altLabel ? (
                        <span className="vc-stardust-label vc-stardust-label-alt">{altLabel}</span>
                    ) : null}
                </span>
            )}
            {glyph || altGlyph ? (
                <span className="vc-stardust-glyphs" aria-hidden="true">
                    <span className="vc-stardust-glyph vc-stardust-glyph-rest">{glyph}</span>
                    <span className="vc-stardust-glyph vc-stardust-glyph-alt">{altGlyph}</span>
                </span>
            ) : null}
        </>
    )
    if (as === 'span') {
        return (
            <span
                className={className}
                data-size={size}
                data-state={state}
                data-testid="launch-vote-pill"
                role={role}
                aria-label={ariaLabel}
                aria-disabled={ariaDisabled ? true : undefined}
            >
                {body}
            </span>
        )
    }
    return (
        <button
            type="button"
            className={className}
            data-size={size}
            data-state={state}
            data-testid="launch-vote-pill"
            aria-label={ariaLabel}
            aria-haspopup={ariaHaspopup}
            aria-expanded={ariaExpanded}
            onClick={onClick}
        >
            {body}
        </button>
    )
}
