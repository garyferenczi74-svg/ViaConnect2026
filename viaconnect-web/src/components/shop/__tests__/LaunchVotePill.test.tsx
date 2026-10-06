import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { armFollowThroughBlock, LaunchVotePillView } from '@/components/shop/LaunchVotePill'
import { LAUNCH_SASH_CLEARANCE_PX, launchSashCapReach, launchSashOffset } from '@/components/shop/launch-sash-place'
import { CONSUMER_OPEN_PILL_BASE } from '@/lib/ui/consumerChrome'
import { SHOP_CONTROL_JOIN, SHOP_CONTROL_PURCHASE, SHOP_CONTROL_VOTE } from '@/lib/shop/launch-vote-copy'
import type { ResolvedPill } from '@/lib/shop/launch-vote/state'

vi.mock('next/navigation', () => ({
    usePathname: () => '/shop/product/fixture',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

function pill(partial: Partial<ResolvedPill> = {}): ResolvedPill {
    return {
        kind: 'rest',
        interactive: true,
        releaseDateLabel: null,
        topVoted: false,
        ...partial,
    }
}

function renderView(partial: Partial<Parameters<typeof LaunchVotePillView>[0]> = {}) {
    return renderToStaticMarkup(
        <LaunchVotePillView
            productId="p1"
            productName="Creatine Fixture"
            size="card"
            pill={pill()}
            phase="rest"
            signedIn
            votingEnabled
            hasPriorPaidOrder={null}
            error={null}
            onOpen={() => undefined}
            onCancel={() => undefined}
            onSubmit={() => undefined}
            {...partial}
        />,
    )
}

function rgbaVar(css: string, name: string): [number, number, number, number] {
    const match = css.match(
        new RegExp(`${name}:\\s*rgba\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(0?\\.\\d+|1|0)\\s*\\)`),
    )
    if (!match) throw new Error(`missing ${name}`)
    return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])]
}

