'use client';

// Prompt 179 Section 7.2 Trajectory Chart. Actual EWMA trend (Teal), projected
// trajectory (Orange dashed), goal line (Navy family, lightened for contrast on
// the dark card). Recharts, mirroring the existing WeightChart token usage.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { TrajectoryView } from './useActiveGoal';

interface Row {
  date: string;
  label: string;
  actual?: number;
  projected?: number;
}

export function TrajectoryChart({
  actual,
  startWeightLb,
  startDate,
  goalWeightLb,
  projectedDate,
}: Omit<TrajectoryView, 'latestSmoothedLb'>) {
  if (actual.length === 0 && !projectedDate) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white/40">Log your weight to see your trajectory</p>
      </div>
    );
  }

  const byDate = new Map<string, Row>();
  for (const a of actual) {
    byDate.set(a.date, { date: a.date, label: a.date.slice(5), actual: a.smoothedLb });
  }
  const projectedPoints: Array<{ date: string; value: number }> = [{ date: startDate, value: startWeightLb }];
  if (projectedDate) projectedPoints.push({ date: projectedDate, value: goalWeightLb });
  for (const p of projectedPoints) {
    const existing = byDate.get(p.date);
    if (existing) existing.projected = p.value;
    else byDate.set(p.date, { date: p.date, label: p.date.slice(5), projected: p.value });
  }
  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
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
  );
}
