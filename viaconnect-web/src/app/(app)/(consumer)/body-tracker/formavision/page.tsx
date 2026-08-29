'use client';

// Prompt 210h Revision C: dedicated FormaVision tab.
// Prompt 210l: four-photo scan panel on this tab.
// Prompt Brief 2: 3D A/B wipe compare (parametric BodyParamVector only).
// Body Composition remains the numbers / manual / 2D surface.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import {
  CompositionSectionToggle,
  type CompositionNavTab,
} from '@/components/body-tracker/CompositionSectionToggle';
import {
  BodyCompositionAvatar,
  SelectBodyPartControl,
  RenderTierProvider,
} from '@/components/formavision';
import { JourneyTimeline, type JourneyScanReadout } from '@/components/formavision/JourneyTimeline';
import { FutureSelfPanel } from '@/components/formavision/FutureSelfPanel';
import { RegionProtocolPanel } from '@/components/formavision/RegionProtocolPanel';
import {
  AbComparePanelContent,
  AbWipeSplitOverlay,
} from '@/components/formavision/AbComparePanel';
import { useReducedMotion } from '@/components/body-tracker/HoverSystem/useReducedMotion';
import { SegmentalHeatMap } from '@/components/body-tracker/SegmentalHeatMap';
import { UnitToggle } from '@/components/body-tracker/UnitToggle';
import { useCompositionHistory } from '@/hooks/body-tracker/useCompositionHistory';
import { useCircumferenceHistory } from '@/hooks/body-tracker/useCircumferenceHistory';
import { useCircumferenceData } from '@/hooks/body-tracker/useCircumferenceData';
import { useUserBiologicalSex } from '@/hooks/body-tracker/useUserBiologicalSex';
import { useUserJourney } from '@/hooks/body-tracker/useUserJourney';
import { useCurrentUser } from '@/components/body-tracker/manual-input';
import { BodyScanUploader, type BodyScanResult } from '@/components/body-tracker/BodyScanUploader';
import { BodyScanResults } from '@/components/body-tracker/BodyScanResults';
import { persistScan } from '@/lib/body-tracker/composition/persistScanClient';
import { isJourneyCompositionPoint } from '@/lib/body-tracker/composition/journeyPoints';
import type { MeasurementUnit } from '@/lib/body-tracker/circumference';
import {
  compositionSectionHref,
} from '@/lib/body-tracker/compositionNav';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { buildSegmentTintsFromChange } from '@/lib/formavision/geometry/composSegmentTints';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import { useAvatarTelemetry } from '@/lib/formavision/telemetry/useAvatarTelemetry';
import {
  pairScanPoints,
  resolveAbBaseline,
  type AbBaselineMode,
} from '@/lib/formavision/compare/resolveAbBaseline';
import { computeAbMeasurementDeltas } from '@/lib/formavision/compare/abMeasurementDeltas';
import { emitCompareEvent } from '@/lib/formavision/compare/compareTelemetry';

const UNIT_STORAGE_KEY = 'vc.body-tracker.measurement-unit';

function readStoredUnit(): MeasurementUnit {
  if (typeof window === 'undefined') return 'in';
  try {
    const v = window.localStorage.getItem(UNIT_STORAGE_KEY);
    return v === 'cm' ? 'cm' : 'in';
  } catch {
    return 'in';
  }
}

export default function FormaVisionPage() {
  return (
    <RenderTierProvider>
      <FormaVisionSurface />
    </RenderTierProvider>
  );
}

