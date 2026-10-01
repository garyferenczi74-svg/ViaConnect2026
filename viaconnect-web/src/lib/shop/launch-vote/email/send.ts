/**
 * Launch vote mail. Fail closed. No network until every check passes.
 * Does not edit the shared email service. The key is read at call time.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { launchVoteEmailsEnabled } from '@/lib/shop/launch-vote/flags'

export type SendSkipReason =
    | 'flag_off'
    | 'no_provider'
    | 'no_postal_address'
    | 'no_from'
    | 'opt_out'
    | 'no_recipient'

export type SendLaunchResult =
    | { status: 'skipped'; reason: SendSkipReason }
    | { status: 'sent' }
    | { status: 'failed'; reason: string }

export interface SendLaunchInput {
    to: string
    subject: string
    html: string
    text: string
    userId: string | null
}

async function defaultOptOut(userId: string): Promise<boolean> {
    const admin = createAdminClient()
    const sb = admin as unknown as {
        from: (table: string) => {
            select: (columns: string) => {
                eq: (column: string, value: string) => {
                    maybeSingle: () => Promise<{ data: { user_id?: string } | null; error: { code?: string } | null }>
                }
            }
        }
    }
    const result = await sb.from('shop_launch_email_optout').select('user_id').eq('user_id', userId).maybeSingle()
    if (result.error) return false
    return Boolean(result.data?.user_id)
}

export async function sendLaunchEmail(
    input: SendLaunchInput,
    deps?: {
        fetchImpl?: typeof fetch
        isOptedOut?: (userId: string) => Promise<boolean>
    },
): Promise<SendLaunchResult> {
    if (!launchVoteEmailsEnabled()) return { status: 'skipped', reason: 'flag_off' }
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) return { status: 'skipped', reason: 'no_provider' }
    const postal = process.env.LAUNCH_VOTE_EMAIL_POSTAL_ADDRESS
    if (!postal) return { status: 'skipped', reason: 'no_postal_address' }
    const fromEmail = process.env.SENDGRID_FROM_EMAIL
    if (!fromEmail) return { status: 'skipped', reason: 'no_from' }
    if (input.userId) {
        const opted = deps?.isOptedOut ? await deps.isOptedOut(input.userId) : await defaultOptOut(input.userId)
        if (opted) return { status: 'skipped', reason: 'opt_out' }
    }
    if (!input.to) return { status: 'skipped', reason: 'no_recipient' }

    const fetchImpl = deps?.fetchImpl ?? fetch
    const fromName = process.env.SENDGRID_FROM_NAME ?? 'ViaCura'
    try {
        const res = await fetchImpl('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: input.to }] }],
                from: { email: fromEmail, name: fromName },
                subject: input.subject,
                content: [
                    { type: 'text/plain', value: input.text },
                    { type: 'text/html', value: input.html },
                ],
            }),
        })
        if (res.ok || res.status === 202) return { status: 'sent' }
        return { status: 'failed', reason: 'provider' }
    } catch {
        return { status: 'failed', reason: 'network' }
    }
}

export function appBaseUrl(): string | null {
    const value = process.env.NEXT_PUBLIC_APP_URL
    if (!value) return null
    return value.replace(/\/$/, '')
}
