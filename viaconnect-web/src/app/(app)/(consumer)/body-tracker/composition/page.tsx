'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { BodySilhouette } from '@/components/body-tracker/BodySilhouette';
import {
  CompositionSectionToggle,
  type CompositionSection,
} from '@/components/body-tracker/CompositionSectionToggle';
import { UnitToggle } from '@/components/body-tracker/UnitToggle';
import { MeasurementsGrid } from '@/components/body-tracker/MeasurementsGrid';
import { BodyCompositionForm } from '@/components/body-tracker/BodyCompositionForm';
import {
  InlineEntryPanel,
  EntryHistoryTimeline,
  ScanPhotoGallery,
  useCurrentUser,
} from '@/components/body-tracker/manual-input';
import { useCircumferenceData } from '@/hooks/body-tracker/useCircumferenceData';
import type { MeasurementUnit } from '@/lib/body-tracker/circumference';

const SAMPLE_FAT = {
  right_arm_pct: 18.2, left_arm_pct: 17.9, trunk_pct: 26.6,
  right_leg_pct: 19.4, left_leg_pct: 19.7, total_body_fat_pct: 21.3,
};
const SAMPLE_FEMALE_MEASUREMENTS = { waist_in: 27.5, hips_in: 36.0 };
const SAMPLE_MUSCLE = {
  right_arm_lbs: 6.2, left_arm_lbs: 5.9, trunk_lbs: 54.1,
  right_leg_lbs: 18.9, left_leg_lbs: 18.9,
  total_muscle_mass_lbs: 63.8, skeletal_muscle_mass_lbs: 28.3,
};

const UNIT_STORAGE_KEY = 'vc.body-tracker.measurement-unit';

function readStoredUnit(): MeasurementUnit {
  if (typeof window === 'undefined') return 'in';
  try {
    const v = window.localStorage.getItem(UNIT_STORAGE_KEY);
    return v === 'cm' ? 'cm' : 'in';
  } catch { return 'in'; }
}

