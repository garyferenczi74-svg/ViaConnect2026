/**
 * PLP grid must tell an outage apart from a true empty category.
 * Node-safe renderToStaticMarkup (no jsdom). The error is forced by the
 * result prop in this test, not by production data.
 */
import { createElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ShopProduct } from '@/lib/shop/queries'

const nav = vi.hoisted(() => ({
  refresh: vi.fn(),
  search: '',
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ refresh: nav.refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/shop/advanced-formulas',
}))

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
  default: ({ alt }: { alt?: string }) => createElement('img', { alt: alt ?? '' }),
}))

import { PlpProductGrid } from '@/components/shop/PlpProductGrid'
import { PlpProductsRetryControl } from '@/components/shop/PlpProductsRetryButton'
import {
  PLP_PRODUCTS_COMING_ONLINE_COPY,
  PLP_PRODUCTS_LOAD_ERROR_MESSAGE,
  PLP_PRODUCTS_TRY_AGAIN_LABEL,
} from '@/lib/shop/plp-copy'

const COMING_ONLINE = 'Products in this category are coming online. Check back soon.'
const LOAD_ERROR = "We couldn't load these products right now."
const TRY_AGAIN = 'Try again'

function product(name: string, extras: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id: `id-${name}`,
    sku: 'MTHFR-PLUS',
    slug: 'mthfr-plus',
    name,
    short_name: name,
    summary: 'Methylation support',
    description: 'Grid fixture. Not catalog data.',
    format: 'capsule',
    category: 'supplement',
    category_slug: 'advanced-formulas',
    price: 48,
    price_msrp: 48,
    pricing_tier: 'standard',
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
    ...extras,
  }
}

function renderGrid(
  result:
    | { status: 'ok'; products: ShopProduct[] }
    | { status: 'error'; reason: 'timeout' | 'upstream' },
) {
  return renderToStaticMarkup(
    <PlpProductGrid
      result={result}
      variant="supplement"
      categorySlug="advanced-formulas"
      signedIn
      joinedProductIds={[]}
    />,
  )
}

describe('PlpProductGrid honest states', () => {
  it('keeps the pending-review strings in one named-constant module', () => {
    expect(PLP_PRODUCTS_LOAD_ERROR_MESSAGE).toBe(LOAD_ERROR)
    expect(PLP_PRODUCTS_TRY_AGAIN_LABEL).toBe(TRY_AGAIN)
    expect(PLP_PRODUCTS_COMING_ONLINE_COPY).toBe(COMING_ONLINE)
    const copySource = readFileSync(join(process.cwd(), 'src/lib/shop/plp-copy.ts'), 'utf8')
    expect(copySource).toContain(LOAD_ERROR)
    expect(copySource).toContain(TRY_AGAIN)
  })

  it('shows the load-error message and Try again when the query failed', () => {
    const html = renderGrid({ status: 'error', reason: 'upstream' })
    expect(html).toContain(LOAD_ERROR.replaceAll("'", '&#x27;'))
    expect(html).toContain(TRY_AGAIN)
    expect(html).toContain('data-testid="plp-products-error"')
    expect(html).toContain('data-testid="plp-products-retry"')
    expect(html).not.toContain(COMING_ONLINE)
    expect(html).not.toContain('MTHFR+')
  })

  it('shows the coming-online copy when the category is truly empty', () => {
    const html = renderGrid({ status: 'ok', products: [] })
    expect(html).toContain(COMING_ONLINE)
    expect(html).not.toContain(LOAD_ERROR)
    expect(html).not.toContain(TRY_AGAIN)
  })

  it('shows products when the query succeeds with rows', () => {
    const html = renderGrid({ status: 'ok', products: [product('MTHFR+')] })
    expect(html).toContain('MTHFR+')
    expect(html).not.toContain(LOAD_ERROR)
    expect(html).not.toContain(COMING_ONLINE)
  })

  it('disables Try again while a refresh is pending and still labels the button Try again', () => {
    const html = renderToStaticMarkup(
      <PlpProductsRetryControl isPending onRetry={() => undefined} />,
    )
    expect(html).toContain(TRY_AGAIN)
    expect(html).toContain('disabled=""')
    expect(html).toContain('data-pending="true"')
    expect(html).toContain('aria-busy="true"')
  })

  it('renders two overlays and two buy buttons for one released, two unreleased, and one kit', () => {
    const html = renderGrid({
      status: 'ok',
      products: [
        product('Released Supplement', { id: 'rel', sku: 'FC-NAD-001', is_released: true }),
        product('Unreleased One', { id: 'u1', sku: 'FC-CREATINE-001', is_released: false }),
        product('Unreleased Two', { id: 'u2', sku: 'FC-CATALYST-001', is_released: false }),
        product('GeneX Kit', {
          id: 'kit',
          sku: 'GX-KIT',
          category: 'test_kit',
          product_type: 'test_kit',
          is_released: true,
        }),
      ],
    })
    expect(html.match(/data-testid="coming-soon-overlay"/g)?.length ?? 0).toBe(2)
    expect(html.match(/>Add to Cart</g)?.length ?? 0).toBe(2)
    expect(html).not.toContain('Join the Revolution waiting list for Released Supplement')
    expect(html).toContain('Join the Revolution waiting list for Unreleased One')
    expect(html).toContain('Join the Revolution waiting list for Unreleased Two')
  })

  it('staggers coming soon delays across three unreleased cards', () => {
    const html = renderGrid({
      status: 'ok',
      products: [
        product('Unreleased One', { id: 'u1', sku: 'FC-ONE', is_released: false }),
        product('Unreleased Two', { id: 'u2', sku: 'FC-TWO', is_released: false }),
        product('Unreleased Three', { id: 'u3', sku: 'FC-THREE', is_released: false }),
      ],
    })
    expect(html).toContain('--cs-delay:0.000s')
    expect(html).toContain('--cs-delay:0.247s')
    expect(html).toContain('--cs-delay:0.094s')
    expect(html).not.toContain('--cs-intro-delay')
  })

  it('wires Try again to router.refresh inside a transition', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/shop/PlpProductsRetryButton.tsx'),
      'utf8',
    )
    expect(source).toContain('router.refresh()')
    expect(source).toContain('startTransition')
    expect(source).toContain('strokeWidth={1.5}')
  })
})
