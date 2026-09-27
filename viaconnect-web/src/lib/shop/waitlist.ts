/**
 * Per-product waiting list. Signed-in users only.
 * Internal launch planning. No emails. Rows are the caller's own under RLS.
 * A missing shop_product_waitlist table (42P01) is schema_missing, which the
 * route surfaces as the existing 500 SERVER_ERROR.
 */
import { createClient } from '@/lib/supabase/server'
// Server-only: imports @/lib/supabase/server (next/headers), which fails in a client bundle.
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { getReleasedShopPhaseIds } from '@/lib/shop/release'
import { isExemptTestKit, releaseFieldsFromRow, resolveRelease } from '@/lib/shop/release-rules'

const WAITLIST_TIMEOUT_MS = 1500

export type WaitlistSource = 'plp' | 'pdp'

export type WaitlistFailureReason = 'timeout' | 'upstream' | 'schema_missing'

export type WaitlistJoinResult =
    | { status: 'joined' }
    | { status: 'released' }
    | { status: 'not_found' }
    | { status: 'error'; reason: WaitlistFailureReason }

export type WaitlistLeaveResult =
    | { status: 'left' }
    | { status: 'error'; reason: WaitlistFailureReason }

interface QueryError {
    code?: string
    message?: string
}

interface TableQuery {
    select: (columns: string) => TableQuery
    eq: (column: string, value: string | boolean) => TableQuery
    not: (column: string, operator: string, value: string) => TableQuery
    maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: QueryError | null }>
    upsert: (
        values: { user_id: string; product_id: string; source: WaitlistSource },
        options: { onConflict: string; ignoreDuplicates: boolean },
    ) => Promise<{ error: QueryError | null }>
    delete: () => TableQuery
    then: PromiseLike<{ data: { product_id?: string }[] | null; error: QueryError | null }>['then']
}

interface WaitlistReader {
    from: (table: string) => TableQuery
}

function errorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object' || !('code' in error)) return null
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : null
}

function failureReason(error: unknown): WaitlistFailureReason {
    if (isTimeoutError(error)) return 'timeout'
    if (errorCode(error) === '42P01') return 'schema_missing'
    return 'upstream'
}

function logWaitlist(message: string, reason: string, productId: string): void {
    safeLog.warn('shop.waitlist', message, { reason, productId })
}

function isPeptideRow(row: Record<string, unknown>): boolean {
    return row.category === 'peptide' || row.product_type === 'peptide'
}

export async function joinProductWaitlist(
    userId: string,
    productId: string,
    source: WaitlistSource,
): Promise<WaitlistJoinResult> {
    try {
        const supabase = await createClient()
        const sb = supabase as unknown as WaitlistReader
        const productQuery = sb
            .from('products')
            .select('*')
            .eq('id', productId)
            .eq('active', true)
            .not('category', 'eq', 'peptide')
            .not('product_type', 'eq', 'peptide')
            .maybeSingle()
        const { data, error } = await withTimeout(
            productQuery,
            WAITLIST_TIMEOUT_MS,
            'shop.waitlist.product',
        )
        if (error) {
            const reason = failureReason(error)
            logWaitlist('join product read failed', reason, productId)
            return { status: 'error', reason }
        }
        if (!data || data.active !== true || isPeptideRow(data)) {
            return { status: 'not_found' }
        }
        if (typeof data.id !== 'string' || typeof data.name !== 'string') {
            return { status: 'not_found' }
        }

        const phaseIds = await getReleasedShopPhaseIds()
        const fields = releaseFieldsFromRow(data)
        if (isExemptTestKit(fields) || resolveRelease(fields, phaseIds)) {
            return { status: 'released' }
        }

        const upserted = await withTimeout(
            sb.from('shop_product_waitlist').upsert(
                { user_id: userId, product_id: productId, source },
                { onConflict: 'user_id,product_id', ignoreDuplicates: true },
            ),
            WAITLIST_TIMEOUT_MS,
            'shop.waitlist.join',
        )
        if (upserted.error) {
            const reason = failureReason(upserted.error)
            logWaitlist('join upsert failed', reason, productId)
            return { status: 'error', reason }
        }
        return { status: 'joined' }
    } catch (error) {
        const reason = failureReason(error)
        logWaitlist('join failed', reason, productId)
        return { status: 'error', reason }
    }
}

export async function leaveProductWaitlist(
    userId: string,
    productId: string,
): Promise<WaitlistLeaveResult> {
    try {
        const supabase = await createClient()
        const sb = supabase as unknown as WaitlistReader
        const deleted = await withTimeout(
            Promise.resolve(
                sb.from('shop_product_waitlist').delete().eq('product_id', productId).eq('user_id', userId),
            ),
            WAITLIST_TIMEOUT_MS,
            'shop.waitlist.leave',
        )
        if (deleted.error) {
            const reason = failureReason(deleted.error)
            logWaitlist('leave failed', reason, productId)
            return { status: 'error', reason }
        }
        return { status: 'left' }
    } catch (error) {
        const reason = failureReason(error)
        logWaitlist('leave failed', reason, productId)
        return { status: 'error', reason }
    }
}

export async function getJoinedWaitlistProductIds(): Promise<string[]> {
    try {
        const supabase = await createClient()
        const sb = supabase as unknown as WaitlistReader
        const { data, error } = await withTimeout(
            Promise.resolve(sb.from('shop_product_waitlist').select('product_id')),
            WAITLIST_TIMEOUT_MS,
            'shop.waitlist.joined',
        )
        if (error) {
            safeLog.warn('shop.waitlist', 'joined ids read failed', { reason: failureReason(error) })
            return []
        }
        const ids: string[] = []
        for (const row of data ?? []) {
            if (typeof row.product_id === 'string' && row.product_id.length > 0) {
                ids.push(row.product_id)
            }
        }
        return ids
    } catch (error) {
        safeLog.warn('shop.waitlist', 'joined ids read failed', { reason: failureReason(error) })
        return []
    }
}
