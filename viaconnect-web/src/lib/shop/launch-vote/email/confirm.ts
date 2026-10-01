/** Vote confirmation. Flag off returns before a database or network call. */
import { launchVoteEmailsEnabled } from '@/lib/shop/launch-vote/flags'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'
import { appBaseUrl, sendLaunchEmail, type SendLaunchResult } from '@/lib/shop/launch-vote/email/send'
import { renderVoteConfirmation } from '@/lib/shop/launch-vote/email/templates'
import { signUnsubscribeToken } from '@/lib/waitlist/unsubscribe-token'
import type { OrderScope } from '@/lib/shop/launch-vote/release'

export async function sendVoteConfirmation(input: {
    userId: string
    productId: string
    productName: string
    productPath: string
    orderScope: OrderScope | null
}): Promise<SendLaunchResult> {
    if (!launchVoteEmailsEnabled()) return { status: 'skipped', reason: 'flag_off' }
    const base = appBaseUrl()
    const postal = process.env.LAUNCH_VOTE_EMAIL_POSTAL_ADDRESS
    const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET
    if (!base || !postal || !secret) {
        return { status: 'skipped', reason: !postal ? 'no_postal_address' : 'no_provider' }
    }
    try {
        const admin = createAdminClient()
        const looked = await admin.auth.admin.getUserById(input.userId)
        const email = looked.data.user?.email
        if (!email) return { status: 'skipped', reason: 'no_recipient' }
        const token = signUnsubscribeToken(input.userId.toLowerCase(), secret)
        const rendered = renderVoteConfirmation({
            productName: input.productName,
            productUrl: input.productPath.startsWith('http') ? input.productPath : `${base}${input.productPath}`,
            orderScope: input.orderScope,
            postal,
            unsubscribeUrl: `${base}/api/shop/launch-vote/unsubscribe?token=${encodeURIComponent(token)}`,
        })
        const result = await sendLaunchEmail({
            to: email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            userId: input.userId,
        })
        if (result.status === 'sent') {
            const sb = admin as unknown as {
                from: (table: string) => {
                    insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>
                }
            }
            await sb.from('shop_launch_email_log').insert({
                user_id: input.userId,
                kind: 'vote_confirm',
                period_key: input.productId,
            })
        }
        return result
    } catch (error) {
        safeLog.warn('shop.launchVote', 'vote confirmation failed', { productId: input.productId })
        return { status: 'failed', reason: error instanceof Error ? 'upstream' : 'upstream' }
    }
}
