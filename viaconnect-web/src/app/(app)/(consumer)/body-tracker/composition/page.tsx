'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import { SegmentalHeatMap } from '@/components/body-tracker/SegmentalHeatMap';
import { HeatmapLegend } from '@/components/body-tracker/HeatmapLegend';
import { HoverSystem } from '@/components/body-tracker/HoverSystem';
// === PROMPT 210b EXTENSION START ===
// Prompt 210h / 210k: 3D BodyCompositionAvatar + SelectBodyPart live only on
// /body-tracker/formavision. This surface keeps the 2D HoverSystem floor.
import { RenderTierProvider } from '@/components/formavision';
import { useReducedMotion } from '@/components/body-tracker/HoverSystem/useReducedMotion';
import {
  buildSegmentTints,
  buildSegmentTintsFromChange,
} from '@/lib/formavision/geometry/composSegmentTints';
// === PROMPT 210b EXTENSION END ===
// Prompt 210k: tab URL sync, scan deep link, post-scan FormaVision landing.
import {
  compositionSectionHref,
  formavisionAfterScanHref,
  parseCompositionSection,
  shouldOpenScanFromQuery,
} from '@/lib/body-tracker/compositionNav';
// Orange CompositionSectionToggle FormaVision tab is the only scan entry.
// BiologyActionRow no longer offers a second FormaVision CTA. The legacy
// composition BodyScanUploader sheet stays mounted for ?scan=1 only (G84).
// === PROMPT 210b VR (Section 8) START ===
// Direct-path imports (not the avatar barrel) so this Visual Results surface
// stays disjoint from the avatar component files.
import { BodyFatReadout } from '@/components/formavision/BodyFatReadout';
import { NotableChanges } from '@/components/formavision/NotableChanges';
// Prompt 217: uniform My Biology action row (Log Data / Doctor's Report).
import { BiologyActionRow } from '@/components/body-tracker/BiologyActionRow';
// Prompt 211a W1: shareable transformation clip (the growth engine). Imported
// directly (NOT via the barrel) so the consumer-only structural discipline holds:
// no practitioner route pulls the clip surface into its import graph.
import { ClipCreatorSurface, type ClipScanRef } from '@/components/formavision/ClipCreatorSurface';
import { lerpParamVector } from '@/lib/formavision/geometry/lerpParamVector';
import { useRenderTier } from '@/components/formavision/RenderTierProvider';
import { useCompositionHistory } from '@/hooks/body-tracker/useCompositionHistory';
import { useCircumferenceHistory } from '@/hooks/body-tracker/useCircumferenceHistory';
import { computeCompositionDeltas } from '@/lib/formavision/deltas/compositionDeltas';
// === PROMPT 210b VR (Section 8) END ===
// === PROMPT 210b P3-T2b (Time Machine) START ===
import { JourneyTimeline, type JourneyScanReadout } from '@/components/formavision/JourneyTimeline';
// === PROMPT 210b P4-T1 (GeneticsOverlay) START ===
import { GeneticsOverlay } from '@/components/formavision/GeneticsOverlay';
// === PROMPT 210b P4-T1 (GeneticsOverlay) END ===
// === PROMPT 210b P5-T1c (FutureSelfPanel) START ===
import { FutureSelfPanel } from '@/components/formavision/FutureSelfPanel';
// === PROMPT 210b P5-T1c (FutureSelfPanel) END ===
// === PROMPT 210b P6-T1 (RegionProtocolPanel) START ===
import { RegionProtocolPanel } from '@/components/formavision/RegionProtocolPanel';
// === PROMPT 210b P6-T1 (RegionProtocolPanel) END ===
// === PROMPT 210b P6-T2 (AgentNarration) START ===
import { AgentNarration } from '@/components/formavision/AgentNarration';
// === PROMPT 210b P6-T2 (AgentNarration) END ===
// === PROMPT 210b P6-T3 (BOSMovementReadout) START ===
import { BOSMovementReadout } from '@/components/formavision/BOSMovementReadout';
// === PROMPT 210b P6-T3 (BOSMovementReadout) END ===
// === PROMPT 210b P6-T4 (MilestoneMoment) START ===
import { MilestoneMoment } from '@/components/formavision/MilestoneMoment';
// === PROMPT 210b P6-T4 (MilestoneMoment) END ===
// === PROMPT 211a W4-2 (Cadence + Streak surfaces) START ===
// ScanStreakDisplay is imported DIRECTLY (not via the formavision barrel) so the
// consumer-only import graph stays explicit: only this (consumer) route pulls it
// in, which the invariants 4.6 structural test relies on. The other three
// surfaces come from the barrel (presentational, safe to reuse).
import { ScanStreakDisplay } from '@/components/formavision/ScanStreakDisplay';
import {
  CadenceReminderOptIn,
  FingerprintFlag,
  ConsistencyTip,
} from '@/components/formavision';
import { useScanFingerprints } from '@/hooks/body-tracker/useScanFingerprints';
// === PROMPT 211a W4-2 (Cadence + Streak surfaces) END ===
// === PROMPT 210b P8-T1b (Avatar Telemetry) START ===
import {
  useAvatarTelemetry,
  createScrubSettleEmitter,
} from '@/lib/formavision/telemetry/useAvatarTelemetry';
import type {
  AvatarQualitySignals,
  AvatarEventProperties,
} from '@/lib/formavision/telemetry/avatarTelemetry';
import { recordAvatarView } from '@/lib/formavision/telemetry/avatarTelemetry';
// === PROMPT 210b P8-T1b (Avatar Telemetry) END ===
// === PROMPT 210b P8-T2a (Avatar Dwell) START ===
import { useAvatarDwell } from '@/lib/formavision/telemetry/useAvatarDwell';
// === PROMPT 210b P8-T2a (Avatar Dwell) END ===
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
// === PROMPT 210b P3-T2b (Time Machine) END ===
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
  ovalStatusesFromExistingChange,
  type OvalColor,
} from '@/lib/body-tracker/heatmap-colors';
import { isJourneyCompositionPoint } from '@/lib/body-tracker/composition/journeyPoints';
import { resolveAvatarCircumferences } from '@/lib/body-tracker/composition/resolveAvatarCircumferences';
import {
  CompositionSectionToggle,
  type CompositionSection,
  type CompositionNavTab,
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
  const router = useRouter();
  const sectionParam = params?.get('section');
  const scanParam = params?.get('scan');
  const initialSection: CompositionSection =
    parseCompositionSection(sectionParam) ?? 'fat';

  const [section, setSection] = useState<CompositionSection>(initialSection);

  // Prompt 210i + 210k: FormaVision is a nav tab; content tabs keep ?section= in the URL.
  const onSectionNav = useCallback(
    (tab: CompositionNavTab) => {
      if (tab === 'formavision') {
        router.push(formavisionAfterScanHref());
        return;
      }
      setSection(tab);
      router.replace(compositionSectionHref(tab), { scroll: false });
    },
    [router],
  );
  const [open, setOpen] = useState(false);
  // Prompt 210k: ?scan=1 opens Scan My Body (FormaVision empty-state CTA deep link).
  const [scanOpen, setScanOpen] = useState(() => shouldOpenScanFromQuery(scanParam));
  const [scanResult, setScanResult] = useState<BodyScanResult | null>(null);
  const [scanPersist, setScanPersist] = useState<ScanPersistState>({ phase: 'idle' });
  const [prefillBodyFat, setPrefillBodyFat] = useState<number | null>(null);
  const [unit, setUnit] = useState<MeasurementUnit>(() => readStoredUnit());
  const [refreshKey, setRefreshKey] = useState(0);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [genderManuallySet, setGenderManuallySet] = useState(false);
  const [genderError, setGenderError] = useState<string | null>(null);
  // === PROMPT 210b EXTENSION START ===
  // Selected body part for the 3D avatar (Phase 1: local, not yet wired to the
  // 2D pin store). reducedMotion mirrors the existing HoverSystem media query.
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const avatarReducedMotion = useReducedMotion();
  // P2-T2c: the avatar (3D) and its grid must persist across section toggles so
  // the materialize intro plays once and the morph engine is exercised on real
  // data changes instead of a remount. The fat and muscle sections share one
  // grid + one avatar instance; only the per-section peripheral UI swaps. The
  // avatar's activeTab follows the section. measurements has no avatar slot, so
  // the shared grid is display:none there (still mounted, identity preserved).
  const avatarActiveTab: 'bodyFat' | 'muscleMass' | 'measurements' =
    section === 'muscle' ? 'muscleMass' : section === 'measurements' ? 'measurements' : 'bodyFat';
  // === PROMPT 210b EXTENSION END ===

  const { id: userId } = useCurrentUser();

  // === PROMPT 210b P8-T1b (Avatar Telemetry) START ===
  // Bind telemetry helpers to the current user. userId may be undefined on first
  // render (auth not yet resolved); emitAvatarEvent is a no-op until it resolves.
  const { emit: telEmit, emitOnce: telEmitOnce } = useAvatarTelemetry(userId);

  // Once-guard refs for mount-time events that must fire at most once per session
  // regardless of re-renders. The emitOnce guard in the hook handles the dedup;
  // these refs skip the initial-mount default for "on CHANGE" events.
  const sectionMountedRef = useRef(false);    // skip initial section on mount
  const bodyPartMountedRef = useRef(false);   // skip initial null selectedBodyPart
  // P8-T2a: avatar_viewed fires exactly once, gated on a resolved userId. The
  // recordAvatarView() storage write must be ATOMIC with the actual emit so the
  // persisted view count never increments on a session that did not emit (which
  // would drift the first repeatViewCount above 1).
  const avatarViewEmittedRef = useRef(false);

  // Debounce helper for timeline_scrubbed: fires once per scrub gesture end.
  // Stable across renders via useRef; onSettle reads telEmit through a current-ref
  // so it always uses the latest emit even if userId resolves mid-session.
  const telEmitRef = useRef(telEmit);
  telEmitRef.current = telEmit;
  const scrubSettleRef = useRef<ReturnType<typeof createScrubSettleEmitter> | null>(null);
  if (scrubSettleRef.current === null) {
    scrubSettleRef.current = createScrubSettleEmitter(() => {
      telEmitRef.current('formavision.timeline_scrubbed');
    });
  }
  // === PROMPT 210b P8-T1b (Avatar Telemetry) END ===

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

  // === PROMPT 210b VR (Section 8) START ===
  // Visual Results read: the scan history (first + latest composition) and the
  // circumference history (first + latest measurements). Both hooks fail open to
  // empty + honest UNKNOWN. The deltas are computed once via the shared pure
  // function; the surfaces render that result without recomputing anything.
  const composHistory = useCompositionHistory(userId ?? null);
  const circHistory = useCircumferenceHistory(userId ?? null, unit);
  // === PROMPT 211a W4-2 (Cadence + Streak) START ===
  // Own-row read of the user's scan fingerprints. Drives the opt-in default time
  // (scanHistory -> recommendCadence), the outlier flag for the latest scan, and
  // the consistency tip. Fail-open: empty history -> surfaces render nothing.
  const scanFp = useScanFingerprints(userId ?? null);
  // === PROMPT 211a W4-2 (Cadence + Streak) END ===
  const vrDeltas = useMemo(
    () =>
      computeCompositionDeltas({
        firstComposition: composHistory.first,
        latestComposition: composHistory.latest,
        firstCircumferences: circHistory.first?.measurements ?? null,
        latestCircumferences: circHistory.latest?.measurements ?? null,
        unit,
      }),
    [composHistory.first, composHistory.latest, circHistory.first, circHistory.latest, unit],
  );
  // === PROMPT 210b VR (Section 8) END ===

  // === PROMPT 210b P3-T2b (Time Machine) START ===
  // The scrub shape driven by the JourneyTimeline. null rests the avatar at its
  // last shape (normal morph resumes per P3-T2a). Only set while scrubbing.
  const [scrubVector, setScrubVector] = useState<BodyParamVector | null>(null);
  // === PROMPT 211a W1 (shareable clip) START ===
  // The r3f frameloop mode, forwarded to BodyCompositionAvatar. Default demand
  // (undefined); the clip recorder flips it to 'always' while recording so
  // canvas.captureStream() emits every painted morph frame, then back to demand.
  const [clipFrameloopMode, setClipFrameloopMode] = useState<'always' | 'demand' | undefined>(undefined);
  // Ref to the avatar container; the clip recorder reads the live WebGL canvas from
  // it by the canonical data-testid. Only used on the WebM path (capable devices).
  const avatarContainerRef = useRef<HTMLDivElement>(null);
  // The active render tier, read from the ambient provider so the clip surface can
  // branch to the static-card fallback on the 2D floor (baseline item 1+2).
  const clipRenderTier = useRenderTier();
  // The clip morph raf handle, so a new recording cancels a stale one.
  const clipMorphRafRef = useRef<number | null>(null);
  // === PROMPT 211a W1 (shareable clip) END ===
  // === PROMPT 210b P5-T1c (FutureSelfPanel) START ===
  // Ghost state: lifted up from FutureSelfPanel via onGhostChange and wired into
  // the BodyCompositionAvatar prop seam (ghostVector + showGhost). Default OFF
  // so the avatar is byte-identical to today until the user opts in.
  const [ghostVector, setGhostVector] = useState<BodyParamVector | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  // === PROMPT 210b P5-T1c (FutureSelfPanel) END ===
  // === PROMPT 210g (first-scan comparison ghost) START ===
  // Show Comparison Overlay: ghost is the first scan through the same parametric
  // engine. Honest-disabled when no first scan exists. Comparison takes priority
  // over Future Self ghost when enabled so both do not fight for the seam.
  const [comparisonOverlayOn, setComparisonOverlayOn] = useState(false);
  // Prompt 210l: Time Machine / clip / first-scan ghost exclude weight-only dates
  // (e.g. May 8/12/21). Body Fat / Muscle Mass cards stay on useLatestComposition.
  const journeySnapshots = useMemo(
    () => composHistory.snapshots.filter(isJourneyCompositionPoint),
    [composHistory.snapshots],
  );

  const firstScanVector = useMemo<BodyParamVector | null>(() => {
    const first = journeySnapshots[0] ?? null;
    if (!first) return null;
    return scanToParamVector({
      snapshot: first,
      circumferences: circHistory.first?.measurements ?? null,
      sex: gender,
      unit,
    });
  }, [journeySnapshots, circHistory.first, gender, unit]);
  const effectiveGhostVector =
    comparisonOverlayOn && firstScanVector ? firstScanVector : ghostVector;
  const effectiveShowGhost =
    comparisonOverlayOn && firstScanVector
      ? true
      : comparisonOverlayOn
        ? false
        : showGhost;
  // === PROMPT 210g (first-scan comparison ghost) END ===

  // One BodyParamVector + one honest readout per REAL composition scan, oldest
  // first. Circumferences are aligned to each scan by recordedAt, falling back to
  // index. Numbers are real-scan-only; nothing here is fabricated or interpolated
  // (the interpolation happens in the timeline via lerpParamVector). Memoized so
  // the snap points are stable across renders.
  const circByDate = useMemo(() => {
    const map = new Map<string, (typeof circHistory.entries)[number]>();
    for (const e of circHistory.entries) map.set(e.recordedAt, e);
    return map;
  }, [circHistory.entries]);

  const journeyVectors = useMemo<BodyParamVector[]>(
    () =>
      journeySnapshots.map((snap, i) => {
        const measured =
          circByDate.get(snap.recordedAt)?.measurements ??
          circHistory.entries[i]?.measurements ??
          null;
        return scanToParamVector({
          snapshot: snap,
          circumferences: resolveAvatarCircumferences({
            overlay: null,
            measured,
            historySnapshot: snap,
            sex: gender,
            unit,
          }),
          sex: gender,
          unit,
        });
      }),
    [journeySnapshots, circByDate, circHistory.entries, gender, unit],
  );

  const journeyReadouts = useMemo<JourneyScanReadout[]>(
    () =>
      journeySnapshots.map((snap, i) => {
        const circ =
          circByDate.get(snap.recordedAt)?.measurements ??
          circHistory.entries[i]?.measurements ??
          null;
        return {
          recordedAt: snap.recordedAt,
          totalBodyFatPct: snap.totalBodyFatPct,
          waist: circ?.waist ?? null,
        };
      }),
    [journeySnapshots, circByDate, circHistory.entries],
  );
  // === PROMPT 210b P3-T2b (Time Machine) END ===

  // === PROMPT 211a W1 (shareable clip) START ===
  // The choose-able scan history for the clip range picker, oldest first. Dates come
  // from the SAME composition history the Time Machine uses. Per-scan confidence is
  // not exposed on this read path (useCompositionHistory returns CompositionSnapshot,
  // which carries no confidence), so it is passed as null (honest UNKNOWN): the
  // low-confidence warning treats UNKNOWN as not-low and never fabricates a tier.
  const clipScans = useMemo<ClipScanRef[]>(
    () => journeySnapshots.map((snap) => ({ recordedAt: snap.recordedAt, confidence: null })),
    [journeySnapshots],
  );

  // Reads the live avatar canvas from the container by its canonical data-testid.
  // Returns null when the 2D floor is shown (no canvas) so the clip surface serves
  // the static-card fallback honestly.
  const getClipCanvas = useCallback((): HTMLCanvasElement | null => {
    const root = avatarContainerRef.current;
    if (!root) return null;
    return root.querySelector<HTMLCanvasElement>('[data-testid="formavision-avatar-canvas"]');
  }, []);

  // Flip the frameloop for the clip recorder (always while recording, demand after).
  const setClipFrameloopAlways = useCallback((always: boolean) => {
    setClipFrameloopMode(always ? 'always' : 'demand');
  }, []);

  // Drive the morph play for the clip over the chosen range. Reuses the EXACT PLAY
  // math the JourneyTimeline uses: lerpParamVector between the two real scan vectors
  // across PLAY_DURATION_MS. Numbers are never fabricated; only the shape interpolates
  // between real scans. The clip surface passes the chosen range via a closure below.
  const playClipMorph = useCallback(
    (startIndex: number, endIndex: number) => {
      const a = journeyVectors[startIndex];
      const b = journeyVectors[endIndex];
      if (!a || !b) return;
      if (clipMorphRafRef.current !== null) cancelAnimationFrame(clipMorphRafRef.current);
      const PLAY_MS = 4000; // mirrors JourneyTimeline.PLAY_DURATION_MS
      let start: number | null = null;
      const tick = (now: number) => {
        if (start === null) start = now;
        const t = Math.min(1, (now - start) / PLAY_MS);
        setScrubVector(lerpParamVector(a, b, t));
        if (t < 1) {
          clipMorphRafRef.current = requestAnimationFrame(tick);
        } else {
          clipMorphRafRef.current = null;
        }
      };
      clipMorphRafRef.current = requestAnimationFrame(tick);
    },
    [journeyVectors],
  );
  // === PROMPT 211a W1 (shareable clip) END ===

  useEffect(() => {
    try { window.localStorage.setItem(UNIT_STORAGE_KEY, unit); } catch { /* ignore */ }
  }, [unit]);

  // Default gender from CAQ biological_sex, unless user has manually toggled
  useEffect(() => {
    if (!genderManuallySet) setGender(caqSex);
  }, [caqSex, genderManuallySet]);

  useEffect(() => {
    const parsed = parseCompositionSection(sectionParam);
    if (parsed) setSection(parsed);
  }, [sectionParam]);

  // Prompt 210k: honor ?scan=1 after client navigation (empty-state CTA from FormaVision).
  useEffect(() => {
    if (shouldOpenScanFromQuery(scanParam)) {
      setOpen(false);
      setScanOpen(true);
      setScanResult(null);
      setScanPersist({ phase: 'idle' });
    }
  }, [scanParam]);

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
    // PROMPT 210b VR: repaint the Visual Results surfaces on save too.
    composHistory.refresh();
    circHistory.refresh();
    // PROMPT 210b P3-T2b: clear any active scrub so a stale Time Machine shape
    // does not linger over freshly saved data; the avatar rests at latest.
    setScrubVector(null);
    // PROMPT 210b P5-T1c: clear the ghost too - newly saved data may shift the
    // projection vector. The panel's useEffect will recompute and the user can
    // re-enable the ghost after review. Keeps the avatar byte-identical on save.
    setGhostVector(null);
    setShowGhost(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // === PROMPT 210b P8-T1b (Avatar Telemetry) START ===
  // 1. avatar_viewed: fire exactly once, gated on a resolved userId.
  //    P8-T2a: enriched with repeatViewCount + daysSinceLastView (localStorage
  //    persisted). The recordAvatarView() storage write and the emit are ATOMIC:
  //    both happen only inside the userId-gated, ref-guarded block, so the
  //    persisted view count never increments on a session that did not actually
  //    emit avatar_viewed (which would push the first repeatViewCount above 1).
  //    A mount-only useEffect([]) would not re-run when userId resolves late, so
  //    this effect depends on userId and the local ref enforces single-fire.
  //    Destructured into an object literal so AvatarEventProperties (Record<string,Json>)
  //    receives a plain object without a cast, avoiding the index-signature mismatch.
  useEffect(() => {
    if (!userId || avatarViewEmittedRef.current) return;
    avatarViewEmittedRef.current = true;
    const { repeatViewCount, daysSinceLastView } = recordAvatarView();
    telEmit('formavision.avatar_viewed', { repeatViewCount, daysSinceLastView });
    // telEmit is stable; userId is the dependency. The ref guards single-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // === PROMPT 210b P8-T2a (Avatar Dwell) START ===
  // Dwell tracking: accumulates active-visible time via visibilitychange + pagehide.
  // Emits 'formavision.avatar_session_ended' with { dwellMs } on each hide event.
  // telEmit is stable (useCallback([], [])); the hook registers listeners once.
  useAvatarDwell(telEmit);
  // === PROMPT 210b P8-T2a (Avatar Dwell) END ===

  // 2. tab_switched: fire on section CHANGE, skip the initial mount default.
  useEffect(() => {
    if (!sectionMountedRef.current) {
      sectionMountedRef.current = true;
      return;
    }
    telEmit('formavision.tab_switched', { tab: section });
    // telEmit is stable; section is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // 3. region_selected: fire on selectedBodyPart CHANGE, skip initial null.
  useEffect(() => {
    if (!bodyPartMountedRef.current) {
      bodyPartMountedRef.current = true;
      return;
    }
    telEmit('formavision.region_selected', { region: selectedBodyPart ?? 'all' });
    // telEmit is stable; selectedBodyPart is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBodyPart]);

  // 4. protocol_opened: fire once when a body region is first selected
  //    (RegionProtocolPanel mounts when selectedBodyPart !== null).
  useEffect(() => {
    if (selectedBodyPart !== null) {
      telEmitOnce('formavision.protocol_opened');
    }
    // telEmitOnce is stable; selectedBodyPart is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBodyPart]);
  // === PROMPT 210b P8-T1b (Avatar Telemetry) END ===

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  // Prompt #209 + 210k: persist a completed scan through the canonical path,
  // then land on FormaVision (210h Rev C) so the 3D surface shows the new scan.
  // Fail-open: any failure surfaces an inline retry, never throws into render.
  const runScanPersist = useCallback(async (scanId: string) => {
    setScanPersist({ phase: 'saving' });
    const res = await persistScan(scanId);
    if (res.ok) {
      setScanPersist({ phase: 'saved' });
      setRefreshKey((k) => k + 1);
      // 210h Rev C / 210k seed 8: completed scan lands on FormaVision with results.
      router.push(formavisionAfterScanHref());
    } else {
      setScanPersist({ phase: 'error', scanId, reason: res.reason });
    }
  }, [router]);

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
    () => ovalStatusesFromExistingChange(fatChange.data, 'fat'),
    [fatChange.data],
  );
  const muscleRegionStatuses: Record<string, OvalColor> = useMemo(
    () => ovalStatusesFromExistingChange(muscleChange.data, 'muscle'),
    [muscleChange.data],
  );

  // === PROMPT 210b EXTENSION START ===
  // OV-T2: the 5-segment tint record for the 3D avatar. The two tabs source
  // differently so each MATCHES its own 2D floor:
  //   Body Fat -> ABSOLUTE status from the canonical regionFatPct via
  //     getSegmentStatus -> getOvalColorFromStatus, agreeing with the fat cards.
  //   Muscle -> CHANGE based (Arnold OV-T2 review): the latest-vs-first
  //     regionMuscleLbs delta via getOvalColorFromChange('muscle'), mirroring the
  //     2D muscle floor below the avatar EXACTLY, so the 3D and 2D can never show
  //     opposite colors for the same region. EITHER end UNKNOWN -> segment omitted.
  // Measurements passes null (no tint).
  const avatarSegmentTints = useMemo(() => {
    if (avatarActiveTab === 'measurements') {
      return null;
    }
    if (avatarActiveTab === 'muscleMass') {
      return buildSegmentTintsFromChange(
        composHistory.first?.regionMuscleLbs ?? null,
        composHistory.latest?.regionMuscleLbs ?? null,
        'muscle',
      );
    }
    if (!snapshot) {
      return null;
    }
    return buildSegmentTints(snapshot.regionFatPct, 'fat', gender);
  }, [avatarActiveTab, snapshot, gender, composHistory.first, composHistory.latest]);
  // === PROMPT 210b EXTENSION END ===

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
      {/* Prompt 217: stacked on mobile so pill row + action row each scroll
          internally (no page-level overflow, no orphan wrap). Desktop keeps
          a single header row when space allows. */}
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <CompositionSectionToggle active={section} onChange={onSectionNav} />
        <BiologyActionRow
          userId={userId ?? null}
          logOpen={open}
          onToggleLog={() => {
            setScanOpen(false);
            setOpen((o) => !o);
          }}
        />
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
              setScrubVector(null);
              setScanResult(r);
              void runScanPersist(r.scanId);
            }}
            onCancel={() => setScanOpen(false)}
          />
        )}
      </InlineEntryPanel>

      {errorBanner}

      {/* === PROMPT 210b EXTENSION START === */}
      {/* P2-T2c: the fat and muscle sections now share ONE grid and ONE
          BodyCompositionAvatar instance so the 3D avatar keeps a stable React
          identity across the Body Fat / Muscle / Measurements toggle. The intro
          materialize plays once on initial mount; toggling sections only swaps
          activeTab + the per-section peripheral UI (titles, legend labels,
          HoverSystem view, regions, segment statuses), never remounts. On
          measurements the shared grid is display:none (still mounted), and the
          measurements UI renders below. The 2D floor stays per-section and
          unchanged: BodyCompositionAvatar renders the section's own HoverSystem
          + SegmentalHeatMap on the WebGL fallback. */}
      {(() => {
        // 'fat' is the default config for the persistent grid; on measurements
        // the grid is hidden but kept mounted, so we still feed it a valid
        // (fat) config. Only 'muscle' flips to the muscle variant.
        const isMuscle = section === 'muscle';
        const isMeasurements = section === 'measurements';
        return (
          <>
            {section === 'fat' && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5 lg:p-3">
                <h2 className="text-lg font-bold text-white">Body Composition</h2>
                <p className="text-xs text-white/60">Segmental body fat analysis</p>
              </div>
            )}

            {isMuscle && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5 lg:p-3">
                <h2 className="text-lg font-bold text-white">Muscle Analysis</h2>
                <p className="text-xs text-white/60">Segmental muscle mass breakdown</p>
              </div>
            )}

            {/* Prompt 210k: gender drives fat and muscle 2D floors; show on both (not measurements). */}
            {(section === 'fat' || isMuscle) && (
              <>
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
              </>
            )}

            {/* The persistent grid. Hidden (display:none) on measurements so the
                avatar identity survives the toggle without consuming layout. */}
            <div
              data-testid="body-tracker-grid"
              className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-6 backdrop-blur-sm lg:mt-[25vh] lg:flex lg:flex-col lg:p-3 lg:h-[calc(100vh-200px)] lg:min-h-[568px] lg:overflow-hidden ${
                isMeasurements ? 'hidden' : ''
              }`}
            >
              <h3 className="mb-3 shrink-0 text-center text-xs font-semibold uppercase tracking-wider text-white/40 lg:hidden">
                {isMuscle ? 'Segmental Muscle Analysis' : 'Segmental Body Fat Analysis'}
              </h3>
              <HeatmapLegend metric={isMuscle ? 'muscle' : 'fat'} className="mb-4 shrink-0 lg:hidden" />
              <div className="flex flex-col lg:flex-1 lg:flex-row lg:items-stretch lg:gap-6 lg:min-h-0">
                <div
                  ref={avatarContainerRef}
                  data-testid="avatar-container"
                  className="relative flex items-center justify-center px-2 py-2 lg:min-h-0 lg:flex-1"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(45, 165, 160, 0.15))' }}
                >
                  {/* Prompt 210h Rev C: 3D mounts live only on /body-tracker/formavision.
                      This surface keeps the 2D segmental avatars for numbers and Log Data. */}
                  {isMuscle ? (
                    <HoverSystem view="muscle" sex={gender} regions={muscleRegions} className="lg:h-full">
                      <SegmentalHeatMap sex={gender} segmentStatuses={muscleRegionStatuses} />
                    </HoverSystem>
                  ) : (
                    <HoverSystem view="composition" sex={gender} regions={fatRegions} className="lg:h-full">
                      <SegmentalHeatMap sex={gender} segmentStatuses={fatRegionStatuses} />
                    </HoverSystem>
                  )}
                  <LegendBar
                    pinnedIds={pinnedIds}
                    hoveredId={hoveredId}
                    onActivate={handleLegendActivate}
                    layout="ring"
                    className="hidden lg:block lg:absolute lg:top-2 lg:bottom-2 lg:left-1/2 lg:-translate-x-1/2 lg:aspect-[720/1152]"
                  />
                </div>
                <aside
                  data-testid="kpi-stack-desktop"
                  aria-label="Body composition summary"
                  className="hidden lg:flex lg:w-[200px] lg:shrink-0 lg:flex-col lg:gap-3"
                >
                  {/* Prompt 210f: uniform 1.5 gap between the heading, the legend
                      rows, and each dot-to-label so the block reads as evenly
                      spaced. Dot and label are already middle-aligned (items-center).
                      Spacing only; block position and every card are unchanged. */}
                  <div data-testid="kpi-stack-header" className="flex flex-col items-center gap-1.5 lg:mb-4">
                    <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-white/40">
                      {isMuscle ? 'Segmental Muscle Analysis' : 'Segmental Body Fat Analysis'}
                    </h3>
                    <ul className="flex flex-col gap-1.5 text-[10px] lg:w-fit lg:mx-auto">
                      <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
                        <span className="text-white/40">{isMuscle ? 'Muscle Gain' : 'Fat Loss'}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
                        <span className="text-white/40">No Change</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
                        <span className="text-white/40">{isMuscle ? 'Muscle Loss' : 'Fat Gain'}</span>
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
        );
      })()}
      {/* === PROMPT 210b EXTENSION END === */}

      {/* === PROMPT 210b VR (Section 8) START === */}
      {/* Visual Results: the large latest-vs-first body-fat readout and the
          Notable Changes summary, mounted beneath the avatar on the Body Fat and
          Muscle sections. Both read the histories + the shared delta function;
          they show honest UNKNOWN / invite states on a single scan or missing
          data, never a fabricated delta. measurements has its own surface below. */}
      {section !== 'measurements' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BodyFatReadout
            latestBodyFatPct={composHistory.latest?.totalBodyFatPct ?? null}
            estimatedBodyFatMin={composHistory.latest?.estimatedBodyFatMin ?? null}
            estimatedBodyFatMax={composHistory.latest?.estimatedBodyFatMax ?? null}
            bodyFat={vrDeltas.bodyFat}
            firstScanDate={journeySnapshots[0]?.recordedAt ?? null}
            latestScanDate={
              journeySnapshots[journeySnapshots.length - 1]?.recordedAt ??
              composHistory.latest?.recordedAt ??
              null
            }
          />
          <NotableChanges deltas={vrDeltas} />
        </div>
      )}
      {/* === PROMPT 210b VR (Section 8) END === */}

      {/* === PROMPT 210b P3-T2b (Time Machine) START === */}
      {/* The JourneyTimeline scrubber sits beneath the avatar on the Body Fat and
          Muscle sections. It drives the avatar body via scrubVector across the
          REAL scans (no fabricated scans). With fewer than two scans it shows an
          honest invite instead of a fake timeline. Numbers in its readout are
          real-scan-only; between scans are labeled a visual transition. */}
      {section !== 'measurements' && (
        <JourneyTimeline
          vectors={journeyVectors}
          readouts={journeyReadouts}
          unit={unit}
          reducedMotion={avatarReducedMotion}
          onScrub={(vec) => {
            setScrubVector(vec);
            // P8-T1b: debounce-notify for timeline_scrubbed; fires once per gesture.
            scrubSettleRef.current?.notify();
          }}
          onPlay={() => telEmit('formavision.journey_played')}
        />
      )}
      {/* === PROMPT 210b P3-T2b (Time Machine) END === */}

      {/* === PROMPT 211a W1 (shareable transformation clip) START === */}
      {/* The growth engine: turn the real transformation into a shareable clip.
          One-source numbers (vrDeltas, same as the cards). Explicit consent gate
          before anything leaves the device. No-dependency WebM on desktop / modern
          Android via MediaRecorder(canvas.captureStream()); honest static-card
          fallback on iOS / the 2D floor (never a fake video, never a raw photo).
          Consumer-only (imported directly, not barreled). Fewer than two scans
          shows an honest invite. */}
      {section !== 'measurements' && (
        <ClipCreatorSurface
          userId={userId ?? null}
          tier={clipRenderTier}
          deltas={vrDeltas}
          scans={clipScans}
          getCanvas={getClipCanvas}
          playMorph={playClipMorph}
          setFrameloopAlways={setClipFrameloopAlways}
          surface="/body-tracker/composition"
        />
      )}
      {/* === PROMPT 211a W1 (shareable transformation clip) END === */}

      {/* === PROMPT 210b P4-T1 (GeneticsOverlay) START === */}
      {/* Honest-disabled genetics layer. Two states: real variants present ->
          body-positive invitation (tendency-not-destiny, no region band/tint);
          absent -> CTA to /genetics/upload. Fail-open via the shared hook. */}
      {section !== 'measurements' && (
        <GeneticsOverlay
          onFirstView={(state) =>
            telEmitOnce('formavision.genetics_overlay_viewed', { state })
          }
        />
      )}
      {/* === PROMPT 210b P4-T1 (GeneticsOverlay) END === */}

      {/* === PROMPT 210b P5-T1c (FutureSelfPanel) START === */}
      {/* Projected Future Self panel. Default OFF (avatar byte-identical to today).
          Reads stored goal (body-fat + weight goal), computes the ghost vector via
          projectFutureSelfVector, and drives ghostVector + showGhost on the avatar
          via the P5-T1b prop seam. Honest-disabled on no-goal or no-current-scan.
          P5-T2 segmental note always shown (never a fabricated per-region tint). */}
      {section !== 'measurements' && (
        <FutureSelfPanel
          snapshot={snapshot}
          circumferences={circumferenceData.latest}
          sex={gender}
          unit={unit}
          userId={userId ?? null}
          reducedMotion={avatarReducedMotion}
          onGhostChange={(v, s) => {
            setGhostVector(v);
            setShowGhost(s);
          }}
          onUserToggle={(on) =>
            telEmit('formavision.future_self_toggled', { on })
          }
        />
      )}
      {/* === PROMPT 210b P5-T1c (FutureSelfPanel) END === */}

      {/* === PROMPT 210b P6-T1 (RegionProtocolPanel) START === */}
      {/* Whole-protocol panel. Shown only when a body region is selected.
          Content is IDENTICAL for every region: no body-region-to-product
          mapping exists, so no region-targeted claim is ever produced.
          synthesis null -> honest-disabled invite + CTA to /supplements.
          Additive to the existing layer stack; 2D floor + avatar untouched. */}
      {section !== 'measurements' && selectedBodyPart !== null && (
        <RegionProtocolPanel reducedMotion={avatarReducedMotion} />
      )}
      {/* === PROMPT 210b P6-T1 (RegionProtocolPanel) END === */}

      {/* === PROMPT 210b P6-T2 (AgentNarration) START === */}
      {/* Agent narration layer. Templated, deterministic lines from Arnold and
          Hannah: what changed (from vrDeltas), what is notable (biggestChange),
          one gentle non-prescriptive suggestion. No LLM call, no fetch, no
          fabricated change. null deltas -> honest first-scan welcome.
          Consumes vrDeltas already computed on this surface (read-only). */}
      {section !== 'measurements' && (
        <AgentNarration
          deltas={vrDeltas}
          reducedMotion={avatarReducedMotion}
        />
      )}
      {/* === PROMPT 210b P6-T2 (AgentNarration) END === */}

      {/* === PROMPT 210b P6-T3 (BOSMovementReadout) START === */}
      {/* Compact Bio Optimization Score movement readout. Reads from the
          existing useBOSCurrent hook (/api/bos/current SSOT) - no new data
          path. Shows score + movement since baseline when both are present;
          honest-disabled on null score or null baseline. Read-only, fail-open. */}
      {section !== 'measurements' && (
        <BOSMovementReadout reducedMotion={avatarReducedMotion} />
      )}
      {/* === PROMPT 210b P6-T3 (BOSMovementReadout) END === */}

      {/* === PROMPT 210b P6-T4 (MilestoneMoment) START === */}
      {/* Consumer-only, celebrate-only fixed overlay. One-shot per session when a
          genuinely-achieved body-composition milestone (completed_date set by server)
          exists that the user has not yet seen. Dismissible (44px touch target).
          Read-only: no economy writes, no helix_score_events, no creditEarning.
          Carry-forward: server-side milestone -> Helix crediting is a separate task.
          Fail-open: any read failure renders nothing, never throws. */}
      {section !== 'measurements' && (
        <MilestoneMoment
          reducedMotion={avatarReducedMotion}
          onShown={() => telEmitOnce('formavision.milestone_celebrated')}
        />
      )}
      {/* === PROMPT 210b P6-T4 (MilestoneMoment) END === */}

      {/* === PROMPT 211a W4-2 (Cadence + Streak surfaces) START === */}
      {/* Four consumer-only surfaces. The outlier fingerprint FLAG appears BEFORE
          the trend so a lighting/time change is not misread as a body change. The
          consistency TIP names the user's own best conditions (null on thin
          history, never generic). The scan STREAK is read-only from scan_streak
          (own-row). The reminder OPT-IN is off by default and revocable, and its
          default time is the user's own historical scan time. Streak credit stays
          in the server award lane, never written from these visual surfaces. */}
      {section !== 'measurements' && (
        <div className="space-y-3">
          {scanFp.flagDecision && <FingerprintFlag decision={scanFp.flagDecision} />}
          <ScanStreakDisplay />
          <ConsistencyTip tip={scanFp.consistencyTip} />
          <CadenceReminderOptIn scanHistory={scanFp.scanHistory} />
        </div>
      )}
      {/* === PROMPT 211a W4-2 (Cadence + Streak surfaces) END === */}

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
              confidence={circumferenceData.latestConfidence ?? null}
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
  // P7-T2: RenderTierProvider hoisted to the composition surface so page-level
  // layers can read the ambient tier via useRenderTier. The provider's capability
  // probe runs once here (SSR-safe: cinematic on the server, lite on a clear
  // low-power client). BodyCompositionAvatar now consumes the ambient provider
  // instead of creating its own. The onBudgetMissed prop seam keeps the frame
  // monitor reporting through the Canvas prop boundary (r3f context does not
  // cross the reconciler boundary).
  return (
    <RenderTierProvider>
      <BackToHubLink />
      <Suspense fallback={<div className="h-12" />}>
        <CompositionPageInner />
      </Suspense>
    </RenderTierProvider>
  );
}
