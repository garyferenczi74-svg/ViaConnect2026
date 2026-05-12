'use client';

// Prompt #162 section 3.1 + 3.2: one chart row. Self-contained.
// Reach-target metrics (calories, carbs, good fat): Teal under 100%, Orange
// 100-115%, Red over 115%.
// Stay-under metrics (bad fat, sugar): Teal under 70% of limit, Orange 70-100%,
// Red over 100%.

import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCountUp } from '@/lib/ui/useCountUp';

interface MetricProgressRowProps {
  readonly label: string;
  readonly Icon: LucideIcon;
  readonly actual: number;
  readonly target: number;
  readonly unit: string;
  readonly direction: 'reach' | 'stay-under';
}

interface VisualState {
  readonly fillPct: number;
  readonly color: string;
  readonly status: string;
}

const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';
const RED = '#C9381F';
const VISUAL_CAP = 115;

function reachState(pct: number): VisualState {
  let color = TEAL;
  let status = 'On target';
  if (pct >= 90 && pct <= 110) status = 'On target';
  else if (pct < 90) status = 'Below target';
  else status = 'Over';
  if (pct > 100 && pct <= 115) color = ORANGE;
  else if (pct > 115) color = RED;
  return { fillPct: Math.min(pct, VISUAL_CAP), color, status };
}

function stayUnderState(pct: number): VisualState {
  let color = TEAL;
  let status = 'Good';
  if (pct >= 70 && pct <= 100) {
    color = ORANGE;
    status = 'Near limit';
  } else if (pct > 100) {
    color = RED;
    status = 'Over limit';
  }
  return { fillPct: Math.min(pct, VISUAL_CAP), color, status };
}

export function MetricProgressRow({
  label,
  Icon,
  actual,
  target,
  unit,
  direction,
}: MetricProgressRowProps) {
  const animatedActual = useCountUp(actual);
  const pct = target > 0 ? (actual / target) * 100 : 0;
  const state = direction === 'reach' ? reachState(pct) : stayUnderState(pct);
  const widthPct = `${state.fillPct}%`;
  const hasTarget = target > 0;
  const targetDisplay = hasTarget ? target.toLocaleString() : '';
  const actualDisplay = unit === 'kcal'
    ? Math.round(animatedActual).toLocaleString()
    : (Math.round(animatedActual * 10) / 10).toLocaleString();

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-5 w-5 text-white/70" strokeWidth={1.5} />
          <span className="text-base font-semibold text-white">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5 tabular-nums">
          <span
            className="text-lg font-semibold text-white"
            style={pct > VISUAL_CAP ? { color: RED } : undefined}
          >
            {actualDisplay}
          </span>
          {hasTarget && <span className="text-sm text-white/40">/ {targetDisplay}</span>}
          <span className="text-xs text-white/40">{unit}</span>
        </div>
      </div>

      <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: state.color }}
          initial={{ width: 0 }}
          animate={{ width: widthPct }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
        {direction === 'stay-under' && target > 0 && (
          <span
            className="absolute top-0 h-full w-px bg-white/40"
            style={{ left: '100%', transform: 'translateX(-1px)' }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-white/45">
        <span style={pct > VISUAL_CAP ? { color: RED } : undefined}>{state.status}</span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}
