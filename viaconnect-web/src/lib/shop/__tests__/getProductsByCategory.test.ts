/**
 * getProductsByCategory must not collapse an upstream failure into [].
 * An empty array is a true empty category. Timeout and Supabase errors
 * are a discriminated error result. No server-side retry.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShopProduct } from '@/lib/shop/queries'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

import { getProductsByCategory } from '@/lib/shop/queries'
import { safeLog } from '@/lib/utils/safe-log'

type QueryPayload = {
  data: ShopProduct[] | null
  error: { code: string; message: string } | null
}

interface QueryBuilder {
  select: (columns: string) => QueryBuilder
  eq: (column: string, value: string | boolean) => QueryBuilder
  not: (column: string, operator: string, value: string) => QueryBuilder
  order: (
    column: string,
    options: { ascending: boolean },
  ) => Promise<QueryPayload>
}

function product(name: string): ShopProduct {
  return {
    id: 'prod-mthfr-plus',
    sku: 'MTHFR-PLUS',
    slug: 'mthfr-plus',
    name,
    short_name: 'MTHFR+',
    summary: 'Methylation support',
    description: 'Advanced formula fixture for the category query test.',
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
  }
}

function installClient(orderResult: () => Promise<QueryPayload>) {
  const fromCalls: string[] = []
  const builder: QueryBuilder = {
    select: () => builder,
    eq: () => builder,
    not: () => builder,
    order: () => orderResult(),
  }
  mocks.createClient.mockResolvedValue({
    from: (table: string) => {
      fromCalls.push(table)
      return builder
    },
  })
  return { fromCalls }
}

describe('getProductsByCategory', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
    vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined)
    vi.spyOn(safeLog, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns ok with the product rows when Supabase succeeds', async () => {
    const row = product('MTHFR+')
    const { fromCalls } = installClient(async () => ({ data: [row], error: null }))

    const result = await getProductsByCategory('advanced-formulas')

    expect(result).toEqual({ status: 'ok', products: [row] })
    expect(fromCalls).toEqual(['products'])
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(safeLog.warn).not.toHaveBeenCalled()
    expect(safeLog.error).not.toHaveBeenCalled()
  })

  it('returns ok with an empty list when the category has no active products', async () => {
    installClient(async () => ({ data: [], error: null }))

    const result = await getProductsByCategory('advanced-formulas')

    expect(result).toEqual({ status: 'ok', products: [] })
    expect(safeLog.warn).not.toHaveBeenCalled()
    expect(safeLog.error).not.toHaveBeenCalled()
  })

  it('returns upstream when Supabase responds with an error object', async () => {
    const error = {
      code: 'PGRST002',
      message: 'Could not query the database for the schema cache. Retrying.',
    }
    installClient(async () => ({ data: null, error }))

    const result = await getProductsByCategory('advanced-formulas')

    expect(result).toEqual({ status: 'error', reason: 'upstream' })
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(safeLog.warn).toHaveBeenCalledWith(
      'shop.queries',
      'getProductsByCategory supabase error',
      expect.objectContaining({ slug: 'advanced-formulas', error }),
    )
  })

  it('returns timeout when the product query exceeds 5 seconds and does not retry', async () => {
    vi.useFakeTimers()
    const { fromCalls } = installClient(() => new Promise<QueryPayload>(() => undefined))

    let result: Awaited<ReturnType<typeof getProductsByCategory>> | undefined
    const pending = getProductsByCategory('advanced-formulas').then((value) => {
      result = value
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(result).toBeUndefined()

    await vi.advanceTimersByTimeAsync(4999)
    expect(result).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    await pending

    expect(result).toEqual({ status: 'error', reason: 'timeout' })
    expect(fromCalls).toEqual(['products'])
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(safeLog.warn).toHaveBeenCalledWith(
      'shop.queries',
      'getProductsByCategory timed out',
      expect.objectContaining({ slug: 'advanced-formulas' }),
    )
    expect(safeLog.error).not.toHaveBeenCalled()
  })
})
