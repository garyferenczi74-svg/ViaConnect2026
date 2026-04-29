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

const QUERY_TIMEOUT_MS = 5000

export interface ShopCategoryRow {
    slug: string
    name: string
    tagline: string
    hero_image_url: string | null
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
        | { name: string; dose: number | null; unit: string | null; role?: string | null }[]
        | null
    gene_match_score: number | null
    requires_practitioner_order: boolean | null
    active: boolean
}

export async function getShopCategories(): Promise<ShopCategoryRow[]> {
    // Casting because categories table is added by migration 20260429000000;
    // generated Database types are stale until `supabase gen types` is rerun.
    const sb = createClient() as unknown as {
        from: (table: string) => any
    }
    try {
        const { data, error } = await withTimeout(
            sb
                .from('categories')
                .select('slug, name, tagline, hero_image_url, display_order, card_variant')
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

export async function getProductsByCategory(slug: string): Promise<ShopProduct[]> {
    const sb = createClient() as unknown as {
        from: (table: string) => any
    }
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
            query as Promise<{ data: ShopProduct[] | null; error: unknown }>,
            QUERY_TIMEOUT_MS,
            `shop.getProductsByCategory:${slug}`,
        )
        if (error) {
            safeLog.warn('shop.queries', 'getProductsByCategory supabase error', { slug, error })
            return []
        }
        return data ?? []
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.queries', 'getProductsByCategory timed out', { slug, error })
        } else {
            safeLog.error('shop.queries', 'getProductsByCategory failed', { slug, error })
        }
        return []
    }
}

export async function getProductBySlug(productSlug: string): Promise<ShopProduct | null> {
    const sb = createClient() as unknown as {
        from: (table: string) => any
    }
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
            query as Promise<{ data: ShopProduct | null; error: unknown }>,
            QUERY_TIMEOUT_MS,
            `shop.getProductBySlug:${productSlug}`,
        )
        if (error) {
            safeLog.warn('shop.queries', 'getProductBySlug supabase error', { productSlug, error })
            return null
        }
        return data
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
    const sb = createClient() as unknown as {
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
        return data ?? []
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.queries', 'searchProducts timed out', { searchQuery: trimmed, error })
        } else {
            safeLog.error('shop.queries', 'searchProducts failed', { searchQuery: trimmed, error })
        }
        return []
    }
}
