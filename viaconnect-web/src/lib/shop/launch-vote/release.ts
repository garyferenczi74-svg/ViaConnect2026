/**
 * Pure release planner plus a thin service-role wrapper.
 * No code is planned unless releasedAt is provided.
 * Percent is 25 only. Expiry is exactly 7 days after release.
 * Rows without a vote time are excluded. Existing codes are not duplicated.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { addDaysIso } from '@/lib/shop/launch-vote/state'

export const EARLY_VOTER_PERCENT = 25
export const EARLY_VOTER_EXPIRE_DAYS = 7

export type OrderScope = 'first_order' | 'next_order'

export interface ReleaseVoteInput {
    userId: string
    productId: string
    votedAt: string | null
}

export interface PlannedReleaseCode {
    userId: string
    productId: string
    percentOff: 25
    expiresAt: string
    orderScope: OrderScope
}

export function orderScopeForUser(hasPriorPaidOrder: boolean): OrderScope {
    return hasPriorPaidOrder ? 'next_order' : 'first_order'
}

export function planReleaseCodes(input: {
    votes: readonly ReleaseVoteInput[]
    releasedAt: string | null
    existingCodeUserIds: ReadonlySet<string>
    priorPaidOrderUserIds: ReadonlySet<string>
}): PlannedReleaseCode[] {
    if (!input.releasedAt) return []
    const releasedMs = Date.parse(input.releasedAt)
    if (Number.isNaN(releasedMs)) return []
    const expiresAt = addDaysIso(input.releasedAt, EARLY_VOTER_EXPIRE_DAYS)
    const seen = new Set<string>()
    const planned: PlannedReleaseCode[] = []
    for (const vote of input.votes) {
        if (!vote.votedAt) continue
        if (input.existingCodeUserIds.has(vote.userId)) continue
        if (seen.has(vote.userId)) continue
        seen.add(vote.userId)
        planned.push({
            userId: vote.userId,
            productId: vote.productId,
            percentOff: EARLY_VOTER_PERCENT,
            expiresAt,
            orderScope: orderScopeForUser(input.priorPaidOrderUserIds.has(vote.userId)),
        })
    }
    return planned
}

interface RpcResult {
    data: unknown
    error: { code?: string; message?: string } | null
}

export async function callAdminReleaseProduct(
    productId: string,
    actorId: string,
): Promise<{ ok: true; codesCreated: number } | { ok: false; reason: string }> {
    try {
        const admin = createAdminClient()
        const sb = admin as unknown as {
            rpc: (fn: string, args: Record<string, unknown>) => Promise<RpcResult>
        }
        const result = await withTimeout(
            sb.rpc('shop_admin_release_product', { p_product_id: productId, p_actor: actorId }),
            8000,
            'shop.launchVote.release',
        )
        if (result.error) {
            const code = result.error.code ?? 'upstream'
            safeLog.warn('shop.launchVote', 'release rpc failed', { reason: code, productId })
            if (code === 'P0001') return { ok: false, reason: 'test_kit' }
            if (code === 'P0002') return { ok: false, reason: 'not_found' }
            if (code === '42P01' || code === '42883') return { ok: false, reason: 'schema_missing' }
            return { ok: false, reason: 'upstream' }
        }
        const count = typeof result.data === 'number' ? result.data : Number(result.data)
        return { ok: true, codesCreated: Number.isFinite(count) ? count : 0 }
    } catch (error) {
        safeLog.warn('shop.launchVote', 'release rpc failed', { productId })
        return { ok: false, reason: error instanceof Error ? 'upstream' : 'upstream' }
    }
}
