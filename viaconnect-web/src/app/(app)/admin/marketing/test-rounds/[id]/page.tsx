'use client';

// Prompt #138a Phase 5b: test round detail page.
// Fetches round metadata + variant labels + impression/conversion data,
// then renders ImpressionConversionChart + WinnerDeclarationPanel + the
// pause / resume / promote-winner controls.

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, FlaskConical, Pause, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ImpressionConversionChart, type VariantStats } from '@/components/marketing-admin/ImpressionConversionChart';
import { WinnerDeclarationPanel } from '@/components/marketing-admin/WinnerDeclarationPanel';
import type { MarketingCopyTestRoundRow, MarketingCopyVariantRow } from '@/lib/marketing/variants/types';
import type { VariantOutcome } from '@/lib/marketing/variants/winnerCheck';

const supabase = createClient();

const CONTROL_SLOT_ID = 'hero.variant.control';

interface PageState {
  round: MarketingCopyTestRoundRow;
  variants: MarketingCopyVariantRow[];
  stats: VariantStats[];
  outcomes: VariantOutcome[];
  variantLabels: Record<string, string>;
}

export default function TestRoundDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [state, setState] = useState<PageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: round } = await (supabase as any)
      .from('marketing_copy_test_rounds')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!round) {
      setError('Round not found');
      setLoading(false);
      return;
    }
    const r = round as MarketingCopyTestRoundRow;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: variants } = await (supabase as any)
      .from('marketing_copy_variants')
      .select('*')
      .in('slot_id', r.active_slot_ids);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: imps } = await (supabase as any)
      .from('marketing_copy_impressions')
      .select('slot_id, visitor_id')
      .in('slot_id', r.active_slot_ids)
      .gte('rendered_at', r.started_at);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: convs } = await (supabase as any)
      .from('marketing_copy_conversions')
      .select('preceding_slot_id, visitor_id, conversion_kind')
      .eq('conversion_kind', 'caq_start')
      .in('preceding_slot_id', r.active_slot_ids)
      .gte('occurred_at', r.started_at);

    const visitorsBySlot = new Map<string, Set<string>>();
    for (const row of (imps ?? []) as Array<{ slot_id: string; visitor_id: string }>) {
      if (!visitorsBySlot.has(row.slot_id)) visitorsBySlot.set(row.slot_id, new Set());
      visitorsBySlot.get(row.slot_id)!.add(row.visitor_id);
    }
    const caqByVisitorBySlot = new Map<string, Set<string>>();
    for (const row of (convs ?? []) as Array<{ preceding_slot_id: string | null; visitor_id: string }>) {
      if (!row.preceding_slot_id) continue;
      if (!caqByVisitorBySlot.has(row.preceding_slot_id)) caqByVisitorBySlot.set(row.preceding_slot_id, new Set());
      caqByVisitorBySlot.get(row.preceding_slot_id)!.add(row.visitor_id);
    }

    const variantList = ((variants ?? []) as MarketingCopyVariantRow[]).slice().sort((a, b) =>
      r.active_slot_ids.indexOf(a.slot_id) - r.active_slot_ids.indexOf(b.slot_id)
    );

    const stats: VariantStats[] = variantList.map((v) => ({
      slotId: v.slot_id,
      variantLabel: v.variant_label,
      isControl: v.slot_id === CONTROL_SLOT_ID,
      visitors: visitorsBySlot.get(v.slot_id)?.size ?? 0,
      caqStarts: caqByVisitorBySlot.get(v.slot_id)?.size ?? 0,
    }));
    const outcomes: VariantOutcome[] = stats.map((s) => ({
      slotId: s.slotId,
      visitors: s.visitors,
      caqStarts: s.caqStarts,
    }));
    const variantLabels = Object.fromEntries(variantList.map((v) => [v.slot_id, v.variant_label]));

    setState({ round: r, variants: variantList, stats, outcomes, variantLabels });
    setLoading(false);
  }, [id]);

  useEffect(() => { void reload(); }, [reload]);

  async function callRoundAction(path: 'pause' | 'resume') {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketing/test-rounds/${id}/${path}`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? `${path} failed`);
      setBusy(false);
      return;
    }
    setBusy(false);
    await reload();
  }

  if (loading || !state) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-6">
        <p className="text-sm text-white/40">{error ? error : 'Loading round...'}</p>
      </div>
    );
  }

  const { round, stats, outcomes, variantLabels } = state;
  const isRunning = !round.ended_at && !round.paused_at;
  const isPaused = !round.ended_at && !!round.paused_at;
  const isEnded = !!round.ended_at;

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link
          href="/admin/marketing/test-rounds"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Test rounds
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2 truncate">
              <FlaskConical className="h-5 w-5 text-[#2DA5A0] flex-none" strokeWidth={1.5} />
              {round.test_id}
            </h1>
            <p className="text-[11px] text-white/50 mt-0.5 font-mono truncate">{round.id}</p>
            <p className="text-xs text-white/60 mt-2">
              Started {new Date(round.started_at).toLocaleString()}
              {round.ended_at && (
                <> ; ended {new Date(round.ended_at).toLocaleString()} ({round.ended_reason ?? ''})</>
              )}
            </p>
          </div>
          {!isEnded && (
            <div className="flex flex-wrap gap-2">
              {isRunning && (
                <button
                  onClick={() => callRoundAction('pause')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50 min-h-[44px]"
                >
                  <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Pause round
                </button>
              )}
              {isPaused && (
                <button
                  onClick={() => callRoundAction('resume')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] px-3 py-2 text-xs font-semibold text-[#0B1520] hover:bg-[#3DBAB5] disabled:opacity-50 min-h-[44px]"
                >
                  <Play className="h-3.5 w-3.5" strokeWidth={2} />
                  Resume round
                </button>
              )}
            </div>
          )}
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <ImpressionConversionChart rows={stats} />

        {!isEnded && (
          <WinnerDeclarationPanel
            testRoundId={round.id}
            controlSlotId={CONTROL_SLOT_ID}
            variantOutcomes={outcomes}
            variantLabels={variantLabels}
            testStartedAt={new Date(round.started_at)}
            onChanged={() => void reload()}
          />
        )}

        {isEnded && round.winner_slot_id && (
          <div className="rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-4">
            <p className="text-sm text-[#3DBAB5] font-semibold">
              Winner promoted: {variantLabels[round.winner_slot_id] ?? round.winner_slot_id}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
