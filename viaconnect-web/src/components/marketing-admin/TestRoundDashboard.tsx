'use client';

// Prompt #138a Phase 5b: test round list view.
// One card per round; status (running, paused, ended), variant count,
// runtime days. Links to detail page.

import Link from 'next/link';
import { Pause, Play, FlaskConical, CheckCircle2, XCircle } from 'lucide-react';
import type { MarketingCopyTestRoundRow } from '@/lib/marketing/variants/types';

export interface TestRoundDashboardProps {
  rounds: MarketingCopyTestRoundRow[];
}

export function TestRoundDashboard({ rounds }: TestRoundDashboardProps) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
        <p className="text-sm text-white/60">No test rounds yet.</p>
        <p className="text-xs text-white/40 mt-1">
          Activate at least two variants in /admin/marketing/hero-variants, then start a round.
        </p>
      </div>
    );
  }

  const sorted = [...rounds].sort((a, b) => {
    const av = a.ended_at ?? '';
    const bv = b.ended_at ?? '';
    if (av && !bv) return 1;
    if (!av && bv) return -1;
    return b.started_at.localeCompare(a.started_at);
  });

  return (
    <ul className="space-y-2">
      {sorted.map((r) => (
        <li key={r.id}>
          <Link
            href={`/admin/marketing/test-rounds/${r.id}`}
            className="block rounded-2xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] transition-colors p-4 min-h-[44px]"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <FlaskConical className="h-4 w-4 text-[#2DA5A0] flex-none" strokeWidth={1.5} />
                  <span className="text-sm font-semibold truncate">{r.test_id}</span>
                  <RoundStatusBadge round={r} />
                </div>
                <p className="text-[11px] text-white/50 mt-1 font-mono truncate">{r.id}</p>
                <p className="text-[11px] text-white/60 mt-1">
                  {r.active_slot_ids.length} variant{r.active_slot_ids.length === 1 ? '' : 's'}; {runtimeDays(r)}d
                  {r.winner_slot_id && (
                    <> ; winner <span className="font-mono text-[#2DA5A0]">{r.winner_slot_id}</span></>
                  )}
                </p>
              </div>
              <div className="text-[10px] text-white/40 flex-none sm:text-right">
                {new Date(r.started_at).toLocaleDateString()}
                {r.ended_at && (
                  <>
                    {' '}to{' '}
                    {new Date(r.ended_at).toLocaleDateString()}
                  </>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function runtimeDays(r: MarketingCopyTestRoundRow): number {
  const start = new Date(r.started_at).getTime();
  const end = r.ended_at ? new Date(r.ended_at).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
}

function RoundStatusBadge({ round }: { round: MarketingCopyTestRoundRow }) {
  if (round.ended_at) {
    if (round.ended_reason === 'winner_promoted') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/20 text-[#2DA5A0] text-[10px] px-2 py-0.5 font-medium">
          <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={1.5} />
          Winner promoted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white/60 text-[10px] px-2 py-0.5 font-medium">
        <XCircle className="h-2.5 w-2.5" strokeWidth={1.5} />
        Ended
      </span>
    );
  }
  if (round.paused_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-200 text-[10px] px-2 py-0.5 font-medium">
        <Pause className="h-2.5 w-2.5" strokeWidth={1.5} />
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] px-2 py-0.5 font-medium">
      <Play className="h-2.5 w-2.5" strokeWidth={1.5} />
      Running
    </span>
  );
}
