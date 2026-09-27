/**
 * A failed release lookup must not 404 a product that exists.
 * Fixtures are not catalog data.
 */
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ShopProduct } from '@/lib/shop/queries'
import type { CompatibilityResult } from '@/lib/shop/productTabs/types'

const notFound = vi.hoisted(() => vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
}))

const mocks = vi.hoisted(() => ({
    getProductBySlug: vi.fn(),
    getCurrentShopSession: vi.fn(),
    getReleasedShopPhaseIds: vi.fn(),
    getJoinedWaitlistProductIds: vi.fn(),
}))

vi.mock('next/link', () => ({
    default: ({ href, children, className }: { href: string; children?: ReactNode; className?: string }) =>
        createElement('a', { href, className }, children),
}))

vi.mock('next/image', () => ({
    default: ({ alt }: { alt?: string }) => createElement('img', { alt: alt ?? '' }),
}))

vi.mock('next/navigation', () => ({
    notFound: () => notFound(),
    usePathname: () => '/shop/product/creatine-fixture',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/shop/queries', async () => {
    const actual = await vi.importActual<typeof import('@/lib/shop/queries')>('@/lib/shop/queries')
    return {
        ...actual,
        getProductBySlug: mocks.getProductBySlug,
    }
})

vi.mock('@/lib/shop/release', () => ({
    getReleasedShopPhaseIds: mocks.getReleasedShopPhaseIds,
}))

vi.mock('@/lib/shop/waitlist', () => ({
    getJoinedWaitlistProductIds: mocks.getJoinedWaitlistProductIds,
}))

vi.mock('@/lib/shop/role', () => ({
    getCurrentShopSession: mocks.getCurrentShopSession,
    isConsumerSession: () => true,
}))

const compatibility: CompatibilityResult = {
    band: 'signed_out',
    state: 'signed_out',
    framingLine: 'Not catalog data',
    disclaimer: 'Not catalog data',
    lastUpdated: null,
    reasons: [],
    coverageCaveats: [],
    scoreInputs: { greenWeight: 0, yellowWeight: 0, redWeight: 0, matchedVariants: 0 },
}

vi.mock('@/lib/shop/productTabs/loadCompatibility', () => ({
    loadProductCompatibility: vi.fn(async () => compatibility),
}))

import ProductDetailPage from '@/app/(app)/(consumer)/shop/product/[slug]/page'

function classTokens(className: string): string[] {
    return className.trim().split(/\s+/)
}

function supplement(partial: Partial<ShopProduct> = {}): ShopProduct {
    const row: ShopProduct = {
        id: 'sup-1',
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
        is_released: true,
        ...partial,
    }
    delete row.launch_phase_id
    return row
}

describe('PDP release fallback', () => {
    beforeEach(() => {
        notFound.mockClear()
        mocks.getProductBySlug.mockReset()
        mocks.getCurrentShopSession.mockResolvedValue({ role: 'consumer', userId: 'user-1' })
        mocks.getReleasedShopPhaseIds.mockResolvedValue(null)
        mocks.getJoinedWaitlistProductIds.mockResolvedValue([])
        mocks.getProductBySlug.mockResolvedValue(supplement())
    })

    it('renders Join the Revolution for a supplement and does not call notFound when the phase lookup fails', async () => {
        const element = await ProductDetailPage({
            params: Promise.resolve({ slug: 'creatine-fixture' }),
        })
        const html = renderToStaticMarkup(element)
        expect(notFound).not.toHaveBeenCalled()
        expect(html).toContain('Join the Revolution')
        expect(html).toContain('data-testid="coming-soon-overlay"')
        expect(html).not.toContain('Add to Cart')
    })

    it('uses bg-white on the main image and thumbs when a photo exists', async () => {
        mocks.getProductBySlug.mockResolvedValue(
            supplement({
                image_urls: ['https://example.test/a.png', 'https://example.test/b.png'],
                image_url: 'https://example.test/a.png',
            }),
        )
        const element = await ProductDetailPage({
            params: Promise.resolve({ slug: 'creatine-fixture' }),
        })
        const html = renderToStaticMarkup(element)
        const main = html.match(/class="(relative aspect-\[4\/5\][^"]*)"/)?.[1] ?? ''
        expect(classTokens(main)).toContain('bg-white')
        expect(classTokens(main)).not.toContain('bg-white/[0.04]')
        const thumbs = html.match(/class="(relative aspect-square[^"]*)"/g) ?? []
        expect(thumbs.length).toBeGreaterThan(1)
        for (const thumb of thumbs) {
            const tokens = classTokens(thumb.replace(/^class="/, '').replace(/"$/, ''))
            expect(tokens).toContain('bg-white')
            expect(tokens).not.toContain('bg-white/[0.04]')
        }
    })

    it('keeps the navy fallback on the main image when there is no photo', async () => {
        const element = await ProductDetailPage({
            params: Promise.resolve({ slug: 'creatine-fixture' }),
        })
        const html = renderToStaticMarkup(element)
        const main = html.match(/class="(relative aspect-\[4\/5\][^"]*)"/)?.[1] ?? ''
        expect(classTokens(main)).toContain('bg-white/[0.04]')
        expect(classTokens(main)).not.toContain('bg-white')
    })
})
