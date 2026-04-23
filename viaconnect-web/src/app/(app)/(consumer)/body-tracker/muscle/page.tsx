'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MaleBack } from '@/components/body-tracker/body-graphic/assets/MaleBack';
import { MuscleAnalysisForm } from '@/components/body-tracker/manual-input/forms/MuscleAnalysisForm';
import { EntryHistoryTimeline, ScanPhotoGallery } from '@/components/body-tracker/manual-input';

export default function MusclePage() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6" key={refreshKey}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Muscle Analysis</h2>
          <p className="text-xs text-white/45">Segmental muscle mass breakdown</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/25 min-h-[44px]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Log Entry
        </button>
      </div>
      <MuscleAnalysisForm open={open} onOpenChange={setOpen} onSaved={() => setRefreshKey((k) => k + 1)} />

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

      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-6 backdrop-blur-sm flex justify-center">
        <div className="w-full max-w-[360px] text-[#2DA5A0]">
          <MaleBack showAnatomicalDetail={true} showMuscleRegions={true} />
        </div>
      </div>

      <EntryHistoryTimeline category="muscle" onChanged={() => setRefreshKey((k) => k + 1)} />
      <ScanPhotoGallery category="muscle" />
    </div>
  );
}
