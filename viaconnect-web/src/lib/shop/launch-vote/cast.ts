/**
 * Cast one vote. Refuses released and exempt kits before the RPC.
 * The RPC keeps the first voted_at. A second call returns that same time.
 * Logs never pair a user id with a product name.
 */
import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { getReleasedShopPhaseIds } from '@/lib/shop/release'
import { isExemptTestKit, releaseFieldsFromRow, resolveRelease } from '@/lib/shop/release-rules'
import type { WaitlistSource } from '@/lib/shop/waitlist'

const TIMEOUT_MS = 1500

export type CastFailureReason = 'timeout' | 'upstream' | 'schema_missing'

export type CastLaunchVoteResult =
    | { status: 'voted'; votedAt: string }
    | { status: 'already_voted'; votedAt: string }
    | { status: 'released' }
    | { status: 'not_found' }
    | { status: 'error'; reason: CastFailureReason }

interface QueryError {
    code?: string
    message?: string
}

interface CastQuery {
    select: (columns: string) => CastQuery
    eq: (column: string, value: string | boolean) => CastQuery
    not: (column: string, operator: string, value: string) => CastQuery
    maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: QueryError | null }>
}

interface CastReader {
    from: (table: string) => CastQuery
    rpc: (
        fn: string,
        args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: QueryError | null }>
}

function errorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object' || !('code' in error)) return null
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : null
}

function failureReason(error: unknown): CastFailureReason {
    if (isTimeoutError(error)) return 'timeout'
    const code = errorCode(error)
    if (code === '42P01' || code === '42883') return 'schema_missing'
    return 'upstream'
}

function isPeptideRow(row: Record<string, unknown>): boolean {
    return row.category === 'peptide' || row.product_type === 'peptide'
}

export async function castLaunchVote(
    userId: string,
    productId: string,
    source: WaitlistSource,
): Promise<CastLaunchVoteResult> {
    try {
        const supabase = await createClient()
        const sb = supabase as unknown as CastReader
        const productQuery = sb
            .from('products')
            .select('*')
            .eq('id', productId)
            .eq('active', true)
            .not('category', 'eq', 'peptide')
            .not('product_type', 'eq', 'peptide')
            .maybeSingle()
        const { data, error } = await withTimeout(productQuery, TIMEOUT_MS, 'shop.launchVote.product')
        if (error) {
            const reason = failureReason(error)
            safeLog.warn('shop.launchVote', 'cast product read failed', { reason, productId })
            return { status: 'error', reason }
        }
        if (!data || data.active !== true || isPeptideRow(data)) return { status: 'not_found' }
        if (typeof data.id !== 'string') return { status: 'not_found' }

        const phaseIds = await getReleasedShopPhaseIds()
        const fields = releaseFieldsFromRow(data)
        if (isExemptTestKit(fields) || resolveRelease(fields, phaseIds)) {
            return { status: 'released' }
        }

        const existing = await withTimeout(
            sb.from('shop_product_waitlist').select('voted_at').eq('product_id', productId).eq('user_id', userId).maybeSingle(),
            TIMEOUT_MS,
            'shop.launchVote.existing',
        )
        if (existing.error && errorCode(existing.error) !== 'PGRST116') {
            const reason = failureReason(existing.error)
            if (reason === 'schema_missing') {
                safeLog.warn('shop.launchVote', 'cast existing read failed', { reason, productId })
                return { status: 'error', reason }
            }
        }
        const prior = typeof existing.data?.voted_at === 'string' ? existing.data.voted_at : null

        const rpc = await withTimeout(
            sb.rpc('shop_cast_launch_vote', { p_product_id: productId, p_source: source }),
            TIMEOUT_MS,
            'shop.launchVote.cast',
        )
        if (rpc.error) {
            const reason = failureReason(rpc.error)
            safeLog.warn('shop.launchVote', 'cast rpc failed', { reason, productId })
            return { status: 'error', reason }
        }
        const votedAt = prior ?? (typeof rpc.data === 'string' ? rpc.data : null)
        if (!votedAt) {
            safeLog.warn('shop.launchVote', 'cast rpc returned no time', { productId })
            return { status: 'error', reason: 'upstream' }
        }
        if (prior) return { status: 'already_voted', votedAt: prior }
        return { status: 'voted', votedAt }
    } catch (error) {
        const reason = failureReason(error)
        safeLog.warn('shop.launchVote', 'cast failed', { reason, productId })
        return { status: 'error', reason }
    }
}
