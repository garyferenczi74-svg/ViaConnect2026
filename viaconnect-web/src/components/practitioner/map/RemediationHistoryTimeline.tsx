// Prompt #100 Phase 4: 90-day violation + remediation history.

import { Clock } from 'lucide-react';
import type { MAPViolationRow } from '@/lib/map/types';
import { SEVERITY_TONE } from '@/lib/map/severity';

const STATUS_LABEL: Record<MAPViolationRow['status'], string> = {
  active: 'Active',
  notified: 'Notified',
  acknowledged: 'Acknowledged',
  remediated: 'Remediated',
  escalated: 'Escalated',
  dismissed: 'Dismissed',
  investigating: 'Investigating',
};

export function RemediationHistoryTimeline({ rows }: { rows: MAPViolationRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5">
        <p className="text-xs text-white/60">No violation history in the past 90 days.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-sm font-semibold text-white">90-day history</h2>
      </div>
      <ul className="space-y-2">
        {rows.map((v) => (
          <li
            key={v.violationId}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 border ${SEVERITY_TONE[v.severity]}`}
              >
                {v.severity.toUpperCase()}
              </span>
              <span className="text-[11px] text-white/70">
                {new Date(v.createdAt).toLocaleDateString()}
              </span>
            </div>
            <span className="text-[11px] text-white/55">{STATUS_LABEL[v.status]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
