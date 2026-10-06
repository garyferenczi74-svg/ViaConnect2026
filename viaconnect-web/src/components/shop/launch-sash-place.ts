/** Painted clearance from each rounded cap to the photo edge. Brief 72 A5 fit. */
export const LAUNCH_SASH_CLEARANCE_PX = 8

/**
 * Unrotated top/left for a stadium rotated -45deg around its center.
 * The cap that swings up and the cap that swings left both land
 * `clearance` px inside the photo. A percent translate cannot express
 * this: horizontal % is of width and vertical % is of height.
 */
export function launchSashOffset(
    width: number,
    height: number,
    clearance = LAUNCH_SASH_CLEARANCE_PX,
): { left: number; top: number } {
    if (!(width > 0) || !(height > 0)) {
        return { left: clearance, top: clearance }
    }
    const capReach = launchSashCapReach(width, height)
    return {
        left: clearance + capReach - width / 2,
        top: clearance + capReach - height / 2,
    }
}

/** Distance from the pill center to the outer tip of either semicircle cap after -45deg. */
export function launchSashCapReach(width: number, height: number): number {
    const radius = height / 2
    return (width / 2 - radius) * Math.SQRT1_2 + radius
}

/**
 * Same corner tuck, pulled back if the frame is tight so the opposite
 * caps stay inside the right and bottom edges when the pill fits.
 */
export function launchSashOffsetInFrame(
    width: number,
    height: number,
    frameWidth: number,
    frameHeight: number,
    clearance = LAUNCH_SASH_CLEARANCE_PX,
): { left: number; top: number } {
    const preferred = launchSashOffset(width, height, clearance)
    if (!(width > 0) || !(height > 0)) return preferred
    const capReach = launchSashCapReach(width, height)
    const maxLeft = frameWidth - clearance - capReach - width / 2
    const maxTop = frameHeight - clearance - capReach - height / 2
    return {
        left: Math.min(preferred.left, maxLeft),
        top: Math.min(preferred.top, maxTop),
    }
}

/**
 * Locks the interactive label column so the hover sentence fits in at most
 * three lines. The rest line already sets that width when three lines fit.
 * A wider shared width is written only when the sentence would wrap to a
 * fourth line. The result is one box for rest and hover.
 * Self-contained so a browser evaluate() can run the function body alone.
 */
export function fitLaunchSashLabel(pill: HTMLElement): void {
    if (pill.getAttribute('data-interactive') !== 'true') return
    if (pill.dataset.sashFit === '1') return
    const labels = pill.querySelector<HTMLElement>('.vc-stardust-labels')
    const alt = pill.querySelector<HTMLElement>('.vc-stardust-label-alt')
    if (!labels || !alt) return
    const line = parseFloat(getComputedStyle(alt).lineHeight) || 15
    const limit = line * 3 + 1
    const fits = (): boolean =>
        alt.scrollHeight <= limit && alt.scrollWidth <= alt.clientWidth + 1
    if (fits()) {
        pill.dataset.sashFit = '1'
        return
    }
    const rest = pill.querySelector<HTMLElement>('.vc-stardust-label-rest')
    let lo = Math.max(1, Math.ceil(rest?.scrollWidth ?? labels.clientWidth))
    let hi = lo
    const applyWidth = (width: number): void => {
        const px = `${width}px`
        labels.style.width = px
        labels.style.minWidth = px
        labels.style.maxWidth = px
    }
    while (hi < 480) {
        applyWidth(hi)
        if (fits()) break
        hi += 8
    }
    let best = hi
    while (lo + 1 < best) {
        const mid = Math.floor((lo + best) / 2)
        applyWidth(mid)
        if (fits()) best = mid
        else lo = mid
    }
    applyWidth(best)
    pill.dataset.sashFit = '1'
}

export function applyLaunchSash(frame: HTMLElement): void {
    const pill = frame.querySelector<HTMLElement>('[data-testid="launch-vote-pill"]')
    if (!pill || pill.offsetWidth === 0 || pill.offsetHeight === 0) return
    fitLaunchSashLabel(pill)
    const signature = `${pill.offsetWidth}x${pill.offsetHeight}@${frame.clientWidth}x${frame.clientHeight}`
    if (frame.dataset.sashBox === signature) return
    const next = launchSashOffsetInFrame(
        pill.offsetWidth,
        pill.offsetHeight,
        frame.clientWidth,
        frame.clientHeight,
        LAUNCH_SASH_CLEARANCE_PX + 1,
    )
    pill.style.left = `${next.left}px`
    pill.style.top = `${next.top}px`
    frame.dataset.sashBox = signature
    frame.setAttribute('data-sash-placed', 'true')
}