function FormaVisionSurface() {
  const router = useRouter();
  const { id: userId } = useCurrentUser();
  const reducedMotion = useReducedMotion();
  const {
    sex: caqSex,
    setOverride: setGenderOverride,
  } = useUserBiologicalSex(userId ?? null);
  const journey = useUserJourney(userId ?? null);

  const onSectionNav = useCallback(
    (tab: CompositionNavTab) => {
      if (tab === 'formavision') return;
      router.push(compositionSectionHref(tab));
    },
    [router],
  );
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [genderManuallySet, setGenderManuallySet] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [scrubVector, setScrubVector] = useState<BodyParamVector | null>(null);
  const [ghostVector, setGhostVector] = useState<BodyParamVector | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [abCompareOn, setAbCompareOn] = useState(false);
  const [baselineMode, setBaselineMode] = useState<AbBaselineMode>('last_scan');
  const [wipeT, setWipeT] = useState(0.5);
  // Prompt 210l: wire the FormaVision tab to the four-photo scan panel.
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<BodyScanResult | null>(null);
  // Prompt 210k: same unit spine as composition (localStorage key shared).
  const [unit, setUnit] = useState<MeasurementUnit>(() => readStoredUnit());

  useEffect(() => {
    if (!genderManuallySet && (caqSex === 'male' || caqSex === 'female')) {
      setGender(caqSex);
    }
  }, [caqSex, genderManuallySet]);

  useEffect(() => {
    try {
      window.localStorage.setItem(UNIT_STORAGE_KEY, unit);
    } catch {
      /* ignore */
    }
  }, [unit]);

  const persistGender = useCallback(
    async (g: 'male' | 'female') => {
      try {
        await setGenderOverride(g);
      } catch {
        /* fail-open: local toggle still updates the body */
      }
    },
    [setGenderOverride],
  );

  const { emit: telEmit, emitOnce: telEmitOnce } = useAvatarTelemetry(userId);
  useEffect(() => {
    if (!userId) return;
    telEmitOnce('formavision.tab_entered', { surface: 'formavision' });
  }, [userId, telEmitOnce]);

  const composHistory = useCompositionHistory(userId ?? null);
  const circHistory = useCircumferenceHistory(userId ?? null, unit);
  const { data: circumferenceData, refresh: refreshCirc } = useCircumferenceData({
    userId: userId ?? null,
    displayUnit: unit,
  });
  const snapshot = composHistory.latest;
  const journeySnapshots = useMemo(
    () => composHistory.snapshots.filter(isJourneyCompositionPoint),
    [composHistory.snapshots],
  );

  const scanPoints = useMemo(
    () => pairScanPoints(composHistory.snapshots, circHistory.entries),
    [composHistory.snapshots, circHistory.entries],
  );

  const lastScanBaseline = useMemo(
    () => resolveAbBaseline({ scans: scanPoints, mode: 'last_scan' }),
    [scanPoints],
  );

  const protocolBaseline = useMemo(
    () =>
      resolveAbBaseline({
        scans: scanPoints,
        mode: 'protocol_start',
        protocolStartedAt: journey.startedAt,
      }),
    [scanPoints, journey.startedAt],
  );

  const selectedBaseline =
    baselineMode === 'last_scan' ? lastScanBaseline : protocolBaseline;
  const activeBaseline = selectedBaseline.comparable ? selectedBaseline : lastScanBaseline;
  const canCompare = lastScanBaseline.comparable;

  const wipeVector = useMemo<BodyParamVector | null>(() => {
    if (!abCompareOn || !activeBaseline.baseline) return null;
    return scanToParamVector({
      snapshot: activeBaseline.baseline.composition,
      circumferences: activeBaseline.baseline.circumferences,
      sex: gender,
      unit,
    });
  }, [abCompareOn, activeBaseline.baseline, gender, unit]);

  const abDeltas = useMemo(() => {
    if (!abCompareOn || !activeBaseline.baseline || !activeBaseline.latest) return [];
    return computeAbMeasurementDeltas({
      baselineComposition: activeBaseline.baseline.composition,
      latestComposition: activeBaseline.latest.composition,
      baselineCircumferences: activeBaseline.baseline.circumferences,
      latestCircumferences: activeBaseline.latest.circumferences,
      unit,
    });
  }, [abCompareOn, activeBaseline.baseline, activeBaseline.latest, unit]);

  const hasScanData = Boolean(snapshot || circumferenceData.latest);

  const journeyVectors = useMemo(
    () =>
      journeySnapshots.map((snap, i) => {
        const circ =
          circHistory.entries.find((e) => e.recordedAt === snap.recordedAt)?.measurements ??
          circHistory.entries[i]?.measurements ??
          null;
        return scanToParamVector({
          snapshot: snap,
          circumferences: circ,
          sex: gender,
          unit,
        });
      }),
    [journeySnapshots, circHistory.entries, gender, unit],
  );

  const journeyReadouts = useMemo<JourneyScanReadout[]>(
    () =>
      journeySnapshots.map((snap, i) => {
        const circ =
          circHistory.entries.find((e) => e.recordedAt === snap.recordedAt)?.measurements ??
          circHistory.entries[i]?.measurements ??
          null;
        return {
          recordedAt: snap.recordedAt,
          totalBodyFatPct: snap.totalBodyFatPct,
          waist: circ?.waist ?? null,
        };
      }),
    [journeySnapshots, circHistory.entries],
  );

  const improvementTints = useMemo(() => {
    if (!composHistory.first || !composHistory.latest) return null;
    return buildSegmentTintsFromChange(
      composHistory.first.regionFatPct,
      composHistory.latest.regionFatPct,
      'fat',
    );
  }, [composHistory.first, composHistory.latest]);

  const effectiveShowGhost = abCompareOn ? false : showGhost;

  const onCompareToggle = useCallback(() => {
    setAbCompareOn((v) => {
      const next = !v;
      if (next) {
        void emitCompareEvent(userId, 'formavision.ab_compared', {
          surface: '/body-tracker/formavision',
          baseline: activeBaseline.kind ?? 'last_scan',
          ok: true,
        });
      }
      return next;
    });
  }, [userId, activeBaseline.kind]);

  useEffect(() => {
    if (effectiveShowGhost && improvementTints && Object.keys(improvementTints).length > 0) {
      telEmitOnce('formavision.improvement_viewed', { mode: 'ghost' });
    }
  }, [effectiveShowGhost, improvementTints, telEmitOnce]);

  const comparePanelProps = {
    comparable: canCompare,
    compareOn: abCompareOn,
    onToggle: onCompareToggle,
    baselineMode,
    onBaselineModeChange: setBaselineMode,
    baselineKind: selectedBaseline.kind,
    wipeT,
    onWipeTChange: setWipeT,
    deltas: abDeltas,
    reducedMotion,
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-16 pt-4 md:px-6">
      <BackToHubLink />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompositionSectionToggle active="formavision" onChange={onSectionNav} />
        <button
          type="button"
          data-testid="formavision-open-scan"
          onClick={() => {
            setScanOpen((o) => !o);
            if (scanOpen) setScanResult(null);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#B75E18]/50 bg-[#B75E18]/15 px-4 py-2.5 text-sm font-medium text-[#B75E18]"
        >
          <Camera size={16} strokeWidth={1.5} />
          {scanOpen ? 'Close scan' : 'Scan My Body'}
        </button>
      </div>

      {scanOpen && (
        <div
          data-testid="formavision-scan-panel"
          className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md sm:p-5"
        >
          <h2 className="text-base font-semibold text-white">FormaVision four-photo scan</h2>
          <p className="mb-4 text-xs text-white/55">
            JPEG and PNG keep their real types. Analysis can take up to 60 seconds.
          </p>
          {scanResult ? (
            <BodyScanResults
              result={scanResult}
              onRetake={() => setScanResult(null)}
              onClose={() => {
                setScanOpen(false);
                setScanResult(null);
              }}
            />
          ) : (
            <BodyScanUploader
              onComplete={(r) => {
                setScanResult(r);
                void persistScan(r.scanId).then(() => {
                  composHistory.refresh();
                  circHistory.refresh();
                  refreshCirc();
                });
              }}
              onCancel={() => setScanOpen(false)}
            />
          )}
        </div>
      )}

      <header className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md sm:p-5">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-[#B75E18]">Forma</span>
          <span className="text-white">Vision</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/65">
          {hasScanData
            ? 'Your body, built from your scan and measurements. Compare against your last scan with an A/B wipe.'
            : 'Scan your body or log measurements to build your 3D form. No photographic surface reconstruction.'}
        </p>
      </header>

      {!hasScanData && (
        <div
          data-testid="formavision-empty-state"
          className="rounded-2xl border border-white/10 bg-[#0D1520]/60 p-6 text-center"
        >
          <p className="text-sm text-white/70">
            No scan or measurements yet. Start a body scan or enter measurements to render your 3D
            body.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setScanOpen(true);
                setScanResult(null);
              }}
              className="min-h-[44px] rounded-xl border border-[#B75E18]/50 bg-[#B75E18]/15 px-4 py-2.5 text-sm font-medium text-[#B75E18]"
            >
              Scan My Body
            </button>
            <Link
              href={compositionSectionHref('measurements')}
              className="min-h-[44px] rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/80"
            >
              Log measurements
            </Link>
          </div>
        </div>
      )}

      {/* Prompt 210m: top control row. Male/Female + units stay above the avatar.
          A/B compare toggle joins this row at md+; on phone it lives below
          Select Body Part. */}
      <div
        data-testid="formavision-top-controls"
        className="flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            data-testid="formavision-gender-male"
            onClick={() => {
              setGenderManuallySet(true);
              setGender('male');
              void persistGender('male');
            }}
            className={`min-h-[44px] flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              gender === 'male'
                ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                : 'border-white/20 bg-white/[0.04] text-white/60'
            }`}
          >
            Male
          </button>
          <button
            type="button"
            data-testid="formavision-gender-female"
            onClick={() => {
              setGenderManuallySet(true);
              setGender('female');
              void persistGender('female');
            }}
            className={`min-h-[44px] flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              gender === 'female'
                ? 'border-[#B75E18]/60 bg-[#B75E18]/15 text-[#B75E18]'
                : 'border-white/20 bg-white/[0.04] text-white/60'
            }`}
          >
            Female
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <UnitToggle value={unit} onChange={setUnit} layoutId="formavision-page-unit" />
          <AbComparePanelContent {...comparePanelProps} placement="top" />
        </div>
      </div>

      {/* Prompt 210m: avatar canvas is controls-free aside from the wipe split
          line (pointer-events none so orbit and Neck callouts stay usable). */}
      <div
        data-testid="formavision-canvas-grid"
        className="relative flex min-h-[480px] justify-center rounded-2xl border border-white/[0.08] bg-transparent p-4 lg:min-h-[560px]"
      >
        <AbWipeSplitOverlay wipeT={wipeT} visible={abCompareOn && Boolean(wipeVector)} />
        <BodyCompositionAvatar
          sex={gender}
          scan={snapshot}
          firstScan={composHistory.first}
          circumferences={circumferenceData.latest}
          unit={unit}
          activeTab="bodyFat"
          selectedBodyPart={selectedBodyPart}
          onSelectBodyPart={setSelectedBodyPart}
          reducedMotion={reducedMotion}
          segmentTints={effectiveShowGhost ? improvementTints : null}
          scrubVector={scrubVector}
          ghostVector={ghostVector}
          showGhost={effectiveShowGhost}
          wipeActive={abCompareOn}
          wipeT={wipeT}
          wipeVector={wipeVector}
        >
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <SegmentalHeatMap sex={gender} segmentStatuses={{}} />
          </div>
        </BodyCompositionAvatar>
      </div>

      {/* Prompt 210m: Select Body Part centered below the avatar feet, above Journey.
          Supersedes 210f top-left placement; Neck and all callouts stay unblocked. */}
      <div
        data-testid="formavision-select-body-part-slot"
        className="flex justify-center px-2 pt-1"
      >
        <SelectBodyPartControl value={selectedBodyPart} onChange={setSelectedBodyPart} />
      </div>

      <AbComparePanelContent {...comparePanelProps} placement="phone" />
      <AbComparePanelContent {...comparePanelProps} placement="controls" />

      {journeyVectors.length > 1 && (
        <JourneyTimeline
          vectors={journeyVectors}
          readouts={journeyReadouts}
          unit={unit}
          reducedMotion={reducedMotion}
          onScrub={setScrubVector}
          onPlay={() => telEmit('formavision.journey_played', {})}
        />
      )}

      <FutureSelfPanel
        snapshot={snapshot}
        circumferences={circumferenceData.latest}
        sex={gender}
        unit={unit}
        userId={userId ?? null}
        reducedMotion={reducedMotion}
        onGhostChange={(v, s) => {
          if (!abCompareOn) {
            setGhostVector(v);
            setShowGhost(s);
          }
        }}
        onUserToggle={(on) => telEmit('formavision.future_self_toggled', { on })}
      />

      {/* Prompt 210k: protocol panel follows body-part selection (lives with Select Body Part). */}
      {selectedBodyPart !== null && (
        <RegionProtocolPanel reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
