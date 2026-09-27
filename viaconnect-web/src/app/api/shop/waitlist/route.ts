/**
 * Join or leave the per-product shop waiting list.
 * Signed-in users only. 42P01 (table missing) is the existing 500 SERVER_ERROR.
 * Logs never pair a user id with a product name.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import {
    joinProductWaitlist,
    leaveProductWaitlist,
    type WaitlistJoinResult,
    type WaitlistLeaveResult,
    type WaitlistSource,
} from '@/lib/shop/waitlist'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function apiEnvelope(
    success: boolean,
    data?: Record<string, unknown>,
    errorCode?: string,
) {
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
        const authResult = await withTimeout(
            supabase.auth.getUser(),
            2000,
            'api.shop.waitlist.auth',
        )
        const userId = authResult.data.user?.id
        if (authResult.error || !userId) {
            return json(401, false, undefined, 'AUTH_REQUIRED')
        }
        return { userId }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('api.shop.waitlist', 'auth timed out', { reason: 'timeout' })
            return json(503, false, undefined, 'TIMEOUT')
        }
        safeLog.warn('api.shop.waitlist', 'auth failed', { reason: 'upstream' })
        return json(500, false, undefined, 'SERVER_ERROR')
    }
}

async function readBody(request: Request): Promise<Record<string, unknown> | NextResponse> {
    try {
        const body: unknown = await request.json()
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return json(400, false, undefined, 'INVALID_BODY')
        }
        return body as Record<string, unknown>
    } catch {
        return json(400, false, undefined, 'INVALID_BODY')
    }
}

function readProductId(body: Record<string, unknown>): string | NextResponse {
    const productId = body.productId
    if (typeof productId !== 'string' || !UUID_RE.test(productId)) {
        return json(400, false, undefined, 'INVALID_BODY')
    }
    return productId
}

function mapJoin(result: WaitlistJoinResult, productId: string) {
    if (result.status === 'joined') {
        safeLog.info('api.shop.waitlist', 'joined', { productId })
        return json(200, true, { status: 'joined' })
    }
    if (result.status === 'released') {
        return json(409, false, undefined, 'PRODUCT_RELEASED')
    }
    if (result.status === 'not_found') {
        return json(404, false, undefined, 'PRODUCT_NOT_FOUND')
    }
    if (result.reason === 'timeout') {
        return json(503, false, undefined, 'TIMEOUT')
    }
    return json(500, false, undefined, 'SERVER_ERROR')
}

function mapLeave(result: WaitlistLeaveResult) {
    if (result.status === 'left') {
        return json(200, true, { status: 'left' })
    }
    if (result.reason === 'timeout') {
        return json(503, false, undefined, 'TIMEOUT')
    }
    return json(500, false, undefined, 'SERVER_ERROR')
}

export async function POST(request: Request) {
    const auth = await requireUser()
    if (auth instanceof NextResponse) return auth

    const body = await readBody(request)
    if (body instanceof NextResponse) return body

    const productId = readProductId(body)
    if (productId instanceof NextResponse) return productId

    const source = body.source
    if (source !== 'plp' && source !== 'pdp') {
        return json(400, false, undefined, 'INVALID_BODY')
    }

    const result = await joinProductWaitlist(auth.userId, productId, source as WaitlistSource)
    return mapJoin(result, productId)
}

export async function DELETE(request: Request) {
    const auth = await requireUser()
    if (auth instanceof NextResponse) return auth

    const body = await readBody(request)
    if (body instanceof NextResponse) return body

    const productId = readProductId(body)
    if (productId instanceof NextResponse) return productId

    const result = await leaveProductWaitlist(productId)
    return mapLeave(result)
}
