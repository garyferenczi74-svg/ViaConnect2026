'use client';

import { Heart, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { CapacityStrainBars } from '@/components/body-tracker/CapacityStrainBars';

const READINESS_COLORS: Record<string, string> = {
  optimal: '#2DA5A0', moderate: '#5B8DEF', suboptimal: '#9B59B6', low: '#E91E8C',
};
const READINESS_VALUES: Record<string, number> = {
  optimal: 4, moderate: 3, suboptimal: 2, low: 1,
};

const circadianData = [
  { period: 'Morning', value: READINESS_VALUES.optimal, readiness: 'optimal' },
  { period: 'Afternoon', value: READINESS_VALUES.moderate, readiness: 'moderate' },
  { period: 'Evening', value: READINESS_VALUES.moderate, readiness: 'moderate' },
  { period: 'Night', value: READINESS_VALUES.suboptimal, readiness: 'suboptimal' },
];

const momentumData = [
  { day: 'S', value: 5 }, { day: 'M', value: 8 }, { day: 'T', value: 6 },
  { day: 'W', value: 12 }, { day: 'T', value: 10 }, { day: 'F', value: 15 }, { day: 'S', value: 12 },
];

export default function MetabolicPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Metabolic & Cardiovascular</h2>

      {/* Readiness window cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/[0.08] bg-white/5 p-3 backdrop-blur-md">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2DA5A0]" />
            <span className="text-xs text-white/50">Optimal</span>
          </div>
          <p className="text-sm font-semibold text-[#2DA5A0]">6AM to 12PM</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/5 p-3 backdrop-blur-md">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#5B8DEF]" />
            <span className="text-xs text-white/50">Moderate</span>
          </div>
          <p className="text-sm font-semibold text-[#5B8DEF]">12PM to 10PM</p>
        </div>
      </div>

      {/* Circadian Readiness Chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Circadian Readiness</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={circadianData} barCategoryGap="25%">
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="period" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} width={65}
                tickFormatter={(v: number) => ['', 'Low', 'Sub-opt', 'Moderate', 'Optimal'][v] ?? ''} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                {circadianData.map((entry, i) => (
                  <Cell key={i} fill={READINESS_COLORS[entry.readiness]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* HR & HRV */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md">
          <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
            <Heart className="h-3.5 w-3.5 text-red-400" strokeWidth={1.5} />
            Resting HR
          </div>
          <p className="text-2xl font-bold text-white">58 <span className="text-xs text-white/40">bpm</span></p>
          <p className="mt-1 text-[10px] text-white/40">Optimal: 50 to 60 bpm</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md">
          <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
            <Heart className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
            HRV
          </div>
          <p className="text-2xl font-bold text-white">52 <span className="text-xs text-white/40">ms</span></p>
          <p className="mt-1 text-[10px] text-white/40">Optimal: 40 to 60 ms</p>
        </div>
      </div>

      {/* Metabolic Momentum */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Metabolic Momentum</h3>
          <div className="flex items-center gap-1 text-sm font-bold text-[#22C55E]">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            +12
          </div>
        </div>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={momentumData}>
              <Line type="monotone" dataKey="value" stroke="#2DA5A0" strokeWidth={2} dot={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity & Strain */}
      <CapacityStrainBars capacity={65} strain={42} capacityBaseline={55} strainBaseline={50} />
    </div>
  );
}
