/**
 * Shortest wrapped offset and 3D coverflow transforms.
 * Used by CoverFlowCarousel so the Features rack can be unit-tested
 * without mounting the client component.
 */

/**
 * One card cycle. Most of it is a settled hold so the front card is readable.
 * The move itself is COVERFLOW_STEP_MS. Autoplay must not park between cards.
 */
export const COVERFLOW_AUTOPLAY_MS_PER_CARD = 2800

/** Short ease from one settled card to the next. Always runs to completion. */
export const COVERFLOW_STEP_MS = 560

/** Mobile 390 keeps the compact #150 plate. Tablet/desktop restore a coverflow hero. */
export const COVERFLOW_STAGE_HEIGHT_CLASS =
    'h-[288px] sm:h-[420px] md:h-[540px] lg:h-[620px]'

export const COVERFLOW_CARD_SIZE_CLASS =
    'w-[196px] h-[220px] sm:w-[268px] sm:h-[340px] md:w-[360px] md:h-[440px] lg:w-[420px] lg:h-[520px]'

export interface CoverflowTransform {
    rotateY: number
    translateXPercent: number
    translateZ: number
    scale: number
    opacity: number
    zIndex: number
}

export function wrapCarouselProgress(progress: number, length: number): number {
    if (length <= 0) return 0
    return ((progress % length) + length) % length
}

export function nearestCoverflowIndex(progress: number, length: number): number {
    if (length <= 0) return 0
    return wrapCarouselProgress(Math.round(progress), length)
}

export function advanceCoverflowProgress(
    progress: number,
    dtMs: number,
    msPerCard: number,
    length: number,
): number {
    if (length <= 1 || msPerCard <= 0) {
        return wrapCarouselProgress(progress, length)
    }
    const delta = Math.max(0, dtMs) / msPerCard
    return wrapCarouselProgress(progress + delta, length)
}

export function nextClockwiseIndex(activeIndex: number, length: number): number {
    if (length <= 0) return 0
    return ((activeIndex + 1) % length + length) % length
}

export function shouldPauseCoverflowAutoplay(input: {
    reduceMotion: boolean | null
    hovering: boolean
    focusWithin: boolean
    pointerActive: boolean
    dropdownOpen: boolean
    /** Missing means "still on screen". Only an explicit false pauses. */
    inView?: boolean
    /** Missing means "tab visible". Only an explicit false pauses. */
    tabVisible?: boolean
}): boolean {
    if (input.reduceMotion !== false) return true
    if (input.inView === false || input.tabVisible === false) return true
    return input.hovering || input.focusWithin || input.pointerActive || input.dropdownOpen
}

export function coverflowHoldMs(
    msPerCard = COVERFLOW_AUTOPLAY_MS_PER_CARD,
    stepMs = COVERFLOW_STEP_MS,
): number {
    return Math.max(0, msPerCard - stepMs)
}

/** 0 at the start of a step, 1 once the step must be on the destination card. */
export function coverflowStepProgress(elapsedMs: number, stepMs: number): number {
    if (stepMs <= 0) return 1
    const t = Math.max(0, Math.min(1, elapsedMs / stepMs))
    return 1 - (1 - t) ** 3
}

export function coverflowProgressIsSettled(progress: number, epsilon = 0.02): boolean {
    if (!Number.isFinite(progress)) return true
    return Math.abs(progress - Math.round(progress)) <= epsilon
}

/** Shortest-path blend. amount 1 lands on `to`, never short of it. */
export function coverflowDisplayedProgress(
    from: number,
    to: number,
    amount: number,
    length: number,
): number {
    if (length <= 0) return 0
    const start = wrapCarouselProgress(from, length)
    const end = wrapCarouselProgress(to, length)
    let delta = end - start
    if (delta > length / 2) delta -= length
    if (delta < -length / 2) delta += length
    const t = Math.max(0, Math.min(1, amount))
    if (t >= 1) return end
    return wrapCarouselProgress(start + delta * t, length)
}

export interface CoverflowInteractionFlags {
    hovering: boolean
    focusWithin: boolean
    pointerActive: boolean
}

export type CoverflowReleaseReason =
    | 'visibility-hidden'
    | 'left-viewport'
    | 'window-blur'
    | 'pointer-up'
    | 'pointer-cancel'

/**
 * Hover and an in-flight pointer stick across tab hides and scroll-away
 * because pointerleave / pointerup never fire. Drop those. Keyboard focus
 * stays, so arrow-key use still holds the rack.
 */
export function releaseCoverflowInteraction(
    current: CoverflowInteractionFlags,
    reason: CoverflowReleaseReason,
): CoverflowInteractionFlags {
    if (reason === 'pointer-up' || reason === 'pointer-cancel') {
        return { ...current, pointerActive: false }
    }
    return {
        hovering: false,
        focusWithin: current.focusWithin,
        pointerActive: false,
    }
}

export function shortestCarouselOffset(
    index: number,
    activeIndex: number,
    length: number,
): number {
    if (length <= 0) return 0
    const forward = ((index - activeIndex) % length + length) % length
    const backward = forward - length
    if (forward === 0) return 0
    return Math.abs(backward) < forward ? backward : forward
}

export function coverflowTransform(
    offset: number,
    reduceMotion: boolean,
): CoverflowTransform {
    const abs = Math.abs(offset)
    if (reduceMotion) {
        const isActive = abs < 0.5
        return {
            rotateY: 0,
            translateXPercent: 0,
            translateZ: 0,
            scale: 1,
            opacity: isActive ? 1 : 0,
            zIndex: isActive ? 20 : 0,
        }
    }

    const rotateT = Math.max(-1, Math.min(1, offset))
    const rotateY = rotateT * -42
    const opacity =
        abs >= 2.5 ? 0 : abs <= 1 ? 1 - 0.3 * abs : abs <= 2 ? 0.7 : (0.7 * (2.5 - abs)) / 0.5

    return {
        rotateY: rotateY === 0 ? 0 : rotateY,
        translateXPercent: offset * 56,
        translateZ: -abs * 130,
        scale: Math.max(0.72, 1 - abs * 0.14),
        opacity,
        zIndex: 20 - abs * 4,
    }
}

export function coverflowCssTransform(t: CoverflowTransform): string {
    return [
        'translate(-50%, -50%)',
        `translateX(${t.translateXPercent}%)`,
        `translateZ(${t.translateZ}px)`,
        `rotateY(${t.rotateY}deg)`,
        `scale(${t.scale})`,
    ].join(' ')
}