function FemaleSilhouette({ waistIn, hipsIn }: { waistIn: number; hipsIn: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 400 660" className="h-auto w-full max-w-[320px]">
        <circle cx="200" cy="80" r="38" fill="rgba(45,165,160,0.08)" stroke="rgba(45,165,160,0.25)" strokeWidth="1.5" />
        <rect x="190" y="118" width="20" height="24" rx="5" fill="rgba(45,165,160,0.08)" stroke="rgba(45,165,160,0.15)" strokeWidth="1" />
        <path d="M160 142 L240 142 C248 160 252 200 230 250 C220 275 222 290 225 300 L175 300 C178 290 180 275 170 250 C148 200 152 160 160 142 Z" fill="rgba(45,165,160,0.10)" stroke="rgba(45,165,160,0.45)" strokeWidth="1.5" />
        <ellipse cx="200" cy="300" rx="28" ry="8" fill="none" stroke="#2DA5A0" strokeWidth="2" strokeDasharray="4 3" />
        <path d="M175 300 L225 300 C250 325 260 360 258 400 L142 400 C140 360 150 325 175 300 Z" fill="rgba(183,94,24,0.10)" stroke="rgba(183,94,24,0.45)" strokeWidth="1.5" />
        <ellipse cx="200" cy="395" rx="58" ry="10" fill="none" stroke="#B75E18" strokeWidth="2" strokeDasharray="4 3" />
        <path d="M148 400 L198 400 L192 580 L185 630 L175 630 L160 520 Z" fill="rgba(45,165,160,0.06)" stroke="rgba(45,165,160,0.30)" strokeWidth="1.2" />
        <path d="M202 400 L252 400 L240 520 L225 630 L215 630 L208 580 Z" fill="rgba(45,165,160,0.06)" stroke="rgba(45,165,160,0.30)" strokeWidth="1.2" />
        <path d="M160 145 L140 180 L128 260 L132 360 L140 385 L150 385 L145 340 L152 255 L168 200 Z" fill="rgba(45,165,160,0.06)" stroke="rgba(45,165,160,0.30)" strokeWidth="1.2" />
        <path d="M240 145 L260 180 L272 260 L268 360 L260 385 L250 385 L255 340 L248 255 L232 200 Z" fill="rgba(45,165,160,0.06)" stroke="rgba(45,165,160,0.30)" strokeWidth="1.2" />
        <line x1="228" y1="300" x2="300" y2="300" stroke="#2DA5A0" strokeWidth="1" />
        <text x="305" y="304" fill="#2DA5A0" fontSize="14" fontWeight="600">Waist</text>
        <text x="305" y="320" fill="white" fontSize="13">{waistIn.toFixed(1)}&quot;</text>
        <line x1="258" y1="395" x2="320" y2="395" stroke="#B75E18" strokeWidth="1" />
        <text x="325" y="399" fill="#B75E18" fontSize="14" fontWeight="600">Hips</text>
        <text x="325" y="415" fill="white" fontSize="13">{hipsIn.toFixed(1)}&quot;</text>
      </svg>
      <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
        <div className="rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2">
          <p className="text-[10px] text-[#2DA5A0] uppercase tracking-wider">Waist</p>
          <p className="text-lg font-bold text-white">{waistIn.toFixed(1)}&quot;</p>
        </div>
        <div className="rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/10 px-3 py-2">
          <p className="text-[10px] text-[#B75E18] uppercase tracking-wider">Hips</p>
          <p className="text-lg font-bold text-white">{hipsIn.toFixed(1)}&quot;</p>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function CompositionPageInner() {
  const params = useSearchParams();
  const sectionParam = params?.get('section');
  const initialSection: CompositionSection =
    sectionParam === 'muscle' || sectionParam === 'measurements' || sectionParam === 'fat'
      ? (sectionParam as CompositionSection)
      : 'fat';

  const [section, setSection] = useState<CompositionSection>(initialSection);
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<MeasurementUnit>(() => readStoredUnit());
  const [refreshKey, setRefreshKey] = useState(0);
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const { id: userId } = useCurrentUser();
  const { data: circumferenceData, refresh: refreshCirc } = useCircumferenceData({
    userId: userId ?? null,
    displayUnit: unit,
  });

  useEffect(() => {
    try { window.localStorage.setItem(UNIT_STORAGE_KEY, unit); } catch { /* ignore */ }
  }, [unit]);

  useEffect(() => {
    if (sectionParam === 'muscle' || sectionParam === 'measurements' || sectionParam === 'fat') {
      setSection(sectionParam as CompositionSection);
    }
  }, [sectionParam]);

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
    refreshCirc();
  };

  const historyCategory = section === 'muscle' ? 'muscle' : 'composition';

  return (
    <div className="space-y-6" key={refreshKey}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompositionSectionToggle active={section} onChange={setSection} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium min-h-[44px] transition-all ${
            open
              ? 'border-[#2DA5A0]/60 bg-[#2DA5A0] text-white'
              : 'border-[#2DA5A0]/30 bg-[#2DA5A0]/15 text-[#2DA5A0] hover:bg-[#2DA5A0]/25'
          }`}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Log Data
        </button>
      </div>

      <InlineEntryPanel
        open={open}
        onOpenChange={setOpen}
        title="Log body composition"
        description="Body fat, muscle mass, or circumference measurements"
      >
        <BodyCompositionForm
          initialSection={section}
          preferredUnit={unit}
          onCancel={() => setOpen(false)}
          onSaved={handleSaved}
        />
      </InlineEntryPanel>

      {section === 'fat' && (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Body Composition</h2>
              <p className="text-xs text-white/60">Segmental body fat analysis</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Total Body Fat', value: '21.3%' },
                { label: 'Visceral Fat',   value: '8' },
                { label: 'BMI',            value: '24.2' },
                { label: 'Body Water',     value: '55.1%' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-white/[0.12] bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <p className="text-[10px] text-white/70">{s.label}</p>
                  <p className="text-sm font-bold text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all min-h-[44px] ${
                gender === 'male'
                  ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                  : 'border-white/20 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all min-h-[44px] ${
                gender === 'female'
                  ? 'border-[#B75E18]/60 bg-[#B75E18]/15 text-[#B75E18]'
                  : 'border-white/20 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
              }`}
            >
              Female
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
              {gender === 'female' ? 'Waist and Hips Measurements' : 'Segmental Body Fat Analysis'}
            </h3>
            {gender === 'male' ? (
              <BodySilhouette mode="fat" segmentalData={SAMPLE_FAT} />
            ) : (
              <FemaleSilhouette waistIn={SAMPLE_FEMALE_MEASUREMENTS.waist_in} hipsIn={SAMPLE_FEMALE_MEASUREMENTS.hips_in} />
            )}
          </div>
        </>
      )}

      {section === 'muscle' && (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Muscle Analysis</h2>
              <p className="text-xs text-white/60">Segmental muscle mass breakdown</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Total Muscle Mass',    value: '63.8 lbs' },
                { label: 'Skeletal Muscle Mass', value: '28.3 lbs' },
                { label: 'Muscle Score',         value: 'B+' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-white/[0.12] bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <p className="text-[10px] text-white/70">{s.label}</p>
                  <p className="text-sm font-bold text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
              Segmental Muscle Analysis
            </h3>
            <BodySilhouette mode="muscle" segmentalData={SAMPLE_MUSCLE} />
          </div>
        </>
      )}

      {section === 'measurements' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <UnitToggle value={unit} onChange={setUnit} layoutId="composition-page-unit" />
            {circumferenceData.lastLoggedDate && (
              <span className="text-xs text-white/40">
                Last logged: {formatDate(circumferenceData.lastLoggedDate)}
              </span>
            )}
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm">
            <MeasurementsGrid
              data={circumferenceData.latest}
              previous={circumferenceData.previous}
              unit={unit}
            />
          </div>
        </>
      )}

      <EntryHistoryTimeline category={historyCategory} onChanged={handleSaved} />
      <ScanPhotoGallery category={historyCategory} />
    </div>
  );
}

export default function CompositionPage() {
  return (
    <Suspense fallback={<div className="h-12" />}>
      <CompositionPageInner />
    </Suspense>
  );
}
