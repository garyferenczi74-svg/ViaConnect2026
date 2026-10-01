/**
 * POST /api/shop/launch-vote
 * Signed-in users only. Flag off is 404 VOTE_DISABLED and does not read vote tables.
 * Logs never pair a user id with a product name.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { castLaunchVote, type CastLaunchVoteResult } from '@/lib/shop/launch-vote/cast'
import { launchVoteEnabled } from '@/lib/shop/launch-vote/flags'
import { sendVoteConfirmation } from '@/lib/shop/launch-vote/email/confirm'
import type { OrderScope } from '@/lib/shop/launch-vote/release'
import type { WaitlistSource } from '@/lib/shop/waitlist'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function apiEnvelope(success: boolean, data?: Record<string, unknown>, errorCode?: string) {
    return {
        success,
        ...(data !== undefined && { data }),
        ...(errorCode ? { error: errorCode, errorCode } : {}),
        timestamp: new Date().toISOString(),
    }
}

function json(status: number, success: boolean, data?: Record<string, unknown>, errorCode?: string) {
    return NextResponse.json(apiEnvelope(success, data, errorCode), { status })
}

async function requireUser(): Promise<{ userId: string } | NextResponse> {
    try {
        const supabase = await createClient()
        const authResult = await withTimeout(supabase.auth.getUser(), 2000, 'api.shop.launchVote.auth')
        const userId = authResult.data.user?.id
        if (authResult.error || !userId) return json(401, false, undefined, 'AUTH_REQUIRED')
        return { userId }
    } catch (error) {
        if (isTimeoutError(error)) return json(503, false, undefined, 'TIMEOUT')
        return json(500, false, undefined, 'SERVER_ERROR')
    }
}

function mapCast(result: CastLaunchVoteResult) {
    if (result.status === 'voted' || result.status === 'already_voted') {
        return json(200, true, { status: result.status, votedAt: result.votedAt })
    }
    if (result.status === 'released') return json(409, false, undefined, 'PRODUCT_RELEASED')
    if (result.status === 'not_found') return json(404, false, undefined, 'PRODUCT_NOT_FOUND')
    if (result.reason === 'timeout') return json(503, false, undefined, 'TIMEOUT')
    return json(500, false, undefined, 'SERVER_ERROR')
}

export async function POST(request: Request) {
    if (!launchVoteEnabled()) return json(404, false, undefined, 'VOTE_DISABLED')

    const auth = await requireUser()
    if (auth instanceof NextResponse) return auth

    let body: Record<string, unknown>
    try {
        const parsed: unknown = await request.json()
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return json(400, false, undefined, 'INVALID_BODY')
        }
        body = parsed as Record<string, unknown>
    } catch {
        return json(400, false, undefined, 'INVALID_BODY')
    }

    const productId = body.productId
    if (typeof productId !== 'string' || !UUID_RE.test(productId)) {
        return json(400, false, undefined, 'INVALID_BODY')
    }
    const source = body.source
    if (source !== 'plp' && source !== 'pdp') return json(400, false, undefined, 'INVALID_BODY')

    const result = await castLaunchVote(auth.userId, productId, source as WaitlistSource)
    if (result.status === 'voted') {
        const productName = typeof body.productName === 'string' ? body.productName : ''
        const productPath = typeof body.productPath === 'string' ? body.productPath : `/shop/product/${productId}`
        const orderScope: OrderScope | null =
            body.orderScope === 'first_order' || body.orderScope === 'next_order' ? body.orderScope : null
        if (productName) {
            await sendVoteConfirmation({
                userId: auth.userId,
                productId,
                productName,
                productPath,
                orderScope,
            })
        }
        safeLog.info('api.shop.launchVote', 'voted', { productId })
    }
    return mapCast(result)
}
