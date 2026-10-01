/**
 * Own early-voter code read. Display math lives in early-voter-math.ts
 * so cart client code never imports the server client.
 */
import { createClient } from '@/lib/supabase/server'
import { withTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { earlyVoterDiscountEnabled } from '@/lib/shop/launch-vote/flags'
import {
    EARLY_VOTER_UNITS,
    computeEarlyVoterLine,
    listEarlyVoterRows,
    type AppliedEarlyVoterLine,
    type EarlyVoterCartLine,
    type EarlyVoterCodeRow,
    type EarlyVoterDisplayRow,
} from '@/lib/shop/launch-vote/early-voter-math'

export {
    EARLY_VOTER_UNITS,
    computeEarlyVoterLine,
    listEarlyVoterRows,
    type AppliedEarlyVoterLine,
    type EarlyVoterCartLine,
    type EarlyVoterCodeRow,
    type EarlyVoterDisplayRow,
}

interface CodeQuery {
    select: (columns: string) => CodeQuery
    is: (column: string, value: null) => CodeQuery
    gt: (column: string, value: string) => CodeQuery
    then: PromiseLike<{ data: Record<string, unknown>[] | null; error: { code?: string } | null }>['then']
}

export async function getMyEarlyVoterCodes(nowMs = Date.now()): Promise<EarlyVoterCodeRow[]> {
    if (!earlyVoterDiscountEnabled()) return []
    try {
        const supabase = await createClient()
        const sb = supabase as unknown as { from: (table: string) => CodeQuery }
        const result = await withTimeout(
            Promise.resolve(
                sb
                    .from('shop_early_voter_codes')
                    .select('product_id, code, percent_off, expires_at, redeemed_at, order_scope')
                    .is('redeemed_at', null)
                    .gt('expires_at', new Date(nowMs).toISOString()),
            ),
            1500,
            'shop.launchVote.codes',
        )
        if (result.error) {
            safeLog.warn('shop.launchVote', 'code read failed', { reason: result.error.code ?? 'upstream' })
            return []
        }
        const codes: EarlyVoterCodeRow[] = []
        for (const row of result.data ?? []) {
            if (typeof row.product_id !== 'string' || typeof row.code !== 'string') continue
            if (typeof row.expires_at !== 'string') continue
            if (row.percent_off !== 25) continue
            if (row.order_scope !== 'first_order' && row.order_scope !== 'next_order') continue
            codes.push({
                productId: row.product_id,
                code: row.code,
                percentOff: 25,
                expiresAt: row.expires_at,
                redeemedAt: typeof row.redeemed_at === 'string' ? row.redeemed_at : null,
                orderScope: row.order_scope,
            })
        }
        return codes
    } catch (error) {
        safeLog.warn('shop.launchVote', 'code read failed', {
            reason: error instanceof Error ? 'upstream' : 'upstream',
        })
        return []
    }
}
