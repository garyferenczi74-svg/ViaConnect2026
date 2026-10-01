import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth'
import { runLaunchVoteWeekly } from '@/lib/shop/launch-vote/email/weekly'
import { safeLog } from '@/lib/utils/safe-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(request: Request): Promise<Response> {
    if (!isCronAuthorized(request.headers.get('authorization'))) {
        return new Response('Unauthorized', { status: 401 })
    }
    try {
        const result = await runLaunchVoteWeekly()
        return Response.json({ ok: true, result }, { status: 200 })
    } catch (err) {
        safeLog.error('cron.launch-vote-weekly', 'threw', { error: err })
        return Response.json(
            { ok: false, error: err instanceof Error ? err.message : 'upstream' },
            { status: 200 },
        )
    }
}

export async function GET(request: Request): Promise<Response> {
    return handle(request)
}

export async function POST(request: Request): Promise<Response> {
    return handle(request)
}
