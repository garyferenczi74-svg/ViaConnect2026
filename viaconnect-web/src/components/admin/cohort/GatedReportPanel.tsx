'use client';

// Prompt 211b Workstream 1B -- claim-gated validation report panel.
//
// Renders the honest gated state from cohortClaimGate.evaluateClaimGate().
// HARD RULE: no accuracy number renders unless gate.status === 'open'
// (held_out_pass && gary_signed_off both true on the persisted run). Every
// other state renders closedGateCopy() with NO digit-percent figure.
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency.

import { Hourglass, ShieldCheck } from 'lucide-react';
import type { ClaimClosedReason, GatedAccuracyState } from '@/lib/arnold/scanning/cohort/cohortClaimGate';
import { closedGateCopy } from '@/lib/arnold/scanning/cohort/cohortClaimGate';

export interface GatedReportPanelProps {
  /** null while the gate state is still loading. */
  gate: GatedAccuracyState | null;
}

export default function GatedReportPanel({ gate }: GatedReportPanelProps) {
  if (gate === null) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-6 text-sm text-white/60">
        Loading validation status...
      </div>
    );
  }

  if (gate.status === 'closed') {
    return <ClosedGate reason={gate.reason} />;
  }

  return <OpenGate gate={gate} />;
}

// ---------------------------------------------------------------------------
// Closed state: honest gated copy, no number, ever.
// ---------------------------------------------------------------------------

function ClosedGate({ reason }: { reason: ClaimClosedReason }) {
  return (
    <div
      role="status"
      aria-label="Accuracy claim: not yet proven"
      className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 md:p-6"
    >
      <div className="flex items-center gap-2 text-amber-200">
        <Hourglass className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="text-sm font-semibold uppercase tracking-wide">Not yet proven</span>
      </div>
      <p className="mt-2 text-sm text-amber-100/90">{closedGateCopy(reason)}</p>
      <p className="mt-3 text-xs text-white/40">
        No accuracy figure will render until the held-out cohort passes and Gary signs off.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Open state: gate cleared, safe to render the real per-region report.
// ---------------------------------------------------------------------------

function OpenGate({ gate }: { gate: Extract<GatedAccuracyState, { status: 'open' }> }) {
  const regionEntries = Object.entries(gate.report.heldOutPerRegion) as Array<
    [string, { mape: number; withinTolerancePct: number; icc: number; n: number }]
  >;

  return (
    <div
      role="status"
      aria-label="Accuracy claim: proven and signed off"
      className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 md:p-6 space-y-4"
    >
      <div className="flex items-center gap-2 text-emerald-200">
        <ShieldCheck className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="text-sm font-semibold uppercase tracking-wide">Proven, signed off</span>
      </div>
      <p className="text-xs text-white/50">
        Run {gate.runId} at {gate.runAt}, calibration {gate.calibrationVersion}.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {regionEntries.map(([region, m]) => (
          <div key={region} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/45">{region}</p>
            <p className="text-lg font-semibold text-white tabular-nums">{m.mape.toFixed(1)}%</p>
            <p className="text-[10px] text-white/40">held-out MAPE, n={m.n}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
