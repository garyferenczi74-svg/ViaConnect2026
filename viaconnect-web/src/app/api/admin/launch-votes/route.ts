import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/flags/admin-guard'
import { loadAdminLaunchVotes } from '@/lib/shop/launch-vote/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    const auth = await requireAdmin()
    if (auth.kind === 'error') return auth.response
    const loaded = await loadAdminLaunchVotes()
    if (!loaded.ok) {
        return NextResponse.json({ ok: false, rows: [], planNote: loaded.planNote }, { status: 200 })
    }
    return NextResponse.json({ ok: true, rows: loaded.rows, planNote: loaded.planNote })
}
