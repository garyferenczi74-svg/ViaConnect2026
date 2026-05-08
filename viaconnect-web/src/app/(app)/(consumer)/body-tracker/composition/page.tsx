'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Camera } from 'lucide-react';
import { BodyAvatar } from '@/components/body-tracker/BodyAvatar';
import { BodyPartCallout } from '@/components/body-tracker/BodyPartCallout';
import {
  CompositionSectionToggle,
  type CompositionSection,
} from '@/components/body-tracker/CompositionSectionToggle';
import { UnitToggle } from '@/components/body-tracker/UnitToggle';
import { MeasurementsGrid } from '@/components/body-tracker/MeasurementsGrid';
import { BodyCompositionForm } from '@/components/body-tracker/BodyCompositionForm';
import { BodyScanUploader, type BodyScanResult } from '@/components/body-tracker/BodyScanUploader';
import { BodyScanResults } from '@/components/body-tracker/BodyScanResults';
import { FloatingMetricCard, type MetricStatus } from '@/components/body-tracker/FloatingMetricCard';
import {
  InlineEntryPanel,
  EntryHistoryTimeline,
  ScanPhotoGallery,
  useCurrentUser,
} from '@/components/body-tracker/manual-input';
import { useCircumferenceData } from '@/hooks/body-tracker/useCircumferenceData';
import { useUserBiologicalSex } from '@/hooks/body-tracker/useUserBiologicalSex';
import type { MeasurementUnit } from '@/lib/body-tracker/circumference';
import { getSegmentStatus, type SegmentStatus } from '@/lib/body-tracker/calculations';

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

interface MetricCardSpec {
  label: string;
  value: string;
  status: MetricStatus;
  trend?: 'up' | 'down' | 'stable';
}

// Body Fat summary cards: render in a single horizontal row below the
// silhouette (Prompt #85e). Display order: Total Body Fat, BMI, Visceral
// Fat, Body Water.
const FAT_CARDS: MetricCardSpec[] = [
  { label: 'Total Body Fat', value: '21.3%', status: 'Standard', trend: 'down' },
  { label: 'BMI',            value: '24.2',  status: 'Standard' },
  { label: 'Visceral Fat',   value: '8',     status: 'Standard' },
  { label: 'Body Water',     value: '55.1%', status: 'Good' },
];

// Prompt #85k: 12 finer-grained body parts that flank the silhouette.
// Each card inherits its value from its parent segment (trunk / arm / leg)
// and uses the parent's status thresholds via getSegmentStatus.
type ParentSegment = 'trunk' | 'right_arm' | 'left_arm' | 'right_leg' | 'left_leg';
type ParentSegType = 'arm' | 'trunk' | 'leg';

interface BodyPartSpec {
  key: string;
  label: string;
  side: 'left' | 'right';
  parent: ParentSegment;
  segType: ParentSegType;
}

const BODY_PARTS: BodyPartSpec[] = [
  { key: 'neck',      label: 'Neck',          side: 'left',  parent: 'trunk',     segType: 'trunk' },
  { key: 'shoulders', label: 'Shoulders',     side: 'right', parent: 'trunk',     segType: 'trunk' },
  { key: 'chest',     label: 'Chest',         side: 'left',  parent: 'trunk',     segType: 'trunk' },
  { key: 'waist',     label: 'Waist',         side: 'right', parent: 'trunk',     segType: 'trunk' },
  { key: 'l_bicep',   label: 'L. Bicep',      side: 'left',  parent: 'left_arm',  segType: 'arm' },
  { key: 'r_bicep',   label: 'R. Bicep',      side: 'right', parent: 'right_arm', segType: 'arm' },
  { key: 'l_forearm', label: 'L. Forearm',    side: 'left',  parent: 'left_arm',  segType: 'arm' },
  { key: 'r_forearm', label: 'R. Forearm',    side: 'right', parent: 'right_arm', segType: 'arm' },
  { key: 'l_quad',    label: 'L. Quadriceps', side: 'left',  parent: 'left_leg',  segType: 'leg' },
  { key: 'r_quad',    label: 'R. Quadriceps', side: 'right', parent: 'right_leg', segType: 'leg' },
  { key: 'l_calf',    label: 'L. Calf',       side: 'left',  parent: 'left_leg',  segType: 'leg' },
  { key: 'r_calf',    label: 'R. Calf',       side: 'right', parent: 'right_leg', segType: 'leg' },
];

interface BodyPartCard {
  key: string;
  label: string;
  side: 'left' | 'right';
  value: number;
  unit: string;
  status: SegmentStatus;
}

