// Prompt #122 P6: freshness chip for manual-evidence list rows.

import { CheckCircle2, AlertTriangle, XCircle, Clock, Archive, Signature } from 'lucide-react';
import type { FreshnessState } from '@/lib/soc2/manualEvidence/types';

export interface FreshnessChipProps {
  state: FreshnessState;
  daysUntilExpiry: number | null;
}

export default function FreshnessChip({ state, daysUntilExpiry }: FreshnessChipProps) {
  const cfg = CONFIG[state];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${cfg.classes}`}>
      <Icon className="w-3 h-3" strokeWidth={1.5} aria-hidden />
      <span>{cfg.label}</span>
      {daysUntilExpiry !== null && (state === 'expiring_soon' || state === 'expired') ? (
        <span className="opacity-70 tabular-nums">
          · {daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)}d past` : `${daysUntilExpiry}d`}
        </span>
      ) : null}
    </span>
  );
}

const CONFIG: Record<FreshnessState, { label: string; icon: typeof CheckCircle2; classes: string }> = {
  fresh:          { label: 'Fresh',          icon: CheckCircle2,  classes: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200' },
  expiring_soon:  { label: 'Expiring soon',  icon: AlertTriangle, classes: 'bg-amber-500/15 border-amber-400/40 text-amber-200' },
  expired:        { label: 'Expired',        icon: XCircle,       classes: 'bg-red-500/15 border-red-400/40 text-red-200' },
  stale:          { label: 'Stale',          icon: Clock,         classes: 'bg-amber-500/10 border-amber-400/25 text-amber-200' },
  needs_signoff:  { label: 'Needs signoff',  icon: Signature,     classes: 'bg-blue-500/15 border-blue-400/30 text-blue-200' },
  archived:       { label: 'Archived',       icon: Archive,       classes: 'bg-white/[0.05] border-white/[0.12] text-white/60' },
};