function hexVar(css: string, name: string): [number, number, number] {
    const match = css.match(new RegExp(`${name}:\\s*#([0-9a-fA-F]{6})`))
    if (!match?.[1]) throw new Error(`missing ${name}`)
    const hex = match[1]
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

describe('LaunchVotePillView', () => {
    it('stacks both labels and opens confirm without writing', () => {
        const rest = renderView()
        expect(rest).toContain('Launching Soon')
        expect(rest).toContain('Vote for the next product launch')
        expect(rest).toContain('aria-haspopup="dialog"')
        expect(rest).not.toContain('aria-disabled')
        const confirm = renderView({ phase: 'confirm' })
        expect(confirm).toContain('Vote for Creatine Fixture?')
        expect(confirm).toContain("Votes can&#x27;t be undone.")
        expect(confirm).toContain('Submit vote')
        expect(confirm).toContain('Cancel')
        expect(confirm).toContain('role="dialog"')
    })

    it('renders voted as status and popular as two lines that are not a button', () => {
        const voted = renderView({ pill: pill({ kind: 'voted', interactive: false }), phase: 'voted' })
        expect(voted).toContain('role="status"')
        expect(voted).toContain('You voted. 25% off at launch')
        expect(voted).not.toContain('<button')
        const popular = renderView({
            pill: pill({ kind: 'popular', interactive: false, releaseDateLabel: 'Oct 5' }),
        })
        expect(popular).toContain('By Popular Demand')
        expect(popular).toContain('Releases Oct 5')
        expect(popular).not.toContain('<button')
    })

    it('keeps hover rules inside hover media and reduced motion at none', () => {
        const css = readFileSync(join(process.cwd(), 'src/components/ui/stardust-button.css'), 'utf8')
        const hoverBlock = css.slice(
            css.indexOf('@media (hover: hover)'),
            css.indexOf(".vc-stardust[data-interactive='true'][data-state='rest']:focus-visible"),
        )
        expect(hoverBlock).toContain(':hover')
        expect(hoverBlock).toContain("data-interactive='true'")
        expect(css).toContain('@media (prefers-reduced-motion: reduce)')
        expect(css).toContain('transition: none')
        const button = readFileSync(join(process.cwd(), 'src/components/shop/LaunchVotePill.tsx'), 'utf8')
        expect(button).toContain('strokeWidth={1.5}')
    })

    it('paints one open-pill glass shape with a green hover and no inner dark pill', () => {
        const css = readFileSync(join(process.cwd(), 'src/components/ui/stardust-button.css'), 'utf8')
        const base = css.slice(0, css.indexOf('@media (hover: hover)'))
        const hoverBlock = css.slice(
            css.indexOf('@media (hover: hover)'),
            css.indexOf(".vc-stardust[data-interactive='true'][data-state='rest']:focus-visible"),
        )
        const fallback = css.slice(css.indexOf('@supports not (backdrop-filter: blur(1px))'))
        const reduced = css.slice(css.indexOf('@media (prefers-reduced-transparency: reduce)'))
        expect(css).toContain('-webkit-backdrop-filter: blur(12px)')
        expect(css).toContain('backdrop-filter: blur(12px)')
        expect(css).not.toContain('::before')
        expect(css).not.toContain('::after')
        expect(css).not.toContain('text-shadow:')
        expect(css).not.toContain('--vc-stardust-scrim')
        expect(css.toLowerCase()).not.toContain('#0a1929')
        expect(css).not.toContain('rgba(0, 0, 0')
        expect(base).toContain('border: 1px solid var(--vc-stardust-rest-border)')
        expect(base).toContain('box-shadow: none')
        expect(base).toContain('border-radius: 999px')
        expect(base).toContain('min-height: 0')

        const restGlass = rgbaVar(base, '--vc-stardust-rest-bg')
        const hoverGlass = rgbaVar(base, '--vc-stardust-hover-bg')
        const restBorder = rgbaVar(base, '--vc-stardust-rest-border')
        const restInk = hexVar(base, '--vc-stardust-rest-fg')
        const hoverInk = hexVar(base, '--vc-stardust-hover-fg')
        expect(restGlass).toEqual([42, 76, 158, 0.12])
        expect(restBorder).toEqual([91, 141, 239, 0.3])
        expect(restInk).toEqual([255, 255, 255])
        expect(hoverInk).toEqual([255, 255, 255])
        expect(hoverGlass).toEqual([15, 77, 51, 0.2])
        expect(hoverBlock).toContain('border-color: var(--vc-stardust-hover-border)')
        expect(hoverBlock).toContain('box-shadow: none')
        expect(rgbaVar(fallback, '--vc-stardust-rest-bg')[3]).toBeGreaterThan(restGlass[3])
        expect(rgbaVar(reduced, '--vc-stardust-rest-bg')[3]).toBeGreaterThan(rgbaVar(fallback, '--vc-stardust-rest-bg')[3])
        expect(reduced).toContain('backdrop-filter: none')
        expect(base).toContain('font-size: 12px')
        expect(base).toContain('padding: 6px 14px')
        expect(base).not.toContain('::before')
        expect(base).not.toContain('::after')
        const buttonSource = readFileSync(join(process.cwd(), 'src/components/ui/stardust-button.tsx'), 'utf8')
        expect(buttonSource).toContain('CONSUMER_OPEN_PILL_BASE')
        expect(CONSUMER_OPEN_PILL_BASE).toContain('bg-[#2A4C9E]/[0.12]')
        expect(CONSUMER_OPEN_PILL_BASE).toContain('border-[#5B8DEF]/30')
        expect(CONSUMER_OPEN_PILL_BASE).toContain('backdrop-blur-md')
        expect(CONSUMER_OPEN_PILL_BASE).toContain('text-white')
    })

    it('sits in the image top-left as a single -45deg sash and stays static when votes are off', () => {
        const overlay = readFileSync(join(process.cwd(), 'src/components/shop/launch-vote-pill.css'), 'utf8')
        const sash = overlay.slice(0, overlay.indexOf('.vc-launch-vote-notes'))
        expect(sash).toContain('inset: 0')
        expect(sash).toContain('overflow: hidden')
        expect(sash).toContain('border-radius: 0.75rem')
        expect(sash).toContain("border-radius: 1rem")
        expect(sash).toContain('transform-origin: center')
        expect(sash).toContain('transform: rotate(-45deg)')
        expect(sash).not.toContain('translate(')
        expect(sash).not.toContain('11.25rem')
        expect(sash).toContain('width: max-content')
        expect(sash).toContain('white-space: nowrap')
        expect(sash).not.toContain('::before')
        expect(sash).not.toContain('::after')
        expect(sash).not.toContain('#0a1929')
        expect(overlay).not.toContain('left: 10%')
        const source = readFileSync(join(process.cwd(), 'src/components/shop/LaunchVotePill.tsx'), 'utf8')
        expect(source).toContain('useLayoutEffect')
        expect(source).toContain('applyLaunchSash')
        expect(LAUNCH_SASH_CLEARANCE_PX).toBe(8)

        const off = renderView({
            pill: pill({ kind: 'rest', interactive: false }),
            votingEnabled: false,
        })
        expect(off).toContain('Launching Soon')
        expect(off).toContain('data-interactive="false"')
        expect(off).not.toContain('Vote for the next product launch')
        expect(off).not.toContain('data-testid="launch-vote-terms"')
        expect(off).not.toContain('<button')

        const on = renderView()
        expect(on).toContain('data-interactive="true"')
        expect(on).toContain('Vote for the next product launch')

        const card = readFileSync(join(process.cwd(), 'src/components/shop/ProductCard.tsx'), 'utf8')
        const pdp = readFileSync(
            join(process.cwd(), 'src/app/(app)/(consumer)/shop/product/[slug]/page.tsx'),
            'utf8',
        )
        expect(card).toContain('overflow-hidden')
        expect(card).toContain('<LaunchVotePill')
        expect(pdp).toContain('overflow-hidden')
        expect(pdp).toContain('<LaunchVotePill')
    })

    it('keeps the pill border box the same size in rest, hover, focus, and active', () => {
        const css = readFileSync(join(process.cwd(), 'src/components/ui/stardust-button.css'), 'utf8')
        const overlay = readFileSync(join(process.cwd(), 'src/components/shop/launch-vote-pill.css'), 'utf8')
        const base = css.slice(0, css.indexOf('@media (hover: hover)'))
        const hoverBlock = css.slice(
            css.indexOf('@media (hover: hover)'),
            css.indexOf(".vc-stardust[data-interactive='true'][data-state='rest']:focus-visible"),
        )
        const focusAt = css.indexOf(".vc-stardust[data-interactive='true'][data-state='rest']:focus-visible")
        const focusBlock = css.slice(
            focusAt,
            css.indexOf(".vc-stardust[data-interactive='false'][data-state='rest']:hover", focusAt),
        )
        expect(base).toContain('appearance: none')
        expect(base).toContain('box-sizing: border-box')
        expect(base).toContain('border: 1px solid var(--vc-stardust-rest-border)')
        expect(base).toContain('flex: 1 1 0%')
        expect(base).toContain('width: 0')
        expect(base).toContain('flex: 0 0 12px')
        expect(hoverBlock).toContain('border-width: 1px')
        expect(hoverBlock).toContain('border-style: solid')
        expect(hoverBlock).toContain('box-sizing: border-box')
        expect(hoverBlock).not.toContain('display: none')
        expect(focusBlock).toContain('border-width: 1px')
        expect(focusBlock).toContain('border-style: solid')
        expect(focusBlock).not.toContain('display: none')
        expect(overlay).not.toContain('11.25rem')
        const sashCss = overlay.slice(0, overlay.indexOf('.vc-launch-vote-notes'))
        expect(sashCss).toContain('font-size: 11px')
        expect(sashCss).not.toMatch(/font-size:\s*10px/)
        expect(sashCss).not.toMatch(/font-size:\s*9px/)
        expect(overlay).toContain(".vc-launch-vote > .vc-stardust[data-interactive='true'] .vc-stardust-label-alt")
        expect(overlay).toContain(".vc-launch-vote > .vc-stardust[data-interactive='true'] .vc-stardust-label-rest")
        expect(overlay).toContain('align-items: center')
        expect(overlay).toContain('align-self: center')
        expect(overlay).toContain('white-space: normal')
        expect(overlay).toContain('min-width: 100%')
        expect(overlay).not.toContain('-webkit-line-clamp: 2')
        expect(overlay).not.toContain('line-clamp: 2')
        expect(overlay).toContain('pointer-events: auto')
        const place = readFileSync(join(process.cwd(), 'src/components/shop/launch-sash-place.ts'), 'utf8')
        expect(place).toContain('fitLaunchSashLabel')
        expect(place).toContain('dataset.sashBox')
        const width = 128
        const height = 36
        const placed = launchSashOffset(width, height)
        const reach = launchSashCapReach(width, height)
        expect(placed.left + width / 2 - reach).toBeCloseTo(LAUNCH_SASH_CLEARANCE_PX, 6)
        expect(placed.top + height / 2 - reach).toBeCloseTo(LAUNCH_SASH_CLEARANCE_PX, 6)
    })

    it('keeps the full sash inset and the terms line as a glass strip under the image', () => {
        const overlay = readFileSync(join(process.cwd(), 'src/components/shop/launch-vote-pill.css'), 'utf8')
        const note = overlay.slice(overlay.indexOf('.vc-stardust-note {'), overlay.indexOf('.vc-vote-dialog'))
        expect(note).toContain('rgba(42, 76, 158, 0.12)')
        expect(note).toContain('rgba(91, 141, 239, 0.3)')
        expect(note).toContain('backdrop-filter: blur(12px)')
        expect(note).toContain('border-radius: 999px')
        expect(note).toContain('min-height: 44px')
        expect(note).not.toContain('#0a1929')
        expect(note).not.toContain('bottom:')
        expect(overlay.slice(0, overlay.indexOf('.vc-launch-vote-notes'))).not.toContain('position: absolute;\n    right: 8px')

        const html = renderView()
        const overlayAt = html.indexOf('data-testid="launch-vote-overlay"')
        const termsAt = html.indexOf('data-testid="launch-vote-terms"')
        expect(overlayAt).toBeGreaterThan(-1)
        expect(termsAt).toBeGreaterThan(overlayAt)
        const between = html.slice(overlayAt, termsAt)
        expect(between).not.toContain('25% off your first order')
        expect(html).toContain('25% off your first order of this product if you have not ordered before, or your next order if you have. Terms apply.')
        expect(html).toContain('bg-[#2A4C9E]/[0.12]')
        expect(html).toContain('border-[#5B8DEF]/30')
        expect(html).toContain('backdrop-blur-md')
        const source = readFileSync(join(process.cwd(), 'src/components/shop/LaunchVotePill.tsx'), 'utf8')
        expect(source).toContain('CONSUMER_OPEN_PILL_BASE')
        const card = readFileSync(join(process.cwd(), 'src/components/shop/ProductCard.tsx'), 'utf8')
        const pdp = readFileSync(
            join(process.cwd(), 'src/app/(app)/(consumer)/shop/product/[slug]/page.tsx'),
            'utf8',
        )
        expect(card.indexOf('<LaunchVotePill')).toBeLessThan(card.indexOf('{photo}'))
        expect(pdp.indexOf('<LaunchVotePill')).toBeLessThan(pdp.indexOf('aspect-[4/5]'))
    })

    it('seals dialog taps so Cancel, overlay, Submit, and Escape do not reach the card link', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/shop/LaunchVotePill.tsx'), 'utf8')
        expect(source).toContain('createPortal(dialog, document.body)')
        expect(source).toContain('data-testid="launch-vote-dialog"')
        expect(source).toContain('armFollowThroughBlock')
        expect(source).toContain('guardCardClick(event)')
        expect(source).toContain('event.stopPropagation()')
        expect(source).toContain("event.key === 'Escape'")
        expect(source).toContain('closeConfirmRef.current()')
        expect(source).not.toMatch(/\bany\b/)
        const confirm = renderView({ phase: 'confirm' })
        expect(confirm).toContain('data-testid="launch-vote-dialog"')
        expect(confirm).toContain('type="button"')
        expect(confirm).toContain('Cancel')
        expect(confirm).toContain('Submit vote')

        const listeners: Array<{ type: string; listener: (event: Event) => void; capture: true }> = []
        let removed = 0
        let scheduled: { fn: () => void; ms: number } | null = null
        armFollowThroughBlock(
            {
                addEventListener(type, listener, capture) {
                    listeners.push({ type, listener, capture })
                },
                removeEventListener() {
                    removed += 1
                },
            },
            (fn, ms) => {
                scheduled = { fn, ms }
                return 1
            },
            { x: 40, y: 80 },
        )
        expect(listeners).toHaveLength(1)
        expect(listeners[0]?.type).toBe('click')
        expect(listeners[0]?.capture).toBe(true)
        const near = { clientX: 48, clientY: 90, preventDefault: vi.fn(), stopPropagation: vi.fn() }
        listeners[0]?.listener(near as unknown as Event)
        expect(near.preventDefault).toHaveBeenCalledOnce()
        expect(near.stopPropagation).toHaveBeenCalledOnce()
        const away = { clientX: 200, clientY: 400, preventDefault: vi.fn(), stopPropagation: vi.fn() }
        listeners[0]?.listener(away as unknown as Event)
        expect(away.preventDefault).not.toHaveBeenCalled()
        expect(scheduled?.ms).toBe(350)
        scheduled?.fn()
        expect(removed).toBe(1)
    })

    it('describes Join, purchase, and vote as three separate controls', () => {
        expect(SHOP_CONTROL_JOIN).toContain('email sign-up only')
        expect(SHOP_CONTROL_PURCHASE).toContain('purchase button only')
        expect(SHOP_CONTROL_VOTE).toContain('only on unreleased')
        const card = readFileSync(join(process.cwd(), 'src/components/shop/ProductCard.SupplementBody.tsx'), 'utf8')
        expect(card).toContain('JoinWaitlistButton')
        expect(card).toContain('Add to Cart')
        expect(card).toContain('email sign-up')
    })
})
