'use client';

// Prompt 179 Section 7.2 Trajectory Chart. Prompt 201 (2026-06-15) DD-4: promoted
// to a hero bento card with a legend (Actual, Projected, Goal), a range toggle, a
// shaded on-track band, and a pinned projected-completion chip. Section 8 axis
// fix: the old label was a.date.slice(5) (MM-DD, no year), so a date across a year
// boundary or the projected endpoint read out of order. The series sort is already
// chronological (localeCompare on YYYY-MM-DD); only the LABEL is corrected via the
// year-aware axisTickLabel, and the projected endpoint carries its year.

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { TrajectoryView } from './useActiveGoal';
import { ProgressCard } from './ProgressCard';
import { axisTickLabel } from './progressMath';

interface Row {
  date: string;
  label: string;
  actual?: number;
  projected?: number;
}

type Range = '30d' | '90d' | 'all' | 'togoal';
const RANGES: ReadonlyArray<{ id: Range; label: string }> = [
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'all', label: 'All' },
  { id: 'togoal', label: 'To goal' },
];

function LegendDot({ color, dashed, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60">
      <span
        aria-hidden="true"
        className="inline-block h-0.5 w-4 rounded"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`
            : color,
        }}
      />
      {label}
    </span>
  );
}

export function TrajectoryChart({
  actual,
  startWeightLb,
  startDate,
  goalWeightLb,
  projectedDate,
}: Omit<TrajectoryView, 'latestSmoothedLb'>) {
  const [range, setRange] = useState<Range>('all');

  const rows = useMemo<Row[]>(() => {
    // Range filter on the actual series; projected points always included so the
    // trajectory line stays continuous. Fail-open to all when a window is empty.
    let actualRows = actual;
    if (range === '30d' || range === '90d') {
      const days = range === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 86_400_000;
      const filtered = actual.filter((a) => new Date(`${a.date}T00:00:00Z`).getTime() >= cutoff);
      actualRows = filtered.length > 0 ? filtered : actual;
    }
    const byDate = new Map<string, Row>();
    for (const a of actualRows) {
      byDate.set(a.date, { date: a.date, label: axisTickLabel(a.date, false), actual: a.smoothedLb });
    }
    const projectedPoints: Array<{ date: string; value: number }> = [
      { date: startDate, value: startWeightLb },
    ];
    if (projectedDate) projectedPoints.push({ date: projectedDate, value: goalWeightLb });
    for (const p of projectedPoints) {
      const isEndpoint = !!projectedDate && p.date === projectedDate;
      const existing = byDate.get(p.date);
      if (existing) existing.projected = p.value;
      else byDate.set(p.date, { date: p.date, label: axisTickLabel(p.date, isEndpoint), projected: p.value });
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [actual, startWeightLb, startDate, goalWeightLb, projectedDate, range]);

  const empty = actual.length === 0 && !projectedDate;

  return (
    <ProgressCard icon={TrendingUp} accent="teal" attributionSlug="arnold">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Trajectory</h2>
        {projectedDate ? (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm">
            Goal by {axisTickLabel(projectedDate, true)}
          </span>
        ) : null}
      </div>

      {empty ? (
        <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
          <p className="text-sm text-white/40">Log your weight to see your trajectory</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LegendDot color="#2DA5A0" label="Actual" />
              <LegendDot color="#B75E18" dashed label="Projected" />
              <LegendDot color="#8b9cc4" dashed label="Goal" />
            </div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/[0.06] p-0.5 backdrop-blur-md">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    range === r.id ? 'bg-white/15 text-white' : 'text-white/55'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                {/* On-track band: a shaded tolerance zone around the goal weight. */}
                <ReferenceArea
                  y1={goalWeightLb - 1.5}
                  y2={goalWeightLb + 1.5}
                  fill="#2DA5A0"
                  fillOpacity={0.08}
                  stroke="none"
                />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <ReferenceLine
                  y={goalWeightLb}
                  stroke="#8b9cc4"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: `Goal ${goalWeightLb} lb`, position: 'right', fill: '#9fb0d0', fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#B75E18"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#2DA5A0"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  activeDot={{ r: 5, fill: '#2DA5A0', stroke: '#1E3054', strokeWidth: 2 }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E3054',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  itemStyle={{ color: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ProgressCard>
  );
}
