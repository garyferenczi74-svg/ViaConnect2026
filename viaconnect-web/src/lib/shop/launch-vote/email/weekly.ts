/** ISO week key and weekly send planner. Flag off does no database or network work. */
import { launchVoteEmailsEnabled } from '@/lib/shop/launch-vote/flags'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'
import { appBaseUrl, sendLaunchEmail } from '@/lib/shop/launch-vote/email/send'
import { getApprovedViaCuraContent } from '@/lib/shop/launch-vote/email/content'
import { renderAdminWeekly, renderSubscriberWeekly, type AdminTallyRow, type WeeklyProductBlock } from '@/lib/shop/launch-vote/email/templates'
import { signUnsubscribeToken } from '@/lib/waitlist/unsubscribe-token'
import type { OrderScope } from '@/lib/shop/launch-vote/release'

export function isoWeekPeriodKey(date: Date): string {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = utc.getUTCDay() || 7
    utc.setUTCDate(utc.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
    const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function parseAdminDigestRecipients(raw: string | undefined): string[] {
    if (!raw) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const part of raw.split(',')) {
        const email = part.trim()
        if (!email) continue
        const key = email.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(email)
    }
    return out
}

export interface WeeklyAudienceRow {
    userId: string
    email: string
    productId: string
    productName: string
    imageUrl: string | null
    productPath: string
    voted: boolean
    releaseDate: string | null
    orderScope: OrderScope | null
}

export interface PlannedUserSend {
    userId: string
    email: string
    products: WeeklyProductBlock[]
}

export function planWeeklyUserSends(input: {
    rows: readonly WeeklyAudienceRow[]
    alreadySentUserIds: ReadonlySet<string>
}): PlannedUserSend[] {
    const grouped = new Map<string, PlannedUserSend>()
    for (const row of input.rows) {
        if (input.alreadySentUserIds.has(row.userId)) continue
        if (!row.email) continue
        const product: WeeklyProductBlock = {
            productName: row.productName,
            imageUrl: row.imageUrl,
            productUrl: row.productPath,
            voted: row.voted,
            releaseDate: row.releaseDate,
            approved: getApprovedViaCuraContent(row.productId),
            orderScope: row.voted ? row.orderScope : null,
        }
        const current = grouped.get(row.userId)
        if (!current) {
            grouped.set(row.userId, { userId: row.userId, email: row.email, products: [product] })
            continue
        }
        current.products.push(product)
    }
    return [...grouped.values()]
}

export interface WeeklyRunResult {
    skipped?: 'flag_off' | 'no_postal_address' | 'no_app_url'
    periodKey?: string
    adminRecipients?: number
    userSends?: number
}

export async function runLaunchVoteWeekly(now = new Date()): Promise<WeeklyRunResult> {
    if (!launchVoteEmailsEnabled()) return { skipped: 'flag_off' }
    const postal = process.env.LAUNCH_VOTE_EMAIL_POSTAL_ADDRESS
    if (!postal) return { skipped: 'no_postal_address' }
    const base = appBaseUrl()
    if (!base) return { skipped: 'no_app_url' }
    const periodKey = isoWeekPeriodKey(now)
    const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET ?? ''
    try {
        const admin = createAdminClient()
        const sb = admin as unknown as WeeklyDb
        const listed = await sb.from('shop_launch_email_log').select('user_id, kind, period_key').eq('period_key', periodKey)
        const already = new Set<string>()
        let adminLogged = false
        for (const row of listed.data ?? []) {
            if (row.kind === 'voter_weekly' && typeof row.user_id === 'string') already.add(row.user_id)
            if (row.kind === 'admin_weekly' && row.user_id == null) adminLogged = true
        }
        const audience = await loadAudience(sb, base)
        const planned = planWeeklyUserSends({ rows: audience.rows, alreadySentUserIds: already })
        let userSends = 0
        for (const send of planned) {
            if (!secret) continue
            const token = signUnsubscribeToken(send.userId.toLowerCase(), secret)
            const rendered = renderSubscriberWeekly({
                products: send.products,
                postal,
                unsubscribeUrl: `${base}/api/shop/launch-vote/unsubscribe?token=${encodeURIComponent(token)}`,
            })
            const result = await sendLaunchEmail({
                to: send.email,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text,
                userId: send.userId,
            })
            if (result.status === 'sent') {
                await sb.from('shop_launch_email_log').insert({
                    user_id: send.userId,
                    kind: 'voter_weekly',
                    period_key: periodKey,
                })
                userSends += 1
            }
        }
        const recipients = parseAdminDigestRecipients(process.env.LAUNCH_VOTE_ADMIN_DIGEST_TO)
        let adminRecipients = 0
        if (!adminLogged && recipients.length > 0) {
            const rendered = renderAdminWeekly({ rows: audience.tally, postal })
            for (const to of recipients) {
                const result = await sendLaunchEmail({
                    to,
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text,
                    userId: null,
                })
                if (result.status === 'sent') adminRecipients += 1
            }
            if (adminRecipients > 0) {
                await sb.from('shop_launch_email_log').insert({
                    user_id: null,
                    kind: 'admin_weekly',
                    period_key: periodKey,
                })
            }
        }
        return { periodKey, adminRecipients, userSends }
    } catch (error) {
        safeLog.warn('shop.launchVote.weekly', 'weekly run failed', {
            reason: error instanceof Error ? 'upstream' : 'upstream',
        })
        return { periodKey, adminRecipients: 0, userSends: 0 }
    }
}

interface LogRow {
    user_id?: string | null
    kind?: string
    period_key?: string
}

interface WeeklyDb {
    from: (table: string) => {
        select: (columns: string) => {
            eq: (column: string, value: string) => Promise<{ data: LogRow[] | null; error: { code?: string } | null }>
            then?: unknown
        }
        insert: (values: Record<string, unknown>) => Promise<{ error: { code?: string } | null }>
    }
}

async function loadAudience(
    sb: WeeklyDb,
    base: string,
): Promise<{ rows: WeeklyAudienceRow[]; tally: AdminTallyRow[] }> {
    const db = sb as unknown as {
        from: (table: string) => {
            select: (columns: string) => Promise<{ data: Record<string, unknown>[] | null; error: { code?: string } | null }>
        }
    }
    const waitlist = await db.from('shop_product_waitlist').select('user_id, product_id, voted_at')
    const products = await db.from('products').select('id, name, sku, image_url, slug, active, launch_phase_id')
    const plans = await db.from('shop_product_launch_plan').select('product_id, release_date')
    if (waitlist.error || products.error) return { rows: [], tally: [] }
    const productById = new Map<string, Record<string, unknown>>()
    for (const product of products.data ?? []) {
        if (typeof product.id === 'string') productById.set(product.id, product)
    }
    const dateById = new Map<string, string | null>()
    for (const plan of plans.data ?? []) {
        if (typeof plan.product_id === 'string') {
            dateById.set(plan.product_id, typeof plan.release_date === 'string' ? plan.release_date : null)
        }
    }
    const voteCounts = new Map<string, number>()
    const rows: WeeklyAudienceRow[] = []
    for (const row of waitlist.data ?? []) {
        if (typeof row.user_id !== 'string' || typeof row.product_id !== 'string') continue
        const product = productById.get(row.product_id)
        if (!product || product.active !== true) continue
        const voted = typeof row.voted_at === 'string'
        if (voted) voteCounts.set(row.product_id, (voteCounts.get(row.product_id) ?? 0) + 1)
        const slug = typeof product.slug === 'string' ? product.slug : typeof product.sku === 'string' ? product.sku : row.product_id
        rows.push({
            userId: row.user_id,
            email: '',
            productId: row.product_id,
            productName: typeof product.name === 'string' ? product.name : '',
            imageUrl: typeof product.image_url === 'string' ? product.image_url : null,
            productPath: `${base}/shop/product/${slug}`,
            voted,
            releaseDate: dateById.get(row.product_id) ?? null,
            orderScope: null,
        })
    }
    const tally: AdminTallyRow[] = []
    for (const [productId, votes] of voteCounts) {
        const product = productById.get(productId)
        if (!product || typeof product.name !== 'string' || typeof product.sku !== 'string') continue
        tally.push({
            name: product.name,
            sku: product.sku,
            votes,
            rank: null,
            releaseDate: dateById.get(productId) ?? null,
        })
    }
    tally.sort((a, b) => b.votes - a.votes || (a.sku < b.sku ? -1 : 1))
    tally.forEach((row, index) => {
        row.rank = index < 3 && row.votes > 0 ? index + 1 : null
    })
    return { rows: await attachEmails(rows), tally }
}

async function attachEmails(rows: WeeklyAudienceRow[]): Promise<WeeklyAudienceRow[]> {
    const admin = createAdminClient()
    const cache = new Map<string, string>()
    const out: WeeklyAudienceRow[] = []
    for (const row of rows) {
        let email = cache.get(row.userId)
        if (email === undefined) {
            const looked = await admin.auth.admin.getUserById(row.userId)
            email = looked.data.user?.email ?? ''
            cache.set(row.userId, email)
        }
        if (!email || !row.productName) continue
        out.push({ ...row, email })
    }
    return out
}
