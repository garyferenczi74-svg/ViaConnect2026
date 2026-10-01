/**
 * Shopper launch-vote read. Missing tables degrade to a static pill.
 * Flag off skips every vote and plan query.
 */
import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { launchVoteEnabled } from '@/lib/shop/launch-vote/flags'
import { MIN_VOTES_FOR_TOP3 } from '@/lib/shop/launch-vote/rank'
import { EMPTY_LAUNCH_VOTE_VIEW, type LaunchVoteTopEntry, type LaunchVoteView } from '@/lib/shop/launch-vote/types'

const TIMEOUT_MS = 1500

interface QueryError {
    code?: string
    message?: string
}

interface VoteReader {
    rpc: (
        fn: string,
        args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: QueryError | null }>
    from: (table: string) => VoteQuery
}

interface VoteQuery {
    select: (columns: string) => VoteQuery
    eq: (column: string, value: string) => VoteQuery
    not: (column: string, operator: string, value: null) => VoteQuery
    limit: (count: number) => VoteQuery
    maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: QueryError | null }>
    then: PromiseLike<{ data: Record<string, unknown>[] | null; error: QueryError | null }>['then']
}

function reasonOf(error: unknown): string {
    if (isTimeoutError(error)) return 'timeout'
    if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: unknown }).code
        if (typeof code === 'string') return code
    }
    return 'upstream'
}

function asRows(data: unknown): Record<string, unknown>[] {
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : []
}

export async function getLaunchVoteView(userId: string | null): Promise<LaunchVoteView> {
    if (!launchVoteEnabled()) return EMPTY_LAUNCH_VOTE_VIEW
    try {
        const supabase = await createClient()
        const sb = supabase as unknown as VoteReader
        const topPromise = withTimeout(
            sb.rpc('shop_launch_vote_top3', { p_min_votes: MIN_VOTES_FOR_TOP3 }),
            TIMEOUT_MS,
            'shop.launchVote.top3',
        )
        const votesPromise = userId
            ? withTimeout(
                  Promise.resolve(
                      sb.from('shop_product_waitlist').select('product_id').eq('user_id', userId).not('voted_at', 'is', null),
                  ),
                  TIMEOUT_MS,
                  'shop.launchVote.own',
              )
            : Promise.resolve({ data: [] as Record<string, unknown>[], error: null })

        const [top, votes] = await Promise.all([topPromise, votesPromise])
        if (top.error || votes.error) {
            safeLog.warn('shop.launchVote', 'view read failed', {
                reason: reasonOf(top.error ?? votes.error),
            })
            return EMPTY_LAUNCH_VOTE_VIEW
        }

        const top3: LaunchVoteTopEntry[] = []
        for (const row of asRows(top.data)) {
            if (typeof row.product_id !== 'string') continue
            const rank = typeof row.rank === 'number' ? row.rank : Number(row.rank)
            if (!Number.isFinite(rank)) continue
            top3.push({
                productId: row.product_id,
                rank,
                releaseDate: typeof row.release_date === 'string' ? row.release_date : null,
            })
        }

        const votedProductIds: string[] = []
        for (const row of asRows(votes.data)) {
            if (typeof row.product_id === 'string' && row.product_id.length > 0) {
                votedProductIds.push(row.product_id)
            }
        }

        let hasPriorPaidOrder: boolean | null = null
        if (userId) {
            try {
                const orders = await withTimeout(
                    Promise.resolve(
                        sb.from('shop_orders').select('id').eq('user_id', userId).eq('status', 'paid').limit(1),
                    ),
                    TIMEOUT_MS,
                    'shop.launchVote.priorOrder',
                )
                if (!orders.error) hasPriorPaidOrder = asRows(orders.data).length > 0
            } catch (error) {
                safeLog.warn('shop.launchVote', 'prior order read failed', { reason: reasonOf(error) })
            }
        }

        return { enabled: true, votedProductIds, top3, hasPriorPaidOrder }
    } catch (error) {
        safeLog.warn('shop.launchVote', 'view read failed', { reason: reasonOf(error) })
        return EMPTY_LAUNCH_VOTE_VIEW
    }
}
