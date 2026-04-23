'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { BodyGraphic, muscleRegions } from '@/components/body-tracker/body-graphic';
import type { Gender, BodyView, RegionOverlayData, RegionId } from '@/components/body-tracker/body-graphic';
import { MuscleAnalysisForm } from '@/components/body-tracker/manual-input/forms/MuscleAnalysisForm';
import { EntryHistoryTimeline, ScanPhotoGallery } from '@/components/body-tracker/manual-input';

const SAMPLE_MUSCLE = {
  right_arm_lbs: 6.2, left_arm_lbs: 5.9, trunk_lbs: 54.1,
  right_leg_lbs: 18.9, left_leg_lbs: 18.9,
  total_muscle_mass_lbs: 63.8, skeletal_muscle_mass_lbs: 28.3,
};

function muscleLbsToOverlay(lbs: number, maxLbs: number): RegionOverlayData {
  const ratio = lbs / maxLbs;
  const status: RegionOverlayData['status'] =
    ratio >= 0.8 ? 'healthy' : ratio >= 0.5 ? 'caution' : 'alert';
  return {
    rawValue: lbs,
    value: 1 - Math.min(ratio, 1),
    unit: 'lbs',
    status,
    trend: 'stable',
  };
}

function buildMuscleOverlay(data: typeof SAMPLE_MUSCLE): Record<RegionId, RegionOverlayData> {
  const out: Record<RegionId, RegionOverlayData> = {};
  const ARM_MAX = 10;
  const LEG_MAX = 22;
  const TRUNK_MAX = 60;
  const rightArm = muscleLbsToOverlay(data.right_arm_lbs, ARM_MAX);
  const leftArm  = muscleLbsToOverlay(data.left_arm_lbs, ARM_MAX);
  const rightLeg = muscleLbsToOverlay(data.right_leg_lbs, LEG_MAX);
  const leftLeg  = muscleLbsToOverlay(data.left_leg_lbs, LEG_MAX);
  const trunk    = muscleLbsToOverlay(data.trunk_lbs, TRUNK_MAX);

  for (const r of muscleRegions) {
    const isLeft  = r.id.endsWith('-left');
    const isRight = r.id.endsWith('-right');
    if (r.anatomicalGroup === 'upper-limb') {
      out[r.id] = isLeft ? leftArm : rightArm;
    } else if (r.anatomicalGroup === 'lower-limb') {
      out[r.id] = isLeft ? leftLeg : rightLeg;
    } else {
      out[r.id] = trunk;
    }
  }
  return out;
}

export default function MusclePage() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [gender, setGender] = useState<Gender>('male');
  const [view, setView] = useState<BodyView>('front');

  const overlayData = useMemo(() => buildMuscleOverlay(SAMPLE_MUSCLE), []);

  return (
    <div className="space-y-6" key={refreshKey}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Muscle Analysis</h2>
          <p className="text-xs text-white/45">Anatomical muscle map, tap any muscle for detail</p>
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
          { label: 'Total Muscle Mass', value: `${SAMPLE_MUSCLE.total_muscle_mass_lbs} lbs` },
          { label: 'Skeletal Muscle Mass', value: `${SAMPLE_MUSCLE.skeletal_muscle_mass_lbs} lbs` },
          { label: 'Muscle Score', value: 'B+' },
          { label: 'Change This Period', value: '+0.9 lbs' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] text-white/50">{s.label}</p>
            <p className="text-sm font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <BodyGraphic
        mode="muscle"
        gender={gender}
        onGenderChange={setGender}
        view={view}
        onViewChange={setView}
        overlayData={overlayData}
      />

      <EntryHistoryTimeline category="muscle" onChanged={() => setRefreshKey((k) => k + 1)} />
      <ScanPhotoGallery category="muscle" />
    </div>
  );
}
