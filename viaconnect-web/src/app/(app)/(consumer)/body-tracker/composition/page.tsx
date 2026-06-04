'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Camera } from 'lucide-react';
import { SegmentalHeatMap } from '@/components/body-tracker/SegmentalHeatMap';
import { HeatmapLegend } from '@/components/body-tracker/HeatmapLegend';
import { HoverSystem } from '@/components/body-tracker/HoverSystem';
import { LegendBar } from '@/components/body-tracker/HoverSystem/LegendBar';
import { usePinnedCards } from '@/components/body-tracker/HoverSystem/usePinnedCards';
import { useResponsivePinCap } from '@/components/body-tracker/HoverSystem/useResponsivePinCap';
import type {
  BodyRegionData,
  BodyRegionId,
  Classification,
  Trend,
} from '@/components/body-tracker/HoverSystem/types';
import { CHANGE_THRESHOLD } from '@/lib/body-tracker/heatmap-colors';
import {
  getOvalColorFromChange,
  getOvalColorFromStatus,
  type OvalColor,
} from '@/lib/body-tracker/heatmap-colors';
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
import { useFatChangeData } from '@/hooks/body-tracker/useFatChangeData';
import { useMuscleChangeData } from '@/hooks/body-tracker/useMuscleChangeData';
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
  { key: 'l_bicep',   label: 'L. Bicep',      side: 'left',  parent: 'left_arm',  segType: 'arm' },
  { key: 'r_bicep',   label: 'R. Bicep',      side: 'right', parent: 'right_arm', segType: 'arm' },
  { key: 'l_forearm', label: 'L. Forearm',    side: 'left',  parent: 'left_arm',  segType: 'arm' },
  { key: 'r_forearm', label: 'R. Forearm',    side: 'right', parent: 'right_arm', segType: 'arm' },
  { key: 'hip',       label: 'Hips',          side: 'right', parent: 'trunk',     segType: 'trunk' },
  { key: 'waist',     label: 'Waist',         side: 'left',  parent: 'trunk',     segType: 'trunk' },
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

// Prompt #157k: convert the 12 BodyPartCard rows into the
// BodyRegionData shape the HoverSystem orchestrator expects. The
// classification axis collapses Very Low / Low / Standard / High /
// Very High into the four-bucket Low / Standard / Good / High the
// hover-card pill recognizes; trend reads the raw change sign with a
// sub-threshold dead band to suppress flat-noise arrows.
function mapStatusToClassification(s: SegmentStatus): Classification {
  if (s === 'Very Low' || s === 'Low') return 'Low';
  if (s === 'Very High' || s === 'High') return 'High';
  return 'Standard';
}

function changeToTrend(change: number | null | undefined): Trend {
  if (change === null || change === undefined) return 'flat';
  if (Math.abs(change) < CHANGE_THRESHOLD) return 'flat';
  return change > 0 ? 'up' : 'down';
}

