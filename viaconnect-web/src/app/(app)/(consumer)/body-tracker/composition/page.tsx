'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Camera, Check, RotateCcw } from 'lucide-react';
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
  type OvalColor,
} from '@/lib/body-tracker/heatmap-colors';
import {
  CompositionSectionToggle,
  type CompositionSection,
} from '@/components/body-tracker/CompositionSectionToggle';
import { UnitToggle } from '@/components/body-tracker/UnitToggle';
import { MeasurementsGrid } from '@/components/body-tracker/MeasurementsGrid';
import { MeasurementsPanel } from '@/components/body-tracker/measurements/MeasurementsPanel';
import { BodyCompositionForm } from '@/components/body-tracker/BodyCompositionForm';
import { BodyScanUploader, type BodyScanResult } from '@/components/body-tracker/BodyScanUploader';
import { BodyScanResults } from '@/components/body-tracker/BodyScanResults';
import { FloatingMetricCard } from '@/components/body-tracker/FloatingMetricCard';
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
import { useLatestComposition } from '@/hooks/body-tracker/useLatestComposition';
import { buildMetricCards } from '@/lib/body-tracker/composition/metricCards';
import { fatValuesFromSnapshot, muscleValuesFromSnapshot } from '@/lib/body-tracker/composition/regionValues';
import { resolveSurfaceState } from '@/lib/body-tracker/composition/surfaceState';
import { persistScan } from '@/lib/body-tracker/composition/persistScanClient';
import type { MeasurementUnit } from '@/lib/body-tracker/circumference';
import { getSegmentStatus, type SegmentStatus } from '@/lib/body-tracker/calculations';

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
  // null === UNKNOWN. A photo scan and a first manual entry leave per-region
  // values null; a null is rendered as a neutral "no data" callout, never 0.
  value: number | null;
  unit: string;
  // null status === UNKNOWN (neutral). getSegmentStatus is only ever called
  // with a real number, never with null.
  status: SegmentStatus | null;
}

