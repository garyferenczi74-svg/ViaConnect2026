/**
 * Product card release states. Fixtures are not catalog data.
 */
import { createElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductCard } from '@/components/shop/ProductCard'
import { withReleaseState, type ShopProduct } from '@/lib/shop/queries'

vi.mock('next/link', () => ({
    default: ({
        href,
        children,
        className,
    }: {
        href: string
        children?: ReactNode
        className?: string
    }) => createElement('a', { href, className }, children),
}))

vi.mock('next/image', () => ({
    default: ({ alt, blurDataURL }: { alt?: string; blurDataURL?: string }) =>
        createElement('img', { alt: alt ?? '', 'data-blur': blurDataURL ?? '' }),
}))

vi.mock('next/navigation', () => ({
    usePathname: () => '/shop/genex360',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}))

function base(partial: Partial<ShopProduct> = {}): ShopProduct {
    return {
        id: 'id-1',
        sku: 'FC-CREATINE-001',
        slug: 'creatine-fixture',
        name: 'Creatine Fixture',
        short_name: 'Creatine',
        summary: 'Not catalog data',
        description: 'Not catalog data',
        format: 'powder',
        category: 'supplement',
        category_slug: 'advanced-formulas',
        price: 20,
        price_msrp: 24,
        pricing_tier: 'L1',
        image_url: null,
        image_urls: null,
        status_tags: null,
        testing_meta: null,
        snp_targets: null,
        bioavailability_pct: null,
        product_type: 'supplement',
        ingredients: null,
        gene_match_score: null,
        requires_practitioner_order: false,
        active: true,
        display_config: null,
        is_released: false,
        ...partial,
    }
}

function renderCard(product: ShopProduct, variant: 'supplement' | 'testing' = 'supplement', joined = false, signedIn = true) {
    return renderToStaticMarkup(
        <ProductCard
            product={product}
            variant={variant}
            href={`/shop/product/${product.slug}`}
            isFormulationOpen={false}
            onToggleFormulation={() => undefined}
            waitlist={{ signedIn, joined }}
        />,
    )
}

describe('ProductCard coming soon', () => {
    it('keeps Add to Cart and Join the Revolution on a released supplement and hides the vote pill', () => {
        const html = renderCard(base({ name: 'Released Fixture', is_released: true }))
        expect(html).not.toContain('data-testid="launch-vote-pill"')
        expect(html).toContain('Add to Cart')
        expect(html).toContain('Join the Revolution')
    })

    it('shows the vote pill and Join the Revolution on an unreleased supplement, with no Add to Cart', () => {
        const html = renderCard(base({ is_released: false }))
        expect(html).toContain('data-testid="launch-vote-pill"')
        expect(html).toContain('Launching Soon')
        expect(html).toContain('Join the Revolution')
        expect(html).not.toContain('Add to Cart')
    })

    it('keeps a GeneX360 kit buyable when the release lookup failed', () => {
        const [kit] = withReleaseState(
            [
                base({
                    id: 'kit',
                    sku: 'GX-KIT',
                    name: 'Panel Kit',
                    category: 'test_kit',
                    product_type: 'test_kit',
                    category_slug: 'genex360',
                    requires_practitioner_order: true,
                }),
            ],
            null,
        )
        const html = renderCard(kit, 'testing')
        expect(kit.is_released).toBe(true)
        expect(html).not.toContain('data-testid="launch-vote-pill"')
        expect(html).toContain('Join the Revolution')
        expect(html).toContain('Order Test Kit')
    })

    it('puts a null product_type in the genex360 category on the waitlist', () => {
        const [row] = withReleaseState(
            [
                base({
                    name: 'Null Type Fixture',
                    category: 'test_kit',
                    product_type: null,
                    category_slug: 'genex360',
                }),
            ],
            null,
        )
        const html = renderCard(row, 'testing')
        expect(row.is_released).toBe(false)
        expect(html).toContain('data-testid="launch-vote-pill"')
        expect(html).toContain('Join the Revolution')
        expect(html).not.toContain('Add to Cart')
        expect(html).not.toContain('Order Test Kit')
    })

    it('shows the joined state and the leave control', () => {
        const html = renderCard(base(), 'supplement', true, true)
        expect(html).toContain('role="status"')
        expect(html).toContain("You&#x27;re on the list")
        expect(html).toContain('Leave the list')
    })

    it('shows the signed-out fallback', () => {
        const html = renderCard(base(), 'supplement', false, false)
        expect(html).toContain('Sign in to join the list')
        expect(html).toContain('/login?redirectTo=')
    })

    it('keeps the sash on the photo and status pills in the image frame', () => {
        const html = renderCard(base({ status_tags: ['NEW'], is_released: false }))
        const imageAt = html.indexOf('aspect-[3/4]')
        const overlayAt = html.indexOf('data-testid="launch-vote-pill"')
        const pillsAt = html.indexOf('absolute top-3 right-3 z-10')
        expect(imageAt).toBeGreaterThan(-1)
        expect(pillsAt).toBeGreaterThan(imageAt)
        expect(overlayAt).toBeGreaterThan(pillsAt)
        expect(html).not.toContain('data-testid="launch-vote-terms"')
    })

    it('uses a white image container when a photo exists and the navy fallback when it does not', () => {
        const whiteBlur =
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0IDUiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjUiIGZpbGw9IiNGRkZGRkYiLz48L3N2Zz4='
        const withPhoto = renderCard(base({ image_urls: ['https://example.test/photo.png'] }))
        const photoClass = withPhoto.match(/class="([^"]*aspect-\[3\/4\][^"]*)"/)?.[1] ?? ''
        expect(photoClass.split(/\s+/)).toContain('bg-white')
        expect(photoClass.split(/\s+/)).not.toContain('bg-white/[0.04]')
        expect(withPhoto).toContain(whiteBlur)

        const noPhoto = renderCard(base())
        const fallbackClass = noPhoto.match(/class="([^"]*aspect-\[3\/4\][^"]*)"/)?.[1] ?? ''
        expect(fallbackClass.split(/\s+/)).toContain('bg-white/[0.04]')
        expect(fallbackClass.split(/\s+/)).not.toContain('bg-white')
        expect(noPhoto).not.toContain(whiteBlur)

        const source = readFileSync(join(process.cwd(), 'src/components/shop/ProductCard.tsx'), 'utf8')
        expect(source).toContain(whiteBlur)
    })

    it('uses strokeWidth 1.5 on new icons and no any', () => {
        const button = readFileSync(
            join(process.cwd(), 'src/components/shop/JoinWaitlistButton.tsx'),
            'utf8',
        )
        const card = readFileSync(join(process.cwd(), 'src/components/shop/ProductCard.tsx'), 'utf8')
        expect(button).toContain('strokeWidth={1.5}')
        expect(button).not.toMatch(/\bany\b/)
        expect(card).not.toMatch(/\bany\b/)
        expect(card).toContain('LaunchVotePill')
        expect(card).not.toContain('ComingSoonOverlay')
    })
})
