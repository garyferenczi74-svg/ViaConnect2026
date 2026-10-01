import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/flags/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { isRealCalendarDate } from '@/lib/shop/launch-vote/state'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: Request, props: { params: Promise<{ productId: string }> }) {
    const auth = await requireAdmin()
    if (auth.kind === 'error') return auth.response
    const { productId } = await props.params
    if (!UUID_RE.test(productId)) {
        return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }
    let body: { releaseDate?: unknown }
    try {
        body = (await request.json()) as { releaseDate?: unknown }
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const releaseDate = body.releaseDate
    if (releaseDate !== null && (typeof releaseDate !== 'string' || !isRealCalendarDate(releaseDate))) {
        return NextResponse.json({ error: 'Invalid release date' }, { status: 400 })
    }
    try {
        const admin = createAdminClient()
        const sb = admin as unknown as {
            from: (table: string) => {
                upsert: (
                    values: Record<string, unknown>,
                    options: { onConflict: string },
                ) => Promise<{ error: { message?: string } | null }>
            }
        }
        const result = await withTimeout(
            sb.from('shop_product_launch_plan').upsert(
                {
                    product_id: productId,
                    release_date: releaseDate,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'product_id' },
            ),
            8000,
            'admin.launchVotes.date',
        )
        if (result.error) {
            safeLog.warn('admin.launchVotes', 'date save failed', { productId })
            return NextResponse.json({ error: 'Could not save the release date.' }, { status: 500 })
        }
        return NextResponse.json({ ok: true, releaseDate })
    } catch {
        return NextResponse.json({ error: 'Could not save the release date.' }, { status: 500 })
    }
}
