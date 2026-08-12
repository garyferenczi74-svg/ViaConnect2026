'use client';

/**
 * Prompt 214a: Admin Command Center view of Jeffery's daily synchronism chain.
 * Desktop + mobile: stacked stages, status chips, no fabricated data.
 */

import { useEffect, useState } from 'react';
import { STAGE_ORDER, type ChainRunResult, type StageStatus } from '@/lib/agents/synchronism/chain';

const STATUS_COLOR: Record<StageStatus, string> = {
  ok: '#2DA5A0',
  partial: '#B75E18',
  skipped: '#6B7A99',
  failed: '#E05A4B',
};

interface Props {
  /** Optional preloaded run (SSR); otherwise client fetches /api/admin/jeffery/pipeline */
  initialRun?: ChainRunResult | null;
}

export function PipelineChainView({ initialRun = null }: Props) {
  const [run, setRun] = useState<ChainRunResult | null>(initialRun);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRun) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/jeffery/pipeline', { method: 'GET' });
        if (!res.ok) {
          if (!cancelled) setError('Pipeline log unavailable');
          return;
        }
        const body = (await res.json()) as { run?: ChainRunResult | null };
        if (!cancelled) setRun(body.run ?? null);
      } catch {
        if (!cancelled) setError('Pipeline log unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRun]);

  return (
    <section
      data-testid="pipeline-chain-view"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-4 md:p-5"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Daily synchronism chain</h2>
          <p className="text-[11px] text-white/50 mt-0.5">
            Jeffery-owned Stages 1 to 7. One run id per day.
          </p>
        </div>
        {run && (
          <div className="text-[11px] text-white/60 font-mono">
            {run.runId} · {run.status}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-white/55" data-testid="pipeline-empty">
          {error}. Trigger /api/cron/synchronism-daily or wait for the 06:15 UTC schedule.
        </p>
      )}

      {!error && !run && (
        <p className="text-xs text-white/55" data-testid="pipeline-empty">
          No pipeline run logged yet for today.
        </p>
      )}

      {run && (
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {STAGE_ORDER.map((stageId) => {
            const stage = run.stages.find((s) => s.stage === stageId);
            const status = stage?.status ?? 'skipped';
            const color = STATUS_COLOR[status];
            return (
              <li
                key={stageId}
                data-testid={`pipeline-stage-${stageId}`}
                className="rounded-xl border border-white/[0.08] bg-[#0D1520]/50 p-3 min-h-[88px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                    {stageId.replace('_', ' ')}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase"
                    style={{ color }}
                  >
                    {status}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-white/50">
                  out {stage?.recordsOut ?? 0}
                  {stage?.durationMs != null ? ` · ${stage.durationMs}ms` : ''}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default PipelineChainView;
