// Prompt #99 Phase 1 (Path A): KPI tile used by every analytics page.

import type { LucideIcon } from 'lucide-react';

export interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  /** Render delta with color coding. Positive is green, negative red,
   *  null/undefined is muted. Copy passed in already signed. */
  delta?: string | null;
  deltaDirection?: 'up' | 'down' | 'flat';
}

const DELTA_STYLES: Record<NonNullable<KPICardProps['deltaDirection']>, string> = {
  up: 'text-emerald-300',
  down: 'text-red-300',
  flat: 'text-white/55',
};

export function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  deltaDirection = 'flat',
}: KPICardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} aria-hidden="true" />
        {delta && (
          <span className={`text-[10px] font-semibold ${DELTA_STYLES[deltaDirection]}`}>
            {delta}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/65 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-white/45 mt-1">{sub}</p>}
    </div>
  );
}
