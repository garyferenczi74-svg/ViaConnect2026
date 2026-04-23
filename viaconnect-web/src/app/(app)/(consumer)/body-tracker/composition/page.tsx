'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { BodyGraphic } from '@/components/body-tracker/body-graphic';
import type { Gender, BodyView, RegionOverlayData, RegionId } from '@/components/body-tracker/body-graphic';
import { SegmentalFatForm } from '@/components/body-tracker/manual-input/forms/SegmentalFatForm';
import { EntryHistoryTimeline, ScanPhotoGallery } from '@/components/body-tracker/manual-input';

const SAMPLE_FAT = {
  right_arm_pct: 18.2, left_arm_pct: 17.9, trunk_pct: 26.6,
  right_leg_pct: 19.4, left_leg_pct: 19.7, total_body_fat_pct: 21.3,
};

function fatPctToOverlay(pct: number): RegionOverlayData {
  const status: RegionOverlayData['status'] =
    pct < 15 ? 'healthy' : pct < 25 ? 'caution' : 'alert';
  return {
    rawValue: pct,
    value: Math.min(pct / 40, 1),
    unit: '%',
    status,
    trend: 'stable',
  };
}

function buildCompositionOverlay(data: typeof SAMPLE_FAT): Record<RegionId, RegionOverlayData> {
  return {
    'comp-right-arm': fatPctToOverlay(data.right_arm_pct),
    'comp-left-arm':  fatPctToOverlay(data.left_arm_pct),
    'comp-chest':     fatPctToOverlay(data.trunk_pct),
    'comp-abdomen':   fatPctToOverlay(data.trunk_pct),
    'comp-upper-back':fatPctToOverlay(data.trunk_pct),
    'comp-lower-back':fatPctToOverlay(data.trunk_pct),
    'comp-right-leg': fatPctToOverlay(data.right_leg_pct),
    'comp-left-leg':  fatPctToOverlay(data.left_leg_pct),
  };
}

export default function CompositionPage() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [gender, setGender] = useState<Gender>('male');
  const [view, setView] = useState<BodyView>('front');

  const overlayData = useMemo(() => buildCompositionOverlay(SAMPLE_FAT), []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Body Composition</h2>
            <p className="text-xs text-white/60">Anatomical body fat map, tap any zone for detail</p>
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
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total Body Fat', value: `${SAMPLE_FAT.total_body_fat_pct}%` },
            { label: 'Visceral Fat', value: '8' },
            { label: 'BMI', value: '24.2' },
            { label: 'Body Water', value: '55.1%' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-white/[0.12] bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] text-white/70">{s.label}</p>
              <p className="text-sm font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div key={refreshKey}>
        <BodyGraphic
          mode="composition"
          gender={gender}
          onGenderChange={setGender}
          view={view}
          onViewChange={setView}
          overlayData={overlayData}
        />
      </div>

      <SegmentalFatForm open={open} onOpenChange={setOpen} onSaved={() => setRefreshKey((k) => k + 1)} />

      <EntryHistoryTimeline category="composition" onChanged={() => setRefreshKey((k) => k + 1)} />
      <ScanPhotoGallery category="composition" />
    </div>
  );
}
