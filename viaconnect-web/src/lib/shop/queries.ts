/**
 * Supabase queries for the consumer shop surfaces. Every query that returns
 * product rows applies the peptide exclusion filter per Prompt #141 v3 §1B
 * and §7.1. Peptides have their own untouched destination page; they MUST
 * NOT appear in any of the seven shop PLPs, the bento landing, or any
 * search surfaced by these queries.
 *
 * All queries are wrapped with withTimeout from lib/utils/with-timeout.ts to
 * fail open under upstream slowness per Prompt #140 resilience hardening
 * (§8 of Prompt #141 v3 carries this forward as a baseline).
 *
 * Field shape on returned rows reflects post-migration columns added by
 * 20260429000000_prompt_141v3_shop_schema_extensions.sql. Existing legacy
 * columns (price, image_url, category) are preserved alongside the new
 * shop-display columns (price_msrp, image_urls, category_slug) so the
 * legacy app surfaces continue to function during the gradual backfill.
 */
import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { annotateShopIngredientJson } from '@/lib/supplements/confirmedBioavailability'
import { applyLockedIngredientShopFields } from '@/lib/shop/lockedIngredientDisplay'
import { resolveRelease } from '@/lib/shop/release-rules'

const QUERY_TIMEOUT_MS = 5000

function hydrateShopProduct(product: ShopProduct): ShopProduct {
    const annotated = product.ingredients?.length
        ? {
              ...product,
              ingredients: annotateShopIngredientJson(
                  product.slug ?? product.sku,
                  product.name,
                  product.ingredients,
              ),
          }
        : product
    return applyLockedIngredientShopFields(annotated)
}

export interface ShopCategoryRow {
    slug: string
    name: string
    tagline: string
    hero_image_url: string | null
    video_url: string | null
    video_poster_url: string | null
    display_order: number
    card_variant: 'supplement' | 'testing'
}

export interface ShopProduct {
    id: string
    sku: string
    slug: string | null
    name: string
    short_name: string
    summary: string | null
    description: string
    format: string | null
    category: string
    category_slug: string | null
    price: number
    price_msrp: number | null
    pricing_tier: string
    image_url: string | null
    image_urls: string[] | null
    status_tags: string[] | null
    testing_meta: {
        what_is_tested?: string
        who_its_for?: string
        what_you_get?: string
    } | null
    snp_targets: string[] | null
    bioavailability_pct: number | null
    product_type: string | null
    ingredients:
        | {
              name: string
              dose: number | null
              unit: string | null
              role?: string | null
              bioavailability_note?: string | null
              evidence_type?: 'this_sku' | 'class_not_this_sku' | 'not_stated' | null
              pmid?: string | null
          }[]
        | null
    gene_match_score: number | null
    requires_practitioner_order: boolean | null
    active: boolean
    display_config: import('./resolve-display-config').ProductDisplayConfig | null
    /**
     * Purchasable right now. Pages set this via withReleaseState.
     * Test kits (category and product_type exactly test_kit) are true.
     */
    is_released: boolean
    /**
     * Hand-typed for products.launch_phase_id (migration 20260926200000).
     * The key is absent on rows read before that column exists.
     */
    launch_phase_id?: string | null
}

export async function getShopCategories(): Promise<ShopCategoryRow[]> {
    // Casting because categories table is added by migration 20260429000000;
    // generated Database types are stale until `supabase gen types` is rerun.
    const sb = await createClient() as unknown as {
        from: (table: string) => any
    }
    try {
        const { data, error } = await withTimeout(
            sb
                .from('categories')
                .select(
                    'slug, name, tagline, hero_image_url, video_url, video_poster_url, display_order, card_variant',
                )
                .order('display_order', { ascending: true }) as Promise<{
                data: ShopCategoryRow[] | null
                error: unknown
            }>,
            QUERY_TIMEOUT_MS,
            'shop.getShopCategories',
        )
        if (error) {
            safeLog.warn('shop.queries', 'getShopCategories supabase error', { error })
            return []
        }
        return data ?? []
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.queries', 'getShopCategories timed out', { error })
        } else {
            safeLog.error('shop.queries', 'getShopCategories failed', { error })
        }
        return []
    }
}

export type ProductsByCategoryFailureReason = 'timeout' | 'upstream'

/** Ok is a real category read, including a true empty list. Error is an outage. */
export type ProductsByCategoryResult =
    | { status: 'ok'; products: ShopProduct[] }
    | { status: 'error'; reason: ProductsByCategoryFailureReason }

