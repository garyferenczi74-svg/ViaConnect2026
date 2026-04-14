'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area,
} from 'recharts';

interface WeightDataPoint { date: string; value: number; label: string; }

interface WeightChartProps {
  data: WeightDataPoint[];
  goalWeight: number | null;
  unit: string;
}

function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1E3054]/90 px-3 py-2 shadow-lg backdrop-blur-md">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-sm font-semibold text-white">{payload[0].value} {unit}</p>
    </div>
  );
}

export function WeightChart({ data, goalWeight, unit }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white/40">Log your weight to see trends</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2DA5A0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2DA5A0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
          {goalWeight && (
            <ReferenceLine
              y={goalWeight}
              stroke="#B75E18"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{ value: `Goal: ${goalWeight} ${unit}`, position: 'right', fill: '#B75E18', fontSize: 11 }}
            />
          )}
          <Area type="monotone" dataKey="value" stroke="none" fill="url(#weightGradient)" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2DA5A0"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: '#2DA5A0', stroke: '#1E3054', strokeWidth: 2 }}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
