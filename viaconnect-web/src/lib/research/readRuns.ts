// src/lib/research/readRuns.ts
//
// Reader for research_run_log via the admin (service-role) client.
// research_run_log is service-role-only (RLS blocks anon/user reads),
// so the admin client is mandatory here.
//
// Fail-open: on any error safeLog.error is called and [] is returned
// so the KB health panel still renders.
//
// Prompt 208, Phase 9, Task 24 (2026-06-21).
// No em/en-dashes. No emojis.

import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// ResearchRun - shape of a row returned by getRecentResearchRuns.
// ---------------------------------------------------------------------------

export interface ResearchRun {
  domain: string | null
  sources_queried: string[]
  atoms_created: number
  atoms_rejected: number
  gaps_recorded: number
  duration_ms: number | null
  status: string
  created_at: string
}

// ---------------------------------------------------------------------------
// getRecentResearchRuns
//
// Selects up to `limit` rows from research_run_log ordered by created_at
// descending. Parses defensively (null numerics default to 0, null arrays
// to []). Fail-open: on error safeLog.error + return [].
// ---------------------------------------------------------------------------

export async function getRecentResearchRuns(limit?: number): Promise<ResearchRun[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('research_run_log')
      .select(
        'domain, sources_queried, atoms_created, atoms_rejected, gaps_recorded, duration_ms, status, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit ?? 50)

    if (error || !data) {
      safeLog.error('research.readRuns', 'Failed to read research_run_log', { error })
      return []
    }

    return data.map((row: Record<string, unknown>) => ({
      domain: (row.domain as string | null) ?? null,
      sources_queried: Array.isArray(row.sources_queried) ? (row.sources_queried as string[]) : [],
      atoms_created: typeof row.atoms_created === 'number' ? row.atoms_created : 0,
      atoms_rejected: typeof row.atoms_rejected === 'number' ? row.atoms_rejected : 0,
      gaps_recorded: typeof row.gaps_recorded === 'number' ? row.gaps_recorded : 0,
      duration_ms: typeof row.duration_ms === 'number' ? row.duration_ms : null,
      status: typeof row.status === 'string' ? row.status : 'unknown',
      created_at: typeof row.created_at === 'string' ? row.created_at : '',
    }))
  } catch (err) {
    safeLog.error('research.readRuns', 'getRecentResearchRuns threw unexpectedly', {
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}