interface CategoryProductQuery {
    select: (columns: string) => CategoryProductQuery
    eq: (column: string, value: string | boolean) => CategoryProductQuery
    not: (column: string, operator: string, value: string) => CategoryProductQuery
    order: (
        column: string,
        options: { ascending: boolean },
    ) => Promise<{ data: ShopProduct[] | null; error: unknown }>
}

interface ShopProductsReader {
    from: (table: string) => CategoryProductQuery
}

/**
 * Active products for one shop PLP. The 5s timeout is unchanged and there
 * is no server-side retry. A Supabase error or timeout is returned as
 * status 'error' so the PLP can show a load failure instead of the
 * empty-category copy.
 */
export async function getProductsByCategory(slug: string): Promise<ProductsByCategoryResult> {
    const sb = (await createClient()) as unknown as ShopProductsReader
    try {
        const query = sb
            .from('products')
            .select('*')
            .eq('active', true)
            .eq('category_slug', slug)
            .not('category', 'eq', 'peptide')
            .not('product_type', 'eq', 'peptide')
            .order('name', { ascending: true })

        const { data, error } = await withTimeout(
            query,
            QUERY_TIMEOUT_MS,
            `shop.getProductsByCategory:${slug}`,
        )
        if (error) {
            safeLog.warn('shop.queries', 'getProductsByCategory supabase error', { slug, error })
            return { status: 'error', reason: 'upstream' }
        }
        return { status: 'ok', products: (data ?? []).map(hydrateShopProduct) }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.queries', 'getProductsByCategory timed out', { slug, error })
            return { status: 'error', reason: 'timeout' }
        }
        safeLog.error('shop.queries', 'getProductsByCategory failed', { slug, error })
        return { status: 'error', reason: 'upstream' }
    }
}

interface ProductBySlugQuery {
    select: (columns: string) => ProductBySlugQuery
    eq: (column: string, value: string | boolean) => ProductBySlugQuery
    not: (column: string, operator: string, value: string) => ProductBySlugQuery
    maybeSingle: () => Promise<{ data: ShopProduct | null; error: unknown }>
}

interface ProductBySlugReader {
    from: (table: string) => ProductBySlugQuery
}

export async function getProductBySlug(productSlug: string): Promise<ShopProduct | null> {
    const sb = (await createClient()) as unknown as ProductBySlugReader
    try {
        const query = sb
            .from('products')
            .select('*')
            .eq('active', true)
            .eq('slug', productSlug)
            .not('category', 'eq', 'peptide')
            .not('product_type', 'eq', 'peptide')
            .maybeSingle()

        const { data, error } = await withTimeout(
            query,
            QUERY_TIMEOUT_MS,
            `shop.getProductBySlug:${productSlug}`,
        )
        if (error) {
            safeLog.warn('shop.queries', 'getProductBySlug supabase error', { productSlug, error })
            return null
        }
        return data ? hydrateShopProduct(data) : null
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.queries', 'getProductBySlug timed out', { productSlug, error })
        } else {
            safeLog.error('shop.queries', 'getProductBySlug failed', { productSlug, error })
        }
        return null
    }
}

export async function searchProducts(searchQuery: string): Promise<ShopProduct[]> {
    const trimmed = searchQuery.trim()
    if (!trimmed) return []
    const sb = await createClient() as unknown as {
        from: (table: string) => any
    }
    try {
        const escaped = trimmed.replace(/[%_]/g, '\\$&')
        const orFilter = `name.ilike.%${escaped}%,short_name.ilike.%${escaped}%,summary.ilike.%${escaped}%`
        const query = sb
            .from('products')
            .select('*')
            .eq('active', true)
            .not('category', 'eq', 'peptide')
            .not('product_type', 'eq', 'peptide')
            .or(orFilter)
            .limit(40)

        const { data, error } = await withTimeout(
            query as Promise<{ data: ShopProduct[] | null; error: unknown }>,
            QUERY_TIMEOUT_MS,
            'shop.searchProducts',
        )
        if (error) {
            safeLog.warn('shop.queries', 'searchProducts supabase error', { searchQuery: trimmed, error })
            return []
        }
        return (data ?? []).map(hydrateShopProduct)
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.queries', 'searchProducts timed out', { searchQuery: trimmed, error })
        } else {
            safeLog.error('shop.queries', 'searchProducts failed', { searchQuery: trimmed, error })
        }
        return []
    }
}

/**
 * Apply the separate release lookup onto catalog rows.
 * releasedPhaseIds null means the lookup failed: exempt kits stay released,
 * every other row is unreleased. Does not query Supabase.
 */
export function withReleaseState(
    products: ShopProduct[],
    releasedPhaseIds: ReadonlySet<string> | null,
): ShopProduct[] {
    return products.map((product) => ({
        ...product,
        is_released: resolveRelease(product, releasedPhaseIds),
    }))
}
