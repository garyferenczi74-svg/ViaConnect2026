import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/flags/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(_request: Request, props: { params: Promise<{ productId: string }> }) {
    const auth = await requireAdmin()
    if (auth.kind === 'error') return auth.response
    const { productId } = await props.params
    if (!UUID_RE.test(productId)) {
        return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }
    try {
        const admin = createAdminClient()
        const sb = admin as unknown as {
            from: (table: string) => {
                select: (columns: string) => {
                    eq: (column: string, value: string) => {
                        maybeSingle: () => Promise<{
                            data: { release_date?: string | null } | null
                            error: { code?: string } | null
                        }>
                    }
                }
                upsert: (
                    values: Record<string, unknown>,
                    options: { onConflict: string },
                ) => Promise<{ error: { message?: string } | null }>
            }
        }
        const existing = await withTimeout(
            sb.from('shop_product_launch_plan').select('release_date').eq('product_id', productId).maybeSingle(),
            8000,
            'admin.launchVotes.notify.read',
        )
        if (existing.error || !existing.data?.release_date) {
            return NextResponse.json({ error: 'A release date is required before notify.' }, { status: 400 })
        }
        const saved = await withTimeout(
            sb.from('shop_product_launch_plan').upsert(
                {
                    product_id: productId,
                    notify_requested_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'product_id' },
            ),
            8000,
            'admin.launchVotes.notify',
        )
        if (saved.error) {
            safeLog.warn('admin.launchVotes', 'notify marker failed', { productId })
            return NextResponse.json({ error: 'Could not queue the notice.' }, { status: 500 })
        }
        return NextResponse.json({ ok: true, queued: true })
    } catch {
        return NextResponse.json({ error: 'Could not queue the notice.' }, { status: 500 })
    }
}