// Prompt #209: per-region values come from the canonical CompositionSnapshot
// (fatValuesFromSnapshot / muscleValuesFromSnapshot) and may be null. A null
// value yields a null status (neutral) and getSegmentStatus is skipped so an
// UNKNOWN region is never scored or coerced to 0.
function buildBodyPartCards(
  mode: 'fat' | 'muscle',
  fat: Record<string, number | null>,
  muscle: Record<string, number | null>,
  gender: 'male' | 'female',
): BodyPartCard[] {
  const unit = mode === 'fat' ? '%' : 'lbs';
  return BODY_PARTS.map((p) => {
    const raw =
      mode === 'fat'
        ? fat[`${p.parent}_pct`] ?? null
        : muscle[`${p.parent}_lbs`] ?? null;
    const value = typeof raw === 'number' ? raw : null;
    const status = value === null ? null : getSegmentStatus(value, p.segType, mode, gender);
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

// Prompt #209: a callout with a null (UNKNOWN) value is omitted from the
// HoverSystem region set entirely. The avatar hit target still renders (its
// aria label degrades to "<region>. Press Enter to pin." with no number) and
// the oval color still comes from the change hook, but no card asserts a
// fabricated "0%" or "0 lbs". The metric.value contract stays a real number.
function buildBodyRegionData(
  cards: BodyPartCard[],
  changeData: Record<string, { change: number | null }>,
): BodyRegionData[] {
  const out: BodyRegionData[] = [];
  for (const c of cards) {
    if (c.value === null || c.status === null) continue;
    out.push({
      id: c.key as BodyRegionId,
      label: c.label,
      metric: { value: c.value, unit: c.unit as '%' | 'lbs' },
      classification: mapStatusToClassification(c.status),
      trend: changeToTrend(changeData[c.key]?.change ?? null),
    });
  }
  return out;
}

const UNIT_STORAGE_KEY = 'vc.body-tracker.measurement-unit';

function readStoredUnit(): MeasurementUnit {
  if (typeof window === 'undefined') return 'in';
  try {
    const v = window.localStorage.getItem(UNIT_STORAGE_KEY);
    return v === 'cm' ? 'cm' : 'in';
  } catch { return 'in'; }
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return iso; }
}

// Prompt #209: scan persistence status drives the inline success / retry
// affordance below the scan results. Idle hides it; the avatar and cards
// never block on this, they read the canonical path.
type ScanPersistState =
  | { phase: 'idle' }
  | { phase: 'saving' }
  | { phase: 'saved' }
  | { phase: 'error'; scanId: string; reason?: string };

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
  const [scanPersist, setScanPersist] = useState<ScanPersistState>({ phase: 'idle' });
  const [prefillBodyFat, setPrefillBodyFat] = useState<number | null>(null);
  const [unit, setUnit] = useState<MeasurementUnit>(() => readStoredUnit());
  const [refreshKey, setRefreshKey] = useState(0);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [genderManuallySet, setGenderManuallySet] = useState(false);
  const [genderError, setGenderError] = useState<string | null>(null);

  const { id: userId } = useCurrentUser();
  const { sex: caqSex, source: caqSource, setOverride: setGenderOverride } = useUserBiologicalSex(userId ?? null);

  // Prompt #209: canonical composition read. Drives the four metric cards,
  // the per-region callout values, and the four-state resolution. UNKNOWN
  // (null) measurements are preserved as null, never coerced to 0.
  const {
    snapshot,
    bmi,
    loading: compLoading,
    error: compError,
    refresh: refreshComp,
  } = useLatestComposition(userId ?? null);

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

  // Prompt #209: repaint on update. A Log Data save and a scan persist both
  // bump refreshKey; this effect re-reads the canonical composition snapshot
  // and the segment change maps (which drive the avatar oval colors) so the
  // whole surface refreshes with no page reload. Skips the initial mount
  // (each hook already loads on its own userId effect).
  useEffect(() => {
    if (refreshKey === 0) return;
    refreshComp();
    fatChange.refresh();
    muscleChange.refresh();
    refreshCirc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  // Prompt #209: persist a completed scan through the canonical path, then
  // repaint. Fail-open: any failure surfaces an inline retry, never throws
  // into the render path and never blocks the avatar / cards.
  const runScanPersist = useCallback(async (scanId: string) => {
    setScanPersist({ phase: 'saving' });
    const res = await persistScan(scanId);
    if (res.ok) {
      setScanPersist({ phase: 'saved' });
      setRefreshKey((k) => k + 1);
    } else {
      setScanPersist({ phase: 'error', scanId, reason: res.reason });
    }
  }, []);

  const historyCategory = section === 'muscle' ? 'muscle' : 'composition';

  // Prompt #209: per-region values now come from the canonical snapshot
  // (null === UNKNOWN), replacing the removed hardcoded mock constants.
  const fatValues = useMemo(() => fatValuesFromSnapshot(snapshot), [snapshot]);
  const muscleValues = useMemo(() => muscleValuesFromSnapshot(snapshot), [snapshot]);

  // Prompt #85k: 12 body-part callouts inheriting from parent segments.
  const fatBodyPartCards = useMemo(
    () => buildBodyPartCards('fat', fatValues, muscleValues, gender),
    [fatValues, muscleValues, gender],
  );
  const muscleBodyPartCards = useMemo(
    () => buildBodyPartCards('muscle', fatValues, muscleValues, gender),
    [fatValues, muscleValues, gender],
  );

  // Prompt #209: the four global composition metric cards, read from the
  // canonical snapshot + BMI. UNKNOWN renders as a neutral "No data" card.
  // The same four are shown on both the fat and muscle tabs (global metrics).
  const metricCards = useMemo(() => buildMetricCards(snapshot, bmi), [snapshot, bmi]);

  // Prompt #209: surface state. The avatar is ALWAYS the canvas; this only
  // governs the surrounding affordances (skeleton / empty hint / error banner).
  const surfaceState = resolveSurfaceState({ loading: compLoading, error: compError, snapshot });

  // Prompt #209 v3: per-region oval colors now read from the week-over-week
  // change on BOTH tabs (DD2). First entry / no prior / no data => neutral
  // yellow (the change hooks already return that for a null change), so the
  // oval matches the change-based trend on the callout card.
  const fatRegionStatuses: Record<string, OvalColor> = useMemo(
    () =>
      Object.fromEntries(
        BODY_PARTS.map((p) => [
          p.key,
          getOvalColorFromChange(fatChange.data[p.key]?.change ?? null, 'fat'),
        ]),
      ),
    [fatChange.data],
  );
  const muscleRegionStatuses: Record<string, OvalColor> = useMemo(
    () =>
      Object.fromEntries(
        BODY_PARTS.map((p) => [
          p.key,
          getOvalColorFromChange(muscleChange.data[p.key]?.change ?? null, 'muscle'),
        ]),
      ),
    [muscleChange.data],
  );

  // Prompt #157k: BodyRegionData arrays for the HoverSystem + LegendBar.
  // Regions with an UNKNOWN (null) value are omitted (no fabricated card);
  // trend reads the change hook. Memoized so HoverSystem children do not
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

  // Prompt #209: small on-brand banner shown in the error state with a
  // Retry that re-reads the canonical snapshot. The avatar stays the canvas.
  const errorBanner =
    surfaceState === 'error' ? (
      <div
        data-testid="composition-error-banner"
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#B75E18]/40 bg-[#B75E18]/10 p-3 text-xs text-white/80"
      >
        <span>We could not load your latest composition. Your data is safe.</span>
        <button
          type="button"
          onClick={refreshComp}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#B75E18]/50 bg-[#B75E18]/15 px-3 py-1.5 font-medium text-white transition-colors hover:bg-[#B75E18]/25"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Retry
        </button>
      </div>
    ) : null;

  // Prompt #209: empty-state hint shown beneath the avatar when there is no
  // composition record yet. The cards already render as neutral "No data"
  // (buildMetricCards yields Unknown cards for a null snapshot).
  const emptyHint =
    surfaceState === 'empty' ? (
      <p data-testid="composition-empty-hint" className="text-center text-xs text-white/50">
        Scan or Log Data to begin.
      </p>
    ) : null;

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
              if (!scanOpen) { setScanResult(null); setScanPersist({ phase: 'idle' }); }
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
        onOpenChange={(o) => { setScanOpen(o); if (!o) { setScanResult(null); setScanPersist({ phase: 'idle' }); } }}
        title="Body Scan"
        description="AI body composition estimate from 4 photos"
      >
        {scanResult ? (
          <div className="space-y-3">
            <BodyScanResults
              result={scanResult}
              onRetake={() => { setScanResult(null); setScanPersist({ phase: 'idle' }); }}
              onClose={() => { setScanOpen(false); setScanResult(null); setScanPersist({ phase: 'idle' }); }}
              onUseAsBaseline={() => {
                const midpoint = (
                  scanResult.estimates.estimated_body_fat_min +
                  scanResult.estimates.estimated_body_fat_max
                ) / 2;
                const rounded = Math.round(midpoint * 10) / 10;
                setScanOpen(false);
                setScanResult(null);
                setScanPersist({ phase: 'idle' });
                setPrefillBodyFat(rounded);
                setSection('fat');
                setOpen(true);
              }}
            />
            {scanPersist.phase === 'saving' && (
              <p className="text-xs text-white/55">Saving your scan to your profile.</p>
            )}
            {scanPersist.phase === 'saved' && (
              <p className="inline-flex items-center gap-1.5 text-xs text-[#2DA5A0]">
                <Check size={14} strokeWidth={1.5} />
                Saved. Your composition is up to date.
              </p>
            )}
            {scanPersist.phase === 'error' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#B75E18]/40 bg-[#B75E18]/10 p-2.5 text-xs text-white/80">
                <span>We could not save your scan. You can retry or use it as a baseline.</span>
                <button
                  type="button"
                  onClick={() => void runScanPersist(scanPersist.scanId)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#B75E18]/50 bg-[#B75E18]/15 px-2.5 py-1 font-medium text-white transition-colors hover:bg-[#B75E18]/25"
                >
                  <RotateCcw size={12} strokeWidth={1.5} />
                  Retry
                </button>
              </div>
            )}
          </div>
        ) : (
          <BodyScanUploader
            onComplete={(r) => {
              setScanResult(r);
              void runScanPersist(r.scanId);
            }}
            onCancel={() => setScanOpen(false)}
          />
        )}
      </InlineEntryPanel>

      {errorBanner}

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
                {metricCards.map((c, i) => (
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
              {metricCards.map((c, i) => (
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
            {emptyHint}
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
                {metricCards.map((c, i) => (
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
              {metricCards.map((c, i) => (
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
            {emptyHint}
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
          <MeasurementsPanel unit={unit} onChanged={refreshCirc} />
        </>
      )}

      <EntryHistoryTimeline category={historyCategory} onChanged={handleSaved} />
      <ScanPhotoGallery category={historyCategory} />
    </div>
  );
}

export default function CompositionPage() {
  return (
    <>
      <BackToHubLink />
      <Suspense fallback={<div className="h-12" />}>
        <CompositionPageInner />
      </Suspense>
    </>
  );
}
