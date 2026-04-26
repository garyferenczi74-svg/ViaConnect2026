'use client';

// Prompt #138a Phase 5b: winner-declaration panel.
// Wraps evaluateWinner from the Phase 2 lib (winnerCheck.ts) and surfaces
// the five spec section 6.4 criteria per variant.
// Promote-winner action is gated to compliance_admin / superadmin per
// spec section 6.4 condition 5; the route enforces server-side, the UI
// just exposes the action.

import { useState } from 'react';
import { CheckCircle2, Circle, Trophy } from 'lucide-react';
import { evaluateWinner, type VariantOutcome } from '@/lib/marketing/variants/winnerCheck';
import { WINNER_THRESHOLDS } from '@/lib/marketing/variants/types';

export interface WinnerDeclarationPanelProps {
  testRoundId: string;
  controlSlotId: string;
  variantOutcomes: VariantOutcome[];
  variantLabels: Record<string, string>;
  testStartedAt: Date;
  onChanged: () => void;
}

export function WinnerDeclarationPanel({
  testRoundId, controlSlotId, variantOutcomes, variantLabels, testStartedAt, onChanged,
}: WinnerDeclarationPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = evaluateWinner({
    controlSlotId,
    variantOutcomes,
    testStartedAt,
  });

  async function promoteWinner(slotId: string | null, reason: 'winner_promoted' | 'no_winner_archived' | 'manual_terminated') {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketing/test-rounds/${testRoundId}/promote-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winner_slot_id: slotId,
        ended_reason: reason,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? 'Promotion failed');
      setBusy(false);
      return;
    }
    setBusy(false);
    onChanged();
  }

  return (
    <section className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Winner declaration</h3>
        <span
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
            result.meetsRuntime ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-white/40'
          }`}
        >
          {result.runtimeDays}d / {WINNER_THRESHOLDS.min_runtime_days}d runtime
        </span>
      </header>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-white/40 text-left">
            <th className="font-normal pb-1 pr-2">Variant</th>
            <th className="font-normal pb-1 pr-2">Visitors</th>
            <th className="font-normal pb-1 pr-2">Lift</th>
            <th className="font-normal pb-1 pr-2">p</th>
            <th className="font-normal pb-1">Gates</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-white/[0.05]">
            <td className="py-2 pr-2 text-white/60">
              {variantLabels[controlSlotId] ?? controlSlotId} <span className="text-[10px] uppercase ml-1 text-white/30">control</span>
            </td>
            <td className="py-2 pr-2 font-mono">{result.control.visitors.toLocaleString()}</td>
            <td className="py-2 pr-2 text-white/40">n/a</td>
            <td className="py-2 pr-2 text-white/40">n/a</td>
            <td className="py-2">
              <Gate ok={result.control.meetsSampleSize} label="N" />
            </td>
          </tr>
          {result.variants.map((v) => (
            <tr key={v.slotId} className="border-t border-white/[0.05]">
              <td className="py-2 pr-2 text-white/80">{variantLabels[v.slotId] ?? v.slotId}</td>
              <td className="py-2 pr-2 font-mono">{v.visitors.toLocaleString()}</td>
              <td className={`py-2 pr-2 font-mono ${v.liftAbsolutePoints > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {v.liftAbsolutePoints > 0 ? '+' : ''}{v.liftAbsolutePoints.toFixed(2)}pp
              </td>
              <td className="py-2 pr-2 font-mono text-white/60">{v.pValue.toFixed(3)}</td>
              <td className="py-2">
                <div className="flex gap-1 flex-wrap">
                  <Gate ok={v.meetsSampleSize} label="N" />
                  <Gate ok={v.meetsConfidence} label="p" />
                  <Gate ok={v.meetsLift} label="Δ" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {result.notes.length > 0 && (
        <div className="text-[11px] text-white/50 space-y-1">
          {result.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {result.eligibleWinnerSlotId ? (
          <button
            onClick={() => promoteWinner(result.eligibleWinnerSlotId, 'winner_promoted')}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-semibold text-[#0B1520] hover:bg-[#3DBAB5] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Trophy className="h-4 w-4" strokeWidth={2} />
            Promote winner: {variantLabels[result.eligibleWinnerSlotId] ?? result.eligibleWinnerSlotId}
          </button>
        ) : (
          <p className="text-xs text-white/50 italic">
            No variant meets all five criteria yet. Steve approval still required after eligibility.
          </p>
        )}
        <button
          onClick={() => {
            if (!confirm('End this test round without a winner? Variants stay archived for evidence.')) return;
            void promoteWinner(null, 'no_winner_archived');
          }}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.08] disabled:opacity-50 min-h-[44px]"
        >
          End without winner
        </button>
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}
    </section>
  );
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
        ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-white/40'
      }`}
    >
      {ok ? <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={1.5} /> : <Circle className="h-2.5 w-2.5" strokeWidth={1.5} />}
      {label}
    </span>
  );
}
