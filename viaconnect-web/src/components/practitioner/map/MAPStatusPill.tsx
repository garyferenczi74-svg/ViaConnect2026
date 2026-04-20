// Prompt #100 Phase 6: MAP pricing status pill.
// Shared shape per §4.6 Revenue Intelligence integration.

import Link from 'next/link';
import type { MAPPillState } from '@/lib/map/types';

export type { MAPPillState };

const TONE: Record<MAPPillState, string> = {
  compliant: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  monitored: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  warning: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  violation: 'bg-red-500/15 text-red-300 border-red-500/30',
  critical: 'bg-red-600/25 text-red-200 border-red-600/40 animate-pulse',
  exempt: 'bg-white/[0.06] text-white/55 border-white/10',
};

const LABEL: Record<MAPPillState, string> = {
  compliant: 'Compliant',
  monitored: 'Monitored',
  warning: 'Warning',
  violation: 'Violation',
  critical: 'Critical',
  exempt: 'Exempt',
};

export function MAPStatusPill({
  state,
  violationId,
  exemptLabel,
  linkToRemediation = true,
}: {
  state: MAPPillState;
  violationId?: string | null;
  exemptLabel?: 'L3' | 'L4';
  linkToRemediation?: boolean;
}) {
  const label = state === 'exempt' && exemptLabel ? exemptLabel : LABEL[state];
  const classes = `inline-flex items-center text-[10px] font-semibold rounded-md px-1.5 py-0.5 border ${TONE[state]}`;

  const body = <span className={classes}>{label}</span>;
  if (linkToRemediation && violationId && state !== 'compliant' && state !== 'exempt') {
    return (
      <Link
        href={`/practitioner/map/violations?violation_id=${violationId}`}
        className="hover:opacity-80"
      >
        {body}
      </Link>
    );
  }
  return body;
}
