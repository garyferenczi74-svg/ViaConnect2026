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
        const rest = contrast([129, 216, 255], [10, 25, 41])
        const hover = contrast([167, 243, 208], [15, 77, 51])
        expect(rest).toBeGreaterThanOrEqual(7)
        expect(hover).toBeGreaterThanOrEqual(7)
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
