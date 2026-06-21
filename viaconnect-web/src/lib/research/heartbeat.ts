// src/lib/research/heartbeat.ts
//
// Agent heartbeat writer/reader for the Prompt 208 research scheduler.
// Upserts and reads agent_heartbeats via the admin client.
// Both functions are fail-open: on any error, safeLog.error is called
// and the function returns normally (writeHeartbeat -> void, readHeartbeats -> []).
//
// Prompt 208, Phase 6, Task 18b (2026-06-21).
// No em/en-dashes. No emojis.

import { createAdminClient } from '@/lib/supabase/admin'
import { safeLog } from '@/lib/utils/safe-log'

// ---------------------------------------------------------------------------
// writeHeartbeat
//
// Upserts a row in agent_heartbeats (onConflict 'agent') with status,
// detail, and last_beat_at. Fail-open: never throws.
// ---------------------------------------------------------------------------

export async function writeHeartbeat(
  agent: string,
  status: 'ok' | 'degraded' | 'error',
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('agent_heartbeats')
      .upsert(
        {
          agent,
          status,
          detail: detail ?? {},
          last_beat_at: new Date().toISOString(),
        },
        { onConflict: 'agent' },
      )
    if (error) {
      safeLog.error('research.heartbeat', 'Failed to upsert agent_heartbeats', {
        agent,
        status,
        error,
      })
    }
  } catch (err) {
    safeLog.error('research.heartbeat', 'writeHeartbeat threw unexpectedly', {
      agent,
      status,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ---------------------------------------------------------------------------
// readHeartbeats
//
// Returns all rows from agent_heartbeats. Fail-open: returns [] on error.
// ---------------------------------------------------------------------------

export async function readHeartbeats(): Promise<
  Array<{
    agent: string
    status: string
    detail: Record<string, unknown>
    last_beat_at: string
  }>
> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('agent_heartbeats').select('*')
    if (error || !data) {
      safeLog.error('research.heartbeat', 'Failed to read agent_heartbeats', { error })
      return []
    }
    return data as Array<{
      agent: string
      status: string
      detail: Record<string, unknown>
      last_beat_at: string
    }>
  } catch (err) {
    safeLog.error('research.heartbeat', 'readHeartbeats threw unexpectedly', {
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}
