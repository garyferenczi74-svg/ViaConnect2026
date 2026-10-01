/**
 * A failed release lookup must not take the PLP load-error branch.
 * Fixtures are not catalog data.
 */
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ShopProduct } from '@/lib/shop/queries'

const mocks = vi.hoisted(() => ({
    getProductsByCategory: vi.fn(),
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
    usePathname: () => '/shop/advanced-formulas',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    notFound: () => {
        throw new Error('NEXT_NOT_FOUND')
    },
}))

vi.mock('@/lib/shop/queries', async () => {
    const actual = await vi.importActual<typeof import('@/lib/shop/queries')>('@/lib/shop/queries')
    return {
        ...actual,
        getProductsByCategory: mocks.getProductsByCategory,
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

import { ShopCategoryPage } from '@/components/shop/ShopCategoryPage'
import { PLP_PRODUCTS_LOAD_ERROR_MESSAGE } from '@/lib/shop/plp-copy'

function row(partial: Partial<ShopProduct>): ShopProduct {
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

describe('ShopCategoryPage release fallback', () => {
    beforeEach(() => {
        mocks.getProductsByCategory.mockReset()
        mocks.getCurrentShopSession.mockReset()
        mocks.getReleasedShopPhaseIds.mockReset()
        mocks.getJoinedWaitlistProductIds.mockReset()
        mocks.getCurrentShopSession.mockResolvedValue({ role: 'consumer', userId: 'user-1' })
        mocks.getReleasedShopPhaseIds.mockResolvedValue(null)
        mocks.getJoinedWaitlistProductIds.mockResolvedValue([])
    })

    it('renders the grid with overlays on supplements and Add to Cart on kits when the phase lookup fails', async () => {
        const supplement = row({ id: 'sup', name: 'Creatine Fixture' })
        delete supplement.launch_phase_id
        const kit = row({
            id: 'kit',
            sku: 'GX-KIT',
            name: 'Panel Kit',
            category: 'test_kit',
            product_type: 'test_kit',
            category_slug: 'advanced-formulas',
        })
        mocks.getProductsByCategory.mockResolvedValue({
            status: 'ok',
            products: [supplement, kit],
        })

        const element = await ShopCategoryPage({ slug: 'advanced-formulas' })
        const html = renderToStaticMarkup(element)
        expect(html).not.toContain(PLP_PRODUCTS_LOAD_ERROR_MESSAGE.replaceAll("'", '&#x27;'))
        expect(html).toContain('data-testid="launch-vote-pill"')
        expect(html).toContain('Creatine Fixture')
        expect(html).toContain('Join the Revolution')
        expect(html).toContain('Panel Kit')
        expect(html).toContain('Add to Cart')
        expect(html.match(/data-testid="launch-vote-pill"/g)?.length ?? 0).toBe(1)
    })
})
