/**
 * Persist synchronism chain runs to pipeline_runs (idempotent upsert on run_id).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import type { ChainRunResult } from './chainTypes';

export async function persistPipelineRun(run: ChainRunResult): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('pipeline_runs').upsert(
      {
        run_id: run.runId,
        run_date: run.runDate,
        status: run.status,
        started_at: run.startedAt,
        ended_at: run.endedAt,
        stages: run.stages,
      },
      { onConflict: 'run_id' },
    );
    if (error) {
      safeLog.error('synchronism.persist', 'upsert failed', { runId: run.runId, error });
    }
  } catch (err) {
    safeLog.error('synchronism.persist', 'threw', {
      runId: run.runId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function fetchLatestPipelineRuns(limit = 7): Promise<ChainRunResult[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('run_id, run_date, status, started_at, ended_at, stages')
      .order('run_date', { ascending: false })
      .limit(limit);
    if (error || !data) {
      safeLog.warn('synchronism.persist', 'fetch failed open', { error });
      return [];
    }
    return data.map((row) => ({
      runId: row.run_id as string,
      runDate: String(row.run_date),
      status: row.status as ChainRunResult['status'],
      startedAt: row.started_at as string,
      endedAt: row.ended_at as string,
      stages: (row.stages as ChainRunResult['stages']) ?? [],
    }));
  } catch (err) {
    safeLog.warn('synchronism.persist', 'fetch threw', { error: err });
    return [];
  }
}
