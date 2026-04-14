'use client';

import { Plus } from 'lucide-react';
import { BodySilhouette } from '@/components/body-tracker/BodySilhouette';

const SAMPLE_MUSCLE = {
  right_arm_lbs: 6.2, left_arm_lbs: 5.9, trunk_lbs: 54.1,
  right_leg_lbs: 18.9, left_leg_lbs: 18.9,
  total_muscle_mass_lbs: 63.8, skeletal_muscle_mass_lbs: 28.3,
};

export default function MusclePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Muscle Analysis</h2>
          <p className="text-xs text-white/45">Segmental muscle mass breakdown</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/25">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Log Entry
        </button>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Muscle Mass', value: '63.8 lbs' },
          { label: 'Skeletal Muscle Mass', value: '28.3 lbs' },
          { label: 'Muscle Score', value: 'B+' },
          { label: 'Change This Period', value: '+0.9 lbs' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] text-white/50">{s.label}</p>
            <p className="text-sm font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">Segmental Muscle Analysis</h3>
        <BodySilhouette mode="muscle" segmentalData={SAMPLE_MUSCLE} />
      </div>
    </div>
  );
}
