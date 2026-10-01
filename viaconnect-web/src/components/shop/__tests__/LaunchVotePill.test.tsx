import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LaunchVotePillView } from '@/components/shop/LaunchVotePill'
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

function contrast(fg: [number, number, number], bg: [number, number, number]): number {
    const lin = (channel: number) => {
        const value = channel / 255
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }
    const lum = (rgb: [number, number, number]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
    const lighter = Math.max(lum(fg), lum(bg))
    const darker = Math.min(lum(fg), lum(bg))
    return (lighter + 0.05) / (darker + 0.05)
}

function over(
    src: [number, number, number, number],
    dst: [number, number, number],
): [number, number, number] {
    const alpha = src[3]
    return [
        Math.round(src[0] * alpha + dst[0] * (1 - alpha)),
        Math.round(src[1] * alpha + dst[1] * (1 - alpha)),
        Math.round(src[2] * alpha + dst[2] * (1 - alpha)),
    ]
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
        const hoverBlock = css.slice(css.indexOf('@media (hover: hover)'), css.indexOf('.vc-stardust[data-state=\'rest\']:focus-visible'))
        expect(hoverBlock).toContain(':hover')
        expect(css).toContain('@media (prefers-reduced-motion: reduce)')
        expect(css).toContain('transition: none')
        const button = readFileSync(join(process.cwd(), 'src/components/shop/LaunchVotePill.tsx'), 'utf8')
        expect(button).toContain('strokeWidth={1.5}')
    })

    it('paints a glass pill that stays WCAG AA on white, black, and the light card', () => {
        const css = readFileSync(join(process.cwd(), 'src/components/ui/stardust-button.css'), 'utf8')
        const base = css.slice(0, css.indexOf('@media (hover: hover)'))
        const hoverBlock = css.slice(css.indexOf('@media (hover: hover)'), css.indexOf('.vc-stardust[data-state=\'rest\']:focus-visible'))
        const fallback = css.slice(css.indexOf('@supports not (backdrop-filter: blur(1px))'))
        const reduced = css.slice(css.indexOf('@media (prefers-reduced-transparency: reduce)'))
        expect(css).toContain('-webkit-backdrop-filter: blur(12px)')
        expect(css).toContain('backdrop-filter: blur(12px)')
        expect(css).toContain('rgba(255, 255, 255, 0.42)')
        expect(css).toContain('text-shadow: 0 1px 1px rgba(0, 0, 0, 0.45)')
        expect(base).toContain('border: 0')

        const restGlass = rgbaVar(base, '--vc-stardust-rest-bg')
        const hoverGlass = rgbaVar(base, '--vc-stardust-hover-bg')
        const restInk = hexVar(base, '--vc-stardust-rest-fg')
        const hoverInk = hexVar(base, '--vc-stardust-hover-fg')
        const restScrim = rgbaVar(base, '--vc-stardust-scrim')
        const greenScrim = rgbaVar(hoverBlock, '--vc-stardust-scrim')
        expect(restGlass[3]).toBeGreaterThanOrEqual(0.1)
        expect(restGlass[3]).toBeLessThanOrEqual(0.25)
        expect(hoverGlass[3]).toBeGreaterThanOrEqual(0.1)
        expect(hoverGlass[3]).toBeLessThanOrEqual(0.25)
        expect(rgbaVar(fallback, '--vc-stardust-rest-bg')[3]).toBeGreaterThan(restGlass[3])
        expect(rgbaVar(reduced, '--vc-stardust-rest-bg')[3]).toBeGreaterThan(rgbaVar(fallback, '--vc-stardust-rest-bg')[3])
        expect(reduced).toContain('backdrop-filter: none')

        const surfaces: Array<[string, [number, number, number]]> = [
            ['white bottle', [255, 255, 255]],
            ['black bottle', [17, 17, 17]],
            ['light card', [255, 255, 255]],
        ]
        const states: Array<[string, [number, number, number, number], [number, number, number, number], [number, number, number]]> = [
            ['rest', restGlass, restScrim, restInk],
            ['hover', hoverGlass, greenScrim, hoverInk],
            ['voted', hoverGlass, greenScrim, hoverInk],
            ['popular', hoverGlass, greenScrim, hoverInk],
        ]
        for (const [surfaceName, surface] of surfaces) {
            for (const [stateName, glass, scrim, ink] of states) {
                const ratio = contrast(ink, over(scrim, over(glass, surface)))
                expect(ratio, `${stateName} on ${surfaceName}`).toBeGreaterThanOrEqual(4.5)
            }
        }
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