function buildBodyRegionData(
  cards: BodyPartCard[],
  changeData: Record<string, { change: number | null }>,
): BodyRegionData[] {
  return cards.map((c) => ({
    id: c.key as BodyRegionId,
    label: c.label,
    metric: { value: c.value, unit: c.unit as '%' | 'lbs' },
    classification: mapStatusToClassification(c.status),
    trend: changeToTrend(changeData[c.key]?.change ?? null),
  }));
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

  // Prompt #85n: weekly change data drives the avatar heat-map overlay and
  // the trend row on each of the 12 callouts. Both hooks degrade quietly:
  // missing user, missing rows, or DB error => empty map => neutral yellow.
  const fatChange = useFatChangeData(userId ?? null);
  const muscleChange = useMuscleChangeData(userId ?? null);

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

  // Prompt #85n v3: per-region oval colors. Fat side reads from each
  // body-part card's static SegmentStatus (Low / Standard / High);
  // muscle side reads from the week-over-week change so the oval
  // matches the change-based badge on the muscle callout card.
  const fatRegionStatuses: Record<string, OvalColor> = Object.fromEntries(
    fatBodyPartCards.map((c) => [c.key, getOvalColorFromStatus(c.status)]),
  );
  const muscleRegionStatuses: Record<string, OvalColor> = Object.fromEntries(
    BODY_PARTS.map((p) => [
      p.key,
      getOvalColorFromChange(muscleChange.data[p.key]?.change ?? null, 'muscle'),
    ]),
  );

  // Prompt #157k: BodyRegionData arrays for the HoverSystem +
  // LegendBar. Fat regions carry static SegmentStatus classification;
  // muscle regions carry the same status data + trend reading from
  // the muscle change hook. Memoized so HoverSystem children do not
  // re-render on unrelated state churn.
  const fatRegions = useMemo(
    () => buildBodyRegionData(fatBodyPartCards, fatChange.data),
    [fatBodyPartCards, fatChange.data],
  );
  const muscleRegions = useMemo(
    () => buildBodyRegionData(muscleBodyPartCards, muscleChange.data),
    [muscleBodyPartCards, muscleChange.data],
  );

  // Prompt #157k: shared pin-region store for both surfaces (figure
  // hit map inside HoverSystem, chip toolbar inside LegendBar). Both
  // dispatch through usePinnedCards.pinRegion with the responsive
  // cap; HoverSystem's pinnedIds-watching effect handles analytics +
  // aria-live for every activation source via triggerOriginById.
  const pinnedIds = usePinnedCards((s) => s.pinnedIds);
  const hoveredId = usePinnedCards((s) => s.hoveredId);
  const pinRegion = usePinnedCards((s) => s.pinRegion);
  const { pinCap } = useResponsivePinCap();
  const handleLegendActivate = useCallback(
    (id: BodyRegionId) => pinRegion(id, pinCap, 'legend'),
    [pinRegion, pinCap],
  );

  return (
    <div className="space-y-6 lg:space-y-3" key={refreshKey}>
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
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium min-h-[44px] backdrop-blur-sm transition-all ${
              scanOpen
                ? 'border-[#5B8DEF]/50 bg-[#2A4C9E]/25 text-white'
                : 'border-[#5B8DEF]/25 bg-[#2A4C9E]/10 text-white hover:bg-[#2A4C9E]/20'
            }`}
          >
            <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
            Scan My Body
          </button>
          <button
            type="button"
            onClick={() => { setScanOpen(false); setOpen((o) => !o); }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium min-h-[44px] backdrop-blur-sm transition-all ${
              open
                ? 'border-[#5B8DEF]/60 bg-[#2A4C9E]/35 text-white'
                : 'border-[#5B8DEF]/30 bg-[#2A4C9E]/15 text-white hover:bg-[#2A4C9E]/25'
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
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5 lg:p-3">
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
              data-testid="gender-toggle-male"
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
              data-testid="gender-toggle-female"
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

          {/* Prompt #157k: HoverSystem replaces the 3-column rail of
              flanking callout cards. The figure is the primary
              navigation surface; cards appear on hover (desktop) or
              tap (mobile) and pin via the FIFO queue. The summary
              KPI strip below remains persistent. */}
          <div data-testid="body-tracker-grid" className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-6 backdrop-blur-sm lg:mt-[25vh] lg:flex lg:flex-col lg:p-3 lg:h-[calc(100vh-200px)] lg:min-h-[568px] lg:overflow-hidden">
            {/* Prompt #157o: top-center title + legend now mobile/tablet
                only. Desktop relocates them to the top of the right
                column, above the Total Body Fat KPI card. */}
            <h3 className="mb-3 shrink-0 text-center text-xs font-semibold uppercase tracking-wider text-white/40 lg:hidden">
              Segmental Body Fat Analysis
            </h3>
            <HeatmapLegend metric="fat" className="mb-4 shrink-0 lg:hidden" />
            {/* Prompt #157n: desktop main row pairs the avatar (left,
                lg:flex-1) with the KPI stack (right, fixed lg:w-[200px]).
                On mobile / tablet the wrapper collapses to flex-col so
                the avatar stacks above the bottom KPI row exactly as
                the post-#157k layout did. */}
            <div className="flex flex-col lg:flex-1 lg:flex-row lg:items-stretch lg:gap-6 lg:min-h-0">
              <div
                data-testid="avatar-container"
                className="relative flex items-center justify-center px-2 py-2 lg:min-h-0 lg:flex-1"
                style={{ filter: 'drop-shadow(0 0 20px rgba(45, 165, 160, 0.15))' }}
              >
                <HoverSystem view="composition" sex={gender} regions={fatRegions} className="lg:h-full">
                  <SegmentalHeatMap sex={gender} segmentStatuses={fatRegionStatuses} />
                </HoverSystem>
                <LegendBar
                  pinnedIds={pinnedIds}
                  hoveredId={hoveredId}
                  onActivate={handleLegendActivate}
                  layout="ring"
                  className="hidden lg:block lg:absolute lg:top-2 lg:bottom-2 lg:left-1/2 lg:-translate-x-1/2 lg:aspect-[720/1152]"
                />
              </div>
              {/* Prompt #157o: title + vertical legend block at the top
                  of the desktop KPI column. Five proportionate bands
                  (this block + 4 KPI cards) all share gap-3 from the
                  parent flex column. Tokens mirror HeatmapLegend
                  (bg-green-400 / yellow-400 / red-400, text-white/40). */}
              <aside
                data-testid="kpi-stack-desktop"
                aria-label="Body composition summary"
                className="hidden lg:flex lg:w-[200px] lg:shrink-0 lg:flex-col lg:gap-3"
              >
                <div data-testid="kpi-stack-header" className="flex flex-col items-center gap-2 lg:mb-4">
                  <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-white/40">
                    Segmental Body Fat Analysis
                  </h3>
                  <ul className="flex flex-col gap-1 text-[10px] lg:w-fit lg:mx-auto">
                    <li className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
                      <span className="text-white/40">Fat Loss</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
                      <span className="text-white/40">No Change</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
                      <span className="text-white/40">Fat Gain</span>
                    </li>
                  </ul>
                </div>
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
              </aside>
            </div>
            <LegendBar
              pinnedIds={pinnedIds}
              hoveredId={hoveredId}
              onActivate={handleLegendActivate}
              className="mt-3 shrink-0 lg:hidden"
            />
            <div data-testid="bottom-metrics-row" className="mx-auto mt-3 grid w-full max-w-2xl shrink-0 grid-cols-2 gap-3 md:grid-cols-4 lg:hidden">
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
        </>
      )}

      {section === 'muscle' && (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5 lg:p-3">
            <h2 className="text-lg font-bold text-white">Muscle Analysis</h2>
            <p className="text-xs text-white/60">Segmental muscle mass breakdown</p>
          </div>

          {/* Prompt #157k: HoverSystem replaces the muscle 3-column
              rail. Same FIFO pin queue + LegendBar accessibility row;
              regions carry change-based muscle classifications. */}
          <div data-testid="body-tracker-grid" className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-6 backdrop-blur-sm lg:mt-[25vh] lg:flex lg:flex-col lg:p-3 lg:h-[calc(100vh-200px)] lg:min-h-[568px] lg:overflow-hidden">
            {/* Prompt #157o: top-center title + legend now mobile/tablet
                only. Desktop relocates them to the top of the right
                column, above the Total Body Fat KPI card. */}
            <h3 className="mb-3 shrink-0 text-center text-xs font-semibold uppercase tracking-wider text-white/40 lg:hidden">
              Segmental Muscle Analysis
            </h3>
            <HeatmapLegend metric="muscle" className="mb-4 shrink-0 lg:hidden" />
            {/* Prompt #157n: desktop main row pairs the avatar with
                the KPI stack on the right. Same shape as the fat
                section. */}
            <div className="flex flex-col lg:flex-1 lg:flex-row lg:items-stretch lg:gap-6 lg:min-h-0">
              <div
                data-testid="avatar-container"
                className="relative flex items-center justify-center px-2 py-2 lg:min-h-0 lg:flex-1"
                style={{ filter: 'drop-shadow(0 0 20px rgba(45, 165, 160, 0.15))' }}
              >
                <HoverSystem view="muscle" sex={gender} regions={muscleRegions} className="lg:h-full">
                  <SegmentalHeatMap sex={gender} segmentStatuses={muscleRegionStatuses} />
                </HoverSystem>
                <LegendBar
                  pinnedIds={pinnedIds}
                  hoveredId={hoveredId}
                  onActivate={handleLegendActivate}
                  layout="ring"
                  className="hidden lg:block lg:absolute lg:top-2 lg:bottom-2 lg:left-1/2 lg:-translate-x-1/2 lg:aspect-[720/1152]"
                />
              </div>
              {/* Prompt #157o: muscle variant of the desktop title + legend
                  block. Labels invert per HeatmapLegend's metric semantics
                  (Muscle Gain = good, Muscle Loss = bad). */}
              <aside
                data-testid="kpi-stack-desktop"
                aria-label="Body composition summary"
                className="hidden lg:flex lg:w-[200px] lg:shrink-0 lg:flex-col lg:gap-3"
              >
                <div data-testid="kpi-stack-header" className="flex flex-col items-center gap-2 lg:mb-4">
                  <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-white/40">
                    Segmental Muscle Analysis
                  </h3>
                  <ul className="flex flex-col gap-1 text-[10px] lg:w-fit lg:mx-auto">
                    <li className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
                      <span className="text-white/40">Muscle Gain</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
                      <span className="text-white/40">No Change</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
                      <span className="text-white/40">Muscle Loss</span>
                    </li>
                  </ul>
                </div>
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
              </aside>
            </div>
            <LegendBar
              pinnedIds={pinnedIds}
              hoveredId={hoveredId}
              onActivate={handleLegendActivate}
              className="mt-3 shrink-0 lg:hidden"
            />
            <div data-testid="bottom-metrics-row" className="mx-auto mt-3 grid w-full max-w-2xl shrink-0 grid-cols-2 gap-3 md:grid-cols-4 lg:hidden">
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
