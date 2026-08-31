/**
 * Shortest wrapped offset and 3D coverflow transforms.
 * Used by CoverFlowCarousel so the Features rack can be unit-tested
 * without mounting the client component.
 */

/** Milliseconds to glide one card during continuous autoplay. Not a dwell. */
export const COVERFLOW_AUTOPLAY_MS_PER_CARD = 2800

/** Mobile 390 keeps the compact #150 plate. Tablet/desktop restore a coverflow hero. */
export const COVERFLOW_STAGE_HEIGHT_CLASS =
    'h-[288px] sm:h-[420px] md:h-[540px]'

export const COVERFLOW_CARD_SIZE_CLASS =
    'w-[196px] h-[220px] sm:w-[268px] sm:h-[340px] md:w-[360px] md:h-[440px]'

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
}): boolean {
    if (input.reduceMotion !== false) return true
    return input.hovering || input.focusWithin || input.pointerActive || input.dropdownOpen
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
