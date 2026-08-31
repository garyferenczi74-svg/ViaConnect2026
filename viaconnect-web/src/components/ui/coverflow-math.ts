/**
 * Shortest wrapped offset and 3D coverflow transforms.
 * Used by CoverFlowCarousel so the Features rack can be unit-tested
 * without mounting the client component.
 */

export interface CoverflowTransform {
    rotateY: number
    translateXPercent: number
    translateZ: number
    scale: number
    opacity: number
    zIndex: number
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
    const isActive = offset === 0
    if (reduceMotion) {
        return {
            rotateY: 0,
            translateXPercent: 0,
            translateZ: 0,
            scale: 1,
            opacity: isActive ? 1 : 0,
            zIndex: isActive ? 20 : 0,
        }
    }

    const abs = Math.abs(offset)
    const sign = offset === 0 ? 0 : offset > 0 ? 1 : -1
    return {
        rotateY: isActive ? 0 : sign * -42,
        translateXPercent: offset * 56,
        translateZ: -abs * 130,
        scale: abs === 0 ? 1 : Math.max(0.72, 1 - abs * 0.14),
        opacity: abs > 2 ? 0 : abs === 0 ? 1 : 0.7,
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
