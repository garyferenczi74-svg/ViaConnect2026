/**
 * Admin launch vote reads. Counts only. No voter identities.
 */
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { ADMIN_PLAN_NOTE } from '@/lib/shop/launch-vote-copy'
import { MIN_VOTES_FOR_TOP3, rankVotes, top3, type VoteRankRow } from '@/lib/shop/launch-vote/rank'
import { isExemptTestKit, resolveRelease } from '@/lib/shop/release-rules'

export interface AdminLaunchVoteRow {
    productId: string
    name: string
    sku: string
    votes: number
    rank: number | null
    releaseDate: string | null
    released: boolean
    releasedAt: string | null
    notifyRequestedAt: string | null
}

export interface AdminLaunchVoteLoad {
    ok: boolean
    rows: AdminLaunchVoteRow[]
    planNote: string
}

interface Row {
    [key: string]: unknown
}

interface AdminReader {
    from: (table: string) => {
        select: (columns: string) => Promise<{ data: Row[] | null; error: { code?: string } | null }> & {
            in: (column: string, values: string[]) => Promise<{ data: Row[] | null; error: { code?: string } | null }>
            eq: (column: string, value: string) => {
                maybeSingle: () => Promise<{ data: Row | null; error: { code?: string } | null }>
            }
        }
    }
}

export async function loadAdminLaunchVotes(): Promise<AdminLaunchVoteLoad> {
    const failed: AdminLaunchVoteLoad = { ok: false, rows: [], planNote: ADMIN_PLAN_NOTE }
    const admin = createAdminClientOrNull()
    if (!admin) return failed
    try {
        const sb = admin as unknown as AdminReader
        const votes = await withTimeout(
            sb.from('shop_product_waitlist').select('product_id, user_id, voted_at'),
            8000,
            'admin.launchVotes.rows',
        )
        if (votes.error) {
            safeLog.warn('admin.launchVotes', 'vote read failed', { reason: votes.error.code ?? 'upstream' })
            return failed
        }
        const voteRows: VoteRankRow[] = []
        const counts = new Map<string, number>()
        for (const row of votes.data ?? []) {
            if (typeof row.product_id !== 'string' || typeof row.user_id !== 'string') continue
            if (typeof row.voted_at !== 'string') continue
            voteRows.push({ productId: row.product_id, userId: row.user_id, votedAt: row.voted_at })
            counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1)
        }
        const productIds = [...counts.keys()]
        if (productIds.length === 0) return { ok: true, rows: [], planNote: ADMIN_PLAN_NOTE }

        const [products, plans, phases] = await Promise.all([
            withTimeout(
                sb.from('products').select('id, name, sku, category, product_type, launch_phase_id, active').in('id', productIds),
                8000,
                'admin.launchVotes.products',
            ),
            withTimeout(
                sb.from('shop_product_launch_plan').select('product_id, release_date, notify_requested_at, released_at').in('product_id', productIds),
                8000,
                'admin.launchVotes.plans',
            ),
            withTimeout(
                sb.from('launch_phases').select('id, activation_status').in('activation_status', ['active', 'completed']),
                8000,
                'admin.launchVotes.phases',
            ),
        ])
        if (products.error || plans.error || phases.error) return failed

        const releasedPhaseIds = new Set<string>()
        for (const phase of phases.data ?? []) {
            if (typeof phase.id === 'string') releasedPhaseIds.add(phase.id)
        }
        const releasedProducts = new Set<string>()
        const productById = new Map<string, Row>()
        for (const product of products.data ?? []) {
            if (typeof product.id !== 'string') continue
            productById.set(product.id, product)
            const fields = {
                category: product.category,
                product_type: product.product_type,
                launch_phase_id: product.launch_phase_id,
            }
            if (isExemptTestKit(fields) || resolveRelease(fields, releasedPhaseIds)) {
                releasedProducts.add(product.id)
            }
        }
        const ranked = top3(rankVotes(voteRows, releasedProducts, MIN_VOTES_FOR_TOP3))
        const rankById = new Map(ranked.map((row) => [row.productId, row.rank]))
        const planById = new Map<string, Row>()
        for (const plan of plans.data ?? []) {
            if (typeof plan.product_id === 'string') planById.set(plan.product_id, plan)
        }

        const rows: AdminLaunchVoteRow[] = []
        for (const productId of productIds) {
            const product = productById.get(productId)
            if (!product || typeof product.name !== 'string' || typeof product.sku !== 'string') continue
            const plan = planById.get(productId)
            rows.push({
                productId,
                name: product.name,
                sku: product.sku,
                votes: counts.get(productId) ?? 0,
                rank: rankById.get(productId) ?? null,
                releaseDate: typeof plan?.release_date === 'string' ? plan.release_date : null,
                released: releasedProducts.has(productId) || typeof plan?.released_at === 'string',
                releasedAt: typeof plan?.released_at === 'string' ? plan.released_at : null,
                notifyRequestedAt: typeof plan?.notify_requested_at === 'string' ? plan.notify_requested_at : null,
            })
        }
        rows.sort((a, b) => b.votes - a.votes || (a.sku < b.sku ? -1 : 1))
        return { ok: true, rows, planNote: ADMIN_PLAN_NOTE }
    } catch (error) {
        safeLog.warn('admin.launchVotes', 'load failed', {
            reason: error instanceof Error ? 'upstream' : 'upstream',
        })
        return failed
    }
}