function buildBodyPartCards(
  mode: 'fat' | 'muscle',
  fat: typeof SAMPLE_FAT,
  muscle: typeof SAMPLE_MUSCLE,
  gender: 'male' | 'female',
): BodyPartCard[] {
  const unit = mode === 'fat' ? '%' : 'lbs';
  return BODY_PARTS.map((p) => {
    const value =
      mode === 'fat'
        ? (fat as Record<string, number>)[`${p.parent}_pct`] ?? 0
        : (muscle as Record<string, number>)[`${p.parent}_lbs`] ?? 0;
    const status = getSegmentStatus(value, p.segType, mode, gender);
    return { key: p.key, label: p.label, side: p.side, value, unit, status };
  });
}

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
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<BodyScanResult | null>(null);
  const [prefillBodyFat, setPrefillBodyFat] = useState<number | null>(null);
  const [unit, setUnit] = useState<MeasurementUnit>(() => readStoredUnit());
  const [refreshKey, setRefreshKey] = useState(0);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [genderManuallySet, setGenderManuallySet] = useState(false);
  const [genderError, setGenderError] = useState<string | null>(null);

  const { id: userId } = useCurrentUser();
  const { sex: caqSex, source: caqSource, setOverride: setGenderOverride } = useUserBiologicalSex(userId ?? null);

  async function persistGender(g: 'male' | 'female') {
    setGenderError(null);
    try {
      await setGenderOverride(g);
    } catch (e) {
      setGenderError(e instanceof Error ? e.message : 'Could not save preference');
    }
  }
  const { data: circumferenceData, refresh: refreshCirc } = useCircumferenceData({
    userId: userId ?? null,
    displayUnit: unit,
  });

  useEffect(() => {
    try { window.localStorage.setItem(UNIT_STORAGE_KEY, unit); } catch { /* ignore */ }
  }, [unit]);

  // Default gender from CAQ biological_sex, unless user has manually toggled
  useEffect(() => {
    if (!genderManuallySet) setGender(caqSex);
  }, [caqSex, genderManuallySet]);

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

  // Prompt #85k: 12 body-part callouts inheriting from parent segments.
  const fatBodyPartCards = buildBodyPartCards('fat', SAMPLE_FAT, SAMPLE_MUSCLE, gender);
  const muscleBodyPartCards = buildBodyPartCards('muscle', SAMPLE_FAT, SAMPLE_MUSCLE, gender);

  return (
    <div className="space-y-6" key={refreshKey}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompositionSectionToggle active={section} onChange={setSection} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setScanOpen((o) => !o);
              if (!scanOpen) setScanResult(null);
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium min-h-[44px] transition-all ${
              scanOpen
                ? 'border-white/30 bg-white/10 text-white'
                : 'border-white/[0.08] bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
            Scan My Body
          </button>
          <button
            type="button"
            onClick={() => { setScanOpen(false); setOpen((o) => !o); }}
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
      </div>

      <InlineEntryPanel
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setPrefillBodyFat(null); }}
        title="Log body composition"
        description="Body fat, muscle mass, or circumference measurements"
      >
        <BodyCompositionForm
          key={`bcf-${prefillBodyFat ?? 'fresh'}`}
          initialSection={section}
          preferredUnit={unit}
          prefillTotalBodyFat={prefillBodyFat}
          onCancel={() => { setOpen(false); setPrefillBodyFat(null); }}
          onSaved={handleSaved}
        />
      </InlineEntryPanel>

      <InlineEntryPanel
        open={scanOpen}
        onOpenChange={(o) => { setScanOpen(o); if (!o) setScanResult(null); }}
        title="Body Scan"
        description="AI body composition estimate from 4 photos"
      >
        {scanResult ? (
          <BodyScanResults
            result={scanResult}
            onRetake={() => setScanResult(null)}
            onClose={() => { setScanOpen(false); setScanResult(null); }}
            onUseAsBaseline={() => {
              const midpoint = (
                scanResult.estimates.estimated_body_fat_min +
                scanResult.estimates.estimated_body_fat_max
              ) / 2;
              const rounded = Math.round(midpoint * 10) / 10;
              setScanOpen(false);
              setScanResult(null);
              setPrefillBodyFat(rounded);
              setSection('fat');
              setOpen(true);
            }}
          />
        ) : (
          <BodyScanUploader
            onComplete={(r) => setScanResult(r)}
            onCancel={() => setScanOpen(false)}
          />
        )}
      </InlineEntryPanel>

      {section === 'fat' && (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5">
            <h2 className="text-lg font-bold text-white">Body Composition</h2>
            <p className="text-xs text-white/60">Segmental body fat analysis</p>
          </div>

          {caqSource === 'caq_other' && !genderManuallySet && (
            <div className="rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-3 text-xs text-white/75">
              We don&apos;t have your gender on file. Pick a visualization below; you can change it anytime.
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setGenderManuallySet(true); setGender('male'); void persistGender('male'); }}
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
              onClick={() => { setGenderManuallySet(true); setGender('female'); void persistGender('female'); }}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all min-h-[44px] ${
                gender === 'female'
                  ? 'border-[#B75E18]/60 bg-[#B75E18]/15 text-[#B75E18]'
                  : 'border-white/20 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
              }`}
            >
              Female
            </button>
          </div>
          {genderError && (
            <p className="text-xs text-[#FCA5A5]">Could not save gender preference: {genderError}</p>
          )}

          {/* Prompt #85k: silhouette card with 12 body-part callouts flanking the avatar.
              Desktop renders 6 cards on each side via lg:grid 3-column. Mobile renders
              the avatar + 12 cards in a 2-column grid below. */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-6 backdrop-blur-sm lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-6">
            {/* Desktop left column: 6 left-side callouts */}
            <div className="hidden lg:flex lg:flex-col lg:gap-3">
              {fatBodyPartCards.filter((c) => c.side === 'left').map((c, order) => (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + order * 0.05, duration: 0.35, ease: 'easeOut' }}
                >
                  <BodyPartCallout
                    label={c.label}
                    value={c.value}
                    unit={c.unit}
                    status={c.status}
                    position="left"
                  />
                </motion.div>
              ))}
            </div>

            <div>
              <h3 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-white/40">
                Segmental Body Fat Analysis
              </h3>
              <div style={{ filter: 'drop-shadow(0 0 20px rgba(45, 165, 160, 0.15))' }}>
                <BodyAvatar gender={gender} />
              </div>

              {/* Mobile only: 12 callouts in a 2-column grid below the avatar */}
              <div className="mt-6 grid grid-cols-2 gap-3 lg:hidden">
                {fatBodyPartCards.map((c, order) => (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + order * 0.04, duration: 0.35, ease: 'easeOut' }}
                  >
                    <BodyPartCallout
                      label={c.label}
                      value={c.value}
                      unit={c.unit}
                      status={c.status}
                      position="left"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Prompt #85e: summary metrics row directly below the silhouette */}
              <div className="mx-auto mt-6 grid w-full max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
                {FAT_CARDS.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                  >
                    <FloatingMetricCard {...c} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Desktop right column: 6 right-side callouts */}
            <div className="hidden lg:flex lg:flex-col lg:gap-3">
              {fatBodyPartCards.filter((c) => c.side === 'right').map((c, order) => (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + order * 0.05, duration: 0.35, ease: 'easeOut' }}
                >
                  <BodyPartCallout
                    label={c.label}
                    value={c.value}
                    unit={c.unit}
                    status={c.status}
                    position="right"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}

      {section === 'muscle' && (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5">
            <h2 className="text-lg font-bold text-white">Muscle Analysis</h2>
            <p className="text-xs text-white/60">Segmental muscle mass breakdown</p>
          </div>

          {/* Prompt #85k: silhouette card with 12 body-part callouts flanking the avatar.
              Desktop renders 6 cards on each side via lg:grid 3-column. Mobile renders
              the avatar + 12 cards in a 2-column grid below. */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-6 backdrop-blur-sm lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-6">
            {/* Desktop left column: 6 left-side callouts */}
            <div className="hidden lg:flex lg:flex-col lg:gap-3">
              {muscleBodyPartCards.filter((c) => c.side === 'left').map((c, order) => (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + order * 0.05, duration: 0.35, ease: 'easeOut' }}
                >
                  <BodyPartCallout
                    label={c.label}
                    value={c.value}
                    unit={c.unit}
                    status={c.status}
                    position="left"
                  />
                </motion.div>
              ))}
            </div>

            <div>
              <h3 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-white/40">
                Segmental Muscle Analysis
              </h3>
              <div style={{ filter: 'drop-shadow(0 0 20px rgba(45, 165, 160, 0.15))' }}>
                <BodyAvatar gender={gender} />
              </div>

              {/* Mobile only: 12 callouts in a 2-column grid below the avatar */}
              <div className="mt-6 grid grid-cols-2 gap-3 lg:hidden">
                {muscleBodyPartCards.map((c, order) => (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + order * 0.04, duration: 0.35, ease: 'easeOut' }}
                  >
                    <BodyPartCallout
                      label={c.label}
                      value={c.value}
                      unit={c.unit}
                      status={c.status}
                      position="left"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Prompt #85i: Body Fat summary cards row mirrored onto the Muscle Mass section */}
              <div className="mx-auto mt-6 grid w-full max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
                {FAT_CARDS.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                  >
                    <FloatingMetricCard {...c} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Desktop right column: 6 right-side callouts */}
            <div className="hidden lg:flex lg:flex-col lg:gap-3">
              {muscleBodyPartCards.filter((c) => c.side === 'right').map((c, order) => (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + order * 0.05, duration: 0.35, ease: 'easeOut' }}
                >
                  <BodyPartCallout
                    label={c.label}
                    value={c.value}
                    unit={c.unit}
                    status={c.status}
                    position="right"
                  />
                </motion.div>
              ))}
            </div>
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
