'use client';

import { Plus } from 'lucide-react';
import { BodySilhouette } from '@/components/body-tracker/BodySilhouette';

const SAMPLE_FAT = {
  right_arm_pct: 18.2, left_arm_pct: 17.9, trunk_pct: 26.6,
  right_leg_pct: 19.4, left_leg_pct: 19.7, total_body_fat_pct: 21.3,
};

export default function CompositionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Body Composition</h2>
          <p className="text-xs text-white/45">Segmental body fat analysis</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/25">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Log Entry
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {[{ label: 'Total Body Fat', value: '21.3%' }, { label: 'Visceral Fat', value: '8' }, { label: 'BMI', value: '24.2' }, { label: 'Body Water', value: '55.1%' }].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] text-white/50">{s.label}</p>
            <p className="text-sm font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">Segmental Body Fat Analysis</h3>
        <BodySilhouette mode="fat" segmentalData={SAMPLE_FAT} />
      </div>
    </div>
  );
}
