/**
 * One-click unsubscribe for launch vote email. Anon by design.
 * Missing UNSUBSCRIBE_TOKEN_SECRET returns 503 and changes nothing.
 * Responses never echo the token or an email address.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyUnsubscribeToken } from '@/lib/waitlist/unsubscribe-token'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCOPE = 'api.shop.launchVote.unsubscribe'

function brandedPage(title: string, heading: string, paragraphs: readonly string[]): string {
    const body = paragraphs
        .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#cfd8ea;font-size:16px;">${p}</p>`)
        .join('')
    return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8"/>',
        '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
        '<meta name="robots" content="noindex"/>',
        `<title>${title}</title>`,
        '</head>',
        '<body style="margin:0;background-color:#1A2744;font-family:\'Instrument Sans\',ui-sans-serif,system-ui,sans-serif;">',
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">',
        '<main style="max-width:480px;width:100%;background-color:#1E3054;border:1px solid rgba(45,165,160,0.35);border-radius:16px;padding:32px;">',
        '<div style="width:40px;height:4px;background-color:#2DA5A0;border-radius:2px;margin:0 0 24px;"></div>',
        `<h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;line-height:1.3;font-weight:600;">${heading}</h1>`,
        body,
        '<p style="margin:24px 0 0;color:#8fa3c4;font-size:13px;">ViaCura</p>',
        '</main>',
        '</div>',
        '</body>',
        '</html>',
    ].join('')
}

function htmlResponse(page: string, status: number): NextResponse {
    return new NextResponse(page, {
        status,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex',
        },
    })
}

const CONFIRMED_PAGE = brandedPage('Unsubscribed', 'You are unsubscribed', [
    'You will not receive further ViaCura launch update emails.',
    'No further action is needed. You may close this page.',
])

const INVALID_PAGE = brandedPage('Link not valid', 'This unsubscribe link is not valid', [
    'The link may be incomplete or altered. Please open the unsubscribe link from your email again.',
    'If the problem continues, reply to the email you received and ask to be removed.',
])

const UNAVAILABLE_PAGE = brandedPage('Temporarily unavailable', 'Unsubscribe is temporarily unavailable', [
    'We could not process your request right now. Please try the link again later.',
    'You can also reply to the email you received and ask to be removed.',
])

export async function GET(request: NextRequest): Promise<NextResponse> {
    const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET ?? ''
    if (!secret) {
        safeLog.error(SCOPE, 'UNSUBSCRIBE_TOKEN_SECRET is not set', {})
        return htmlResponse(UNAVAILABLE_PAGE, 503)
    }
    const verification = verifyUnsubscribeToken(request.nextUrl.searchParams.get('token'), secret)
    if (!verification.valid) {
        safeLog.warn(SCOPE, 'rejected an invalid unsubscribe link', {})
        return htmlResponse(INVALID_PAGE, 400)
    }
    try {
        const supabase = createAdminClient()
        const sb = supabase as unknown as {
            from: (table: string) => {
                upsert: (
                    values: { user_id: string },
                    options: { onConflict: string },
                ) => Promise<{ error: { message?: string } | null }>
            }
        }
        const { error } = await withTimeout(
            sb.from('shop_launch_email_optout').upsert(
                { user_id: verification.waitlistId },
                { onConflict: 'user_id' },
            ),
            10000,
            SCOPE,
        )
        if (error) {
            safeLog.warn(SCOPE, 'opt out write failed', {})
            return htmlResponse(UNAVAILABLE_PAGE, 503)
        }
        return htmlResponse(CONFIRMED_PAGE, 200)
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn(SCOPE, 'opt out timed out', {})
            return htmlResponse(UNAVAILABLE_PAGE, 503)
        }
        safeLog.warn(SCOPE, 'opt out failed', {})
        return htmlResponse(UNAVAILABLE_PAGE, 503)
    }
}
