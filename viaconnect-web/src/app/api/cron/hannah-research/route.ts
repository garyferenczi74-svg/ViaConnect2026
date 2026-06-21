// src/app/api/cron/hannah-research/route.ts
//
// Vercel cron route for Hannah's rotating autonomous research passes.
// Schedule: 0 */3 * * * (every 3 hours, 8 ticks/day cycles the 7 domains).
//
// Auth: mirrors bos/worker/route.ts exactly (timing-safe Bearer CRON_SECRET).
// Fail-open: a failed pass returns 200 and retries on the next cron tick.
//   Only auth failure returns 401.
//
// Note: Sherlock handles deep retrieval on delegation; the research pass calls
// the source clients directly. Deeper Sherlock delegation is a later enhancement.
//
// Prompt 208, Phase 6, Task 18b (2026-06-21).
// No em/en-dashes. No emojis.

import { timingSafeEqual } from 'node:crypto'
import { nextDomains } from '@/lib/research/gapScheduler'
import { runResearchPass } from '@/lib/research/researchPass'
import { writeHeartbeat } from '@/lib/research/heartbeat'
import { safeLog } from '@/lib/utils/safe-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Research passes query PubMed, ClinicalTrials, and Consensus, then embed
// and upsert atoms. Allow extra time for network-bound source calls.
export const maxDuration = 300

const BEARER_PREFIX = 'Bearer '

function isAuthorized(headerValue: string | null): boolean {
  const expected = `${BEARER_PREFIX}${process.env.CRON_SECRET ?? ''}`
  const actual = headerValue ?? ''
  if (expected.length <= BEARER_PREFIX.length) {
    // CRON_SECRET unset or empty -> reject every request, including
    // attackers who send "Authorization: Bearer ".
    return false
  }
  if (actual.length !== expected.length) {
    return false
  }
  return timingSafeEqual(
    Buffer.from(actual, 'utf8'),
    Buffer.from(expected, 'utf8'),
  )
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Gap-prioritized domain selection. Over successive ticks all 7 domains cycle.
    const domains = await nextDomains()
    const domain = domains[0] ?? 'methylation'

    const result = await runResearchPass(domain)

    await writeHeartbeat(
      'hannah',
      result.status === 'error' ? 'error' : 'ok',
      {
        domain,
        atomsCreated: result.atomsCreated,
        atomsRejected: result.atomsRejected,
        durationMs: result.durationMs,
      },
    )

    return Response.json({ ok: true, domain, result })
  } catch (err) {
    safeLog.error('cron.hannah-research', 'Unexpected error in hannah-research cron', {
      error: err instanceof Error ? err.message : String(err),
    })

    // Fail-open: a failed pass must never block; it retries on the next tick.
    await writeHeartbeat('hannah', 'error', { error: String(err) })

    return Response.json({ ok: false }, { status: 200 })
  }
}
