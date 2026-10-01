/** Release-day code emails. Called only after Mark released, and only when the email flag is on. */
import { earlyVoterDiscountEnabled, launchVoteEmailsEnabled } from '@/lib/shop/launch-vote/flags'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'
import { appBaseUrl, sendLaunchEmail } from '@/lib/shop/launch-vote/email/send'
import { renderReleaseCode } from '@/lib/shop/launch-vote/email/templates'
import { formatUtcInstantDate } from '@/lib/shop/launch-vote/state'
import { signUnsubscribeToken } from '@/lib/waitlist/unsubscribe-token'
import type { OrderScope } from '@/lib/shop/launch-vote/release'

export async function sendReleaseCodeEmails(productId: string): Promise<{ skipped?: string; sent: number }> {
    if (!launchVoteEmailsEnabled()) return { skipped: 'flag_off', sent: 0 }
    const base = appBaseUrl()
    const postal = process.env.LAUNCH_VOTE_EMAIL_POSTAL_ADDRESS
    const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET
    if (!base || !postal || !secret) return { skipped: 'not_configured', sent: 0 }
    try {
        const admin = createAdminClient()
        const sb = admin as unknown as ReleaseDb
        const product = await sb.from('products').select('name, slug, sku').eq('id', productId).maybeSingle()
        const codes = await sb
            .from('shop_early_voter_codes')
            .select('user_id, code, expires_at, order_scope')
            .eq('product_id', productId)
        if (product.error || codes.error || !product.data) return { skipped: 'schema_missing', sent: 0 }
        const name = typeof product.data.name === 'string' ? product.data.name : ''
        const slug = typeof product.data.slug === 'string' ? product.data.slug : typeof product.data.sku === 'string' ? product.data.sku : productId
        const includeCode = earlyVoterDiscountEnabled()
        let sent = 0
        for (const row of codes.data ?? []) {
            if (typeof row.user_id !== 'string') continue
            const looked = await admin.auth.admin.getUserById(row.user_id)
            const email = looked.data.user?.email
            if (!email) continue
            const scope: OrderScope = row.order_scope === 'next_order' ? 'next_order' : 'first_order'
            const expiresLabel = typeof row.expires_at === 'string' ? formatUtcInstantDate(row.expires_at) ?? '' : ''
            const token = signUnsubscribeToken(row.user_id.toLowerCase(), secret)
            const rendered = renderReleaseCode({
                productName: name,
                productUrl: `${base}/shop/product/${slug}`,
                code: includeCode && typeof row.code === 'string' ? row.code : null,
                expiresLabel,
                orderScope: scope,
                postal,
                unsubscribeUrl: `${base}/api/shop/launch-vote/unsubscribe?token=${encodeURIComponent(token)}`,
            })
            const result = await sendLaunchEmail({
                to: email,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text,
                userId: row.user_id,
            })
            if (result.status === 'sent') {
                await sb.from('shop_launch_email_log').insert({
                    user_id: row.user_id,
                    kind: 'release_code',
                    period_key: productId,
                })
                sent += 1
            }
        }
        return { sent }
    } catch (error) {
        safeLog.warn('shop.launchVote', 'release emails failed', { productId })
        return { skipped: error instanceof Error ? 'upstream' : 'upstream', sent: 0 }
    }
}

interface ReleaseDb {
    from: (table: string) => {
        select: (columns: string) => {
            eq: (column: string, value: string) => {
                maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { code?: string } | null }>
                then: PromiseLike<{ data: Record<string, unknown>[] | null; error: { code?: string } | null }>['then']
            }
        }
        insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>
    }
}
