/**
 * Dwell and pause rules for the Process assessment highlight.
 * The highlight itself springs between rects; this only decides when
 * the active step is allowed to advance.
 */

/** Time the highlight rests on a step before gliding to the next. */
export const PROCESS_STEP_DWELL_MS = 1800

export function nextProcessStep(index: number, count: number): number {
    if (count <= 1) return 0
    const current = ((index % count) + count) % count
    return (current + 1) % count
}

export function shouldRunProcessAutoplay(input: {
    reduceMotion: boolean
    inView: boolean
    tabVisible: boolean
    interacting: boolean
}): boolean {
    if (input.reduceMotion) return false
    if (!input.inView) return false
    if (!input.tabVisible) return false
    if (input.interacting) return false
    return true
}
