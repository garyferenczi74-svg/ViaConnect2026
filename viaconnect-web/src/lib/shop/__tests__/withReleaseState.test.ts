/**
 * withReleaseState maps the separate phase lookup onto catalog rows.
 * Fixtures are not catalog data. Product queries keep select('*').
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { withReleaseState, type ShopProduct } from '@/lib/shop/queries'

function product(partial: Partial<ShopProduct> = {}): ShopProduct {
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

describe('withReleaseState', () => {
    it('marks every supplement unreleased and every exempt kit released when phase ids are null', () => {
        const kit = product({
            id: 'kit',
            sku: 'GX-KIT',
            name: 'Panel Kit',
            category: 'test_kit',
            product_type: 'test_kit',
        })
        const supplement = product()
        const [nextKit, nextSupplement] = withReleaseState([kit, supplement], null)
        expect(nextKit.is_released).toBe(true)
        expect(nextSupplement.is_released).toBe(false)
    })

    it('treats a row with no launch_phase_id key as an unreleased supplement', () => {
        const row = product()
        delete row.launch_phase_id
        const [next] = withReleaseState([row], new Set(['shop_release_phase_1']))
        expect(next.is_released).toBe(false)
        expect(Object.prototype.hasOwnProperty.call(row, 'launch_phase_id')).toBe(false)
    })

    it('keeps product query select strings at star with no launch_phases embed', () => {
        const source = readFileSync(join(process.cwd(), 'src/lib/shop/queries.ts'), 'utf8')
        const selects = source.match(/\.select\(\s*'([^']*)'\s*\)/g) ?? []
        const productFns = ['getProductsByCategory', 'getProductBySlug', 'searchProducts']
        for (const name of productFns) {
            const start = source.indexOf(`function ${name}`)
            const end = source.indexOf('\nexport ', start + 1)
            const body = source.slice(start, end === -1 ? undefined : end)
            expect(body).toContain(".select('*')")
            expect(body).not.toContain('launch_phases')
        }
        expect(selects.filter((item) => item.includes("'*'")).length).toBeGreaterThanOrEqual(3)
        expect(source).not.toContain('launch_phases(')

        const slugStart = source.indexOf('export async function getProductBySlug')
        const slugEnd = source.indexOf('export async function searchProducts')
        expect(source.slice(slugStart, slugEnd)).not.toMatch(/\bany\b/)
    })
})
