import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/flags/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/utils/with-timeout'
import { callAdminReleaseProduct } from '@/lib/shop/launch-vote/release'
import { launchVoteEmailsEnabled } from '@/lib/shop/launch-vote/flags'
import { sendReleaseCodeEmails } from '@/lib/shop/launch-vote/email/release-send'
import { isExemptTestKit } from '@/lib/shop/release-rules'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request, props: { params: Promise<{ productId: string }> }) {
    const auth = await requireAdmin()
    if (auth.kind === 'error') return auth.response
    const { productId } = await props.params
    if (!UUID_RE.test(productId)) {
        return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }
    let body: { confirmed?: unknown }
    try {
        body = (await request.json()) as { confirmed?: unknown }
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    if (body.confirmed !== true) {
        return NextResponse.json({ error: 'Mark released requires confirmed: true' }, { status: 400 })
    }
    try {
        const admin = createAdminClient()
        const sb = admin as unknown as {
            from: (table: string) => {
                select: (columns: string) => {
                    eq: (column: string, value: string) => {
                        maybeSingle: () => Promise<{
                            data: { category?: unknown; product_type?: unknown; active?: unknown } | null
                            error: { code?: string } | null
                        }>
                    }
                }
            }
        }
        const product = await withTimeout(
            sb.from('products').select('category, product_type, active').eq('id', productId).maybeSingle(),
            8000,
            'admin.launchVotes.release.product',
        )
        if (product.error || !product.data || product.data.active !== true) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }
        if (isExemptTestKit({ category: product.data.category, product_type: product.data.product_type })) {
            return NextResponse.json({ error: 'Test kits are not released from this panel.' }, { status: 409 })
        }
        const released = await callAdminReleaseProduct(productId, auth.user.id)
        if (!released.ok) {
            const status = released.reason === 'test_kit' ? 409 : released.reason === 'not_found' ? 404 : 500
            return NextResponse.json({ error: released.reason }, { status })
        }
        let emails: { skipped?: string; sent: number } = { sent: 0 }
        if (launchVoteEmailsEnabled()) {
            emails = await sendReleaseCodeEmails(productId)
        }
        return NextResponse.json({ ok: true, codesCreated: released.codesCreated, emails })
    } catch {
        return NextResponse.json({ error: 'Release failed' }, { status: 500 })
    }
}
