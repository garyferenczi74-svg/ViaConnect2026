/**
 * Shop release reads. Product queries stay select('*') with no embed.
 * Any failure of the phase lookup returns null so callers fail closed:
 * supplements become Coming soon and exempt test kits stay buyable.
 */
import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import {
    isExemptTestKit,
    isReleasedPhaseStatus,
    releaseFieldsFromRow,
    resolveRelease,
} from '@/lib/shop/release-rules'

const RELEASE_LOOKUP_TIMEOUT_MS = 1500
const RELEASE_LOOKUP_SKU_CHUNK = 100

export interface ReleaseSkuState {
    productId: string
    name: string
    exempt: boolean
    released: boolean
    pricingTier: string | null
    unitPriceCents: number
}

export type ReleaseLookupResult =
    | { status: 'ok'; bySku: Map<string, ReleaseSkuState> }
    | { status: 'error' }

interface QueryError {
    code?: string
    message?: string
}

interface QueryResult<T> {
    data: T[] | null
    error: QueryError | null
}

interface FilterQuery<T> {
    select: (columns: string) => FilterQuery<T>
    eq: (column: string, value: string | boolean) => FilterQuery<T>
    in: (column: string, values: readonly string[]) => FilterQuery<T>
    not: (column: string, operator: string, value: string) => FilterQuery<T>
    then: PromiseLike<QueryResult<T>>['then']
}

interface ReleaseReader {
    from: (table: string) => FilterQuery<Record<string, unknown>>
}

function reasonTag(error: unknown): string {
    if (isTimeoutError(error)) return 'timeout'
    if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: unknown }).code
        if (typeof code === 'string' && code.length > 0) return code
    }
    if (error instanceof Error) return 'network'
    return 'upstream'
}

function logReleaseFailure(message: string, error: unknown): void {
    safeLog.warn('shop.release', message, { reason: reasonTag(error) })
}

export async function getReleasedShopPhaseIds(): Promise<ReadonlySet<string> | null> {
    try {
        const supabase = await createClient()
        const sb = supabase as unknown as ReleaseReader
        const query = sb
            .from('launch_phases')
            .select('id, activation_status')
            .in('activation_status', ['active', 'completed'])
        const { data, error } = await withTimeout(
            Promise.resolve(query),
            RELEASE_LOOKUP_TIMEOUT_MS,
            'shop.release.phases',
        )
        if (error) {
            logReleaseFailure('getReleasedShopPhaseIds failed', error)
            return null
        }
        const ids = new Set<string>()
        for (const row of data ?? []) {
            const id = row.id
            if (typeof id === 'string' && id.length > 0 && isReleasedPhaseStatus(row.activation_status)) {
                ids.add(id)
            }
        }
        return ids
    } catch (error) {
        logReleaseFailure('getReleasedShopPhaseIds failed', error)
        return null
    }
}

function isPeptideRow(row: Record<string, unknown>): boolean {
    return row.category === 'peptide' || row.product_type === 'peptide'
}

function readDollars(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return parsed
    }
    return null
}

function unitPriceCents(row: Record<string, unknown>): number {
    const dollars = readDollars(row.price_msrp) ?? readDollars(row.price) ?? 0
    return Math.round(dollars * 100)
}

function trimSkus(skus: readonly string[]): string[] {
    const trimmed: string[] = []
    const seen = new Set<string>()
    for (const sku of skus) {
        if (typeof sku !== 'string') continue
        const value = sku.trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        trimmed.push(value)
    }
    return trimmed
}

function skuChunks(skus: readonly string[], size: number): string[][] {
    const chunks: string[][] = []
    for (let index = 0; index < skus.length; index += size) {
        chunks.push(skus.slice(index, index + size))
    }
    return chunks
}

function productsBySkuQuery(sb: ReleaseReader, chunk: readonly string[]) {
    return sb
        .from('products')
        .select('*')
        .eq('active', true)
        .in('sku', chunk)
        .not('category', 'eq', 'peptide')
        .not('product_type', 'eq', 'peptide')
}

export async function getReleaseLookupBySkus(skus: readonly string[]): Promise<ReleaseLookupResult> {
    const trimmed = trimSkus(skus)
    const phaseIds = await getReleasedShopPhaseIds()

    if (trimmed.length === 0) {
        return { status: 'ok', bySku: new Map() }
    }

    try {
        const supabase = await createClient()
        const sb = supabase as unknown as ReleaseReader
        const pages = await withTimeout(
            Promise.all(
                skuChunks(trimmed, RELEASE_LOOKUP_SKU_CHUNK).map((chunk) =>
                    Promise.resolve(productsBySkuQuery(sb, chunk)),
                ),
            ),
            RELEASE_LOOKUP_TIMEOUT_MS,
            'shop.release.productsBySku',
        )
        const rows: Record<string, unknown>[] = []
        for (const page of pages) {
            if (page.error) {
                logReleaseFailure('getReleaseLookupBySkus products read failed', page.error)
                return { status: 'error' }
            }
            if (page.data != null && !Array.isArray(page.data)) {
                logReleaseFailure('getReleaseLookupBySkus products read failed', { code: 'upstream' })
                return { status: 'error' }
            }
            for (const row of page.data ?? []) rows.push(row)
        }

        const grouped = new Map<string, Record<string, unknown>[]>()
        for (const row of rows) {
            if (row.active !== true) continue
            if (isPeptideRow(row)) continue
            if (typeof row.sku !== 'string') continue
            const list = grouped.get(row.sku) ?? []
            list.push(row)
            grouped.set(row.sku, list)
        }

        const bySku = new Map<string, ReleaseSkuState>()
        for (const sku of trimmed) {
            const matches = (grouped.get(sku) ?? []).filter((row) => row.sku === sku)
            if (matches.length !== 1) continue
            const row = matches[0]
            const productId = row.id
            const name = row.name
            if (typeof productId !== 'string' || productId.length === 0) continue
            if (typeof name !== 'string' || name.length === 0) continue
            const fields = releaseFieldsFromRow(row)
            const exempt = isExemptTestKit(fields)
            bySku.set(sku, {
                productId,
                name,
                exempt,
                released: resolveRelease(fields, phaseIds),
                pricingTier: typeof row.pricing_tier === 'string' ? row.pricing_tier : null,
                unitPriceCents: unitPriceCents(row),
            })
        }
        return { status: 'ok', bySku }
    } catch (error) {
        logReleaseFailure('getReleaseLookupBySkus products read failed', error)
        return { status: 'error' }
    }
}
